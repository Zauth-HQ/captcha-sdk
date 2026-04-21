import axios, { AxiosInstance, AxiosError } from 'axios';
import type { 
  Challenge, 
  Proof, 
  VerificationResult, 
  ZkCaptchaConfig,
  GenerateProofOptions 
} from '../types';
import { proverService, CircuitArtifact } from './prover';
import { circuitArtifact } from '../artifacts/circuit';
import { DEFAULT_BACKEND_URL } from '../config';
import { sdkLogger, proofLogger } from '../utils/logger';

// Re-export prover types and service for testing
export { proverService, ProverService, CircuitArtifact, ProofInputs, ProofOutput } from './prover';
export { DEFAULT_BACKEND_URL } from '../config';
export { circuitArtifact } from '../artifacts/circuit';

export class ZkCaptcha {
  private client: AxiosInstance;
  private siteId?: string;
  private currentChallenge: Challenge | null = null;
  private initialized: boolean = false;
  private artifactUrl?: string;
  private artifactData?: CircuitArtifact;

  constructor(config: ZkCaptchaConfig = {}) {
    const backendUrl = config.backendUrl || DEFAULT_BACKEND_URL;

    sdkLogger.info('🚀 Creating ZkCaptcha instance', {
      backendUrl,
      siteId: config.siteId,
      hasArtifactUrl: !!config.artifactUrl,
    });

    this.client = axios.create({
      baseURL: backendUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.siteId = config.siteId;
    this.artifactUrl = config.artifactUrl;

    // Add request/response interceptors for logging
    this.client.interceptors.request.use((config) => {
      const requestId = Math.random().toString(36).substring(7);
      (config as any).requestId = requestId;
      (config as any).startTime = Date.now();
      
      sdkLogger.debug(`📤 Request [${requestId}] ${config.method?.toUpperCase()} ${config.url}`, {
        headers: config.headers,
        data: config.data,
      });
      
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        const requestId = (response.config as any).requestId;
        const startTime = (response.config as any).startTime;
        const duration = Date.now() - startTime;
        
        sdkLogger.network(
          response.config.method?.toUpperCase() || 'GET',
          response.config.url || '',
          response.status,
          duration
        );
        
        sdkLogger.debug(`📥 Response [${requestId}] ${response.status}`, {
          data: response.data,
          duration: `${duration}ms`,
        });
        
        return response;
      },
      (error: AxiosError) => {
        if (error.config) {
          const requestId = (error.config as any).requestId;
          const startTime = (error.config as any).startTime;
          const duration = startTime ? Date.now() - startTime : 0;
          
          sdkLogger.network(
            error.config.method?.toUpperCase() || 'GET',
            error.config.url || '',
            error.response?.status || 0,
            duration
          );
          
          sdkLogger.error(`❌ Request [${requestId}] failed:`, error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  setArtifactData(data: CircuitArtifact): void {
    sdkLogger.info('📋 Setting artifact data', { size: data.bytecode?.length });
    this.artifactData = data;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      sdkLogger.debug('Already initialized, skipping');
      return;
    }
    
    sdkLogger.info('🔧 Initializing ZkCaptcha...');
    
    try {
      if (this.artifactUrl) {
        sdkLogger.info(`📥 Loading artifact from ${this.artifactUrl}`);
        await proverService.loadArtifact(this.artifactUrl);
      } else {
        sdkLogger.info('📦 Using embedded circuit artifact');
        await proverService.initialize(circuitArtifact);
      }
      
      this.initialized = true;
      sdkLogger.info('✅ ZkCaptcha initialized successfully');
    } catch (error) {
      sdkLogger.error('❌ Failed to initialize prover with ZK:', (error as Error).message);
      this.initialized = false;
      throw error;
    }
  }

  async getChallenge(siteId?: string): Promise<Challenge> {
    const targetSiteId = siteId || this.siteId;
    sdkLogger.info('🎯 Fetching challenge...', { siteId: targetSiteId });
    
    try {
      const response = await this.client.post<Challenge>('/api/challenge', {
        siteId: targetSiteId,
      });
      
      this.currentChallenge = response.data;
      
      sdkLogger.info('✅ Challenge received', {
        challengeId: response.data.challengeId,
        difficulty: response.data.difficulty,
        expiresAt: response.data.expiresAt,
      });
      
      return response.data;
    } catch (error) {
      sdkLogger.error('❌ Failed to fetch challenge:', (error as Error).message);
      throw error;
    }
  }

  async generateProof(
    challenge: Challenge,
    options?: GenerateProofOptions
  ): Promise<Proof> {
    const startTime = Date.now();
    
    sdkLogger.info('═══════════════════════════════════════════════════');
    sdkLogger.info('🔐 START: Proof generation flow');
    sdkLogger.info('Challenge:', {
      challengeId: challenge.challengeId,
      difficulty: challenge.difficulty,
      nonceLength: challenge.nonce.length,
    });

    const secret = this.generateSecretArray();
    const nonce = this.hexToArray(challenge.nonce);
    const difficulty = challenge.difficulty;
    const timestamp = Math.floor(Date.now() / 1000);

    options?.onProgress?.(10);
    sdkLogger.progress(10, 'Preparing inputs');

    let proofData: string;
    let publicInputs: string[];

    sdkLogger.info('Checking prover status:', {
      initialized: proverService.isInitialized(),
      hasCircuit: proverService.hasCircuit(),
    });

    if (proverService.isInitialized() && proverService.hasCircuit()) {
      try {
        options?.onProgress?.(30);
        sdkLogger.progress(30, 'Loading WASM modules');
        
        proofLogger.info('Generating real ZK proof...');
        
        const proofOutput = await proverService.generateProof({
          secret,
          nonce,
          difficulty,
          timestamp,
        });

        options?.onProgress?.(80);
        sdkLogger.progress(80, 'Encoding proof');

        proofData = JSON.stringify({ ZK: proofOutput.proof });
        publicInputs = proofOutput.publicInputs;
        
        sdkLogger.info('✅ Real ZK proof generated');
      } catch (error) {
        proofLogger.error('❌ ZK proof generation failed:', (error as Error).message);
        throw error;
      }
    } else {
      const error = new Error('Prover is not initialized or circuit is not loaded.');
      proofLogger.error(error.message);
      throw error;
    }

    options?.onProgress?.(100);
    sdkLogger.progress(100, 'Complete');

    const duration = Date.now() - startTime;
    sdkLogger.info('🔐 END: Proof generation complete', {
      proofSize: proofData.length,
      publicInputsCount: publicInputs.length,
      duration: `${duration}ms`,
      isMock: proofData.includes('mock'),
    });
    sdkLogger.info('═══════════════════════════════════════════════════');

    return {
      proofData,
      publicInputs,
    };
  }

  async verify(challengeId: string, proof: Proof): Promise<VerificationResult> {
    sdkLogger.info('📤 Submitting proof for verification...', { challengeId });
    
    try {
      const response = await this.client.post<VerificationResult>('/api/verify', {
        challengeId,
        proof,
        siteId: this.siteId,
      });
      
      sdkLogger.info('✅ Verification successful', {
        verificationId: response.data.verificationId,
        method: response.data._meta?.verificationMethod,
        fallbackUsed: response.data._meta?.fallbackUsed,
        txHash: response.data._meta?.txHash,
        txUrl: response.data._meta?.txUrl || response.data._meta?.explorerUrl,
      });
      
      return response.data;
    } catch (error) {
      sdkLogger.error('❌ Verification failed:', (error as Error).message);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    sdkLogger.info('🧹 Destroying ZkCaptcha instance');
    await proverService.destroy();
    this.currentChallenge = null;
    this.initialized = false;
    sdkLogger.info('✅ ZkCaptcha destroyed');
  }

  getCurrentChallenge(): Challenge | null {
    return this.currentChallenge;
  }

  private generateSecretArray(): number[] {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array);
  }

  private hexToArray(hex: string): number[] {
    const matches = hex.match(/.{1,2}/g) || [];
    return matches.map(byte => parseInt(byte, 16));
  }

  private encodeFieldHex(value: number | bigint): string {
    const hex = BigInt(value).toString(16).padStart(64, '0');
    return `0x${hex}`;
  }
}

export default ZkCaptcha;
