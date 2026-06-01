import { defineConfig } from 'tsdown';

export default defineConfig({
	dts: true,
	entry: ['src/index.ts', 'src/simple-suite.ts', 'src/di.ts'],
	minify: true,
	outExtensions: () => ({
		dts: '.d.ts',
		js: '.js',
	}),
	sourcemap: true,
	unbundle: true,
});
