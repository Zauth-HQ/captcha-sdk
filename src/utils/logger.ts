// SDK Logger for development testing
const isDebugEnabled = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('ZAUTH_DEBUG') === 'true' || 
           localStorage.getItem('DEBUG_ZK') === 'true';
  }
  return process.env.DEBUG_ZK === 'true' || process.env.DEBUG === '*';
};

const getLogLevel = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('ZAUTH_LOG_LEVEL') || 'info';
  }
  return process.env.LOG_LEVEL || 'info';
};

const shouldLog = (level: string) => {
  const levels = ['error', 'warn', 'info', 'debug', 'verbose'];
  const currentLevel = getLogLevel();
  return levels.indexOf(level) <= levels.indexOf(currentLevel);
};

const formatTimestamp = () => {
  return new Date().toISOString().split('T')[1].split('.')[0];
};

const createLogger = (component: string) => ({
  error: (message: string, ...args: unknown[]) => {
    if (isDebugEnabled() && shouldLog('error')) {
      console.error(`[${formatTimestamp()}] ❌ [${component}] ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: unknown[]) => {
    if (isDebugEnabled() && shouldLog('warn')) {
      console.warn(`[${formatTimestamp()}] ⚠️  [${component}] ${message}`, ...args);
    }
  },
  
  info: (message: string, ...args: unknown[]) => {
    if (isDebugEnabled() && shouldLog('info')) {
      console.log(`[${formatTimestamp()}] ℹ️  [${component}] ${message}`, ...args);
    }
  },
  
  debug: (message: string, ...args: unknown[]) => {
    if (isDebugEnabled() && shouldLog('debug')) {
      console.log(`[${formatTimestamp()}] 🔍 [${component}] ${message}`, ...args);
    }
  },
  
  verbose: (message: string, ...args: unknown[]) => {
    if (isDebugEnabled() && shouldLog('verbose')) {
      console.log(`[${formatTimestamp()}] 📋 [${component}] ${message}`, ...args);
    }
  },
  
  // Special loggers
  circuit: (message: string, ...args: unknown[]) => {
    if (isDebugEnabled()) {
      console.log(`[${formatTimestamp()}] ⚡ [Circuit] ${message}`, ...args);
    }
  },
  
  proof: (message: string, ...args: unknown[]) => {
    if (isDebugEnabled()) {
      console.log(`[${formatTimestamp()}] 🔐 [Proof] ${message}`, ...args);
    }
  },
  
  fallback: (primary: string, fallback: string, reason: string) => {
    if (isDebugEnabled()) {
      console.warn(`[${formatTimestamp()}] 🔄 [FALLBACK] ${primary} → ${fallback}: ${reason}`);
    }
  },
  
  network: (method: string, url: string, status: number, duration: number) => {
    if (isDebugEnabled()) {
      const emoji = status >= 200 && status < 300 ? '✅' : '❌';
      console.log(`[${formatTimestamp()}] 🌐 [Network] ${emoji} ${method} ${url} (${status}) - ${duration}ms`);
    }
  },
  
  progress: (percent: number, message: string) => {
    if (isDebugEnabled()) {
      const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
      console.log(`[${formatTimestamp()}] 📊 [Progress] [${bar}] ${percent}% - ${message}`);
    }
  },
  
  test: (message: string, ...args: unknown[]) => {
    console.log(`[${formatTimestamp()}] 🧪 [TEST] ${message}`, ...args);
  },
});

// Component loggers
export const sdkLogger = createLogger('SDK');
export const circuitLogger = createLogger('Circuit');
export const proofLogger = createLogger('Proof');
export const wasmLogger = createLogger('WASM');

// Default export
export default sdkLogger;
