/**
 * CoreLogging: Provides centralized logging functionality and audit trail
 */

import type { BaseOptions } from './index.ts';
import { BaseModule, type BaseArgs } from './BaseModule.ts';

// Helper to enforce hierarchy
const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 } as const;
type Level = keyof typeof LEVELS;

interface Options extends BaseOptions {
	logLevel: Level;
	maxLogs?: number;
}
interface Augmentation {
	log: CoreLogging['log'];
	logs: ReadonlyArray<LogEntry>;
}

interface LogEntry {
	timestamp: number;
	level: string;
	message: string;
}

export class CoreLogging extends BaseModule<Options, Augmentation> {
	private _logs: LogEntry[] = [];

	constructor(...args: BaseArgs) {
		super(...args);
		const self = this;
		this.augment({
			log: this.log,
			get logs() {
				return Object.freeze([...self._logs]);
			},
		});
		this.onStart(() => {
			this.log('INFO', 'CoreLogging initialized');
		});
		this.onDispose(() => {
			this.log('INFO', 'CoreLogging disposed');
			this._logs = [];
		});
	}

	log = (level: Level, message: string) => {
		// IMPLEMENTED: Check log level hierarchy
		const currentLevel = LEVELS[level];
		const minLevel = LEVELS[this.options.logLevel] ?? 0;
		if (currentLevel < minLevel) return; // Skip logging if below threshold
		const entry: LogEntry = {
			timestamp: Date.now(),
			level,
			message,
		};
		const maxLogs = this.options.maxLogs ?? 1000;
		if (this._logs.length >= maxLogs) this._logs.shift();
		this._logs.push(entry);

		// Always print if debug mode is forced in base options, otherwise respect level
		if (this.options.debug || currentLevel >= minLevel) console.log(`[${level}] ${message}`);
	};
}
