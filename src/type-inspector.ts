#!/usr/bin/env node

// oxlint-disable import/no-nodejs-modules

import { dirname, isAbsolute, relative, resolve } from 'node:path';
import ts from 'typescript';

const DEFAULT_MAX_DEPTH = 25;
const OUTPUT_ALIAS_BASE = '__SynthKernelResolvedType';
const TYPE_NODE_FLAGS =
	ts.NodeBuilderFlags.NoTruncation |
	ts.NodeBuilderFlags.UseStructuralFallback |
	ts.NodeBuilderFlags.UseSingleQuotesForStringLiteralType;

const HELPER_TYPES = new Set([
	'Awaited',
	'Capitalize',
	'ConstructorParameters',
	'Exclude',
	'Extract',
	'InstanceType',
	'Lowercase',
	'NoInfer',
	'NonNullable',
	'Omit',
	'OmitThisParameter',
	'Parameters',
	'Partial',
	'Pick',
	'Readonly',
	'ReadonlyArray',
	'Record',
	'Required',
	'ReturnType',
	'ThisParameterType',
	'ThisType',
	'Uncapitalize',
	'Uppercase',
]);

type CliOptions = {
	aliasName: string;
	filePath: string;
	maxDepth: number;
};

type ProjectConfig = {
	fileNames: Array<string>;
	options: ts.CompilerOptions;
};

type ProjectView = {
	checker: ts.TypeChecker;
	program: ts.Program;
	sourceFile: ts.SourceFile;
};

type ExpansionResult = {
	changed: boolean;
	type: ts.TypeNode;
	unfoldedRecursiveAliases: Set<string>;
};

function usage(): string {
	return 'Usage: synthkernel <file-path> <type-alias> [--max-depth <non-negative integer>]';
}

function parseArguments(arguments_: Array<string>): CliOptions {
	const positional: Array<string> = [];
	let maxDepth = DEFAULT_MAX_DEPTH;

	for (let index = 0; index < arguments_.length; index += 1) {
		const argument = arguments_[index];

		if (argument === '--max-depth') {
			const value = arguments_[index + 1];
			if (value === undefined) throw new Error(`Missing value for --max-depth.\n${usage()}`);
			maxDepth = parseMaxDepth(value);
			index += 1;
			continue;
		}

		if (argument.startsWith('--max-depth=')) {
			maxDepth = parseMaxDepth(argument.slice('--max-depth='.length));
			continue;
		}

		if (argument.startsWith('-')) throw new Error(`Unknown option: ${argument}\n${usage()}`);
		positional.push(argument);
	}

	if (positional.length !== 2) throw new Error(usage());

	return {
		aliasName: positional[1],
		filePath: resolve(positional[0]),
		maxDepth,
	};
}

function parseMaxDepth(value: string): number {
	if (!/^\d+$/.test(value)) throw new Error('--max-depth must be a non-negative integer.');
	const depth = Number(value);
	if (!Number.isSafeInteger(depth))
		throw new Error('--max-depth must be a non-negative safe integer.');
	return depth;
}

function loadProjectConfig(filePath: string): ProjectConfig {
	const configPath = ts.findConfigFile(dirname(filePath), ts.sys.fileExists, 'tsconfig.json');
	if (configPath === undefined) throw new Error(`No tsconfig.json found for ${filePath}.`);

	const config = ts.readConfigFile(configPath, ts.sys.readFile);
	if (config.error !== undefined) throwDiagnostics([config.error]);

	const parsed = ts.parseJsonConfigFileContent(
		config.config,
		ts.sys,
		dirname(configPath),
		undefined,
		configPath,
	);
	if (parsed.errors.length > 0) throwDiagnostics(parsed.errors);

	const canonicalTarget = canonicalPath(filePath);
	const fileNames = parsed.fileNames.some((name) => canonicalPath(name) === canonicalTarget)
		? parsed.fileNames
		: [...parsed.fileNames, filePath];

	return { fileNames, options: parsed.options };
}

function createProjectView(
	config: ProjectConfig,
	filePath: string,
	sourceText?: string,
): ProjectView {
	const host = ts.createCompilerHost(config.options, true);
	const originalGetSourceFile = host.getSourceFile.bind(host);
	const originalReadFile = host.readFile.bind(host);
	const canonicalTarget = canonicalPath(filePath);

	if (sourceText !== undefined) {
		host.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) => {
			if (canonicalPath(name) === canonicalTarget)
				return ts.createSourceFile(name, sourceText, languageVersion, true);

			return originalGetSourceFile(name, languageVersion, onError, shouldCreateNewSourceFile);
		};
		host.readFile = (name) =>
			canonicalPath(name) === canonicalTarget ? sourceText : originalReadFile(name);
	}

	const program = ts.createProgram(config.fileNames, config.options, host);
	const sourceFile = program
		.getSourceFiles()
		.find((candidate) => canonicalPath(candidate.fileName) === canonicalTarget);
	if (sourceFile === undefined) throw new Error(`Could not load source file: ${filePath}`);

	return { checker: program.getTypeChecker(), program, sourceFile };
}

function canonicalPath(filePath: string): string {
	const absolute = isAbsolute(filePath) ? filePath : resolve(filePath);
	return ts.sys.useCaseSensitiveFileNames ? absolute : absolute.toLowerCase();
}

function validateProject(view: ProjectView): void {
	const diagnostics = [
		...view.program.getConfigFileParsingDiagnostics(),
		...view.program.getOptionsDiagnostics(),
		...view.program.getGlobalDiagnostics(),
		...view.program.getSyntacticDiagnostics(view.sourceFile),
		...view.program.getSemanticDiagnostics(view.sourceFile),
	];
	if (diagnostics.length > 0) throwDiagnostics(diagnostics);
}

function throwDiagnostics(diagnostics: ReadonlyArray<ts.Diagnostic>): never {
	const message = ts.formatDiagnostics(diagnostics, {
		getCanonicalFileName: canonicalPath,
		getCurrentDirectory: ts.sys.getCurrentDirectory,
		getNewLine: () => ts.sys.newLine,
	});
	throw new Error(message.trimEnd());
}

function resolveAlias(
	checker: ts.TypeChecker,
	sourceFile: ts.SourceFile,
	aliasName: string,
): { declaration: ts.TypeAliasDeclaration; symbol: ts.Symbol } {
	const localSymbol = checker.resolveName(aliasName, sourceFile, ts.SymbolFlags.Type, false);
	if (localSymbol === undefined)
		throw new Error(
			`Type alias "${aliasName}" is not accessible at the top level of ${sourceFile.fileName}.`,
		);

	const symbol = resolveSymbol(checker, localSymbol);
	const declaration = symbol.declarations?.find(ts.isTypeAliasDeclaration);
	if (declaration === undefined)
		throw new Error(
			`"${aliasName}" is not a type alias accessible at the top level of ${sourceFile.fileName}.`,
		);

	return { declaration, symbol };
}

function resolveSymbol(checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol {
	return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
}

function findOutputAlias(sourceFile: ts.SourceFile, name: string): ts.TypeAliasDeclaration {
	const declaration = sourceFile.statements.find(
		(statement): statement is ts.TypeAliasDeclaration =>
			ts.isTypeAliasDeclaration(statement) && statement.name.text === name,
	);
	if (declaration === undefined)
		throw new Error('Internal error: generated output alias was not found.');
	return declaration;
}

function createTargetTypeParameters(
	checker: ts.TypeChecker,
	declaration: ts.TypeAliasDeclaration,
	sourceFile: ts.SourceFile,
): ReadonlyArray<ts.TypeParameterDeclaration> | undefined {
	const parameters = declaration.typeParameters?.map((parameter) => {
		const type = checker.getTypeAtLocation(parameter);
		return checker.typeParameterToDeclaration(type, sourceFile, TYPE_NODE_FLAGS) ?? parameter;
	});
	return parameters === undefined ? undefined : ts.factory.createNodeArray(parameters);
}

function configuredTypeRoots(config: ProjectConfig, containingFile: string): Array<string> {
	return (config.options.types ?? []).flatMap((name) => {
		const result = ts.resolveTypeReferenceDirective(
			name,
			containingFile,
			config.options,
			ts.sys,
		).resolvedTypeReferenceDirective;
		return result?.resolvedFileName === undefined ? [] : [dirname(result.resolvedFileName)];
	});
}

function isInside(filePath: string, directory: string): boolean {
	const path = relative(resolve(directory), resolve(filePath));
	return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}

function isConfiguredAmbientSymbol(
	program: ts.Program,
	typeRoots: ReadonlyArray<string>,
	symbol: ts.Symbol,
): boolean {
	return (
		symbol.declarations?.some((declaration) => {
			const sourceFile = declaration.getSourceFile();
			return (
				program.isSourceFileDefaultLibrary(sourceFile) ||
				typeRoots.some((root) => isInside(sourceFile.fileName, root))
			);
		}) ?? false
	);
}

function typeReferenceSymbol(
	checker: ts.TypeChecker,
	node: ts.TypeReferenceNode,
): ts.Symbol | undefined {
	const type = checker.getTypeAtLocation(node);
	const symbol =
		checker.getSymbolAtLocation(node.typeName) ?? type.aliasSymbol ?? type.getSymbol();
	return symbol === undefined ? undefined : resolveSymbol(checker, symbol);
}

function typeAliasDeclaration(symbol: ts.Symbol): ts.TypeAliasDeclaration | undefined {
	return symbol.declarations?.find(ts.isTypeAliasDeclaration);
}

function aliasIdentity(declaration: ts.TypeAliasDeclaration): string {
	return `${canonicalPath(declaration.getSourceFile().fileName)}:${declaration.pos}:${declaration.end}`;
}

function aliasDependencies(
	checker: ts.TypeChecker,
	declaration: ts.TypeAliasDeclaration,
): Set<ts.Symbol> {
	const dependencies = new Set<ts.Symbol>();

	function visit(node: ts.Node): void {
		if (ts.isTypeReferenceNode(node)) {
			const symbol = typeReferenceSymbol(checker, node);
			if (symbol !== undefined && typeAliasDeclaration(symbol) !== undefined)
				dependencies.add(symbol);
		}
		ts.forEachChild(node, visit);
	}

	visit(declaration.type);
	return dependencies;
}

function createAliasClassifiers(checker: ts.TypeChecker): {
	isDirectAlias: (symbol: ts.Symbol) => boolean;
	isRecursiveAlias: (symbol: ts.Symbol) => boolean;
} {
	const directCache = new Map<ts.Symbol, boolean>();
	const recursiveCache = new Map<ts.Symbol, boolean>();

	function containsInstantiation(node: ts.Node, visiting: Set<ts.Symbol>): boolean {
		if (ts.isArrayTypeNode(node)) return true;

		if (ts.isTypeReferenceNode(node)) {
			const symbol = typeReferenceSymbol(checker, node);
			if (symbol !== undefined) {
				const declaration = typeAliasDeclaration(symbol);
				const genericDeclaration = symbol.declarations?.find(
					(
						candidate,
					): candidate is ts.Declaration & {
						typeParameters: ts.NodeArray<ts.TypeParameterDeclaration>;
					} => 'typeParameters' in candidate && candidate.typeParameters !== undefined,
				);

				if (node.typeArguments !== undefined || genericDeclaration !== undefined)
					return true;
				if (declaration !== undefined && !visiting.has(symbol)) {
					const nextVisiting = new Set(visiting).add(symbol);
					if (containsInstantiation(declaration.type, nextVisiting)) return true;
				}
			}
		}

		return ts.forEachChild(node, (child) => containsInstantiation(child, visiting)) ?? false;
	}

	function isDirectAlias(symbol: ts.Symbol): boolean {
		const cached = directCache.get(symbol);
		if (cached !== undefined) return cached;

		const declaration = typeAliasDeclaration(symbol);
		if (declaration === undefined || declaration.typeParameters !== undefined) return false;

		const direct = !containsInstantiation(declaration.type, new Set([symbol]));
		directCache.set(symbol, direct);
		return direct;
	}

	function reachesAlias(
		current: ts.Symbol,
		target: ts.Symbol,
		visiting: Set<ts.Symbol>,
	): boolean {
		if (visiting.has(current)) return false;
		const declaration = typeAliasDeclaration(current);
		if (declaration === undefined) return false;

		const nextVisiting = new Set(visiting).add(current);
		for (const dependency of aliasDependencies(checker, declaration))
			if (dependency === target || reachesAlias(dependency, target, nextVisiting))
				return true;

		return false;
	}

	function isRecursiveAlias(symbol: ts.Symbol): boolean {
		const cached = recursiveCache.get(symbol);
		if (cached !== undefined) return cached;
		const recursive = reachesAlias(symbol, symbol, new Set());
		recursiveCache.set(symbol, recursive);
		return recursive;
	}

	return { isDirectAlias, isRecursiveAlias };
}

function expandAliasOnce(
	view: ProjectView,
	declaration: ts.TypeAliasDeclaration,
	targetSymbol: ts.Symbol,
	typeRoots: ReadonlyArray<string>,
	previouslyUnfoldedRecursiveAliases: ReadonlySet<string>,
): ExpansionResult {
	const { checker, program } = view;
	const { isDirectAlias, isRecursiveAlias } = createAliasClassifiers(checker);
	let changed = false;
	const unfoldedRecursiveAliases = new Set<string>();

	const transformation = ts.transform(declaration.type, [
		(context) => {
			const visitor: ts.Visitor = (node) => {
				if (ts.isIndexedAccessTypeNode(node)) {
					const type = checker.getTypeAtLocation(node);
					const expanded = checker.typeToTypeNode(
						type,
						declaration,
						TYPE_NODE_FLAGS | ts.NodeBuilderFlags.InTypeAlias,
					);
					if (expanded !== undefined) {
						changed = true;
						return expanded;
					}
				}

				if (!ts.isTypeReferenceNode(node)) return ts.visitEachChild(node, visitor, context);

				const symbol = typeReferenceSymbol(checker, node);
				if (symbol === undefined) return ts.visitEachChild(node, visitor, context);

				const ambient = isConfiguredAmbientSymbol(program, typeRoots, symbol);
				const helper = ambient && HELPER_TYPES.has(symbol.getName());
				if (
					helper &&
					symbol.getName() === 'ReadonlyArray' &&
					node.typeArguments?.length === 1
				) {
					changed = true;
					const argument =
						ts.visitNode(node.typeArguments[0], visitor, ts.isTypeNode) ??
						node.typeArguments[0];
					return ts.factory.createTypeOperatorNode(
						ts.SyntaxKind.ReadonlyKeyword,
						ts.factory.createArrayTypeNode(argument),
					);
				}

				const alias = typeAliasDeclaration(symbol);
				const recursive = alias !== undefined && isRecursiveAlias(symbol);
				const recursiveIdentity = recursive ? aliasIdentity(alias) : undefined;
				const preserve =
					symbol === targetSymbol ||
					(recursiveIdentity !== undefined &&
						previouslyUnfoldedRecursiveAliases.has(recursiveIdentity)) ||
					(ambient && !helper) ||
					(alias !== undefined && !recursive && isDirectAlias(symbol));
				if (preserve || (alias === undefined && !helper))
					return ts.visitEachChild(node, visitor, context);

				const type = checker.getTypeAtLocation(node);
				const expanded = checker.typeToTypeNode(
					type,
					declaration,
					TYPE_NODE_FLAGS | ts.NodeBuilderFlags.InTypeAlias,
				);
				if (expanded === undefined) return ts.visitEachChild(node, visitor, context);

				changed = true;
				if (recursiveIdentity !== undefined)
					unfoldedRecursiveAliases.add(recursiveIdentity);
				return expanded;
			};

			return (root) => ts.visitNode(root, visitor, ts.isTypeNode) ?? root;
		},
	]);

	const type = transformation.transformed[0];
	transformation.dispose();
	return { changed, type, unfoldedRecursiveAliases };
}

function printAlias(
	name: string,
	typeParameters: ReadonlyArray<ts.TypeParameterDeclaration> | undefined,
	type: ts.TypeNode,
	sourceFile: ts.SourceFile,
): string {
	const declaration = ts.factory.createTypeAliasDeclaration(
		undefined,
		name,
		typeParameters,
		type,
	);
	return ts
		.createPrinter({ newLine: ts.NewLineKind.LineFeed })
		.printNode(ts.EmitHint.Unspecified, declaration, sourceFile);
}

function uniqueOutputAlias(checker: ts.TypeChecker, sourceFile: ts.SourceFile): string {
	let name = OUTPUT_ALIAS_BASE;
	let suffix = 2;
	while (checker.resolveName(name, sourceFile, ts.SymbolFlags.Type, false) !== undefined) {
		name = `${OUTPUT_ALIAS_BASE}${suffix}`;
		suffix += 1;
	}
	return name;
}

function inspectType(options: CliOptions): string {
	const sourceText = ts.sys.readFile(options.filePath);
	if (sourceText === undefined)
		throw new Error(`Could not read source file: ${options.filePath}`);

	const config = loadProjectConfig(options.filePath);
	const initialView = createProjectView(config, options.filePath);
	validateProject(initialView);

	const target = resolveAlias(initialView.checker, initialView.sourceFile, options.aliasName);
	const initialType =
		canonicalPath(target.declaration.getSourceFile().fileName) ===
		canonicalPath(options.filePath)
			? target.declaration.type
			: initialView.checker.typeToTypeNode(
					initialView.checker.getDeclaredTypeOfSymbol(target.symbol),
					initialView.sourceFile,
					TYPE_NODE_FLAGS | ts.NodeBuilderFlags.InTypeAlias,
				);
	if (initialType === undefined)
		throw new Error(`Could not resolve type alias "${options.aliasName}".`);

	const outputAlias = uniqueOutputAlias(initialView.checker, initialView.sourceFile);
	let output = printAlias(
		outputAlias,
		createTargetTypeParameters(initialView.checker, target.declaration, initialView.sourceFile),
		initialType,
		initialView.sourceFile,
	);
	const typeRoots = configuredTypeRoots(config, options.filePath);
	const unfoldedRecursiveAliases = new Set<string>();

	for (let depth = 0; depth < options.maxDepth; depth += 1) {
		const overlayText = `${sourceText}\n${output}\n`;
		const view = createProjectView(config, options.filePath, overlayText);
		const declaration = findOutputAlias(view.sourceFile, outputAlias);
		const targetSymbol = resolveAlias(view.checker, view.sourceFile, options.aliasName).symbol;
		const result = expandAliasOnce(
			view,
			declaration,
			targetSymbol,
			typeRoots,
			unfoldedRecursiveAliases,
		);
		output = printAlias(outputAlias, declaration.typeParameters, result.type, view.sourceFile);
		for (const identity of result.unfoldedRecursiveAliases)
			unfoldedRecursiveAliases.add(identity);
		if (!result.changed) break;
	}

	const finalView = createProjectView(config, options.filePath, `${sourceText}\n${output}\n`);
	const finalDeclaration = findOutputAlias(finalView.sourceFile, outputAlias);
	return printAlias(
		options.aliasName,
		finalDeclaration.typeParameters,
		finalDeclaration.type,
		finalView.sourceFile,
	);
}

try {
	const options = parseArguments(process.argv.slice(2));
	process.stdout.write(`${inspectType(options)}\n`);
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	process.stderr.write(`${message}\n`);
	process.exitCode = 1;
}
