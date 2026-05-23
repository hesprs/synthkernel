type General = any;
type GeneralObject = object;
type GeneralConstructor =
	| (new (...args: Array<General>) => General)
	| (abstract new (...args: Array<General>) => General);

type UnionToIntersection<U> = (U extends General ? (k: U) => void : never) extends (
	k: infer I,
) => void
	? I
	: never;

type GeneralModuleInput = ReadonlyArray<GeneralConstructor> | ReadonlyArray<GeneralObject>;

type Instances<T extends GeneralModuleInput> =
	T extends ReadonlyArray<GeneralConstructor> ? InstanceType<T[number]> : T[number];

export type ModuleInput<T extends GeneralConstructor> =
	| ReadonlyArray<T>
	| ReadonlyArray<InstanceType<T>>;

export type Orchestratable<
	T extends GeneralModuleInput,
	K extends keyof Instances<T>,
> = UnionToIntersection<Instances<T>[K]>;

export type AugmentedConstructor<T extends GeneralConstructor, A extends GeneralObject> = new (
	...args: ConstructorParameters<T>
) => InstanceType<T> & A;
