import type { GeneralArray } from './types.ts';

type MatchingFunc<Args extends GeneralArray> = (...args: Args) => void | Promise<void>;
export type Hook<Args extends GeneralArray = [], Async extends boolean = false> = {
	(...args: Args): Async extends true ? Promise<void> : void;
	subs: Set<MatchingFunc<Args>>;
	subscribe(callback: MatchingFunc<Args>): void;
	unsubscribe(callback: MatchingFunc<Args>): void;
};

/**
 * A quick function to create a hook that can be subscribed to and unsubscribed from.
 * Pass your arguments as the type parameter
 *
 * @param reverse - Whether the hook should reverse the execution order or not
 * @param async - Whether the hook is async or not
 * @example const hook = makeHook(true);
 */
export function makeHook<Args extends GeneralArray = [], Async extends boolean = false>(
	reverse: boolean = false,
	async: Async = false as Async,
) {
	const result = (async
		? async (...args: Args) => {
			if (reverse) {
				const items = Array.from(result.subs).reverse();
				for (const callback of items) await callback(...args);
			} else for (const callback of result.subs) await callback(...args);
		}
		: (...args: Args) => {
			if (reverse) {
				const items = Array.from(result.subs).reverse();
				for (const callback of items) void callback(...args);
			} else for (const callback of result.subs) void callback(...args);
		}) as Hook<Args, Async>;
	result.subs = new Set();
	result.subscribe = (callback: MatchingFunc<Args>) => {
		result.subs.add(callback);
	};
	result.unsubscribe = (callback: MatchingFunc<Args>) => {
		result.subs.delete(callback);
	};
	return result;
}
