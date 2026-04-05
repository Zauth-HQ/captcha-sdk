/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
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

    it('should call ZkCaptcha.initialize on mount', () => {
      renderHook(() => useZkCaptcha(defaultOptions));
      expect(mockInitialize).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should reset state', () => {
      const { result } = renderHook(() => useZkCaptcha(defaultOptions));

      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.token).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.progress).toBe(0);
    });

    it('should expose required methods and state', () => {
      const { result } = renderHook(() => useZkCaptcha(defaultOptions));

      expect(result.current.generateProof).toBeDefined();
      expect(result.current.reset).toBeDefined();
      expect(result.current.status).toBeDefined();
      expect(result.current.token).toBeDefined();
      expect(result.current.error).toBeDefined();
      expect(result.current.challenge).toBeDefined();
      expect(result.current.progress).toBeDefined();
    });
  });

  describe('Callbacks', () => {
    it('should accept onSuccess callback', () => {
      const onSuccess = jest.fn();
      const { result } = renderHook(() =>
        useZkCaptcha({ ...defaultOptions, onSuccess })
      );

      expect(result.current).toBeDefined();
    });

    it('should accept onError callback', () => {
      const onError = jest.fn();
      const { result } = renderHook(() =>
        useZkCaptcha({ ...defaultOptions, onError })
      );

      expect(result.current).toBeDefined();
    });
  });
});
