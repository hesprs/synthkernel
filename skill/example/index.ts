/**
 * PolisAlert Loader
 * Dependency injection enabled: Yes (@needle-di/core)
 * Augmentation enabled: Yes
 * Lifecycle hooks:
 *   onStart: Fired when all modules are loaded and initialized
 *   onDispose: Fired when the application is disposed
 * Orchestrations:
 *   options: Module-contributed configuration options
 *   augmentation: Module-contributed methods and properties exposed to consumers
 */

import type { AugmentedConstructor } from 'synthkernel';
import { Container } from 'synthkernel/di';
import type { Augmentation, BaseModule, Options, BaseModuleCtor } from './BaseModule.ts';
import AlertDispatch from './AlertDispatch.ts';
import CoreLogging from './CoreLogging.ts';

export type BaseOptions = {
	appName: string;
	debug?: boolean;
};

const allModules = [CoreLogging, AlertDispatch];
type AllModules = typeof allModules;

type AllOptions = Options<AllModules> & BaseOptions;
type AllAugmentation = Augmentation<AllModules>;

class PolisAlert {
	private readonly loadedModules: Array<BaseModule> = [];
	container: Container;

	private readonly augment = (aug: object) => {
		const descriptors = Object.getOwnPropertyDescriptors(aug);
		Object.defineProperties(this, descriptors);
	};

	constructor(public options: AllOptions) {
		this.container = new Container();

		const bind = (Module: BaseModuleCtor) => {
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
		allModules.forEach((Module: BaseModuleCtor) => this.container.get(Module));

		this.loadedModules.forEach((module) => {
			this.augment(module.augmentation);
			module.onStart();
		});
	}

	dispose = () => {
		this.loadedModules.reverse();
		while (this.loadedModules.length) this.loadedModules.pop()?.onDispose();
		this.container.unbindAll();
	};
}

export default PolisAlert as AugmentedConstructor<typeof PolisAlert, AllAugmentation>;
