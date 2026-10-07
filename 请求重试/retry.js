/**
 * 请求重试（增强版）：失败后延迟重试，并采用指数退避（1s → 2s → 4s ...）
 */

/** 模拟请求：约 80% 概率失败 */
function ajax() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const random = ~~(Math.random() * 10); // 0~9
            random < 8 ? reject('fail') : resolve('success');
        }, 1000);
    });
}

/**
 * @param {() => Promise<any>} fn 需要重试的请求
 * @param {number} count 最多重试次数
 * @param {number} delay 首次重试的等待时间(ms)，之后逐次翻倍
 * @returns {Promise<any>} 最终结果
 */
function retry(fn, count, delay = 1000) {
    return new Promise((resolve, reject) => {
        const run = () => {
            fn()
                .then((res) => {
                    console.log(`请求成功：${res}`);
                    resolve(res);
                })
                .catch((err) => {
                    count--; // 失败：消耗一次机会
                    if (count <= 0) {
                        return reject(`重试次数耗尽：${err}`); // 彻底失败
                    }
                    console.log(`还剩 ${count} 次机会，${delay}ms 后重试...`);
                    setTimeout(() => {
                        delay *= 2; // 指数退避
                        run();
                    }, delay);
                });
        };
        run();
    });
}

// 最多重试 3 次，首次等待 1000ms
retry(ajax, 3)
    .then((res) => console.log(`最终结果：${res}`))
    .catch((err) => console.log(`最终结果：${err}`));