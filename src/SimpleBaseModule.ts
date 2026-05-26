import type { Orchestratable, ModuleInput as MI } from 'synthkernel';
import type { Container } from 'synthkernel/di';

type ModuleInput = MI<SinpleBaseModuleCtor>;
export type BaseArgs = ConstructorParameters<SinpleBaseModuleCtor>;
export type SinpleBaseModuleCtor = typeof SimpleBaseModule;

export type Options<M extends ModuleInput> = Orchestratable<M, 'options'>;
export type Augmentation<M extends ModuleInput> = Orchestratable<M, 'augmentation'>;

export class SimpleBaseModule {
	constructor(
		protected container: Container,
		public options: object,
	) {}

	onStart(): void {}
	onDispose(): void {}
	readonly augmentation: object = {};
}
