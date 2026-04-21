// @ts-nocheck
/* eslint-disable @typescript-eslint/no-invalid-tslint-comment */

import { sdkLogger, proofLogger, wasmLogger } from '../utils/logger';

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
  private noir: any = null;
  private backend: any = null;

  private constructor() {
    sdkLogger.debug('ProverService instance created');
  }

  static getInstance(): ProverService {
    if (!ProverService.instance) {
      ProverService.instance = new ProverService();
    }
    return ProverService.instance;
  }

  async initialize(artifactJson?: CircuitArtifact): Promise<void> {
    const startTime = Date.now();
    
    if (this.initialized) {
      sdkLogger.debug('Prover already initialized, skipping');
      return;
    }

    sdkLogger.info('🚀 Initializing ZK prover...');

    try {
      sdkLogger.debug('Loading Noir witness executor and bb.js prover...');
      const noirJs = await import('@noir-lang/noir_js');
      const { Noir } = noirJs as typeof import('@noir-lang/noir_js');
      await this.loadBbModule();

      sdkLogger.info('✅ Witness backend and bb.js prover loaded');

      if (artifactJson) {
        sdkLogger.debug('Loading circuit from artifact...');
        this.acir = await this.loadCircuitFromJson(artifactJson);
        await this.initializeNoirExecutor();
        await this.initializeProofBackend();
        sdkLogger.info(`✅ Circuit loaded: ${artifactJson.bytecode.length} bytes`);
      }

      this.initialized = true;
      const duration = Date.now() - startTime;
      sdkLogger.info(`✅ Prover initialized successfully (${duration}ms)`);
    } catch (error) {
      sdkLogger.error('❌ Failed to initialize prover:', (error as Error).message);
      throw error;
    }
  }

  private async loadCircuitFromJson(artifact: CircuitArtifact): Promise<any> {
    try {
      sdkLogger.debug('Using embedded ACIR artifact as-is');
      return artifact;
    } catch (error) {
      sdkLogger.error('❌ Failed to load circuit:', (error as Error).message);
      throw error;
    }
  }

  async loadArtifact(artifactUrl: string): Promise<void> {
    sdkLogger.info(`📥 Loading artifact from ${artifactUrl}...`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(artifactUrl);
      const artifact = await response.json() as CircuitArtifact;
      
      sdkLogger.debug(`Fetched ${artifact.bytecode.length} bytes`);
      
      this.acir = await this.loadCircuitFromJson(artifact);
      await this.initializeNoirExecutor();
      await this.initializeProofBackend();
      
      const duration = Date.now() - startTime;
      sdkLogger.info(`✅ Artifact loaded successfully (${duration}ms)`);
    } catch (error) {
      sdkLogger.error('❌ Failed to load artifact:', (error as Error).message);
      throw error;
    }
  }

  private computeExpectedHash(secret: number[], nonce: number[], difficulty: number): number[] {
    sdkLogger.debug('Computing expected hash...');

    // Keep this exactly aligned with circuits/src/hash.nr.
    const hashBytes = new Array<number>(32);
    const d = difficulty & 0xff;

    for (let i = 0; i < 32; i++) {
      const rot = (difficulty >> (i % 4)) & 0xff;
      hashBytes[i] = (secret[i] ^ nonce[i] ^ d ^ rot ^ i) & 0xff;
    }

    sdkLogger.verbose('Hash input prepared:', {
      secretLength: 32,
      nonceLength: 32,
      difficultyBytes: 4,
      totalInput: 64,
    });

    return hashBytes;
  }

  async generateProof(inputs: ProofInputs): Promise<ProofOutput> {
    const startTime = Date.now();
    
    proofLogger.info('🎯 START: Proof generation');
    proofLogger.debug('Input parameters:', {
      difficulty: inputs.difficulty,
      timestamp: inputs.timestamp,
      secretLength: inputs.secret.length,
      nonceLength: inputs.nonce.length,
    });

    if (!this.initialized) {
      const error = 'Prover not initialized. Call initialize() first.';
      proofLogger.error(error);
      throw new Error(error);
    }

    if (!this.acir) {
      const error = 'Circuit not loaded. Provide artifactJson or call loadArtifact().';
      proofLogger.error(error);
      throw new Error(error);
    }

    try {
      wasmLogger.info('Loading Barretenberg backend...');
      const barretenberg = await import('@noir-lang/barretenberg');

      // Compute expected hash
      proofLogger.info('Computing witness hash...');
      const expectedHash = this.computeExpectedHash(inputs.secret, inputs.nonce, inputs.difficulty);
      proofLogger.debug('Expected hash computed:', expectedHash.slice(0, 8).map(n => n.toString(16)));

      wasmLogger.info('Setting up prover...');
      const [prover] = await barretenberg.setup_generic_prover_and_verifier(this.acir);
      wasmLogger.info('✅ Prover ready');

      const witness: Record<string, any> = {
        secret: inputs.secret,
        nonce: inputs.nonce,
        difficulty: inputs.difficulty,
        timestamp: inputs.timestamp,
        hash_output: expectedHash
      };

      proofLogger.info('Generating proof...');
      wasmLogger.progress(0, 'Starting witness computation');
      
      const proofBuffer: Uint8Array = await barretenberg.create_proof(prover, this.acir, witness);
      
      wasmLogger.progress(100, 'Proof complete');
      proofLogger.info('✅ Proof generated successfully');

      const proofBase64 = this.uint8ArrayToBase64(proofBuffer);
      proofLogger.debug('Proof encoded to base64:', { length: proofBase64.length });

      const publicInputs = [
        expectedHash.map(n => n.toString(16).padStart(2, '0')).join(''),
        inputs.difficulty.toString(),
      ];

      const duration = Date.now() - startTime;
      proofLogger.info('🎯 END: Proof generation complete', {
        proofSize: proofBase64.length,
        publicInputsCount: publicInputs.length,
        duration: `${duration}ms`,
      });

      return {
        proof: proofBase64,
        publicInputs,
      };
    } catch (error) {
      proofLogger.error('❌ Failed to generate proof:', (error as Error).message);
      throw error;
    }
  }

  private uint8ArrayToHex(bytes: Uint8Array): string {
    return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  }

  private async initializeNoirExecutor(): Promise<void> {
    if (!this.acir) {
      throw new Error('Circuit not loaded.');
    }

    const noirJs = await import('@noir-lang/noir_js');
    const { Noir } = noirJs as typeof import('@noir-lang/noir_js');
    this.noir = new Noir(this.acir);
    await this.noir.init();
  }

  private async initializeProofBackend(): Promise<void> {
    if (!this.acir) {
      throw new Error('Circuit not loaded.');
    }

    const bbModule = await this.loadBbModule();
    const { UltraHonkBackend } = bbModule as typeof import('@aztec/bb.js');
    this.backend = new UltraHonkBackend(this.acir.bytecode, { threads: 1 });
  }

  private async loadBbModule(): Promise<typeof import('@aztec/bb.js')> {
    if (typeof window === 'undefined') {
      const { createRequire } = await import('node:module');
      const path = await import('node:path');
      const sdkPackageJson = path.resolve(__dirname, '..', 'package.json');
      const nodeRequire = createRequire(sdkPackageJson);
      return nodeRequire('@aztec/bb.js') as typeof import('@aztec/bb.js');
    }

    return import('@aztec/bb.js');
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  hasCircuit(): boolean {
    return this.acir !== null;
  }

  async destroy(): Promise<void> {
    sdkLogger.info('🧹 Destroying prover service');
    this.initialized = false;
    this.acir = null;
    if (this.backend) {
      await this.backend.destroy();
      this.backend = null;
    }
    this.noir = null;
    sdkLogger.info('✅ Prover destroyed');
  }
}

export const proverService = ProverService.getInstance();
export default proverService;
