# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.3] - 2026-04-12

### Changed
- Made the production Render backend the SDK default in code while keeping `backendUrl` overrideable
- Exported a shared `DEFAULT_BACKEND_URL` constant for core and React consumers
- Updated the SDK README to show the backend as the default instead of a required config value

## [1.0.2] - 2026-04-12

### Changed
- Updated the SDK documentation and release metadata for the production Render backend at `https://zauth-captcha.onrender.com`
- Aligned the public quick-start examples with the deployed backend used by the production verification flow
- Bumped the package version for the production backend release cut

## [1.0.0] - 2024-01-15

### Added
- Initial release of @zauth/captcha-sdk
- Zero-knowledge proof based CAPTCHA verification
- Core `ZkCaptcha` class for vanilla JavaScript integration
- React hook `useZkCaptcha` for React applications
- TypeScript support with full type definitions
- Support for both CommonJS and ES modules
- Progress tracking during proof generation
- Automatic fallback to mock proofs for testing
- Network logging and debug capabilities
- Support for custom artifact URLs

### Features
- **Core SDK** (`@zauth/captcha-sdk`)
  - Challenge fetching from backend
  - ZK proof generation using Noir circuits
  - Proof verification submission
  - Configurable timeout and retry logic
  
- **React Integration** (`@zauth/captcha-sdk/react`)
  - `useZkCaptcha` hook with state management
  - Automatic challenge fetching on mount (optional)
  - Progress tracking
  - Error handling
  - Reset functionality

### Security
- Zero-knowledge proof implementation
- No tracking or fingerprinting
- Privacy-preserving verification

[Unreleased]: https://github.com/Zauth-HQ/captcha-sdk/compare/v1.0.3...HEAD
[1.0.3]: https://github.com/Zauth-HQ/captcha-sdk/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/Zauth-HQ/captcha-sdk/compare/v1.0.0...v1.0.2
[1.0.0]: https://github.com/Zauth-HQ/captcha-sdk/releases/tag/v1.0.0
