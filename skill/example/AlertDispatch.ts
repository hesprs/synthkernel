/**
 * AlertDispatch: Handles validation and transmission of alerts
 */

import type { Hook } from 'synthkernel';
import type { LogEntry, Level } from './CoreLogging.ts';

export default class AlertDispatch {
	private readonly unsub: () => void;

	constructor(
		private readonly ctx: {
			log: (level: Level, msg: string) => void;
			onLogOverflow: Hook<[LogEntry]>;
		},
	) {
		this.unsub = ctx.onLogOverflow.subscribe((log) =>
			this.dispatchAlert(`Log overflow: ${JSON.stringify(log)}`),
		);
	}

	dispatchAlert = async (message: string): Promise<boolean> => {
		this.ctx.log('INFO', `Attempted dispatch: "${message}"`);
		const { minMessageLength, maxMessageLength } = this.options;
		if (message.length < minMessageLength) {
			this.ctx.log(
				'ERROR',
				`Validation failed: message too short (min: ${minMessageLength})`,
			);
			return false;
		}
		if (message.length > maxMessageLength) {
			this.ctx.log('ERROR', `Validation failed: message too long (max: ${maxMessageLength})`);
			return false;
		}

		await this.connectAlertService(message);
		return true;
	};

	private readonly connectAlertService = async (alert: string) => {
		this.ctx.log('INFO', `Dispatched: "${alert}"`);
		// Simulate async connection to alerting service, like an email API
		await new Promise((resolve) => setTimeout(resolve, 10));
	};

	onDispose() {
		this.unsub();
		this.ctx.log('INFO', 'AlertDispatch disposed');
	}
	onStart() {
		this.ctx.log('INFO', 'AlertDispatch initialized');
	}
	root = { dispatchAlert: this.dispatchAlert };
	declare options: {
		minMessageLength: number;
		maxMessageLength: number;
	};
}
