// #region [DO NOT MODIFY] SynthKernel Core Types
// oxlint-disable-next-line typescript/no-explicit-any
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
