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
    _options?: GenerateProofOptions
  ): Promise<Proof> {
    const secret = this.generateSecret();
    
    const proofData = await this.computeProof({
      secret,
      nonce: challenge.nonce,
      difficulty: challenge.difficulty,
    });

    const publicInputs = [
      challenge.nonce,
      challenge.difficulty.toString(),
      this.hashSecret(secret, challenge.nonce),
    ];

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

  private generateSecret(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private hashSecret(secret: string, nonce: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(secret + nonce);
    return this.sha256(data);
  }

  private sha256(data: Uint8Array): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data[i];
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  private async computeProof(inputs: {
    secret: string;
    nonce: string;
    difficulty: number;
  }): Promise<string> {
    const { secret, nonce, difficulty } = inputs;
    let hash = '';
    let counter = 0;

    const target = '0'.repeat(Math.floor(difficulty / 2));

    while (!hash.startsWith(target)) {
      const combined = secret + nonce + counter.toString();
      hash = this.sha256(new TextEncoder().encode(combined));
      counter++;
    }

    return this.encodeProof(secret, nonce, counter, hash);
  }

  private encodeProof(secret: string, nonce: string, counter: number, hash: string): string {
    const data = JSON.stringify({ secret, nonce, counter, hash });
    return btoa(data);
  }
}

export default ZkCaptcha;