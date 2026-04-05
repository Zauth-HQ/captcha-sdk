// Type declarations for Noir packages
// Adding to global scope to avoid module augmentation issues

export {};

declare global {
  module '@noir-lang/noir_wasm' {
    export function initNoirWasm(): Promise<void>;
    export function compile(options: { entry_point: string }): { circuit: string; abi: any };
    export function acir_read_bytes(buffer: Uint8Array): any;
  }

  module '@noir-lang/aztec_backend' {
    export default function init(): Promise<void>;
  }

  module '@noir-lang/barretenberg' {
    export function create_proof(prover: any, acir: any, witness: any): Promise<Uint8Array>;
    export function setup_generic_prover_and_verifier(acir: any): Promise<[any, any]>;
  }
}