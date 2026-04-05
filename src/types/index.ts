export interface Challenge {
  challengeId: string;
  nonce: string;
  difficulty: number;
  expiresAt: string;
}

export interface Proof {
  proofData: string;
  publicInputs: string[];
}

export interface VerificationResult {
  success: boolean;
  verificationId: string;
  token: string;
  expiresAt: string;
}

export interface ZkCaptchaConfig {
  backendUrl: string;
  siteId?: string;
  timeout?: number;
  artifactUrl?: string;
}

export interface GenerateProofOptions {
  silent?: boolean;
  onProgress?: (progress: number) => void;
}

export type CaptchaStatus = 'idle' | 'loading' | 'processing' | 'success' | 'error';

export interface UseZkCaptchaOptions {
  backendUrl: string;
  siteId?: string;
  onSuccess?: (token: string) => void;
  onError?: (error: Error) => void;
  autoChallenge?: boolean;
}

export interface UseZkCaptchaReturn {
  generateProof: () => Promise<void>;
  status: CaptchaStatus;
  token: string | null;
  error: Error | null;
  challenge: Challenge | null;
  progress: number;
  reset: () => void;
}