import { defineConfig } from 'tsdown';

export default defineConfig({
	dts: true,
	entry: {
		bin: 'src/type-inspector.ts',
		index: 'src/index.ts',
	},
	minify: true,
	outExtensions: () => ({
		dts: '.d.ts',
		js: '.js',
	}),
	sourcemap: true,
	unbundle: true,
});
