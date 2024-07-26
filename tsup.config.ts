import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
    entryPoints: ['src/index.ts'],
    outDir: 'dist',
    splitting: false,
    sourcemap: true,
    clean: true,
    format: ['cjs', 'esm'],
}));