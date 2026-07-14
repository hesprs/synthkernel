// oxlint-disable import/no-nodejs-modules

import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, test } from 'vitest';

const executeFile = promisify(execFile);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inspectorPath = join(projectRoot, 'src/type-inspector.ts');

type InspectorResult = {
	code: number;
	stderr: string;
	stdout: string;
};

async function inspect(
	filePath: string,
	aliasName: string,
	arguments_: Array<string> = [],
): Promise<InspectorResult> {
	try {
		const { stderr, stdout } = await executeFile(
			'bun',
			[inspectorPath, filePath, aliasName, ...arguments_],
			{ cwd: projectRoot, encoding: 'utf8' },
		);
		return { code: 0, stderr, stdout };
	} catch (error) {
		const failure = error as { code?: number; stderr?: string; stdout?: string };
		return {
			code: typeof failure.code === 'number' ? failure.code : 1,
			stderr: failure.stderr ?? '',
			stdout: failure.stdout ?? '',
		};
	}
}

async function withProject(
	source: string,
	callback: (filePath: string) => Promise<void>,
	compilerOptions: Record<string, unknown> = {},
	files: Record<string, string> = {},
): Promise<void> {
	const directory = await mkdtemp(join(tmpdir(), 'synthkernel-inspector-'));
	const filePath = join(directory, 'fixture.ts');

	try {
		await writeFile(
			join(directory, 'tsconfig.json'),
			JSON.stringify({
				compilerOptions: {
					lib: ['ESNext', 'DOM'],
					module: 'ESNext',
					moduleResolution: 'bundler',
					strict: true,
					target: 'ESNext',
					...compilerOptions,
				},
				include: ['**/*.ts'],
			}),
		);
		await writeFile(filePath, `export {};\n${source}`);

		for (const [path, content] of Object.entries(files)) {
			const file = join(directory, path);
			await mkdir(dirname(file), { recursive: true });
			await writeFile(file, content);
		}

		await callback(filePath);
	} finally {
		await rm(directory, { force: true, recursive: true });
	}
}

test('resolves generic aliases while preserving configured lib containers', async () => {
	await withProject(
		[
			'type Transformer<T> = (input: T) => T;',
			'type CacheTransformer = Transformer<Map<string, Uint8Array<ArrayBuffer>>>;',
		].join('\n'),
		async (filePath) => {
			const result = await inspect(filePath, 'CacheTransformer');
			expect(result).toStrictEqual({
				code: 0,
				stderr: '',
				stdout: 'type CacheTransformer = (input: Map<string, Uint8Array<ArrayBuffer>>) => Map<string, Uint8Array<ArrayBuffer>>;\n',
			});
		},
	);
});

test('folds nested direct aliases after expanding a synthetic alias', async () => {
	await withProject(
		[
			'type Direct = { id: number };',
			'type Wrapper<T> = { value: T };',
			'type Result = Wrapper<Direct>;',
		].join('\n'),
		async (filePath) => {
			const result = await inspect(filePath, 'Result');
			expect(result.stdout).toBe('type Result = {\n    value: Direct;\n};\n');
		},
	);
});

test('unfolds helper aliases inside a generic target', async () => {
	await withProject(
		['type Wrapper<T> = { value: T };', 'type Generic<T> = Readonly<Wrapper<T>>;'].join('\n'),
		async (filePath) => {
			const result = await inspect(filePath, 'Generic');
			expect(result.stdout).toBe('type Generic<T> = {\n    readonly value: T;\n};\n');
		},
	);
});

test('preserves types declared by compilerOptions.types', async () => {
	await withProject(
		['type Wrapper<T> = { value: T };', 'type Result = Container<Wrapper<number>>;'].join('\n'),
		async (filePath) => {
			const result = await inspect(filePath, 'Result');
			expect(result.stdout).toBe('type Result = Container<{\n    value: number;\n}>;\n');
		},
		{ types: ['ambient'] },
		{
			'node_modules/@types/ambient/index.d.ts':
				'declare interface Container<T> { item: T; }\n',
		},
	);
});

test('preserves self-referential types', async () => {
	await withProject('type Recursive = string | Recursive[];', async (filePath) => {
		const result = await inspect(filePath, 'Recursive', ['--max-depth', '2']);
		expect(result.stdout).toBe('type Recursive = string | Recursive[];\n');
	});
});

test('unfolds a recursive alias once and preserves generated self references', async () => {
	await withProject(
		[
			'type Recursive<T> = { value: T; next?: Recursive<T> };',
			'type Result = Recursive<string>;',
		].join('\n'),
		async (filePath) => {
			const result = await inspect(filePath, 'Result');
			expect(result.stdout).toBe(
				'type Result = {\n    value: string;\n    next?: Recursive<string> | undefined;\n};\n',
			);
		},
	);
});

test('unfolds recursive context construction', async () => {
	const filePath = join(projectRoot, 'skill/example/index.ts');
	const result = await inspect(filePath, 'Context');
	expect(result.stdout).toContain('type Context = {');
});

test('resolves indexed access aliases without expanding the source context', async () => {
	const filePath = join(projectRoot, 'skill/example/index.ts');
	const result = await inspect(filePath, 'AllOptions');
	expect(result).toStrictEqual({
		code: 0,
		stderr: '',
		stdout:
			'type AllOptions = {\n' +
			'    logLevel: Level;\n' +
			'    maxLogs: number | undefined;\n' +
			'    appName: string;\n' +
			'    debug?: boolean | undefined;\n' +
			'    minMessageLength: number;\n' +
			'    maxMessageLength: number;\n' +
			'};\n',
	});
});

test('stops before nested expansion at max depth zero', async () => {
	await withProject(
		['type Wrapper<T> = { value: T };', 'type Result<T> = Readonly<Wrapper<T>>;'].join('\n'),
		async (filePath) => {
			const result = await inspect(filePath, 'Result', ['--max-depth=0']);
			expect(result.stdout).toBe('type Result<T> = Readonly<Wrapper<T>>;\n');
		},
	);
});

test('resolves imported aliases accessible at file scope', async () => {
	await withProject(
		"import type { Shared } from './shared';",
		async (filePath) => {
			const result = await inspect(filePath, 'Shared');
			expect(result.stdout).toBe('type Shared<T> = {\n    value: T;\n};\n');
		},
		{},
		{ 'shared.ts': 'export type Shared<T> = { value: T };\n' },
	);
});

test('reports inaccessible aliases with a non-zero exit status', async () => {
	await withProject('type Present = string;', async (filePath) => {
		const result = await inspect(filePath, 'Missing');
		expect(result).toStrictEqual({
			code: 1,
			stderr: `Type alias "Missing" is not accessible at the top level of ${filePath}.\n`,
			stdout: '',
		});
	});
});
