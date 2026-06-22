type General = any;
type GeneralObject = object;
type GeneralConstructor =
	| (new (...args: Array<General>) => General)
	| (abstract new (...args: Array<General>) => General);
type ModuleConstructor<C extends object> = new (context: C) => General;

type GeneralModuleInput = ReadonlyArray<GeneralConstructor> | ReadonlyArray<GeneralObject>;

export type ModuleInput<T extends GeneralConstructor> =
	| ReadonlyArray<T>
	| ReadonlyArray<InstanceType<T>>;

type IsPlainObject<T> = T extends object
	? T extends Function | Date | RegExp | Array<any> | Map<any, any> | Set<any>
		? false
		: true
	: false;

type ShallowMerge<A, B> =
	IsPlainObject<A> extends true ? (IsPlainObject<B> extends true ? Omit<A, keyof B> & B : B) : B;

type Keys<T> = T extends any ? keyof T : never;

type InstanceEach<T extends GeneralModuleInput> =
	T extends ReadonlyArray<GeneralConstructor> ? { [K in keyof T]: InstanceType<T[K]> } : T;

type PickEach<T extends ReadonlyArray<object>, K extends PropertyKey> = {
	[I in keyof T]: Pick<T[I], Extract<K, keyof T[I]>>;
};

type RootValue<T extends object> = RootKey extends keyof T ? Extract<T[RootKey], object> : {};
type MergeRootEach<T extends ReadonlyArray<object>> = {
	[I in keyof T]: ShallowMerge<Omit<T[I], RootKey>, RootValue<T[I]>>;
};

type ExtractKeyEach<T extends ReadonlyArray<object>, K extends Keys<T>> = {
	[I in keyof T]: K extends keyof T[I] ? T[I][K] : never;
};

type MergeObjects<
	T extends ReadonlyArray<object>,
	O extends ReadonlyArray<object> = MergeRootEach<T>,
> = {
	[P in Keys<O[number]>]: MergeValues<ExtractKeyEach<O, P>>;
};

export type MergeSingleKey<
	M extends GeneralModuleInput,
	K extends Keys<InstanceEach<M>[number]>,
> = MergeValues<ExtractKeyEach<InstanceEach<M>, K>>;

type MergePair<A, B> = [A] extends [never] ? B : [B] extends [never] ? A : ShallowMerge<A, B>;
type MergeValues<T extends ReadonlyArray<unknown>> = T extends readonly [infer First, ...infer Rest]
	? [First] extends [never]
		? MergeValues<Rest>
		: Rest extends ReadonlyArray<unknown>
			? Rest['length'] extends 0
				? First
				: MergePair<First, MergeValues<Rest>>
			: never
	: never;

type MergeResult<
	M extends GeneralModuleInput,
	K extends Keys<InstanceEach<M>[number]>,
	Pr extends object,
	Po extends object,
> = MergeObjects<[Pr, ...PickEach<InstanceEach<M>, K>, Po]>;

export type Context<
	M extends ReadonlyArray<ModuleConstructor<General>>,
	K extends Keys<InstanceEach<M>[number]>,
	Pr extends object = {},
	Po extends object = {},
> = MergeResult<M, K, Pr, Po> & {
	__modules__: WeakMap<M[number], InstanceType<M[number]>>;
	__getModule__: <C extends M[number]>(ctor: C) => InstanceType<C>;
	__addModule__: <N extends ModuleConstructor<MergeResult<[...M, N], K, Pr, Po>>>(
		newModule: N,
	) => Context<[...M, N], K, Pr, Po>;
	__assign__: (obj: Partial<MergeResult<M, K, Pr, Po>>) => Context<M, K, Pr, Po>;
};

const ROOT_KEY = 'root';
type RootKey = typeof ROOT_KEY;

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assignShallow(target: Record<string, unknown>, key: string, value: unknown) {
	if (value === undefined) return target;
	const current = target[key];
	if (isPlainObject(current) && isPlainObject(value)) {
		Object.assign(current, value);
		target[key] = current;
	} else target[key] = value;
	return target;
}

function mergeShallow(target: Record<string, unknown>, source: unknown) {
	if (!isPlainObject(source)) return target;
	for (const key of Object.keys(source)) assignShallow(target, key, source[key]);
	return target;
}

/**
 * Creates shared context from ordered modules.
 *
 * Merge order: `preMerge` -> module keys -> `postMerge` -> `assign`.
 * Object values merge shallowly. Module key `root` flattens into context root
 * instead of assigning `context.root`.
 *
 * After final merge, `injectKeys` are written back to every instance. When
 * omitted, `mergeKeys` are reused. Injecting `root` writes whole context.
 *
 * Returned context also exposes `__modules__`, `__getModule__`, and
 * `__addModule__` as non-enumerable helpers.
 *
 * @typeParam Po Object merged after module output.
 * @typeParam Pr Object merged before module construction.
 * @typeParam M Ordered module constructor list.
 * @typeParam K Keys copied from modules into context.
 * @typeParam I Keys injected back into module instances.
 * @param classes Module constructors instantiated in order.
 * @param options Context build options.
 * @param options.preMerge Values merged before module construction.
 * @param options.postMerge Values merged after module merges.
 * @param options.assign Final values assigned after all other merges.
 * @param options.mergeKeys Instance keys merged into context.
 * @param options.injectKeys Instance keys updated from final context. Defaults to
 * `mergeKeys`.
 * @returns Context object containing merged values plus module helper methods.
 */
export default function createContext<
	Po extends object,
	Pr extends object,
	M extends ReadonlyArray<ModuleConstructor<Context<M, K, Pr, Po>>>,
	K extends Keys<InstanceEach<M>[number]>,
	I extends K = K,
>(
	classes: M,
	options: {
		preMerge?: Pr;
		postMerge?: Po;
		mergeKeys: ReadonlyArray<K>;
		injectKeys?: ReadonlyArray<I>;
	},
): Context<M, K, Pr, Po> {
	const context: Record<string, unknown> = {};
	const mergeKeys = options.mergeKeys;
	const injectKeys = (options.injectKeys ?? options.mergeKeys) as ReadonlyArray<string>;
	const instances: Array<Record<string, unknown>> = [];
	const modules = new WeakMap<ModuleConstructor<General>>();

	const mergeInstance = (instance: Record<string, unknown>) => {
		for (const key of mergeKeys) {
			const value = instance[key as string];
			if (key === ROOT_KEY) {
				if (isPlainObject(value)) mergeShallow(context, value);
				continue;
			}
			assignShallow(context, key as string, value);
		}
	};

	const finalizeContext = () => {
		mergeShallow(context, options.postMerge);
		injectContext();
	};

	const registerModule = <C extends ModuleConstructor<General>>(Class: C) => {
		const instance = new Class(context as Context<M, K, Pr, Po>);
		const record = instance as Record<string, unknown>;
		modules.set(Class, instance);
		instances.push(record);
		mergeInstance(record);
	};

	const injectContext = () => {
		for (const instance of instances)
			for (const key of injectKeys) {
				if (context[key] === undefined) context[key] = {};
				instance[key] = key === ROOT_KEY ? context : context[key];
			}
	};

	Object.defineProperties(context, {
		__addModule__: {
			enumerable: false,
			value: <N extends ModuleConstructor<MergeResult<[...M, N], K, Pr, Po>>>(
				newModule: N,
			) => {
				registerModule(newModule);
				finalizeContext();
				return context as Context<[...M, N], K, Pr, Po>;
			},
		},
		__assign__: {
			enumerable: false,
			value: (obj: Partial<MergeResult<M, K, Pr, Po>>) => mergeShallow(context, obj),
		},
		__getModule__: {
			enumerable: false,
			value: <C extends M[number]>(ctor: C) => {
				const instance = modules.get(ctor);
				if (!instance) throw new Error('Module not found in context');
				return instance as InstanceType<C>;
			},
		},
		__modules__: {
			enumerable: false,
			value: modules,
		},
	});

	mergeShallow(context, options.preMerge);
	for (const Class of classes) registerModule(Class);
	finalizeContext();
	return context as Context<M, K, Pr, Po>;
}
