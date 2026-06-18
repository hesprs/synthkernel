type General = any;
type GeneralObject = object;
type GeneralConstructor =
	| (new (...args: Array<General>) => General)
	| (abstract new (...args: Array<General>) => General);
type ModuleConstructor<C extends object> = new (context: C) => General;

type GeneralModuleInput = ReadonlyArray<GeneralConstructor> | ReadonlyArray<GeneralObject>;

type Instances<T extends GeneralModuleInput> =
	T extends ReadonlyArray<GeneralConstructor> ? { [K in keyof T]: InstanceType<T[K]> } : T;

export type ModuleInput<T extends GeneralConstructor> =
	| ReadonlyArray<T>
	| ReadonlyArray<InstanceType<T>>;

type IsPlainObject<T> = T extends object
	? T extends Function | Date | RegExp | Array<any> | Map<any, any> | Set<any>
		? false
		: true
	: false;

type ShallowMergeValue<A, B> =
	IsPlainObject<A> extends true ? (IsPlainObject<B> extends true ? Omit<A, keyof B> & B : B) : B;

type ShallowMergeObjects<A extends object, B extends object> = {
	[K in keyof A | keyof B]: K extends keyof B
		? K extends keyof A
			? ShallowMergeValue<A[K], B[K]>
			: B[K]
		: K extends keyof A
			? A[K]
			: never;
};

type RootValue<T extends object, R extends PropertyKey> = R extends keyof T
	? Extract<T[R], object>
	: {};

type PickMerged<T extends object, K extends keyof T, R extends PropertyKey> = ShallowMergeObjects<
	Pick<T, Exclude<K, R>>,
	RootValue<T, R>
>;

type PickEach<T extends ReadonlyArray<object>, K extends keyof T[number], R extends PropertyKey> = {
	[I in keyof T]: PickMerged<T[I], Extract<K, keyof T[I]>, R>;
};

type MergeObjects<T extends ReadonlyArray<object>> = T extends readonly [
	infer First extends object,
	...infer Rest extends ReadonlyArray<object>,
]
	? Rest['length'] extends 0
		? First
		: ShallowMergeObjects<First, MergeObjects<Rest>>
	: {};

type MergeValues<T extends ReadonlyArray<unknown>> = T extends readonly [infer First, ...infer Rest]
	? Rest extends ReadonlyArray<unknown>
		? Rest['length'] extends 0
			? First
			: ShallowMergeValue<First, MergeValues<Rest>>
		: never
	: {};

type MergeResult<
	M extends GeneralModuleInput,
	K extends keyof Instances<M>[number],
	Pr extends object,
	Po extends object,
	R extends string,
> = MergeObjects<[Pr, ...PickEach<Instances<M>, K, R>, Po]>;

export type Context<
	M extends ReadonlyArray<ModuleConstructor<General>>,
	K extends keyof Instances<M>[number],
	Pr extends object = {},
	Po extends object = {},
	R extends string = 'root',
> = MergeResult<M, K, Pr, Po, R> & {
	__modules__: WeakMap<M[number], InstanceType<M[number]>>;
	__getModule__: <C extends M[number]>(ctor: C) => InstanceType<C>;
	__addModule__: <N extends ModuleConstructor<MergeResult<[...M, N], K, Pr, Po, R>>>(
		newModule: N,
	) => Context<[...M, N], K, Pr, Po, R>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeShallow(target: Record<string, unknown>, source: unknown) {
	if (!isPlainObject(source)) return target;
	for (const key of Object.keys(source)) {
		const sourceValue = source[key];
		if (sourceValue === undefined) continue;
		const targetValue = target[key];
		if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
			target[key] = { ...targetValue, ...sourceValue };
			continue;
		}
		target[key] = isPlainObject(sourceValue) ? { ...sourceValue } : sourceValue;
	}
	return target;
}

/**
 * Creates shared context from ordered modules.
 *
 * Merge order: `preMerge` -> module keys -> `postMerge` -> `assign`.
 * Object values merge shallowly. `rootKey` flattens matching module value into
 * context root instead of assigning `context[rootKey]`.
 *
 * After final merge, `injectKeys` are written back to every instance. When
 * omitted, `mergeKeys` are reused. Injecting `rootKey` writes whole context.
 *
 * Returned context also exposes `__modules__`, `__getModule__`, and
 * `__addModule__` as non-enumerable helpers.
 *
 * @typeParam R Root merge key. Defaults to `root`.
 * @typeParam Po Object merged after module output.
 * @typeParam Pr Object merged before module construction.
 * @typeParam M Ordered module constructor list.
 * @typeParam K Keys copied from modules into context.
 * @typeParam I Keys injected back into module instances.
 * @param classes Module constructors instantiated in order.
 * @param options Context build options.
 * @param options.rootKey Key flattened into context root. Defaults to `root`.
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
	M extends ReadonlyArray<ModuleConstructor<Context<M, K, Pr, Po, R>>>,
	K extends keyof Instances<M>[number],
	R extends string = 'root',
	I extends K = K,
>(
	classes: M,
	options: {
		rootKey?: R;
		preMerge?: Pr;
		postMerge?: Po;
		assign?: Partial<MergeResult<M, K, Pr, Po, R>>;
		mergeKeys: ReadonlyArray<K>;
		injectKeys?: ReadonlyArray<I>;
	},
): Context<M, K, Pr, Po, R> {
	const context: Record<string, unknown> = {};
	const rootKey = (options.rootKey ?? 'root') as R;
	const mergeKeys = options.mergeKeys as ReadonlyArray<string>;
	const injectKeys = (options.injectKeys ?? options.mergeKeys) as ReadonlyArray<string>;
	const instances: Array<Record<string, unknown>> = [];
	const modules = new WeakMap<ModuleConstructor<General>>();

	const mergeInstance = (instance: Record<string, unknown>) => {
		for (const key of mergeKeys) {
			const value = instance[key];
			if (value === undefined) continue;
			if (key === rootKey) {
				if (isPlainObject(value)) mergeShallow(context, value);
				continue;
			}

			const current = context[key];
			context[key] =
				isPlainObject(current) && isPlainObject(value)
					? { ...current, ...value }
					: isPlainObject(value)
						? { ...value }
						: value;
		}
	};

	const injectContext = () => {
		for (const instance of instances)
			for (const key of injectKeys) instance[key] = key === rootKey ? context : context[key];
	};

	Object.defineProperties(context, {
		__addModule__: {
			enumerable: false,
			value: <N extends ModuleConstructor<MergeResult<[...M, N], K, Pr, Po, R>>>(
				newModule: N,
			) => {
				const instance = new newModule(context as Context<[...M, N], K, Pr, Po, R>);
				const record = instance as Record<string, unknown>;
				modules.set(newModule, instance);
				instances.push(record);
				mergeInstance(record);
				mergeShallow(context, options.postMerge);
				mergeShallow(context, options.assign);
				injectContext();
				return context as Context<[...M, N], K, Pr, Po, R>;
			},
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

	for (const Class of classes) {
		const instance = new Class(context as Context<M, K, Pr, Po, R>);
		const record = instance as Record<string, unknown>;
		modules.set(Class, instance);
		instances.push(record);
		mergeInstance(record);
	}

	mergeShallow(context, options.postMerge);
	mergeShallow(context, options.assign);
	injectContext();

	return context as Context<M, K, Pr, Po, R>;
}

type ExtractKeyEach<T extends ReadonlyArray<object>, K extends keyof T[number]> = {
	[I in keyof T]: K extends keyof T[I] ? T[I][K] : never;
};
export type MergeSingleKey<
	M extends GeneralModuleInput,
	K extends keyof Instances<M>[number],
> = MergeValues<ExtractKeyEach<Instances<M>, K>>;
