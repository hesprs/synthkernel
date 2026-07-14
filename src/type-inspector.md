# Type Inspector

`synthkernel` resolves one TypeScript type alias from one TypeScript project and prints a standalone type-alias declaration. The executable uses TypeScript `6.0.3` at runtime.

## Invocation

```sh
synthkernel <file-path> <type-alias> [--max-depth <non-negative integer>]
```

During source development, use:

```sh
bun src/type-inspector.ts <file-path> <type-alias> [--max-depth <non-negative integer>]
```

`<file-path>` is resolved to an absolute path. `<type-alias>` is an unqualified identifier. The command accepts `--max-depth <value>` and `--max-depth=<value>` in any argument position. The last supplied depth option wins. The default is `25`. Values must be non-negative safe integers. Unknown options, missing values, and any positional-argument count other than two are failures.

## Project Resolution

The inspector searches upward from the input file's directory for the nearest `tsconfig.json`. A config file is required. It loads that config with the TypeScript compiler API, so `extends` and all normal effective compiler options apply.

The inspector creates a TypeScript program from the config's resolved file list. If the input file is absent from that list, it is added as an additional root file. The program is rejected when any of these diagnostics exist:

- Config parsing diagnostics
- Compiler-option diagnostics
- Global diagnostics
- Syntactic diagnostics in the input file
- Semantic diagnostics in the input file

The inspector only resolves names available in the input file's top-level TypeScript type scope. This includes aliases declared in that file and aliases imported into that file. A name resolving to an interface, class, namespace, value, or another non-alias declaration is rejected.

## Alias Classes

The inspector uses these exact classes:

- **Generic alias**: a type alias that declares one or more type parameters.
- **Direct alias**: a non-generic alias whose complete alias-reference graph contains no array syntax, no type reference with type arguments, and no reference to a declaration that declares type parameters.
- **Synthetic alias**: every non-generic alias that is not direct. In practice, it contains an instantiated generic type directly or through another non-generic alias.
- **Recursive alias**: an alias whose alias-reference dependency graph can reach itself. Mutual recursion makes every alias in the cycle recursive.

For example:

```ts
type Serializer = (value: unknown) => string; // Direct
type Transformer<T> = (input: T) => T; // Generic
type CacheTransformer = Transformer<Map<string, Uint8Array<ArrayBuffer>>>; // Synthetic
```

## Ambient Exemptions

A symbol is ambient when at least one of its declarations is either:

1. A TypeScript default-library source file selected by effective `compilerOptions.lib`; or
2. Inside the directory of a type-reference package resolved from effective `compilerOptions.types`.

Ambient non-helper symbols are preserved as references. Their type arguments are still inspected and unfolded. This preserves containers such as `Map<K, V>`, `ReadableStream<T>`, `Uint8Array<T>`, and configured Node or Bun type-package containers while resolving aliases inside their arguments.

Only configured `compilerOptions.types` packages create this second exemption. An arbitrary declaration package imported by source code is not ambient merely because it is in `node_modules`.

The following ambient helper symbols are never preserved. The inspector unfolds them with the TypeScript checker:

```text
Awaited, Capitalize, ConstructorParameters, Exclude, Extract, InstanceType,
Lowercase, NoInfer, NonNullable, Omit, OmitThisParameter, Parameters,
Partial, Pick, Readonly, Record, Required, ReturnType, ThisParameterType,
ThisType, Uncapitalize, Uppercase
```

`ReadonlyArray<T>` is also a helper. It is emitted as `readonly T[]` after recursively inspecting `T`.

An application alias with the same name as a helper is not a helper unless its declaration is ambient under the rule above.

## Unfolding and Folding

For a local target alias, inspection starts from its written type expression. For an imported target alias, inspection starts from the TypeScript checker's resolved type expression because the imported declaration may refer to names unavailable in the input file.

The inspector then performs at most `maxDepth` expansion passes. Each pass works on a temporary checked type alias and applies these rules to every type reference:

1. Preserve a reference to the requested target alias. This prevents a target's written definition from expanding its own self-references.
2. Unfold a recursive alias in the first pass where it is eligible for unfolding, even when it would otherwise qualify as a direct alias. All eligible occurrences of that alias already present in that pass unfold. References to the same alias emitted by those expansions are preserved in every later pass. This unfolds the outer recursive construction once without recursively unfolding every `self` reference in its definition.
3. Preserve an ambient non-helper reference, while recursively inspecting its arguments.
4. Preserve a non-recursive direct alias. This is the folding step: the outermost direct alias encountered remains in output.
5. Unfold every other alias reference and every ambient helper reference with the TypeScript checker.
6. Preserve non-alias, non-helper references, such as interfaces and classes, while recursively inspecting their arguments.

The TypeScript checker performs semantic normalization while unfolding a reference. Therefore, one expansion pass can resolve more than one syntactic alias layer. `--max-depth` limits inspector passes, not the internal normalization depth of the TypeScript checker. With `--max-depth=0`, the inspector performs no expansion passes.

If the maximum pass count is reached, the current type expression is printed unchanged. Reaching the maximum is successful; it is not an error.

## Output

Successful output is exactly one declaration:

```ts
type <type-alias> = <resolved-type>;
```

The output keeps target type parameters. It is printed by the TypeScript printer with line-feed newlines, no type truncation, structural fallback, and single-quoted string literal types. The command writes one trailing newline to stdout.

Examples:

```ts
type Transformer<T> = (input: T) => T;
type CacheTransformer = Transformer<Map<string, Uint8Array<ArrayBuffer>>>;

// Output
type CacheTransformer = (
  input: Map<string, Uint8Array<ArrayBuffer>>,
) => Map<string, Uint8Array<ArrayBuffer>>;
```

```ts
type Direct = { id: number };
type Wrapper<T> = { value: T };
type Result = Wrapper<Direct>;

// Output
type Result = {
  value: Direct;
};
```

## Failures

Every failure writes an error message followed by a newline to stderr and exits with status `1`. Failures include invalid CLI arguments, unreadable input files, absent or invalid `tsconfig.json`, rejected TypeScript diagnostics, inaccessible aliases, and accessible names that are not type aliases.
