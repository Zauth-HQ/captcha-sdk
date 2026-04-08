# @zauth/captcha-sdk

[![npm version](https://badge.fury.io/js/@zauth%2Fcaptcha-sdk.svg)](https://www.npmjs.com/package/@zauth/captcha-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

> Zero-knowledge proof based CAPTCHA SDK for the modern web. Privacy-preserving, bot-resistant authentication without compromising user experience.

## Features

- **Zero-Knowledge Proofs**: Uses advanced ZK cryptography to verify humanity without exposing sensitive data
- **Privacy-First**: No tracking, no fingerprinting, no personal data collection
- **Easy Integration**: Simple API for vanilla JavaScript and React
- **Bot-Resistant**: Computational puzzles that are easy for humans, hard for bots
- **TypeScript Support**: Full TypeScript definitions included
- **Lightweight**: Minimal bundle size with tree-shaking support

## Installation

```bash
npm install @zauth/captcha-sdk
# or
yarn add @zauth/captcha-sdk
# or
pnpm add @zauth/captcha-sdk
```

## Quick Start

### Vanilla JavaScript

```typescript
import { ZkCaptcha } from '@zauth/captcha-sdk';

// Initialize the SDK
const captcha = new ZkCaptcha({
  backendUrl: 'https://your-backend.com',
  siteId: 'your-site-id',
});

// Initialize (loads ZK circuits)
await captcha.initialize();

// Get a challenge
const challenge = await captcha.getChallenge();

// Generate proof
const proof = await captcha.generateProof(challenge);

// Verify
const result = await captcha.verify(challenge.challengeId, proof);

if (result.success) {
  console.log('CAPTCHA verified! Token:', result.token);
}
```

### React Hook

```tsx
import { useZkCaptcha } from '@zauth/captcha-sdk/react';

function CaptchaComponent() {
  const { 
    generateProof, 
    fetchChallenge, 
    status, 
    token, 
    error, 
    progress 
  } = useZkCaptcha({
    backendUrl: 'https://your-backend.com',
    siteId: 'your-site-id',
    onSuccess: (token) => {
      console.log('Verification successful!', token);
    },
    onError: (err) => {
      console.error('Verification failed:', err);
    },
  });

  return (
    <div>
      <button 
        onClick={generateProof}
        disabled={status === 'processing'}
      >
        {status === 'processing' ? `Verifying (${progress}%)...` : 'Verify CAPTCHA'}
      </button>
      
      {status === 'success' && <p>✅ Verified!</p>}
      {status === 'error' && <p>❌ Error: {error?.message}</p>}
    </div>
  );
}
```

## API Reference

### ZkCaptcha Class

#### Constructor

```typescript
new ZkCaptcha(config: ZkCaptchaConfig)
```

**Config Options:**

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `backendUrl` | `string` | ✅ | URL of your ZAuth backend server |
| `siteId` | `string` | ❌ | Unique identifier for your site |
| `timeout` | `number` | ❌ | Request timeout in milliseconds (default: 30000) |
| `artifactUrl` | `string` | ❌ | URL to load ZK circuit artifacts from |

#### Methods

##### `initialize(): Promise<void>`

Initializes the SDK and loads ZK circuits. Must be called before other operations.

##### `getChallenge(siteId?: string): Promise<Challenge>`

Fetches a new CAPTCHA challenge from the backend.

##### `generateProof(challenge: Challenge, options?: GenerateProofOptions): Promise<Proof>`

Generates a zero-knowledge proof for the given challenge.

**Options:**
- `silent?: boolean` - Suppress console output
- `onProgress?: (progress: number) => void` - Progress callback (0-100)

##### `verify(challengeId: string, proof: Proof): Promise<VerificationResult>`

Submits the proof to the backend for verification.

##### `destroy(): Promise<void>`

Cleans up resources. Call this when the SDK is no longer needed.

### React Hook

#### `useZkCaptcha(options: UseZkCaptchaOptions): UseZkCaptchaReturn`

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `backendUrl` | `string` | Backend server URL |
| `siteId` | `string` | Site identifier |
| `onSuccess` | `(token: string) => void` | Callback on successful verification |
| `onError` | `(error: Error) => void` | Callback on error |
| `autoChallenge` | `boolean` | Automatically fetch challenge on mount |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `generateProof` | `() => Promise<void>` | Trigger proof generation |
| `fetchChallenge` | `() => Promise<void>` | Fetch a new challenge |
| `status` | `CaptchaStatus` | Current status: 'idle', 'loading', 'processing', 'success', 'error' |
| `token` | `string \| null` | Verification token (on success) |
| `error` | `Error \| null` | Error object (on failure) |
| `challenge` | `Challenge \| null` | Current challenge data |
| `progress` | `number` | Progress percentage (0-100) |
| `reset` | `() => void` | Reset the state |

## Configuration

### Setting up your backend

The SDK requires a ZAuth-compatible backend. Your backend must implement:

1. **POST /api/challenge** - Returns a challenge
   ```json
   {
     "challengeId": "uuid",
     "nonce": "hex-string",
     "difficulty": 4,
     "expiresAt": "2024-01-01T00:00:00Z"
   }
   ```

2. **POST /api/verify** - Verifies a proof
   ```json
   {
     "challengeId": "uuid",
     "proof": { "proofData": "...", "publicInputs": [...] },
     "siteId": "your-site-id"
   }
   ```

### Environment Variables

For React apps, set these environment variables:

```bash
REACT_APP_ZAUTH_BACKEND_URL=https://your-backend.com
REACT_APP_ZAUTH_SITE_ID=your-site-id
```

## Advanced Usage

### Custom Progress Tracking

```typescript
const proof = await captcha.generateProof(challenge, {
  onProgress: (progress) => {
    console.log(`Proof generation: ${progress}%`);
  },
});
```

### Loading Artifacts from Custom URL

```typescript
const captcha = new ZkCaptcha({
  backendUrl: 'https://your-backend.com',
  artifactUrl: 'https://your-cdn.com/circuit-artifact.json',
});
```

### Manual Artifact Loading

```typescript
import { circuitArtifact } from './your-artifact';

const captcha = new ZkCaptcha({ backendUrl: '...' });
captcha.setArtifactData(circuitArtifact);
await captcha.initialize();
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires `crypto.getRandomValues` API support.

## TypeScript

Full TypeScript definitions are included. Import types as needed:

```typescript
import type { 
  Challenge, 
  Proof, 
  VerificationResult, 
  ZkCaptchaConfig 
} from '@zauth/captcha-sdk';
```

## License

MIT © ZAuth Team

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## Support

- 📧 Email: support@zauth.co
- 💬 Discord: [Join our community](https://discord.gg/zauth)
- 🐛 Issues: [GitHub Issues](https://github.com/Zauth-HQ/captcha-sdk/issues)

---

Made with 🔒 by Zauth Team
