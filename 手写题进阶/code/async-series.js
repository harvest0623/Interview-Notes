/**
 * 异步任务串行执行与顺序保证
 * 运行：node 手写题进阶/code/async-series.js
 */

/**
 * 串行执行任务
 * @param {Array<() => Promise<any>>} tasks
 * @param {{ stopOnError?: boolean }} options stopOnError=true 遇错即停
 */
async function series(tasks, { stopOnError = true } = {}) {
    const results = [];
    const errors = [];

    // 关键：用 for...of 而不是 forEach，await 才能真正串行
    for (const [index, task] of tasks.entries()) {
        try {
            results[index] = await task();
        } catch (error) {
            errors.push({ index, error });
            if (stopOnError) throw error;
            results[index] = undefined;
        }
    }
    return stopOnError ? results : { results, errors };
}

/* ------------------------------ 自测 ------------------------------ */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function assert(condition, label) {
    console.log(`${condition ? 'PASS' : 'FAIL'} - ${label}`);
    if (!condition) process.exitCode = 1;
}

(async () => {
    const log = [];

    const tasks = [1, 2, 3].map((n) => async () => {
        log.push(`start-${n}`);
        await sleep(20 - n * 5); // 后面的任务更快，若并发会乱序
        log.push(`end-${n}`);
        return n * 10;
    });

    const results = await series(tasks);
    assert(JSON.stringify(log) === JSON.stringify(['start-1', 'end-1', 'start-2', 'end-2', 'start-3', 'end-3']), '任务严格串行');
    assert(JSON.stringify(results) === JSON.stringify([10, 20, 30]), '结果按输入顺序返回');

    // 遇错即停
    const stopped = [];
    try {
        await series([
            async () => stopped.push(1),
            async () => { throw new Error('boom'); },
            async () => stopped.push(3),
        ]);
    } catch (error) {
        assert(error.message === 'boom' && stopped.length === 1, 'stopOnError=true 遇错即停');
    }

    // 遇错继续
    const { results: partial, errors } = await series(
        [
            async () => 'a',
            async () => { throw new Error('b-fail'); },
            async () => 'c',
        ],
        { stopOnError: false }
    );
    assert(
        partial[0] === 'a' && partial[2] === 'c' && errors[0].index === 1,
        'stopOnError=false 继续执行并记录错误'
    );

    console.log('\n串行执行用例执行完毕');
})();