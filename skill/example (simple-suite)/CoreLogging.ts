import { hook } from 'synthkernel';
import { SimpleBaseModule } from 'synthkernel/simple-suite';
import type { BaseOptions } from './index.ts';

// Helper to enforce hierarchy
const LEVELS = { DEBUG: 0, ERROR: 3, INFO: 1, WARN: 2 } as const;
type Level = keyof typeof LEVELS;

type Options = {
	logLevel: Level;
	maxLogs?: number;
} & BaseOptions;

type Augmentation = {
	log: CoreLogging['log'];
	logs: ReadonlyArray<LogEntry>;
};

type LogEntry = {
	timestamp: number;
	level: string;
	message: string;
};

export default class CoreLogging extends SimpleBaseModule<Options, Augmentation> {
	private logs: Array<LogEntry> = [];
	onOverflow = hook<[LogEntry]>(); // A hook to notify when log overflow occurs for other modules to subscribe to

	log = (level: Level, message: string) => {
		const currentLevel = LEVELS[level];
		const minLevel = LEVELS[this.options.logLevel] ?? 0;
		if (currentLevel < minLevel) return; // Skip logging if below threshold
		const entry: LogEntry = {
			level,
			message,
			timestamp: Date.now(),
		};
		const maxLogs = this.options.maxLogs ?? 1000;
		if (this.logs.length >= maxLogs) this.onOverflow(this.logs.shift()!);
		this.logs.push(entry);

		// Always print if debug mode is forced in base options, otherwise respect level
		if (this.options.debug || currentLevel >= minLevel) console.log(`[${level}] ${message}`);
	};

	onStart(): void {
		this.log('INFO', 'CoreLogging initialized');
	}
	onDispose(): void {
		this.log('INFO', 'CoreLogging disposed');
		this.logs = [];
		this.onOverflow.dispose();
	}
	get augmentation() {
		const self = this;
		return {
			log: this.log,
			get logs(): ReadonlyArray<LogEntry> {
				return Object.freeze([...self.logs]);
			},
		};
	}
}
