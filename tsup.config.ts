import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      core: 'src/core/index.ts',
      react: 'src/react/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    external: ['react', '@noir-lang/*', '@aztec/bb.js', 'axios', 'blakejs', 'pako'],
    noExternal: [/\.\/artifacts\//],
  },
]);
