/**
 * AlertDispatch: Handles validation and transmission of alerts
 */

import type { BaseArgs } from './BaseModule.ts';
import type { BaseOptions } from './index.ts';
import { BaseModule } from './BaseModule.ts';
import CoreLogging from './CoreLogging.ts';

type Options = {
	minMessageLength: number;
	maxMessageLength: number;
} & BaseOptions;

type Augmentation = {
	dispatchAlert: AlertDispatch['dispatchAlert'];
};

export default class AlertDispatch extends BaseModule<Options, Augmentation> {
	private readonly logging: CoreLogging;

	constructor(...args: BaseArgs) {
		super(...args);
		this.logging = this.container.get(CoreLogging);
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

	private readonly connectAlertService = async (alert: string) => {
		this.logging.log('INFO', `Dispatched: "${alert}"`);
		// Simulate async connection to alerting service, like an email API
		await new Promise((resolve) => setTimeout(resolve, 10));
	};

	onDispose() {
		this.logging.log('INFO', 'AlertDispatch disposed');
	}
	onStart() {
		this.logging.log('INFO', 'AlertDispatch initialized');
	}
	augmentation = { dispatchAlert: this.dispatchAlert };
}
