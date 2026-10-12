---
name: synthkernel
description: Architecture skill for SynthKernel — TypeScript module composition via createContext. Use when building, extending, or refactoring a SynthKernel project.
---

## SynthKernel

SynthKernel is a minimalist TypeScript module composition architecture. It ships only `createContext`, type utilities, and reactive primitives — nothing else.

`createContext` takes an ordered array of module classes, instantiates each with a shared context object, merges their contributed keys, and injects the result back. Modules are plain classes — no base class, no DI container, no decorators. The context is an API pool shared between modules and a facade for consumer code. Everything is a module: event systems, registries, logging, persistence, extensibility — all composed through the same primitive.

## Design Principles

- **Context is an API pool**: stable APIs and shared configuration, not volatile runtime data. Use factories exposed via `root` for transient state.
- **Everything is a module**: SynthKernel ships only the composition primitive. Event buses, registries, schedulers, config validation, plugin systems — all built as modules. Build what you need as a module and expose it via `root`.
- **Static modules**: keep core modules in a fixed array. Reserve `__addModule__` for user-installed plugins.
- **Unidirectional flow**: `preMerge` flows down, `root` flows up. Modules access siblings through injected context, not imports.
- **Later modules can intercept earlier ones**: a module can wrap or override sibling APIs in its constructor. Use for middleware patterns (logging, caching, auth).

## When to Use

- Modular composition with type-safe shared state.
- Plugin-extensible applications.
- Refactoring a monolith into composable modules.

## When Not to Use

- Simple project (loc < 200) where a monolith is clearer.
- Projects requiring decorator-based DI or topological dependency resolution.

## createContext

`createContext(classes, options)` → context object

- `mergeKeys` — instance keys merged into context. `root` flattens its contents into context root instead of nesting under `context.root`.
- `injectKeys` — keys written back to every instance after merge. Defaults to `mergeKeys`.
- `preMerge` — values merged before module construction (base infrastructure passed to all modules).
- `postMerge` — values merged after all modules, before injection.

Merge order: `preMerge` → modules (sequential) → `postMerge` → inject.

Context helpers (non-enumerable): `__getModule__(ctor)`, `__addModule__(ctor)`, `__assign__(obj)`.

## Module Pattern

A module is a plain class that takes context in its constructor:

```typescript
export default class MyModule {
  declare options: { myOption: string }; // type-only: context injects runtime value
  constructor(private readonly ctx: { neededApi: () => void }) {} // structural: only keys used
  root = { myMethod: this.myMethod }; // flattens into context root
}
```

- **`declare`** — type-only contributions to orchestrated types. No runtime value; context injects via `injectKeys`.
- **Constructor context** — structurally typed: only declare keys this module uses, not the full context type. Decouples modules from each other and enables plain-object mocking in tests.
- **`root`** — public API object. Flattens into context root so consumer code and sibling modules access methods directly.

## Facade Pattern

The facade owns the module list, creates context, exposes root APIs, and can manage module lifecycles through `__getModule__`:

```typescript
import type { MergeSingleKey, Context as ConstructContext } from 'synthkernel';
import { createContext } from 'synthkernel';
import ModuleA from './ModuleA.ts';
import ModuleB from './ModuleB.ts';

const allModules = [ModuleA, ModuleB] as const;
type AllModules = typeof allModules;
type Context = ConstructContext<AllModules, 'options' | 'root'>;
export type AllOptions = MergeSingleKey<AllModules, 'options'>;

class App {
  private ctx?: Context;
  someApi: Context['someApi'];

  constructor(public options: AllOptions) {
    this.ctx = createContext(allModules, {
      mergeKeys: ['options', 'root'],
    }).__assign__({ options });
    for (const ctor of allModules) this.ctx.__getModule__(ctor).start();
    this.someApi = this.ctx.someApi;
  }

  dispose = () => {
    for (const ctor of allModules.toReversed()) this.ctx?.__getModule__(ctor).dispose();
    this.ctx = undefined;
  };
}

export default App;
```

`MergeSingleKey<AllModules, 'options'>` derives the combined options type from every module's `declare options`. `ConstructContext<AllModules, 'options' | 'root'>` is the fully merged context type. Re-export both so consumer code and external packages use the orchestrated types.

## File Layout

A context and its direct modules live in one folder: `index.ts` creates the context, each module is `(PascalCase).ts`. No required base module, types, or utilities file. Split an oversized module into a sub-folder with its own `createContext` call.

## Reactive Primitives

SynthKernel also exports lightweight reactive primitives `ref`, `computed`, and `hook` for modules needing observable state or events. These are standalone utilities, not part of the composition architecture.

## Reference

- Advanced patterns (testing, nested contexts, interception, settings): [patterns](patterns.md)
- Working example: [./example](example/main.ts) (minimal, real applications can be much larger)
