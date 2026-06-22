import type { MergeSingleKey, Context } from 'synthkernel';
import { createContext } from 'synthkernel';
import type { Level, LogEntry } from './CoreLogging.ts';
import AlertDispatch from './AlertDispatch.ts';
import CoreLogging from './CoreLogging.ts';

export type BaseOptions = {
	appName: string;
	debug?: boolean;
};

const allModules = [CoreLogging, AlertDispatch] as const;
type AllModules = typeof allModules;

class PolisAlert {
	private ctx?: Context<AllModules, 'options' | 'root'>;

	dispatchAlert: (message: string) => Promise<boolean>;
	log: (level: Level, message: string) => void;
	logs: Array<LogEntry>;

	constructor(public options: MergeSingleKey<AllModules, 'options'>) {
		this.ctx = createContext(allModules, { mergeKeys: ['options', 'root'] }).__assign__({
			options,
		});
		for (const ctor of allModules) this.ctx.__getModule__(ctor).onStart();

		// Augmentation
		this.dispatchAlert = this.ctx.dispatchAlert;
		this.log = this.ctx.log;
		this.logs = this.ctx.logs;
	}

	dispose = () => {
		for (const ctor of allModules.toReversed()) this.ctx?.__getModule__(ctor).onDispose();
		this.ctx = undefined;
	};
}

export default PolisAlert;
