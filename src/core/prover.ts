import initNoirWasm, { acir_read_bytes } from '@noir-lang/noir_wasm';
import initializeAztecBackend from '@noir-lang/aztec_backend';
import { create_proof, setup_generic_prover_and_verifier } from '@noir-lang/barretenberg';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface ProofInputs {
  secret: number[];
  nonce: number[];
  difficulty: number;
  timestamp: number;
}

export interface ProofOutput {
  proof: Uint8Array;
  publicInputs: string[];
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

  async initialize(artifactsPath?: string): Promise<void> {
    if (this.initialized) return;

    try {
      await initNoirWasm();
      await initializeAztecBackend();

      if (artifactsPath) {
        this.acir = await this.loadCircuit(artifactsPath);
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize prover:', error);
      throw error;
    }
  }

  private async loadCircuit(artifactsPath: string): Promise<any> {
    try {
      const circuitPath = join(artifactsPath, 'zauth_captcha.json');
      const circuitData = JSON.parse(readFileSync(circuitPath, 'utf-8'));
      
      const bytecode = Buffer.from(circuitData.bytecode, 'base64');
      const acirBytes = new Uint8Array(bytecode);
      
      return acir_read_bytes(acirBytes);
    } catch (error) {
      console.error('Failed to load circuit:', error);
      throw error;
    }
  }

  async generateProof(inputs: ProofInputs): Promise<ProofOutput> {
    if (!this.initialized) {
      throw new Error('Prover not initialized. Call initialize() first.');
    }

    if (!this.acir) {
      throw new Error('Circuit not loaded. Provide artifactsPath in initialize().');
    }

    try {
      const [prover] = await setup_generic_prover_and_verifier(this.acir);

      const witness = {
        secret: inputs.secret,
        nonce: inputs.nonce,
        difficulty: inputs.difficulty,
        timestamp: inputs.timestamp,
        hash_output: new Array(32).fill(0)
      };

      const proof = await create_proof(prover, this.acir, witness);

      return {
        proof,
        publicInputs: [inputs.nonce.join(''), inputs.difficulty.toString()]
      };
    } catch (error) {
      console.error('Failed to generate proof:', error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const proverService = ProverService.getInstance();
export default proverService;