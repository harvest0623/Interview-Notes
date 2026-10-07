/**
 * 控制并发：限制同一时刻最多 N 个异步任务在执行
 * 适用场景：页面同时发起大量请求时，控制并发数避免抢占带宽 / 触发限流
 */

/**
 * 模拟一个网络请求：time 毫秒后返回结果，time > 5000 视为失败
 * @param {number} time 请求耗时(ms)
 * @returns {Promise<string>}
 */
function ajax(time) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (time > 5000) {
                reject(`请求失败(耗时 ${time}ms)`);
            } else {
                resolve(`请求成功(耗时 ${time}ms)`);
            }
        }, time);
    });
}

/**
 * 并发控制器
 */
class Limit {
    constructor(parallCount = 2) {
        this.parallCount = parallCount; // 最大并发数
        this.tasks = [];                // 等待队列：[{ task, resolve, reject }]
        this.runningCount = 0;          // 正在运行的任务数
    }

    /**
     * 添加一个任务，返回该任务执行结果的 Promise
     * @param {() => Promise<any>} task 返回 Promise 的函数
     * @returns {Promise<any>}
     */
    add(task) {
        return new Promise((resolve, reject) => {
            this.tasks.push({ task, resolve, reject });
            this._run(); // 每加入一个任务就尝试调度
        });
    }

    /** 内部调度：尽量把并发槽位填满 */
    _run() {
        while (this.runningCount < this.parallCount && this.tasks.length) {
            const { task, resolve, reject } = this.tasks.shift();
            this.runningCount++;

            task()
                .then(resolve, reject) // 结果透传：成功交给 resolve，失败交给 reject
                .finally(() => {
                    this.runningCount--; // 释放一个并发名额
                    this._run();         // 立即用队列中的下一个任务补位
                });
        }
    }
}

// ---------- 使用示例 ----------
const limit = new Limit(2);

function addTask(time, index) {
    limit
        .add(() => ajax(time))
        .then((res) => console.log(`任务${index}完成：${res}`))
        .catch((err) => console.log(`任务${index}失败：${err}`));
}

// 一次性添加 6 个任务，并发数被限制为 2
const taskTimes = [10000, 4000, 8000, 1000, 5000, 2000];
taskTimes.forEach((time, i) => addTask(time, i + 1));