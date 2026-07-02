// oxlint-disable import/no-nodejs-modules
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test, vi } from 'vitest';
import { inspectTypeAlias, main } from '../src/type-inspector';

function createFixture(source: string) {
	const dir = mkdtempSync(path.join(os.tmpdir(), 'synthkernel-type-inspector-'));
	const filePath = path.join(dir, 'fixture.ts');
	writeFileSync(
		path.join(dir, 'tsconfig.json'),
		JSON.stringify(
			{
				compilerOptions: {
					module: 'ESNext',
					moduleResolution: 'bundler',
					strict: true,
					target: 'ESNext',
				},
				include: ['./*.ts'],
			},
			null,
			2,
		),
	);
	writeFileSync(filePath, source);
	return { dir, filePath };
}

test('inspectTypeAlias resolves final type of alias', () => {
	const fixture = createFixture('type Base = { count: number };\ntype Foo = Base;\n');
	try {
		const result = inspectTypeAlias(fixture.filePath, 'Foo');
		expect(result).toContain('count: number');
		expect(result).not.toContain('Base');
	} finally {
		rmSync(fixture.dir, { force: true, recursive: true });
	}
});

test('inspectTypeAlias expands merged context alias in example file', () => {
	const result = inspectTypeAlias(path.resolve('skill/example/index.ts'), 'AllOptions');
	expect(result).toBe(`{
    logLevel: "DEBUG" | "ERROR" | "INFO" | "WARN";
    maxLogs?: number | undefined;
    appName: string;
    debug?: boolean | undefined;
    minMessageLength: number;
    maxMessageLength: number;
}`);
});

test('inspectTypeAlias rejects generic aliases', () => {
	const fixture = createFixture('type Box<T> = T[];\n');
	try {
		expect(() => inspectTypeAlias(fixture.filePath, 'Box')).toThrow(/generic/i);
	} finally {
		rmSync(fixture.dir, { force: true, recursive: true });
	}
});

test('inspectTypeAlias fails when alias is missing', () => {
	const fixture = createFixture('type Foo = number;\n');
	try {
		expect(() => inspectTypeAlias(fixture.filePath, 'Missing')).toThrow(
			'Type alias not found: Missing',
		);
	} finally {
		rmSync(fixture.dir, { force: true, recursive: true });
	}
});

test('main prints resolved type and exits zero', () => {
	const fixture = createFixture('type Foo = number;\n');
	const log = vi.spyOn(console, 'log').mockReturnValue(undefined);
	const error = vi.spyOn(console, 'error').mockReturnValue(undefined);

	try {
		const code = main([fixture.filePath, 'Foo']);
		expect(code).toBe(0);
		expect(log).toHaveBeenCalledWith('number');
		expect(error).not.toHaveBeenCalled();
	} finally {
		log.mockRestore();
		error.mockRestore();
		rmSync(fixture.dir, { force: true, recursive: true });
	}
});

test('main writes stderr and exits non-zero for missing file', () => {
	const error = vi.spyOn(console, 'error').mockReturnValue(undefined);
	const log = vi.spyOn(console, 'log').mockReturnValue(undefined);

	try {
		const code = main(['missing.ts', 'Foo']);
		expect(code).toBe(1);
		expect(error).toHaveBeenCalledWith('File not found: missing.ts');
		expect(log).not.toHaveBeenCalled();
	} finally {
		log.mockRestore();
		error.mockRestore();
	}
});
