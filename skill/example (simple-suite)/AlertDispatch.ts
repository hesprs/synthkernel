import type { BaseArgs } from 'synthkernel/simple-suite';
import { SimpleBaseModule } from 'synthkernel/simple-suite';
import CoreLogging from './CoreLogging.ts';

type Options = {
	minMessageLength: number;
	maxMessageLength: number;
};

type Augmentation = {
	dispatchAlert: AlertDispatch['dispatchAlert'];
};

export default class AlertDispatch extends SimpleBaseModule<Options, Augmentation> {
	private readonly logging: CoreLogging;
	private readonly unsub: () => void;

	constructor(...args: BaseArgs) {
		super(...args);
		this.logging = this.container.get(CoreLogging);
		this.unsub = this.logging.onOverflow.subscribe((log) =>
			this.dispatchAlert(`Log overflow: ${JSON.stringify(log)}`),
		);
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
		this.unsub();
		this.logging.log('INFO', 'AlertDispatch disposed');
	}
	onStart() {
		this.logging.log('INFO', 'AlertDispatch initialized');
	}
	augmentation = { dispatchAlert: this.dispatchAlert };
}
