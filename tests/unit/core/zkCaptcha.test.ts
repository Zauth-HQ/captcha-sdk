import { ZkCaptcha } from '../../../src/core';
import { DEFAULT_BACKEND_URL } from '../../../src/config';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

// Mock the prover service
jest.mock('../../../src/core/prover', () => ({
  proverService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    isInitialized: jest.fn().mockReturnValue(true),
    hasCircuit: jest.fn().mockReturnValue(true),
    generateProof: jest.fn().mockResolvedValue({
      proof: 'mock-proof-base64',
      publicInputs: ['mock-hash-hex', '10'],
    }),
  },
  CircuitArtifact: jest.fn(),
}));

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  sdkLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    network: jest.fn(),
    progress: jest.fn(),
    fallback: jest.fn(),
  },
  proofLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ZkCaptcha Core', () => {
  let zkCaptcha: ZkCaptcha;
  let mockAxios: MockAdapter;
  const backendUrl = 'http://localhost:3000';

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios = new MockAdapter(axios);
    zkCaptcha = new ZkCaptcha({
      backendUrl,
      siteId: 'test-site',
    });
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('Initialization', () => {
    it('should create instance with correct config', () => {
      expect(zkCaptcha).toBeDefined();
    });

    it('should create instance without siteId', () => {
      const captcha = new ZkCaptcha({ backendUrl });
      expect(captcha).toBeDefined();
    });

    it('should create instance with default backend url when omitted', () => {
      const captcha = new ZkCaptcha();
      expect(captcha).toBeDefined();

      mockAxios.onPost(`${DEFAULT_BACKEND_URL}/api/challenge`).reply(200, {
        challengeId: 'default-challenge',
        nonce: '0x' + '01'.repeat(32),
        difficulty: 10,
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      });

      return expect(captcha.getChallenge()).resolves.toMatchObject({
        challengeId: 'default-challenge',
      });
    });
  });

  describe('Challenge Fetching', () => {
    it('should fetch challenge successfully', async () => {
      const mockChallenge = {
        challengeId: 'challenge-123',
        nonce: '0x' + '01'.repeat(32),
        difficulty: 10,
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      };

      mockAxios.onPost(`${backendUrl}/api/challenge`).reply(200, mockChallenge);

      const challenge = await zkCaptcha.getChallenge();

      expect(challenge).toBeDefined();
      expect(challenge.challengeId).toBe(mockChallenge.challengeId);
      expect(challenge.difficulty).toBe(mockChallenge.difficulty);
    });

    it('should handle challenge fetch error', async () => {
      mockAxios.onPost(`${backendUrl}/api/challenge`).reply(500, {
        error: 'Internal server error',
      });

      await expect(zkCaptcha.getChallenge()).rejects.toThrow();
    });

    it('should handle network error', async () => {
      mockAxios.onPost(`${backendUrl}/api/challenge`).networkError();

      await expect(zkCaptcha.getChallenge()).rejects.toThrow();
    });
  });

  describe('Proof Generation', () => {
    it('should generate proof successfully', async () => {
      const mockChallenge = {
        challengeId: 'challenge-123',
        nonce: '0x' + '01'.repeat(32),
        difficulty: 10,
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      };

      const proof = await zkCaptcha.generateProof(mockChallenge);

      expect(proof).toBeDefined();
      expect(proof.proofData).toBe('mock-proof-base64');
      expect(proof.publicInputs).toHaveLength(2);
    });

    it('should generate mock proof if prover fails', async () => {
      const mockChallenge = {
        challengeId: 'challenge-123',
        nonce: '0x' + '01'.repeat(32),
        difficulty: 10,
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      };

      const { proverService } = require('../../../src/core/prover');
      proverService.generateProof.mockRejectedValue(new Error('WASM failed'));

      const proof = await zkCaptcha.generateProof(mockChallenge);

      expect(proof).toBeDefined();
      expect(proof.proofData).toBeDefined();
    });
  });

  describe('Verification', () => {
    it('should verify proof successfully', async () => {
      const challengeId = 'challenge-123';
      const proof = {
        proofData: 'mock-proof-base64',
        publicInputs: ['mock-hash-hex', '10'],
      };

      mockAxios.onPost(`${backendUrl}/api/verify`).reply(200, {
        success: true,
        verificationId: 'verify-123',
        token: 'jwt-token-123',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      });

      const result = await zkCaptcha.verify(challengeId, proof);

      expect(result.success).toBe(true);
      expect(result.token).toBe('jwt-token-123');
    });

    it('should handle verification failure', async () => {
      const challengeId = 'challenge-123';
      const proof = {
        proofData: 'mock-proof-base64',
        publicInputs: ['mock-hash-hex', '10'],
      };

      mockAxios.onPost(`${backendUrl}/api/verify`).reply(400, {
        error: 'Invalid proof',
      });

      await expect(zkCaptcha.verify(challengeId, proof)).rejects.toThrow();
    });
  });

  describe('Full Flow', () => {
    it('should complete challenge -> proof -> verify flow', async () => {
      const mockChallenge = {
        challengeId: 'challenge-123',
        nonce: '0x' + '01'.repeat(32),
        difficulty: 10,
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      };

      mockAxios
        .onPost(`${backendUrl}/api/challenge`)
        .reply(200, mockChallenge)
        .onPost(`${backendUrl}/api/verify`)
        .reply(200, {
          success: true,
          verificationId: 'verify-123',
          token: 'jwt-token-123',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        });

      const challenge = await zkCaptcha.getChallenge();
      expect(challenge.challengeId).toBe(mockChallenge.challengeId);

      const proof = await zkCaptcha.generateProof(challenge);
      expect(proof).toBeDefined();
      expect(proof.proofData).toBeDefined();
      expect(proof.publicInputs).toBeDefined();

      const result = await zkCaptcha.verify(challenge.challengeId, proof);
      expect(result.success).toBe(true);
      expect(result.token).toBe('jwt-token-123');
    });
  });
});
