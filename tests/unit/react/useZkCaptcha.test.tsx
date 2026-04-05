import { renderHook, act, waitFor } from '@testing-library/react';
import { useZkCaptcha } from '@/react';

// Mock ZkCaptcha class
const mockGetChallenge = jest.fn();
const mockGenerateProof = jest.fn();
const mockVerify = jest.fn();
const mockInitialize = jest.fn();
const mockDestroy = jest.fn();

jest.mock('@/core', () => ({
  ZkCaptcha: jest.fn().mockImplementation(() => ({
    initialize: mockInitialize,
    destroy: mockDestroy,
    getChallenge: mockGetChallenge,
    generateProof: mockGenerateProof,
    verify: mockVerify,
  })),
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  sdkLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('useZkCaptcha', () => {
  const defaultOptions = {
    backendUrl: 'http://localhost:3000',
    siteId: 'test-site',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockInitialize.mockResolvedValue(undefined);
    mockDestroy.mockResolvedValue(undefined);
  });

  describe('Initialization', () => {
    it('should initialize with correct config', () => {
      const { result } = renderHook(() => useZkCaptcha(defaultOptions));

      expect(result.current.status).toBe('idle');
      expect(result.current.token).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should auto-fetch challenge when autoChallenge is true', async () => {
      const mockChallenge = {
        challengeId: 'challenge-123',
        nonce: '0x' + '01'.repeat(32),
        difficulty: 10,
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      };

      mockGetChallenge.mockResolvedValue(mockChallenge);

      const { result } = renderHook(() =>
        useZkCaptcha({ ...defaultOptions, autoChallenge: true })
      );

      // Wait for the effect to run
      await waitFor(() => {
        expect(mockGetChallenge).toHaveBeenCalled();
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

      mockGetChallenge.mockResolvedValue(mockChallenge);

      const { result } = renderHook(() => useZkCaptcha(defaultOptions));

      await act(async () => {
        // Trigger challenge fetch through the hook's internal mechanism
        // Note: The actual method might need to be exposed
      });

      // Wait for state updates
      await waitFor(() => {
        expect(result.current.challenge).toEqual(mockChallenge);
      });
    });

    it('should handle challenge fetch error', async () => {
      mockGetChallenge.mockRejectedValue(new Error('Network error'));

      const onError = jest.fn();
      const { result } = renderHook(() =>
        useZkCaptcha({ ...defaultOptions, onError })
      );

      // The error should be caught and status set to error
      await waitFor(() => {
        expect(result.current.status).toBe('error');
        expect(result.current.error).toBeDefined();
      });
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

      const mockProof = {
        proofData: 'mock-proof',
        publicInputs: ['mock-hash', '10'],
      };

      mockGetChallenge.mockResolvedValue(mockChallenge);
      mockGenerateProof.mockResolvedValue(mockProof);

      const { result } = renderHook(() => useZkCaptcha(defaultOptions));

      await act(async () => {
        await result.current.generateProof();
      });

      expect(mockGenerateProof).toHaveBeenCalled();
    });

    it('should handle proof generation error', async () => {
      mockGenerateProof.mockRejectedValue(new Error('WASM failed'));

      const { result } = renderHook(() => useZkCaptcha(defaultOptions));

      await act(async () => {
        await result.current.generateProof().catch(() => {});
      });

      expect(result.current.status).toBe('error');
    });
  });

  describe('Verification', () => {
    it('should verify successfully and call onSuccess', async () => {
      const onSuccess = jest.fn();
      const mockChallenge = {
        challengeId: 'challenge-123',
        nonce: '0x' + '01'.repeat(32),
        difficulty: 10,
        expiresAt: new Date(Date.now() + 300000).toISOString(),
      };

      const mockProof = {
        proofData: 'mock-proof',
        publicInputs: ['mock-hash', '10'],
      };

      const mockResult = {
        success: true,
        token: 'jwt-token-123',
        verificationId: 'verify-123',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };

      mockGetChallenge.mockResolvedValue(mockChallenge);
      mockGenerateProof.mockResolvedValue(mockProof);
      mockVerify.mockResolvedValue(mockResult);

      const { result } = renderHook(() =>
        useZkCaptcha({ ...defaultOptions, onSuccess })
      );

      await act(async () => {
        await result.current.generateProof();
      });

      expect(result.current.token).toBe('jwt-token-123');
      expect(onSuccess).toHaveBeenCalledWith('jwt-token-123');
    });
  });

  describe('Reset', () => {
    it('should reset state', async () => {
      const { result } = renderHook(() => useZkCaptcha(defaultOptions));

      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.token).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.progress).toBe(0);
    });
  });
});
