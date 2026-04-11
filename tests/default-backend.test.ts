import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { DEFAULT_BACKEND_URL, ZkCaptcha } from '@/core';

describe('Default backend integration', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    mockAxios = new MockAdapter(axios);
  });

  afterEach(() => {
    mockAxios.restore();
    jest.clearAllMocks();
  });

  it('uses the production backend when backendUrl is omitted', async () => {
    const captcha = new ZkCaptcha();

    mockAxios.onPost(`${DEFAULT_BACKEND_URL}/api/challenge`).reply(200, {
      challengeId: 'default-backend-challenge',
      nonce: '0x' + 'ab'.repeat(32),
      difficulty: 10,
      expiresAt: new Date(Date.now() + 300000).toISOString(),
    });

    const challenge = await captcha.getChallenge();

    expect(challenge.challengeId).toBe('default-backend-challenge');
  });
});
