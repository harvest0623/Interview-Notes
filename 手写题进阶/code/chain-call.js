/**
 * 链式调用与惰性求值
 * 运行：node 手写题进阶/code/chain-call.js
 */

/** 累加器：add(1)(2)(3) 通过 valueOf/toString 取值 */
function add(...initial) {
    let sum = initial.reduce((a, b) => a + b, 0);

    function inner(...args) {
        sum += args.reduce((a, b) => a + b, 0);
        return inner;
    }

    inner.valueOf = () => sum;
    inner.toString = () => String(sum);

    return inner;
}

/** 惰性版：只收集参数，调用 getValue 才计算 */
function lazyAdd(...initial) {
    const args = [...initial];

    const chain = (...next) => {
        args.push(...next);
        return chain;
    };

    chain.getValue = () => args.reduce((a, b) => a + b, 0);
    chain.valueOf = chain.getValue;
    chain.toString = () => String(chain.getValue());

    return chain;
}

/** 链式数据处理：只有 value() 才真正执行 */
class Query {
    constructor(tasks = []) {
        this.tasks = tasks;
    }

    map(fn) {
        return new Query([...this.tasks, (arr) => arr.map(fn)]);
    }

    filter(fn) {
        return new Query([...this.tasks, (arr) => arr.filter(fn)]);
    }

    value(arr) {
        return this.tasks.reduce((acc, task) => task(acc), arr);
    }
}

/* ------------------------------ 自测 ------------------------------ */

function assert(condition, label) {
    console.log(`${condition ? 'PASS' : 'FAIL'} - ${label}`);
    if (!condition) process.exitCode = 1;
}

assert(add(1)(2)(3) + 0 === 6, 'add(1)(2)(3) 隐式转数值为 6');
assert(String(add(1)(2)(3)) === '6', 'add(1)(2)(3) 转字符串为 "6"');
assert(add(1, 2)(3, 4) + 0 === 10, '支持多参数');
assert(add()(5)(5)(5) + 0 === 15, '支持空初始值与无限链式');

const lazy = lazyAdd(1)(2)(3);
assert(lazy.getValue() === 6, '惰性求值 getValue');
assert(String(lazy) === '6', '惰性求值 toString');

const result = new Query()
    .map((x) => x * 2)
    .filter((x) => x > 4)
    .value([1, 2, 3]);
assert(JSON.stringify(result) === '[6]', '链式数据管道延迟执行');

console.log('\n链式调用用例执行完毕');