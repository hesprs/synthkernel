import type { GeneralArray } from './types.ts';

type MatchingFunc<Args extends GeneralArray> = (...args: Args) => unknown;
export type Hook<Args extends GeneralArray> = {
	(...args: Args): void;
	subs: Set<MatchingFunc<Args>>;
	subscribe(callback: MatchingFunc<Args>): void;
	unsubscribe(callback: MatchingFunc<Args>): void;
};

/**
 * A quick function to create a hook that can be subscribed to and unsubscribed from.
 * Pass your arguments as the type parameter
 * @example const hook = makeHook(true) the hook will run in reverse order of subscription
 */
export function makeHook<Args extends GeneralArray = []>(reverse: boolean = false) {
	const result: Hook<Args> = (...args: Args) => {
		if (reverse) {
			const items = Array.from(result.subs).reverse();
			items.forEach((callback) => {
				callback(...args);
			});
		} else
			result.subs.forEach((callback) => {
				callback(...args);
			});
	};
	result.subs = new Set();
	result.subscribe = (callback: MatchingFunc<Args>) => {
		result.subs.add(callback);
	};
	result.unsubscribe = (callback: MatchingFunc<Args>) => {
		result.subs.delete(callback);
	};
	return result;
}
