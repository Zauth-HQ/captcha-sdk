// @ts-nocheck
/* eslint-disable @typescript-eslint/no-invalid-tslint-comment */

export interface ProofInputs {
  secret: number[];
  nonce: number[];
  difficulty: number;
  timestamp: number;
}

export interface ProofOutput {
  proof: string;
  publicInputs: string[];
}

export interface CircuitArtifact {
  bytecode: string;
  abi: {
    parameters: Array<{
      name: string;
      type: { kind: string; length?: number };
      visibility: string;
    }>;
  };
}

export class ProverService {
  private static instance: ProverService;
  private initialized: boolean = false;
  private acir: any = null;

  private constructor() {}

  static getInstance(): ProverService {
    if (!ProverService.instance) {
      ProverService.instance = new ProverService();
    }
    return ProverService.instance;
  }

  async initialize(artifactJson?: CircuitArtifact): Promise<void> {
    if (this.initialized) return;

    try {
      const noirWasm = await import('@noir-lang/noir_wasm');
      const aztecBackend = await import('@noir-lang/aztec_backend');

      await noirWasm.initNoirWasm();
      await (aztecBackend as any).default();

      if (artifactJson) {
        this.acir = await this.loadCircuitFromJson(artifactJson);
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize prover:', error);
      throw error;
    }
  }

  private async loadCircuitFromJson(artifact: CircuitArtifact): Promise<any> {
    try {
      const noirWasm = await import('@noir-lang/noir_wasm');
      const bytecode = Buffer.from(artifact.bytecode, 'base64');
      const acirBytes = new Uint8Array(bytecode);
      
      return noirWasm.acir_read_bytes(acirBytes);
    } catch (error) {
      console.error('Failed to load circuit:', error);
      throw error;
    }
  }

  async loadArtifact(artifactUrl: string): Promise<void> {
    try {
      const response = await fetch(artifactUrl);
      const artifact = await response.json() as CircuitArtifact;
      this.acir = await this.loadCircuitFromJson(artifact);
    } catch (error) {
      console.error('Failed to load artifact from URL:', error);
      throw error;
    }
  }

  private computeExpectedHash(secret: number[], nonce: number[], difficulty: number): number[] {
    const { blake2s } = require('blakejs');
    
    const input: Uint8Array = new Uint8Array(68);
    for (let i = 0; i < 32; i++) {
      input[i] = secret[i];
    }
    for (let i = 0; i < 32; i++) {
      input[32 + i] = nonce[i];
    }
    input[64] = ((difficulty >> 24) & 0xff);
    input[65] = ((difficulty >> 16) & 0xff);
    input[66] = ((difficulty >> 8) & 0xff);
    input[67] = (difficulty & 0xff);
    
    const hashBytes = blake2s(input);
    return Array.from(hashBytes);
  }

  async generateProof(inputs: ProofInputs): Promise<ProofOutput> {
    if (!this.initialized) {
      throw new Error('Prover not initialized. Call initialize() first.');
    }

    if (!this.acir) {
      throw new Error('Circuit not loaded. Provide artifactJson or call loadArtifact().');
    }

    try {
      const barretenberg = await import('@noir-lang/barretenberg');

      // Compute expected hash - this is what the circuit expects
      const expectedHash = this.computeExpectedHash(inputs.secret, inputs.nonce, inputs.difficulty);

      const [prover] = await barretenberg.setup_generic_prover_and_verifier(this.acir);

      const witness: Record<string, any> = {
        secret: inputs.secret,
        nonce: inputs.nonce,
        difficulty: inputs.difficulty,
        timestamp: inputs.timestamp,
        hash_output: expectedHash  // This must match what the circuit computes!
      };

      const proofBuffer: Uint8Array = await barretenberg.create_proof(prover, this.acir, witness);

      const proofBase64 = this.uint8ArrayToBase64(proofBuffer);

      const publicInputs = [
        expectedHash.map(n => n.toString(16).padStart(2, '0')).join(''),
        inputs.difficulty.toString(),
      ];

      return {
        proof: proofBase64,
        publicInputs,
      };
    } catch (error) {
      console.error('Failed to generate proof:', error);
      throw error;
    }
  }

  private uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  hasCircuit(): boolean {
    return this.acir !== null;
  }

  async destroy(): Promise<void> {
    this.initialized = false;
    this.acir = null;
  }
}

export const proverService = ProverService.getInstance();
export default proverService;