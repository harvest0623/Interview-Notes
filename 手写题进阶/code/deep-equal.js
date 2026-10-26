/**
 * 深比较 deepEqual
 * 运行：node 手写题进阶/code/deep-equal.js
 */

function deepEqual(a, b, seen = new WeakMap()) {
    // 1. 原始值：Object.is 正确处理 NaN 与 -0
    if (Object.is(a, b)) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
        return false;
    }

    // 2. 循环引用：同一对对象只比较一次
    if (seen.has(a)) return seen.get(a) === b;
    seen.set(a, b);

    // 3. 类型标签必须一致（[] vs {}、Date vs 普通对象）
    const tagA = Object.prototype.toString.call(a);
    const tagB = Object.prototype.toString.call(b);
    if (tagA !== tagB) return false;

    // 4. 特殊对象
    if (a instanceof Date) return a.getTime() === b.getTime();
    if (a instanceof RegExp) return a.source === b.source && a.flags === b.flags;

    if (a instanceof Map) {
        if (a.size !== b.size) return false;
        for (const [key, value] of a) {
            if (!b.has(key) || !deepEqual(value, b.get(key), seen)) return false;
        }
        return true;
    }

    if (a instanceof Set) {
        if (a.size !== b.size) return false;
        for (const value of a) {
            if (!b.has(value)) return false;
        }
        return true;
    }

    // 5. 普通对象 / 数组
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
        if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
        if (!deepEqual(a[key], b[key], seen)) return false;
    }
    return true;
}

/* ------------------------------ 自测 ------------------------------ */

function assert(condition, label) {
    console.log(`${condition ? 'PASS' : 'FAIL'} - ${label}`);
    if (!condition) process.exitCode = 1;
}

assert(deepEqual(1, 1), '原始值相等');
assert(!deepEqual(1, 2), '原始值不等');
assert(deepEqual(NaN, NaN), 'NaN 视为相等');
assert(!deepEqual(0, -0), '0 与 -0 不相等');
assert(deepEqual(null, null), 'null 相等');
assert(!deepEqual(null, undefined), 'null 与 undefined 不等');

assert(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }), '嵌套对象与数组');
assert(!deepEqual({ a: 1 }, { a: 1, b: 2 }), '属性数量不同');
assert(!deepEqual([], {}), '数组与对象不等');
assert(deepEqual(new Date(0), new Date(0)), 'Date 按时间比较');
assert(!deepEqual(new Date(0), new Date(1)), 'Date 时间不同');
assert(deepEqual(/a/g, /a/g), 'RegExp 按 source + flags');
assert(!deepEqual(/a/g, /a/i), 'RegExp flags 不同');
assert(deepEqual(new Map([['a', { x: 1 }]]), new Map([['a', { x: 1 }]])), 'Map 深层比较');
assert(!deepEqual(new Map([['a', 1]]), new Map([['a', 2]])), 'Map value 不同');
assert(deepEqual(new Set([1, 2]), new Set([1, 2])), 'Set 比较');

// 循环引用
const a = { name: 'a' };
const b = { name: 'a' };
a.self = a;
b.self = b;
assert(deepEqual(a, b), '循环引用不死循环');

// 原型不同的两个空对象：当前实现视为相等（只比较自身属性）
class Foo {}
assert(deepEqual(new Foo(), {}), '当前实现不比较原型（面试可主动说明）');

console.log('\ndeepEqual 用例执行完毕');