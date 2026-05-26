import type { Orchestratable, ModuleInput as MI } from 'synthkernel';
import type { Container } from 'synthkernel/di';

type ModuleInput = MI<BaseModuleCtor>;
export type BaseArgs = ConstructorParameters<BaseModuleCtor>;
export type BaseModuleCtor = typeof BaseModule;

export type Options<M extends ModuleInput> = Orchestratable<M, 'options'>;
export type Augmentation<M extends ModuleInput> = Orchestratable<M, 'augmentation'>;

export class BaseModule {
	constructor(
		protected container: Container,
		public options: object,
	) {}

	onStart(): void {}
	onDispose(): void {}
	readonly augmentation: object = {};
}
