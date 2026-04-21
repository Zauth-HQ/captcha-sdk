import { useState, useCallback, useRef, useEffect } from 'react';
import { ZkCaptcha, DEFAULT_BACKEND_URL } from '../core';
import type {
  Challenge,
  UseZkCaptchaOptions,
  UseZkCaptchaReturn,
  CaptchaStatus,
  VerificationResult,
} from '../types';

export function useZkCaptcha(options: UseZkCaptchaOptions = {}): UseZkCaptchaReturn {
  const {
    backendUrl = DEFAULT_BACKEND_URL,
    siteId,
    timeout,
    onSuccess,
    onError,
    autoChallenge = false,
  } = options;

  const captchaRef = useRef<ZkCaptcha | null>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const [status, setStatus] = useState<CaptchaStatus>('idle');
  const [token, setToken] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    captchaRef.current = new ZkCaptcha({ backendUrl, siteId, timeout });
    initPromiseRef.current = captchaRef.current.initialize();

    return () => {
      initPromiseRef.current = null;
      captchaRef.current?.destroy();
    };
  }, [backendUrl, siteId, timeout]);

  useEffect(() => {
    if (autoChallenge && captchaRef.current && status === 'idle') {
      fetchChallenge();
    }
  }, [autoChallenge, status]);

  const fetchChallenge = useCallback(async () => {
    if (!captchaRef.current) return;

    try {
      setStatus('loading');
      setError(null);
      const newChallenge = await captchaRef.current.getChallenge();
      setChallenge(newChallenge);
      setStatus('idle');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch challenge');
      setError(error);
      setStatus('error');
      onError?.(error);
    }
  }, [onError]);

  const generateProof = useCallback(async () => {
    const captcha = captchaRef.current;
    if (!captcha) {
      const err = new Error('SDK not initialized');
      setError(err);
      setStatus('error');
      onError?.(err);
      return;
    }

    try {
      setStatus('processing');
      setError(null);
      setProgress(0);

      if (initPromiseRef.current) {
        await initPromiseRef.current;
      }

      const currentChallenge = captcha.getCurrentChallenge();
      if (!currentChallenge) {
        await fetchChallenge();
      }

      const finalChallenge = captcha.getCurrentChallenge();
      if (!finalChallenge) {
        throw new Error('No challenge available');
      }

      setProgress(30);

      const proof = await captcha.generateProof(finalChallenge, {
        onProgress: (p) => setProgress(30 + Math.floor(p * 0.5)),
      });

      setProgress(80);

      const result: VerificationResult = await captcha.verify(
        finalChallenge.challengeId,
        proof
      );

      setProgress(100);
      setResult(result);
      setToken(result.token);
      setStatus('success');
      setChallenge(null);
      
      onSuccess?.(result.token);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Verification failed');
      setError(error);
      setStatus('error');
      onError?.(error);
    }
  }, [fetchChallenge, onSuccess, onError]);

  const reset = useCallback(() => {
    setStatus('idle');
    setToken(null);
    setResult(null);
    setError(null);
    setChallenge(null);
    setProgress(0);
  }, []);

  return {
    generateProof,
    fetchChallenge,
    status,
    token,
    result,
    error,
    challenge,
    progress,
    reset,
  };
}

export { DEFAULT_BACKEND_URL } from '../core';

export default useZkCaptcha;
