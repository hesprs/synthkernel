// oxlint-disable vitest/require-hook
/**
 * PolisAlert Consumer Example
 * Demonstrates type-safe module composition and root API exposure
 */

import PolisAlert from './index.ts';

// Create the loader with orchestrated options from all modules
const app = new PolisAlert({
	appName: 'PolisAlert',
	logLevel: 'DEBUG',
	maxLogs: 500,
	maxMessageLength: 280,
	minMessageLength: 1,
});

// Type-safe access to root APIs
app.log('INFO', 'Application started');

const success = await app.dispatchAlert('Hello Polis');
console.log('Dispatch result:', success);

// Access orchestrated state
console.log('Audit trail:', app.logs);

// Cleanup
app.dispose();
