import { expect, test } from 'vitest';
import { computed, hook, ref } from '../src/reactive';

test('ref reads initial value and updates subscribers', () => {
	const count = ref(1);
	const events: Array<[number, number]> = [];
	const unsubscribe = count.subscribe((next, prev) => events.push([next, prev]));

	expect(count()).toBe(1);

	count(2);
	expect(count()).toBe(2);
	expect(events).toStrictEqual([[2, 1]]);

	unsubscribe();
	count(3);
	expect(events).toStrictEqual([[2, 1]]);
});

test('ref skips equal updates and supports custom equality', () => {
	const count = ref({ value: 1 }, { equals: (a, b) => a.value === b.value });
	const events: Array<[number, number]> = [];
	count.subscribe((next, prev) => events.push([next.value, prev.value]));

	count({ value: 1 });
	count({ value: 2 });

	expect(events).toStrictEqual([[2, 1]]);
});

test('ref dispose clears all subscribers', () => {
	const value = ref(0);
	let calls = 0;
	value.subscribe(() => {
		calls += 1;
	});

	value.dispose();
	value(1);

	expect(calls).toBe(0);
});

test('hook publishes to subscribers', () => {
	const emit = hook<[string, number]>();
	const events: Array<[string, number]> = [];
	const unsubscribe = emit.subscribe((name, count) => events.push([name, count]));

	emit('a', 1);
	emit('b', 2);
	expect(events).toStrictEqual([
		['a', 1],
		['b', 2],
	]);

	unsubscribe();
	emit('c', 3);
	expect(events).toStrictEqual([
		['a', 1],
		['b', 2],
	]);
});

test('hook dispose clears all subscribers', () => {
	const emit = hook();
	let calls = 0;
	emit.subscribe(() => {
		calls += 1;
	});

	emit.dispose();
	emit();

	expect(calls).toBe(0);
});

test('computed tracks refs automatically', () => {
	const count = ref(1);
	const double = computed(() => count() * 2);
	const events: Array<[number, number]> = [];
	double.subscribe((next, prev) => events.push([next, prev]));

	expect(double()).toBe(2);

	count(2);
	expect(double()).toBe(4);
	expect(events).toStrictEqual([[4, 2]]);
});

test('computed supports explicit deps', () => {
	const left = ref(1);
	const right = ref(2);
	const total = computed(() => left() + right(), { deps: [left, right] });
	const events: Array<[number, number]> = [];
	total.subscribe((next, prev) => events.push([next, prev]));

	expect(total()).toBe(3);

	left(3);
	right(4);

	expect(total()).toBe(7);
	expect(events).toStrictEqual([
		[5, 3],
		[7, 5],
	]);
});

test('computed dispose unsubscribes from dependencies', () => {
	const count = ref(1);
	const double = computed(() => count() * 2);
	let calls = 0;
	double.subscribe(() => {
		calls += 1;
	});

	double.dispose();
	count(2);

	expect(calls).toBe(0);
});
