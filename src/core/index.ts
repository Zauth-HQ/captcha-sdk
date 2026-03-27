import axios, { AxiosInstance } from 'axios';
import type { 
  Challenge, 
  Proof, 
  VerificationResult, 
  ZkCaptchaConfig,
  GenerateProofOptions 
} from '../types';
import { proverService } from './prover';

export class ZkCaptcha {
  private client: AxiosInstance;
  private siteId?: string;
  private currentChallenge: Challenge | null = null;
  private initialized: boolean = false;
  private artifactsPath?: string;

  constructor(config: ZkCaptchaConfig) {
    this.client = axios.create({
      baseURL: config.backendUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.siteId = config.siteId;
    this.artifactsPath = config.artifactsPath;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    if (this.artifactsPath) {
      await proverService.initialize(this.artifactsPath);
    }
    
    this.initialized = true;
  }

  async getChallenge(siteId?: string): Promise<Challenge> {
    const response = await this.client.post<Challenge>('/api/challenge', {
      siteId: siteId || this.siteId,
    });
    this.currentChallenge = response.data;
    return response.data;
  }

  async generateProof(
    challenge: Challenge,
    options?: GenerateProofOptions
  ): Promise<Proof> {
    const secret = this.generateSecretArray();
    const nonce = this.hexToArray(challenge.nonce);
    const difficulty = challenge.difficulty;
    const timestamp = Math.floor(Date.now() / 1000);

    options?.onProgress?.(10);

    let proofData: string;
    let publicInputs: string[];

    if (proverService.isInitialized()) {
      try {
        options?.onProgress?.(30);
        
        const proofOutput = await proverService.generateProof({
          secret,
          nonce,
          difficulty,
          timestamp,
        });

        options?.onProgress?.(80);

        proofData = this.arrayToBase64(proofOutput.proof);
        publicInputs = proofOutput.publicInputs;
      } catch (error) {
        console.error('ZK proof generation failed, falling back to mock:', error);
        const mockProof = await this.computeMockProof({ secret, nonce, difficulty });
        proofData = mockProof.proofData;
        publicInputs = mockProof.publicInputs;
      }
    } else {
      const mockProof = await this.computeMockProof({ secret, nonce, difficulty });
      proofData = mockProof.proofData;
      publicInputs = mockProof.publicInputs;
    }

    options?.onProgress?.(100);

    return {
      proofData,
      publicInputs,
    };
  }

  async verify(challengeId: string, proof: Proof): Promise<VerificationResult> {
    const response = await this.client.post<VerificationResult>('/api/verify', {
      challengeId,
      proof,
      siteId: this.siteId,
    });
    return response.data;
  }

  async destroy(): Promise<void> {
    this.currentChallenge = null;
    this.initialized = false;
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

  private arrayToBase64(arr: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < arr.length; i++) {
      binary += String.fromCharCode(arr[i]);
    }
    return btoa(binary);
  }

  private async computeMockProof(inputs: {
    secret: number[];
    nonce: number[];
    difficulty: number;
  }): Promise<Proof> {
    const { secret, nonce, difficulty } = inputs;
    
    let hash = 0;
    let counter = 0;
    
    const target = '0'.repeat(Math.floor(difficulty / 2));
    
    do {
      const combined = [...secret, ...nonce, counter % 256];
      hash = this.simpleHash(combined);
      counter++;
    } while (hash.toString(16).padStart(16, '0').substring(0, Math.floor(difficulty / 2)) !== target);

    const proofData = this.encodeProof(secret, nonce, counter, hash);
    const publicInputs = [
      nonce.map(n => n.toString(16).padStart(2, '0')).join(''),
      difficulty.toString(),
    ];

    return { proofData, publicInputs };
  }

  private simpleHash(data: number[]): number {
    let hash = 17;
    for (let i = 0; i < data.length; i++) {
      hash = (hash * 31 + data[i]) >>> 0;
    }
    return hash;
  }

  private encodeProof(secret: number[], nonce: number[], counter: number, hash: number): string {
    const data = JSON.stringify({
      secret: secret.map(s => s.toString(16).padStart(2, '0')).join(''),
      nonce: nonce.map(n => n.toString(16).padStart(2, '0')).join(''),
      counter,
      hash: hash.toString(16),
    });
    return btoa(data);
  }
}

export default ZkCaptcha;