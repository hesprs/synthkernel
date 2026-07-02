#!/usr/bin/env node
// oxlint-disable import/no-nodejs-modules
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const TYPE_FORMAT_FLAGS = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.InTypeAlias;
const IDENTIFIER_RE = /^[$A-Z_a-z][$0-9A-Z_a-z]*$/;

function formatDiagnostic(error: ts.Diagnostic): string {
	return ts.flattenDiagnosticMessageText(error.messageText, '\n');
}

function resolveFilePath(filePath: string): string {
	const resolvedPath = path.resolve(process.cwd(), filePath);
	if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile())
		throw new Error(`File not found: ${filePath}`);

	return resolvedPath;
}

function loadProgram(filePath: string): ts.Program {
	const configPath = ts.findConfigFile(path.dirname(filePath), ts.sys.fileExists);
	if (!configPath)
		return ts.createProgram([filePath], {
			module: ts.ModuleKind.ESNext,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			strict: true,
			target: ts.ScriptTarget.ESNext,
		});

	const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
	if (configFile.error) throw new Error(formatDiagnostic(configFile.error));

	const parsed = ts.parseJsonConfigFileContent(
		configFile.config,
		ts.sys,
		path.dirname(configPath),
	);
	const rootNames = new Set(parsed.fileNames.map((name) => path.resolve(name)));
	rootNames.add(filePath);
	return ts.createProgram([...rootNames], parsed.options);
}

function findTypeAlias(sourceFile: ts.SourceFile, aliasName: string): ts.TypeAliasDeclaration {
	const alias = sourceFile.statements.find(
		(statement): statement is ts.TypeAliasDeclaration =>
			ts.isTypeAliasDeclaration(statement) && statement.name.text === aliasName,
	);
	if (!alias) throw new Error(`Type alias not found: ${aliasName}`);
	return alias;
}

function formatPropertyName(name: string): string {
	return IDENTIFIER_RE.test(name) ? name : JSON.stringify(name);
}

function formatType(
	type: ts.Type,
	checker: ts.TypeChecker,
	node: ts.Node,
	seen = new Set<ts.Type>(),
): string {
	if (seen.has(type)) return checker.typeToString(type, node, TYPE_FORMAT_FLAGS);

	if (type.flags & ts.TypeFlags.StringLiteral)
		return JSON.stringify((type as ts.StringLiteralType).value);
	if (type.flags & ts.TypeFlags.NumberLiteral)
		return String((type as ts.NumberLiteralType).value);
	if (type.flags & ts.TypeFlags.BigIntLiteral)
		return checker.typeToString(type, node, TYPE_FORMAT_FLAGS);
	if (type.flags & ts.TypeFlags.BooleanLiteral)
		return checker.typeToString(type, node, TYPE_FORMAT_FLAGS);
	if (type.flags & ts.TypeFlags.Undefined) return 'undefined';
	if (type.flags & ts.TypeFlags.Null) return 'null';
	if (type.flags & ts.TypeFlags.Never) return 'never';
	if (type.flags & ts.TypeFlags.Unknown) return 'unknown';
	if (type.flags & ts.TypeFlags.Any) return 'any';
	if (type.flags & ts.TypeFlags.Void) return 'void';
	if (type.flags & ts.TypeFlags.String) return 'string';
	if (type.flags & ts.TypeFlags.Number) return 'number';
	if (type.flags & ts.TypeFlags.Boolean) return 'boolean';
	if (type.flags & ts.TypeFlags.BigInt) return 'bigint';
	if (type.flags & ts.TypeFlags.ESSymbol) return 'symbol';

	if (type.flags & ts.TypeFlags.Union) {
		const members = (type as ts.UnionType).types;
		const hasUndefined = members.some((member) => member.flags & ts.TypeFlags.Undefined);
		const hasNull = members.some((member) => member.flags & ts.TypeFlags.Null);
		const nonNullableMembers = members.filter(
			(member) =>
				!(member.flags & ts.TypeFlags.Undefined) && !(member.flags & ts.TypeFlags.Null),
		);
		const hasTrue = nonNullableMembers.some(
			(member) =>
				member.flags & ts.TypeFlags.BooleanLiteral &&
				checker.typeToString(member, node, TYPE_FORMAT_FLAGS) === 'true',
		);
		const hasFalse = nonNullableMembers.some(
			(member) =>
				member.flags & ts.TypeFlags.BooleanLiteral &&
				checker.typeToString(member, node, TYPE_FORMAT_FLAGS) === 'false',
		);
		if (
			hasTrue &&
			hasFalse &&
			nonNullableMembers.every((member) => member.flags & ts.TypeFlags.BooleanLiteral)
		) {
			const head = 'boolean';
			const tail = hasNull ? ['null'] : [];
			if (hasUndefined) tail.push('undefined');
			return [head, ...tail].join(' | ');
		}

		const parts = nonNullableMembers.map((subtype) => formatType(subtype, checker, node, seen));
		if (hasNull) parts.push('null');
		if (hasUndefined) parts.push('undefined');
		return parts.join(' | ');
	}

	if (checker.isTupleType(type)) {
		const tuple = type as ts.TypeReference;
		const elements = checker
			.getTypeArguments(tuple)
			.map((elementType) => formatType(elementType, checker, node, seen));
		return `[${elements.join(', ')}]`;
	}

	if (checker.isArrayType(type)) {
		const arrayType = type as ts.TypeReference;
		const [elementType] = checker.getTypeArguments(arrayType);
		if (elementType) return `${formatType(elementType, checker, node, seen)}[]`;
	}

	if (type.flags & ts.TypeFlags.Intersection) {
		const props = checker.getPropertiesOfType(type);
		if (props.length > 0) return formatObjectType(type, checker, node, seen);
		return (type as ts.IntersectionType).types
			.map((subtype) => formatType(subtype, checker, node, seen))
			.join(' & ');
	}

	const signatures = checker.getSignaturesOfType(type, ts.SignatureKind.Call);
	const constructors = checker.getSignaturesOfType(type, ts.SignatureKind.Construct);
	const props = checker.getPropertiesOfType(type);
	if (props.length > 0 && signatures.length === 0 && constructors.length === 0)
		return formatObjectType(type, checker, node, seen);

	return checker.typeToString(type, node, TYPE_FORMAT_FLAGS);
}

function formatObjectType(
	type: ts.Type,
	checker: ts.TypeChecker,
	node: ts.Node,
	seen: Set<ts.Type>,
): string {
	seen.add(type);
	try {
		const lines = checker.getPropertiesOfType(type).map((symbol) => {
			const optional = (symbol.flags & ts.SymbolFlags.Optional) !== 0;
			const propType = checker.getTypeOfSymbolAtLocation(symbol, node);
			return `    ${formatPropertyName(symbol.getName())}${optional ? '?' : ''}: ${formatType(propType, checker, node, seen)};`;
		});
		if (lines.length === 0) return '{}';
		return `{
${lines.join('\n')}
}`;
	} finally {
		seen.delete(type);
	}
}

export function inspectTypeAlias(filePath: string, aliasName: string): string {
	const resolvedFilePath = resolveFilePath(filePath);
	const program = loadProgram(resolvedFilePath);
	const sourceFile = program.getSourceFile(resolvedFilePath);
	if (!sourceFile) throw new Error(`Source file not found in program: ${filePath}`);

	const alias = findTypeAlias(sourceFile, aliasName);
	if (alias.typeParameters?.length) throw new Error(`Type alias is generic: ${aliasName}`);

	const checker = program.getTypeChecker();
	const type = checker.getTypeFromTypeNode(alias.type);
	return formatType(type, checker, alias);
}

export function main(argv: Array<string> = process.argv.slice(2)): number {
	if (argv.length !== 2) {
		console.error('Usage: synthkernel <file-path> <type-alias>');
		return 1;
	}

	try {
		console.log(inspectTypeAlias(argv[0], argv[1]));
		return 0;
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		return 1;
	}
}

function isMainEntryPoint() {
	if (!process.argv[1]) return false;
	try {
		return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url));
	} catch {
		return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
	}
}

if (isMainEntryPoint()) process.exitCode = main();
