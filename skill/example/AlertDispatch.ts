/**
 * AlertDispatch: Handles validation and transmission of alerts
 */

import type { BaseOptions } from './index.ts';
import { type BaseArgs, BaseModule } from './BaseModule.ts';
import { CoreLogging } from './CoreLogging.ts';

interface Options extends BaseOptions {
	minMessageLength: number;
	maxMessageLength: number;
}

interface Augmentation {
	dispatchAlert: AlertDispatch['dispatchAlert'];
}

export class AlertDispatch extends BaseModule<Options, Augmentation> {
	private logging: CoreLogging;

	constructor(...args: BaseArgs) {
		super(...args);
		this.augment({ dispatchAlert: this.dispatchAlert });
		this.logging = this.container.get(CoreLogging);
		this.onStart(() => {
			this.logging.log('INFO', 'AlertDispatch initialized');
		});
		this.onDispose(() => {
			this.logging.log('INFO', 'AlertDispatch disposed');
		});
	}

	dispatchAlert = async (message: string): Promise<boolean> => {
		this.logging.log('INFO', `Attempted dispatch: "${message}"`);
		const { minMessageLength, maxMessageLength } = this.options;
		if (message.length < minMessageLength) {
			this.logging.log(
				'ERROR',
				`Validation failed: message too short (min: ${minMessageLength})`,
			);
			return false;
		}
		if (message.length > maxMessageLength) {
			this.logging.log(
				'ERROR',
				`Validation failed: message too long (max: ${maxMessageLength})`,
			);
			return false;
		}

		await this.connectAlertService(message);
		return true;
	};

	private connectAlertService = async (alert: string) => {
		this.logging.log('INFO', `Dispatched: "${alert}"`);

		// Simulate async connection to alerting service, like an email api
		await new Promise((resolve) => setTimeout(resolve, 10));
	};
}
