/**
 * 手写 compose 与 pipe
 * 运行：node 手写题进阶/code/compose-pipe.js
 */

/** compose：从右到左执行 f(g(h(x))) */
function compose(...fns) {
    if (fns.length === 0) return (x) => x;
    if (fns.length === 1) return fns[0];

    return fns.reduce((acc, fn) => (...args) => acc(fn(...args)));
}

/** pipe：从左到右执行 h(g(f(x))) */
function pipe(...fns) {
    return compose(...fns.reverse());
}

/** 支持多参数与 this 的版本 */
function composeWithContext(...fns) {
    return function (...args) {
        let result = fns[fns.length - 1].apply(this, args);
        for (let i = fns.length - 2; i >= 0; i--) {
            result = fns[i].call(this, result);
        }
        return result;
    };
}

/** 异步 compose：串行等待每个异步函数 */
const composeAsync = (...fns) => (x) =>
    fns.reduceRight((promise, fn) => promise.then(fn), Promise.resolve(x));

/* ------------------------------ 自测 ------------------------------ */

function assert(condition, label) {
    console.log(`${condition ? 'PASS' : 'FAIL'} - ${label}`);
    if (!condition) process.exitCode = 1;
}

const trim = (s) => s.trim();
const upper = (s) => s.toUpperCase();
const exclaim = (s) => `${s}!`;

assert(compose(exclaim, upper, trim)('  hello ') === 'HELLO!', 'compose 从右到左');
assert(pipe(trim, upper, exclaim)('  hello ') === 'HELLO!', 'pipe 从左到右');
assert(compose()('x') === 'x', 'compose 空列表返回恒等函数');

// 顺序验证：先加 1 再乘 2
const addOne = (x) => x + 1;
const double = (x) => x * 2;
assert(compose(double, addOne)(3) === 8, 'compose: double(addOne(3)) = 8');
assert(pipe(double, addOne)(3) === 7, 'pipe: addOne(double(3)) = 7');

// this 绑定
const ctx = {
    base: 10,
    run: composeWithContext(function (x) { return x + this.base; }, double),
};
assert(ctx.run(5) === 20, '支持 this 上下文（double(5)=10，+base=20）');

// 多参数：最右（compose）/最左（pipe）的函数接收全部参数
const fullName = (first, last) => `${first} ${last}`;
assert(compose(upper, fullName)('ada', 'lovelace') === 'ADA LOVELACE', '最右函数可接收多参数');

(async () => {
    const asyncResult = await composeAsync(
        (x) => x + 1,
        async (x) => x * 2,
        async (x) => x - 3
    )(10); // ((10 - 3) * 2) + 1 = 15
    assert(asyncResult === 15, '异步 compose 串行执行');

    console.log('\ncompose / pipe 用例执行完毕');
})();