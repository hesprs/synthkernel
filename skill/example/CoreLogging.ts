/**
 * CoreLogging: Provides centralized logging functionality and audit trail
 */

import { hook } from 'synthkernel';
import type { BaseOptions } from './index.ts';

// Helper to enforce hierarchy
const LEVELS = { DEBUG: 0, ERROR: 3, INFO: 1, WARN: 2 } as const;
export type Level = keyof typeof LEVELS;

export type LogEntry = {
	timestamp: number;
	level: string;
	message: string;
};

export default class CoreLogging {
	private logs: Array<LogEntry> = [];
	private readonly onOverflow = hook<[LogEntry]>(); // A hook to notify when log overflow occurs for other modules to subscribe to
	declare options: {
		logLevel: Level;
		maxLogs?: number;
	} & BaseOptions;

	private readonly log = (level: Level, message: string) => {
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
	}
	root = {
		log: this.log,
		logs: this.logs,
		onLogOverflow: this.onOverflow,
	};
}
