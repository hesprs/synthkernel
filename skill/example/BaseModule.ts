import type { Container } from '@needle-di/core';
import type { BaseOptions } from './index.ts';
import type { General, GeneralObject, ModuleInput as MI, Orchestratable } from './types.ts';

type ModuleInput = MI<GeneralModuleCtor>;
export type BaseArgs = ConstructorParameters<typeof BaseModule>;
export type GeneralModule = BaseModule<General, General>;
export type GeneralModuleCtor = new (...args: BaseArgs) => GeneralModule;

export type Options<M extends ModuleInput> = Orchestratable<M, 'options'>;
export type Augmentation<M extends ModuleInput> = Orchestratable<M, 'augmentation'>;

export abstract class BaseModule<
	O extends BaseOptions = BaseOptions,
	A extends GeneralObject = {},
> {
	options: O;

	constructor(
		protected container: Container,
		options: GeneralObject,
	) {
		this.options = options as O;
	}

	abstract onStart?(): void;
	abstract onDispose?(): void;
	abstract augmentation: A;
}
