/**
 * 手写 once
 * 运行：node 手写题进阶/code/once.js
 */

/** 基础版：首次执行后锁定，后续返回第一次的结果 */
function once(fn) {
    let called = false;
    let result;

    return function (...args) {
        if (!called) {
            called = true; // 必须在调用前标记，避免 fn 内部递归调用导致无限执行
            result = fn.apply(this, args);
        }
        return result;
    };
}

/** 可重试版：执行抛错时不锁定，允许下一次重试 */
function onceRetryable(fn) {
    let called = false;
    let result;

    return function (...args) {
        if (called) return result;
        try {
            result = fn.apply(this, args);
            called = true;
            return result;
        } catch (error) {
            throw error; // called 仍为 false
        }
    };
}

/* ------------------------------ 自测 ------------------------------ */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function assert(condition, label) {
    console.log(`${condition ? 'PASS' : 'FAIL'} - ${label}`);
    if (!condition) process.exitCode = 1;
}

(async () => {
    let count = 0;
    const init = once(() => {
        count++;
        return { ready: true };
    });

    const first = init();
    const second = init();
    assert(count === 1 && first === second, '只执行一次并复用结果');

    // 支持 this 与参数
    const ctx = {
        base: 10,
        run: once(function (x) { return x + this.base; }),
    };
    assert(ctx.run(5) === 15 && ctx.run(100) === 15, '保留 this，后续调用返回首次结果');

    // 返回 undefined 也不会重复执行
    let undefCount = 0;
    const undef = once(() => { undefCount++; });
    undef();
    undef();
    assert(undefCount === 1, '返回 undefined 时仍只执行一次');

    // 失败可重试
    let attempts = 0;
    const retryable = onceRetryable(() => {
        attempts++;
        if (attempts < 2) throw new Error('first fail');
        return 'ok';
    });
    try { retryable(); } catch { }
    assert(retryable() === 'ok' && attempts === 2, 'onceRetryable 失败后可重试');

    // 异步：并发调用共享同一个 Promise
    let asyncCalls = 0;
    const asyncOnce = once(async () => {
        asyncCalls++;
        await sleep(10);
        return 'done';
    });
    const [a, b] = await Promise.all([asyncOnce(), asyncOnce()]);
    assert(a === 'done' && b === 'done' && asyncCalls === 1, '异步并发只执行一次');

    console.log('\nonce 用例执行完毕');
})();