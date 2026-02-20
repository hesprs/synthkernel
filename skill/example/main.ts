/**
 * PolisAlert Consumer Example
 * Demonstrates type-safe augmentation and module composition
 */

import PolisAlert from './index.ts';

// Create the loader with orchestrated options from all modules
const app = new PolisAlert({
	appName: 'PolisAlert',
	debug: true,
	logLevel: 'DEBUG',
	maxLogs: 500,
	minMessageLength: 1,
	maxMessageLength: 280,
});

// Type-safe access to augmented methods
app.log('INFO', 'Application started');

const success = await app.dispatchAlert('Hello Polis');
console.log('Dispatch result:', success);

// Access orchestrated state
console.log('Audit trail:', app.logs);

// Cleanup
app.dispose();
