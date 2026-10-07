/**
 * 请求重试（基础版）：失败后立即重试，最多重试 count 次
 */

/** 模拟请求：约 80% 概率失败 */
function ajax() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const random = ~~(Math.random() * 10); // 0~9
            if (random < 8) {
                reject('fail');
            } else {
                resolve('success');
            }
        }, 1000);
    });
}

/**
 * @param {() => Promise<any>} fn 需要重试的请求
 * @param {number} count 最多重试次数
 * @returns {Promise<any>} 最终结果
 */
function retry(fn, count) {
    return new Promise((resolve, reject) => {
        const run = () => {
            fn()
                .then((res) => {
                    console.log(`请求成功：${res}`);
                    resolve(res); // 成功：结束流程
                })
                .catch(() => {
                    count--; // 失败：消耗一次机会
                    if (count) {
                        console.log(`还剩 ${count} 次重试机会，准备重试...`);
                        run(); // 递归重试
                    } else {
                        reject('重试次数耗尽，请求彻底失败'); // 机会用完：彻底失败
                    }
                });
        };
        run(); // 首次执行
    });
}

// 最多重试 3 次
retry(ajax, 3)
    .then((res) => console.log(`最终结果：${res}`))
    .catch((err) => console.log(`最终结果：${err}`));