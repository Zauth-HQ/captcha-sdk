import { ZkCaptcha } from '@/core';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

jest.mock('@/core/prover', () => ({
  proverService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    isInitialized: jest.fn().mockReturnValue(true),
    hasCircuit: jest.fn().mockReturnValue(true),
    generateProof: jest.fn().mockResolvedValue({
      proof: '0x' + '22'.repeat(96),
      publicInputs: ['0x' + '10'.repeat(32), '0x' + '20'.repeat(32)],
    }),
    destroy: jest.fn().mockResolvedValue(undefined),
  },
  CircuitArtifact: jest.fn(),
}));

describe('SDK Integration', () => {
  let mockAxios: MockAdapter;
  const backendUrl = 'http://localhost:3000';

  beforeEach(() => {
    mockAxios = new MockAdapter(axios);
  });

  afterEach(() => {
    mockAxios.restore();
    jest.clearAllMocks();
  });

  describe('Complete Flow', () => {
    it('should complete full challenge -> proof -> verify cycle', async () => {
      // Setup mocks
      const challenge = {
        challengeId: 'integration-challenge-123',
        nonce: '0x' + 'ab'.repeat(32),
        difficulty: 10,
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      };

      const verificationResult = {
        success: true,
        verificationId: 'verify-integration-123',
        token: 'integration-jwt-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };

      mockAxios
        .onPost(`${backendUrl}/api/challenge`)
        .reply(200, challenge)
        .onPost(`${backendUrl}/api/verify`)
        .reply(200, verificationResult);

      // Create SDK instance
      const zkCaptcha = new ZkCaptcha({
        backendUrl,
        siteId: 'integration-test',
      });

      await zkCaptcha.initialize();

      // Step 1: Get challenge
      const fetchedChallenge = await zkCaptcha.getChallenge();
      expect(fetchedChallenge.challengeId).toBe(challenge.challengeId);

      // Step 2: Generate proof
      const proof = await zkCaptcha.generateProof(fetchedChallenge);
      expect(proof).toBeDefined();
      expect(proof.proofData).toBe(JSON.stringify({ ZK: '0x' + '22'.repeat(96) }));
      expect(proof.publicInputs).toBeDefined();

      // Step 3: Verify proof
      const result = await zkCaptcha.verify(challenge.challengeId, proof);
      expect(result.success).toBe(true);
      expect(result.token).toBe(verificationResult.token);
    });

    it('should handle backend errors gracefully', async () => {
      mockAxios.onPost(`${backendUrl}/api/challenge`).reply(503, {
        error: 'Service temporarily unavailable',
      });

      const zkCaptcha = new ZkCaptcha({ backendUrl });

      await expect(zkCaptcha.getChallenge()).rejects.toThrow();
    });

    it('should handle verification failure', async () => {
      const challenge = {
        challengeId: 'fail-challenge-123',
        nonce: '0x' + 'cd'.repeat(32),
        difficulty: 10,
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      };

      mockAxios
        .onPost(`${backendUrl}/api/challenge`)
        .reply(200, challenge)
        .onPost(`${backendUrl}/api/verify`)
        .reply(400, {
          error: 'Invalid proof',
          code: 'INVALID_PROOF',
        });

      const zkCaptcha = new ZkCaptcha({ backendUrl });

      await zkCaptcha.initialize();

      const fetchedChallenge = await zkCaptcha.getChallenge();
      const proof = await zkCaptcha.generateProof(fetchedChallenge);

      await expect(
        zkCaptcha.verify(challenge.challengeId, proof)
      ).rejects.toThrow();
    });
  });

  describe('Network Resilience', () => {
    it.skip('should retry on network error (retry logic not implemented)', async () => {
      // TODO: Implement retry logic in SDK
      // This test documents expected behavior once retry is implemented
    });
  });
});
