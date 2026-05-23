import type { AugmentedConstructor } from 'synthkernel';
import type { Augmentation, Options } from 'synthkernel/simple-suite';
import { SimpleLoader } from 'synthkernel/simple-suite';
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

class PolisAlert extends SimpleLoader<AllOptions> {
	constructor(options: AllOptions) {
		super(options, allModules);
	}
}

export default PolisAlert as AugmentedConstructor<typeof PolisAlert, AllAugmentation>;
