import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
    entryPoints: ['src/index.ts'],
    outDir: 'dist',
    splitting: false,
    sourcemap: true,
    clean: true,
    format: ['cjs', 'esm'],
}));import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
});
