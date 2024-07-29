import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli/cli.ts'],
  outDir: 'dist',
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
  minify: true,
  treeshake: true,
  legacyOutput: true,
  // banner: {
  //   js: "#!/usr/bin/env node",
  // },
});
