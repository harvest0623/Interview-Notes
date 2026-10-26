/**
 * 手写 Promise 全家桶：all / allSettled / race / any
 * 运行：node 手写题进阶/code/promise-all.js
 */

const delay = (ms, value, shouldReject = false) =>
    new Promise((resolve, reject) => {
        setTimeout(() => (shouldReject ? reject(value) : resolve(value)), ms);
    });

/**
 * Promise.all：全部成功才成功，任一失败立即失败
 * 结果顺序与输入顺序一致
 */
function promiseAll(list) {
    return new Promise((resolve, reject) => {
        let items;
        try {
            items = Array.from(list); // 兼容数组 / Set / 生成器
        } catch (error) {
            return reject(new TypeError('argument is not iterable'));
        }

        const total = items.length;
        if (total === 0) return resolve([]);

        const result = new Array(total);
        let finished = 0;

        items.forEach((item, index) => {
            // 非 Promise 值也要包一层，统一走 then
            Promise.resolve(item).then((value) => {
                result[index] = value; // 按索引写，保证顺序
                if (++finished === total) resolve(result);
            }, reject);
        });
    });
}

/**
 * Promise.allSettled：等待全部落定，永不 reject
 */
function allSettled(list) {
    return new Promise((resolve) => {
        const items = Array.from(list);
        if (items.length === 0) return resolve([]);

        const result = new Array(items.length);
        let finished = 0;

        items.forEach((item, index) => {
            Promise.resolve(item)
                .then(
                    (value) => (result[index] = { status: 'fulfilled', value }),
                    (reason) => (result[index] = { status: 'rejected', reason })
                )
                .finally(() => {
                    // 成功失败都要计数
                    if (++finished === items.length) resolve(result);
                });
        });
    });
}

/**
 * Promise.race：第一个落定（成功或失败）的结果决定最终结果
 */
function promiseRace(list) {
    return new Promise((resolve, reject) => {
        for (const item of list) {
            Promise.resolve(item).then(resolve, reject);
        }
    });
}

/**
 * Promise.any：第一个成功即 resolve，全部失败才 reject AggregateError
 */
function promiseAny(list) {
    return new Promise((resolve, reject) => {
        const items = Array.from(list);
        if (items.length === 0) {
            return reject(new AggregateError([], 'All promises were rejected'));
        }

        const errors = new Array(items.length);
        let rejectedCount = 0;

        items.forEach((item, index) => {
            Promise.resolve(item).then(resolve, (reason) => {
                errors[index] = reason;
                if (++rejectedCount === items.length) {
                    reject(new AggregateError(errors, 'All promises were rejected'));
                }
            });
        });
    });
}

/* ------------------------------ 自测 ------------------------------ */

function assert(condition, label) {
    console.log(`${condition ? 'PASS' : 'FAIL'} - ${label}`);
    if (!condition) process.exitCode = 1;
}

(async () => {
    // all：顺序与输入一致（30ms 的先发起，10ms 的后完成）
    const allResult = await promiseAll([delay(30, 'a'), 2, delay(10, 'c')]);
    assert(JSON.stringify(allResult) === JSON.stringify(['a', 2, 'c']), 'all 保持输入顺序');
    assert((await promiseAll([])).length === 0, 'all 空数组立即 resolve');

    // all：任一失败立即失败
    const failStart = Date.now();
    try {
        await promiseAll([delay(10, 'boom', true), delay(200, 'late')]);
    } catch (error) {
        assert(error === 'boom' && Date.now() - failStart < 100, 'all 失败短路');
    }

    // allSettled：成功失败都收集
    const settled = await allSettled([delay(10, 1), delay(20, 'x', true)]);
    assert(
        settled[0].status === 'fulfilled' &&
        settled[1].status === 'rejected' &&
        settled[1].reason === 'x',
        'allSettled 收集两种状态'
    );

    // race：快的获胜，失败也算获胜
    const raced = await promiseRace([delay(50, 'slow'), delay(10, 'fast')]);
    assert(raced === 'fast', 'race 取第一个落定者');
    try {
        await promiseRace([delay(10, 'err', true), delay(50, 'ok')]);
    } catch (error) {
        assert(error === 'err', 'race 第一个失败也会 reject');
    }

    // any：跳过失败，拿第一个成功
    const anyResult = await promiseAny([
        delay(10, 'first-error', true),
        delay(20, 'success'),
        delay(30, 'later-success'),
    ]);
    assert(anyResult === 'success', 'any 返回第一个成功值');

    // any：全部失败
    try {
        await promiseAny([delay(10, 'e1', true), delay(20, 'e2', true)]);
    } catch (error) {
        assert(error instanceof AggregateError && error.errors.length === 2, 'any 全部失败抛 AggregateError');
    }
    console.log('\n所有 Promise 手写用例执行完毕');
})();