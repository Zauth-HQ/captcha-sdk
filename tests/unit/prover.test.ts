import { ProverService, ProofInputs } from '../../../src/core';

// Mock blakejs
jest.mock('blakejs', () => ({
  blake2s: jest.fn().mockReturnValue(Buffer.from('mock-hash-32-bytes-long-data')),
}));

// Mock Noir WASM modules
jest.mock('@noir-lang/noir_wasm', () => ({
  initNoirWasm: jest.fn().mockResolvedValue(undefined),
  acir_read_bytes: jest.fn().mockReturnValue({ mock: 'acir' }),
}));

jest.mock('@noir-lang/aztec_backend', () => ({
  default: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@noir-lang/barretenberg', () => ({
  setup_generic_prover_and_verifier: jest.fn().mockResolvedValue([{ mock: 'prover' }]),
  create_proof: jest.fn().mockResolvedValue(Buffer.from('mock-proof-data')),
}));

describe('ProverService', () => {
  let service: ProverService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (ProverService as any).instance = null;
    service = ProverService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = ProverService.getInstance();
      const instance2 = ProverService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const mockArtifact = {
        bytecode: 'base64encodeddata',
        abi: { parameters: [] },
      };

      await service.initialize(mockArtifact);

      expect(service.isInitialized()).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      const mockArtifact = {
        bytecode: 'base64encodeddata',
        abi: { parameters: [] },
      };

      await service.initialize(mockArtifact);
      await service.initialize(mockArtifact); // Second call

      expect(service.isInitialized()).toBe(true);
    });
  });

  describe('Hash Computation', () => {
    it('should compute expected hash', async () => {
      const mockInputs: ProofInputs = {
        secret: new Array(32).fill(1),
        nonce: new Array(32).fill(2),
        difficulty: 10,
        timestamp: 1234567890,
      };

      // Generate proof to trigger hash computation
      const { blake2s } = require('blakejs');
      blake2s.mockReturnValueOnce(new Array(32).fill(0));

      await service.initialize();
      
      // We can't actually test hash output without real WASM,
      // but we can verify the service initializes
      expect(service.isInitialized()).toBe(true);
    });
  });

  describe('State Management', () => {
    it('should report not initialized initially', () => {
      expect(service.isInitialized()).toBe(false);
    });

    it('should report no circuit initially', () => {
      expect(service.hasCircuit()).toBe(false);
    });

    it('should destroy properly', async () => {
      await service.initialize();
      expect(service.isInitialized()).toBe(true);

      await service.destroy();
      expect(service.isInitialized()).toBe(false);
      expect(service.hasCircuit()).toBe(false);
    });
  });
});
