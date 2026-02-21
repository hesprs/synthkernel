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
import type { Augmentation, GeneralModuleCtor, Options } from './BaseModule.ts';
import type { GeneralObject } from './types.ts';
import { AlertDispatch } from './AlertDispatch.ts';
import { CoreLogging } from './CoreLogging.ts';
import { makeHook } from './utilities.ts';

// #region Base Orchestrations
export interface BaseOptions {
	appName: string;
	debug?: boolean;
}
// #endregion

const allModules = [CoreLogging, AlertDispatch];
type AllModules = typeof allModules;

type AllOptions = Options<AllModules>;
type AllAugmentation = Augmentation<AllModules>;

class PolisAlert {
	private onDispose = makeHook(true);
	private onStart = makeHook();

	options: AllOptions;

	container: Container;

	private augment = (aug: GeneralObject) => {
		const descriptors = Object.getOwnPropertyDescriptors(aug);
		Object.defineProperties(this, descriptors);
	};

	constructor(options: AllOptions) {
		this.container = new Container();
		this.options = options;

		const bind = (Module: GeneralModuleCtor) => {
			this.container.bind({
				provide: Module,
				useFactory: () =>
					new Module(
						this.container,
						this.options,
						this.onStart,
						this.onDispose,
						this.augment,
					),
			});
		};

		allModules.forEach(bind);
		allModules.forEach((Module: GeneralModuleCtor) => {
			this.container.get(Module);
		});

		this.onStart();
	}

	dispose = () => {
		this.onDispose();
		this.container.unbindAll();
	};
}

type LoaderType = new (
	...args: ConstructorParameters<typeof PolisAlert>
) => PolisAlert & AllAugmentation;
export default PolisAlert as LoaderType;
