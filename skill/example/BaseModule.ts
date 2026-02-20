import type { Container } from '@needle-di/core';
import type { BaseOptions } from './index.ts';
import type { General, GeneralObject, ModuleInput as MI, Orchestratable } from './types.ts';
import type { Hook } from './utilities.ts';

type ModuleInput = MI<GeneralModuleCtor>;
export type GeneralModuleCtor = typeof BaseModule<General, General>;
export type BaseArgs = ConstructorParameters<GeneralModuleCtor>;

export type Options<M extends ModuleInput> = Orchestratable<M, 'options'>;
export type Augmentation<M extends ModuleInput> = Orchestratable<M, '_Augmentation'>;

export class BaseModule<O extends BaseOptions = BaseOptions, A extends GeneralObject = {}> {
	declare private static readonly _BaseModuleBrand: unique symbol;
	declare _Augmentation: A;

	options: O;

	onStart: Hook['subscribe'];
	onDispose: Hook['subscribe'];
    
    container: Container;
    augment: (aug: A) => void;
	constructor(
		container: Container,
		options: GeneralObject,
		onStart: Hook,
		onDispose: Hook,
		augment: (aug: A) => void,
	) {
        this.container = container;
        this.augment = augment;
        // we assign the above two lines for Node.js compatibility. If you have a TypeScript compiler you can remove them and simply write in the constructor:
        // protected container: Container,
		// protected augment: (aug: A) => void,

		this.options = options as O;

		this.onStart = onStart.subscribe;
		this.onDispose = onDispose.subscribe;
	}
}
