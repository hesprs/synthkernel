import { Container } from '@needle-di/core';
import type { Orchestratable, ModuleInput as MI } from './types';

type ModuleInput = MI<GeneralModuleCtor>;
export type BaseArgs = ConstructorParameters<typeof SimpleBaseModule>;
export type GeneralModule = SimpleBaseModule<any, any>;
export type GeneralModuleCtor = new (...args: BaseArgs) => GeneralModule;

export type Options<M extends ModuleInput> = Orchestratable<M, 'options'>;
export type Augmentation<M extends ModuleInput> = Orchestratable<M, 'augmentation'>;

export abstract class SimpleBaseModule<O extends object = {}, A extends object = {}> {
	options: O;

	constructor(
		protected container: Container,
		options: object,
	) {
		this.options = options as O;
	}

	abstract onStart?(): void;
	abstract onDispose?(): void;
	abstract augmentation: A;
}
