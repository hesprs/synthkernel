# SynthKernel Implementation Detail

All code below are templates. Remember that SynthKernel classes do not have uniform shape, modify the templates according to your needs.

## Step 1 Prepare

Ensure you are clear about the functionalities and what your code should do.

Check your `tsconfig.json` which should contain following:

```json
{
  "compilerOptions": {
    "allowImportingTsExtensions": true
  }
}
```

## Step 2 Split

Think about the best way to divide your logic into modules, ensure:

- loose coupling between modules
- although not required, it's good practice to make each module have less than 300 loc estimated.

## Step 3 Clarify Needs

Now ask yourself:

1. Dependency Injection:

- Does this project need inter-module communication or just between loader and each module?
- Has the user already installed a DI library?

2. Type Orchestration:

- Do modules have configurable states to receive from or contribute to the loader (the facade)? (e.g. configs defined by users / a event map that needs extending)
- Do they contain intrinsic fields that should be determined at the top level, not by any modules? - Are they type only (e.g. an event-type mapping) or affect runtime logic (e.g. options)?
- To understand this, imagine module A contributes `{ a: boolean }`, B contributes `{ b: number }`, the orchestrated type will be `{ a: boolean; b: number }`.

3. Lifecycle Hooks:

- How many application-wide lifecycle hooks (not normal event hooks which should be defined by modules) does a module need?
- Does the loader needs to handle advanced loading patterns (e.g. lazy loading)?

4. Augmentation:

- Do modules need to inject methods and properties back to the loader so that consumers can access module functions?

5. Utilities:

- Are there any existing code or installed libraries that allows you to create hooks (or called event listeners) easily?

## Step 4 Create Types

Create (or add the following lines into) `types.ts` in a shared location, these types are the core of the type orchestration and will be shared across the entire SynthKernel tree. The utility of these types is to enable extraction and combination of the types from input classes.

```TypeScript
// #region [DO NOT MODIFY] SynthKernel Core Types
export type General = any;
export type GeneralArray = ReadonlyArray<General>;
export type GeneralObject = object;
export type GeneralConstructor = new (...args: General[]) => General;

type UnionToIntersection<U> = (U extends General ? (k: U) => void : never) extends (
	k: infer I,
) => void
	? I
	: never;

type GeneralModuleInput = Array<GeneralConstructor> | Array<GeneralObject>;

export type ModuleInput<T extends GeneralConstructor> = Array<T> | Array<InstanceType<T>>;

type Instances<T extends GeneralModuleInput> =
	T extends Array<GeneralConstructor> ? InstanceType<T[number]> : T[number];

export type Orchestratable<
	T extends GeneralModuleInput,
	K extends keyof Instances<T>,
> = UnionToIntersection<Instances<T>[K]>;
// #endregion
```

## Step 5 Get What You Need

Now according to your answer to question 1 and 5 step 3:

If the user hasn't installed a DI library but modules need it, use the user's preferred package manager to install `@needle-di/core` as a direct dependency.

If you cannot create hooks using existing code or libraries, create (or add following lines to) `utilities.ts` at the location per file system convention:

```TypeScript
import type { GeneralArray } from './types.ts'; // change this to the actual path of `types.ts`

type MatchingFunc<Args extends GeneralArray> = (...args: Args) => unknown;
export type Hook<Args extends GeneralArray = []> = {
	(...args: Args): void;
	subs: Set<MatchingFunc<Args>>;
	subscribe(callback: MatchingFunc<Args>): void;
	unsubscribe(callback: MatchingFunc<Args>): void;
};

/**
 * A quick function to create a hook that can be subscribed to and unsubscribed from.
 * Pass your arguments as the type parameter
 * @example const hook = makeHook(true); // create a hook that runs subscriptions in reverse order
 */
export function makeHook<Args extends GeneralArray = []>(reverse: boolean = false) {
	const result: Hook<Args> = (...args: Args) => {
		if (reverse) {
			const items = Array.from(result.subs).reverse();
			items.forEach((callback) => {
				callback(...args);
			});
		} else
			result.subs.forEach((callback) => {
				callback(...args);
			});
	};
	result.subs = new Set();
	result.subscribe = (callback: MatchingFunc<Args>) => {
		result.subs.add(callback);
	};
	result.unsubscribe = (callback: MatchingFunc<Args>) => {
		result.subs.delete(callback);
	};
	return result;
}
```

## Step 6 Formulate Base Orchestrations & Maintenance Note

Create `index.ts` per file system convention and firstly write some comments:

```TypeScript
/**
 * (write down what is the task of this loader with all its modules)
 * Dependency injection enabled / not enabled (question 1)
 * Augmentation enabled / not enabled (question 4)
 * Lifecycle hooks: (question 3)
 *   (hook name): (description)
 * Orchestrations: (question 2)
 *   (orchestration name): (description)
 */
```

According to your answer to question 2, step 3, if your app needs orchestration and have base fields, you should write down your base orchestrations, for example:

```TypeScript
// #region Base Orchestrations
// example only, define according to your needs
export interface BaseOptions {
    load: 'lazy' | 'normal' | false;
    container: HTMLElement;
}
// #endregion
```

## Step 7 Design BaseModule

Create `BaseModule.ts` per the file system convention and write following code, the final content depends on your requirements:

```TypeScript
import type { BaseOptions } from './index.ts'; // change or delete this to the path to `index.ts` (the loader) according to real base orchestration needs
import type { General, GeneralObject, ModuleInput as MI, Orchestratable } from './types.ts'; // change this to the real path of `types.ts`
import type { Hook } from './utilities.ts'; // change this to the real hook type you are using (question 5)
import type { Container } from '@needle-di/core'; // change or delete this according to your DI container needs (question)

type ModuleInput = MI<GeneralModuleCtor>;
export type GeneralModuleCtor = typeof BaseModule<General, General>;
export type BaseArgs = ConstructorParameters<GeneralModuleCtor>;

// change, add, or delete this according to your orchestration needs (question 2), align the second type parameter to the actual property name in the BaseModule
export type Options<M extends ModuleInput> = Orchestratable<M, 'options'>;

// add this or not depends on whether you need augmentation or not (question 4)
export type Augmentation<M extends ModuleInput> = Orchestratable<M, '_Augmentation'>;

// add, change or delete type parameters according to your type orchestration and augmentation needs (question 2, 4)
// with base orchestrations: (Generics) extends (your base orchestration) = (your base orchestration)
// without base orchestrations or augmentation: (Generics) extends GeneralObject = {}
export class BaseModule<O extends BaseOptions = BaseOptions, A extends GeneralObject = {}> {
	declare private static readonly _BaseModuleBrand: unique symbol; // nominal marker to ensure type safety

    // if you need augmentation (question 4)
	declare _Augmentation: A;

    // your orchestration fields (question 2)
    // orchestrated field needs runtime access: (field name): (Generics)
    // only type-level orchestration: declare (field name): (Generics)
    options: O;

    // your lifecycle hooks, add, modify or delete according to your needs (question 3)
	onStart: Hook['subscribe'];
	onRestart: Hook['subscribe'];
	onDispose: Hook['subscribe'];

    // constructor parameters, which should include:
    // - DI container if you need (question 1)
    // - all lifecycle hooks if you need (question 3)
    // - special augmentation function: `(aug: (Augmentation Generics)) => void` if you need (question 2)
	constructor(
		protected container: Container,
		options: GeneralObject,
		onStart: Hook,
		onDispose: Hook,
		onRestart: Hook,
		protected augment: (aug: A) => void,
	) {
        // orchestration assignments (question 2)
		this.options = options as O;

        // lifecycle hooks assignments (question 3), adjust according to the real hook subscribe function according to your needs
		this.onStart = onStart.subscribe;
		this.onDispose = onDispose.subscribe;
		this.onRestart = onRestart.subscribe;
	}
}
```

## Step 8 Design Loader

Create or add following lines to `index.ts` (the loader), adjust according to your needs:

```TypeScript
// adjust this to the real location of `BaseModule.ts`
// imports should include: `BaseModule`, all orchestrations if needed (question 2), augmentation if needed (question 4)
import type { GeneralModuleCtor, Options, Augmentation } from './BaseModule.ts';
import type { GeneralObject } from './types.ts'; // change this to the real path of `types.ts`
import { makeHook } from './utilities.ts'; // change this to the real path of `utilities.ts`
import { Container } from '@needle-di/core'; // change or delete this according to your DI container needs (question)

// remember that we have defined the base orchestrations in step 6
export interface BaseOptions {
	container: HTMLElement;
	loading?: 'normal' | 'lazy' | 'none';
}

// populate this once we have real modules
const allModules = []; // let TypeScript infer the type to keep the exact type
type AllModules = typeof allModules;

// the final orchestration of types, should include:
// - all orchestrations if you need (question 2)
// - augmentation if you need (question 4)
type AllOptions = Options<AllModules>;
type AllAugmentation = Augmentation<AllModules>;

// the loader class, change the class name freely
// this is the target of augmentation, when an instance of the loader loads a module that augments it, new methods and properties will be reflected on both the loader's type and runtime property
class Loader {
	// all your lifecycle hooks according to your needs (question 3), adjust according to your lifecycle needs
	private onDispose = makeHook(true);
	private onStart = makeHook();
	private onRestart = makeHook();

    // all your orchestrations according to your needs (question 2), this is the only case where you write some app logic in a loader. And all reason for it is type orchestration. Usually required by type-aware options or a event emitter whose event map is orchestrated
	options: AllOptions<M>;

    // the DI container (question 1)
	container: Container;

    // constructor parameters you need, you probably want to use orchestrated types here, e.g. type for user configurable options defined by modules (question 2)
	constructor(options: AllOptions<M>) {
		this.container = new Container(); // instantiate DI container when needed (question 1)
		this.options = options; // assign orchestrations according your need (question 2)

        // If you don't need DI, the following loading would be straightforward
        allModules.forEach((Module) => {
			new Class(
                // in the same order as the constructor parameters of the base module you defined in step 7, the exact parameters can vary between requirements
				this.container,
				this.options,
				this.onStart,
				this.onDispose,
				this.onRestart,
				this.augment,
			),
		});

        // the DI container binding, specific methods varies between different DI libraries, write following lines if you need to use a DI container
		const bind = (Class: GeneralModuleCtor) => {
			this.container.bind({
				provide: Class,
				useFactory: () =>
					new Class(
                        // in the same order as the constructor parameters of the base module you defined in step 7, the exact parameters can vary between requirements
						this.container,
						this.options,
						this.onStart,
						this.onDispose,
						this.onRestart,
						this.augment,
					),
			});
		};
		allModules.forEach(bind);
        // use non-assign container get to load all modules, if you need custom loading, it would be easy to implement yourself's
		allModules.forEach((Module: GeneralModuleCtor) => {
			this.container.get(Module);
		});

		// ... implement your custom loading logic freely
	}

    // core component for augmentation which should be passed in modules' class constructors, add this if you need augmentation
	private augment = (aug: GeneralObject) => {
		const descriptors = Object.getOwnPropertyDescriptors(aug);
        Object.defineProperties(this, descriptors);
	};

    // implement your lifecycle management methods freely
	dispose = () => {
		this.onDispose();
		this.container.unbindAll();
	};
}

// If you are not using augmentation, simply export the loader, change the name if you like
export default Loader;

// If you are using augmentation, do the final type hack below
type LoaderType = new (...args: ConstructorParameters<typeof Loader>) => Loader & AllAugmentation;
export default Loader as LoaderType;
```

## Step 9 Final Buzzwords

Now you have successfully implemented the infrastructure of SynthKernel.

If you have access to project-wide memory like `AGENTS.md`, modify the `Project Architecture` section it to reflect the up-to-date project structure. Projects implementing SynthKernel can always be structured in a tree style. If you haven't seen this section, create it:

````markdown
## Project Architecture

This project uses SynthKernel architecture. Typical practice consists a module loader class and module classes:

- The module loader class manages module lifecycles, orchestrates types, and behaves as an facade at of your app logic.
- All module classes extend a `BaseModule` class, they define APIs, register lifecycle hooks, execute actual logic, augment the loader class and wire each other via dependency injection.
- Types are resolved via generics orchestration.
- Modules are composed to the loader to form an APP.

**Structure**:

```text
loader: description
- module 1: description
- module 2: description
- (module as well as a loader) 3: description
  - module 1: description
  - module 2: description
- module 4: description
```
````

Then you can proceed to [maintenance](maintenance.md) to see how to create a module.
