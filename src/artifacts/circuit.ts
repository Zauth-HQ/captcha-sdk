// Embedded circuit artifact - loaded from zauth_captcha.json
import artifact from './zauth_captcha.json';

export interface CircuitArtifact {
  bytecode: string;
  abi: {
    parameters: Array<{
      name: string;
      type: { kind: string; length?: number; type?: { kind: string; width?: number } };
      visibility: string;
    }>;
  };
}

export const circuitArtifact: CircuitArtifact = {
  bytecode: artifact.bytecode,
  abi: artifact.abi as CircuitArtifact['abi'],
};

export default circuitArtifact;