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

import { Container } from '@needle-di/core';
import type { Augmentation, GeneralModuleCtor, Options, GeneralModule } from './BaseModule.ts';
import type { GeneralObject } from './types.ts';
import AlertDispatch from './AlertDispatch.ts';
import CoreLogging from './CoreLogging.ts';

// #region Base Orchestrations
export type BaseOptions = {
	appName: string;
	debug?: boolean;
};
// #endregion

const allModules = [CoreLogging, AlertDispatch];
type AllModules = typeof allModules;

type AllOptions = Options<AllModules>;
type AllAugmentation = Augmentation<AllModules>;

class PolisAlert {
	private readonly loadedModules: Array<GeneralModule> = [];
	container: Container;

	private readonly augment = (aug: GeneralObject) => {
		const descriptors = Object.getOwnPropertyDescriptors(aug);
		Object.defineProperties(this, descriptors);
	};

	constructor(public options: AllOptions) {
		this.container = new Container();

		const bind = (Module: GeneralModuleCtor) => {
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
		allModules.forEach((Module: GeneralModuleCtor) => this.container.get(Module));

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

type LoaderType = new (
	...args: ConstructorParameters<typeof PolisAlert>
) => PolisAlert & AllAugmentation;
export default PolisAlert as LoaderType;
