type RefMatchingFunc<T> = (newValue: T, oldValue: T) => void;
export type Ref<T> = {
	(): T;
	(newValue: T): void;
	subscribe(func: RefMatchingFunc<T>): () => void;
	unsubscribe(func: RefMatchingFunc<T>): void;
	dispose(): void;
};
type RefOptions<T> = { equals?: (newValue: T, oldValue: T) => boolean };

export function ref<T>(initial: T, options?: RefOptions<T>): Ref<T> {
	const { equals = (a: T, b: T) => a === b } = options ?? {};
	let value = initial;
	const subs = new Set<RefMatchingFunc<T>>();
	const result: Ref<T> = ((newValue?: T) => {
		if (newValue === undefined) {
			activeTracker?.(result);
			return value;
		}
		if (equals(newValue, value)) return;
		const oldValue = value;
		value = newValue;
		// Spread is needed to avoid mutating the set while iterating
		// oxlint-disable-next-line unicorn/no-useless-spread
		for (const callback of [...subs]) callback(newValue, oldValue);
	}) as Ref<T>;
	result.subscribe = (callback: RefMatchingFunc<T>) => {
		subs.add(callback);
		return () => result.unsubscribe(callback);
	};
	result.unsubscribe = (callback: RefMatchingFunc<T>) => subs.delete(callback);
	result.dispose = () => subs.clear();
	return result;
}

type HookMatchingFunc<Args extends GeneralArray> = (...args: Args) => void;
type GeneralArray = ReadonlyArray<unknown>;
export type Hook<Args extends GeneralArray = []> = {
	(...args: Args): void;
	subscribe(callback: HookMatchingFunc<Args>): () => void;
	unsubscribe(callback: HookMatchingFunc<Args>): void;
	dispose(): void;
};

export function hook<Args extends GeneralArray = []>(): Hook<Args> {
	const subs = new Set<HookMatchingFunc<Args>>();
	const result: Hook<Args> = (...args: Args) => {
		// Spread is needed to avoid mutating the set while iterating
		// oxlint-disable-next-line unicorn/no-useless-spread
		for (const callback of [...subs]) callback(...args);
	};
	result.subscribe = (callback: HookMatchingFunc<Args>) => {
		subs.add(callback);
		return () => result.unsubscribe(callback);
	};
	result.unsubscribe = (callback: HookMatchingFunc<Args>) => subs.delete(callback);
	result.dispose = () => subs.clear();
	return result;
}

let activeTracker: ((ref: Trackable) => void) | undefined;
type Trackable = Ref<any> | Computed<any>;
export type Computed<T> = {
	(): T;
	subscribe(func: RefMatchingFunc<T>): () => void;
	unsubscribe(func: RefMatchingFunc<T>): void;
	dispose(): void;
};
type ComputedOptions<T> = {
	equals?: (newValue: T, oldValue: T) => boolean;
	deps?: Array<Trackable>;
};

export function computed<T>(getter: () => T, options?: ComputedOptions<T>): Computed<T> {
	const { equals = (a: T, b: T) => a === b, deps: _deps } = options ?? {};
	let value: T;
	const subs = new Set<RefMatchingFunc<T>>();
	const result: Computed<T> = () => {
		activeTracker?.(result);
		return value;
	};
	const update = () => {
		const oldValue = value;
		const newValue = getter();
		if (equals(newValue, oldValue)) return;
		value = newValue;
		// Spread is needed to avoid mutating the set while iterating
		// oxlint-disable-next-line unicorn/no-useless-spread
		for (const callback of [...subs]) callback(newValue, oldValue);
	};
	const deps: Array<Trackable> = [];
	if (_deps) {
		deps.push(..._deps);
		value = getter();
	} else {
		const prev = activeTracker;
		activeTracker = (r) => deps.push(r);
		value = getter();
		activeTracker = prev;
	}
	const cleanup = deps.map((dep) => dep.subscribe(update));
	result.subscribe = (cb) => {
		subs.add(cb);
		return () => result.unsubscribe(cb);
	};
	result.unsubscribe = (cb) => subs.delete(cb);
	result.dispose = () => {
		while (cleanup.length) cleanup.pop()!();
		subs.clear();
	};
	return result;
}
