import { Container } from '@needle-di/core';
import type { SinpleBaseModuleCtor, SimpleBaseModule } from './SimpleBaseModule';

export default class SimpleLoader<A extends object> {
	private readonly loadedModules: Array<SimpleBaseModule> = [];
	container: Container;

	private readonly augment = (aug: object) => {
		const descriptors = Object.getOwnPropertyDescriptors(aug);
		Object.defineProperties(this, descriptors);
	};

	constructor(
		public options: A,
		allModules: Array<SinpleBaseModuleCtor>,
	) {
		this.container = new Container();

		const bind = (Module: SinpleBaseModuleCtor) => {
			this.container.bind({
				provide: Module,
				useFactory: () => {
					const module = new Module(this.container, this.options);
					this.loadedModules.push(module);
					return module;
				},
			});
		};

		allModules.forEach(bind);
		allModules.forEach((Module: SinpleBaseModuleCtor) => this.container.get(Module));

		this.loadedModules.forEach((module) => {
			this.augment(module.augmentation);
			module.onStart?.();
		});
	}

	dispose = () => {
		this.loadedModules.reverse();
		while (this.loadedModules.length) this.loadedModules.pop()?.onDispose?.();
		this.container.unbindAll();
	};
}
