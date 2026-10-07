# 控制并发（限制并发请求数）

> **题目：实现一个并发控制器 `Limit`，限制同一时刻最多只有 N 个异步任务在执行，超出的任务排队等待。**
>
> 典型场景：一个页面同时发起几十个请求时，请求之间会互相争抢带宽，容易出现超时、失败。通过控制并发数，让请求「排队」执行，可以显著提升整体的稳定性。

---

## 目录

1. [为什么要控制并发](#1-为什么要控制并发)
2. [题目描述](#2-题目描述)
3. [解题思路](#3-解题思路)
4. [完整实现](#4-完整实现)
5. [关键点说明](#5-关键点说明)
6. [复杂度分析](#6-复杂度分析)
7. [易错点与扩展](#7-易错点与扩展)

---

## 1. 为什么要控制并发

- 浏览器对**同域名**的并发连接数有限制（HTTP/1.1 下通常为 6 个左右），一次性发起大量请求会排队甚至失败。
- 请求太多会互相抢占带宽，导致每一个请求都变慢、超时。
- 后端接口通常也有 QPS 限制，无节制的并发可能触发限流。

因此需要一个「并发池」：**最多同时跑 N 个任务，其余任务排队，某个任务完成后自动补位。**

---

## 2. 题目描述

```js
// 模拟一个网络请求：time 毫秒后返回结果，time > 5000 视为失败
function ajax(time) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            time > 5000 ? reject('请求失败') : resolve('请求成功');
        }, time);
    });
}

const limit = new Limit(2); // 最大并发数为 2

limit.add(() => ajax(10000)).then(/* 成功回调 */).catch(/* 失败回调 */);
// ... 依次添加 6 个任务
```

要求：

- `limit.add(task)` 返回一个 Promise，`task` 完成后其结果透传给外部。
- 同一时刻运行中的任务数不超过 `parallCount`。
- 某个任务结束后，自动从队列中取出下一个任务执行。

---

## 3. 解题思路

需要维护三个东西：

| 变量 | 含义 |
| --- | --- |
| `tasks` | 等待队列，存放还没执行的任务 |
| `runningCount` | 当前正在执行的任务数量 |
| `parallCount` | 允许的最大并发数 |

流程：

1. `add(task)` 时，不立即执行任务，而是把 `{ task, resolve, reject }` 压入队列，然后尝试「调度」。
2. 调度时判断：**如果 `runningCount < parallCount` 且队列非空**，就取出一个任务执行，`runningCount++`。
3. 任务结束时（无论成功或失败），`runningCount--`，并**再次触发调度**，去填满空出来的名额。
4. 把任务的原始结果 `resolve` / `reject` 透传给外部，外部拿到的就是任务本身的成功/失败。

> 核心思想：**用「队列 + 计数器」控制并发，用「在 finally 里再调度一次」实现自动补位。**

---

## 4. 完整实现

```js
/**
 * 模拟一个网络请求：time 毫秒后返回结果，time > 5000 视为失败
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
        this.tasks = [];                // 等待队列
        this.runningCount = 0;          // 正在运行的任务数
    }

    /**
     * 添加一个任务，返回该任务执行结果的 Promise
     * @param {() => Promise<any>} task 返回 Promise 的函数
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
                    this.runningCount--;
                    this._run(); // 空出槽位，继续调度下一个
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

[10000, 4000, 8000, 1000, 5000, 2000].forEach((time, i) => addTask(time, i + 1));
```

运行结果（任务按耗时交错完成，始终最多 2 个在跑）：

```
任务2完成：请求成功(耗时 4000ms)
任务1失败：请求失败(耗时 10000ms)
任务4完成：请求成功(耗时 1000ms)
任务3失败：请求失败(耗时 8000ms)
任务6完成：请求成功(耗时 2000ms)
任务5完成：请求成功(耗时 5000ms)
```

---

## 5. 关键点说明

- **为什么用 `while` 而不是 `if`？**
  一次 `add` 后可能同时有多个空闲槽位（例如一开始就并发添加多个任务），用 `while` 可以把槽位一次填满；用 `if` 则每次只启动一个，虽然最终也能跑起来，但不够直观、效率略低。
- **为什么在 `finally` 里再次调用 `_run`？**
  任务结束时释放了一个并发名额，需要立刻用队列里的下一个任务补上，保证「流水线」不断档。
- **`then(resolve, reject)` 而不是 `then(resolve).catch(reject)`**：
  前者不会把 `resolve` 过程中抛出的异常错误地也交给 `reject`，语义更精确。

---

## 6. 复杂度分析

- 时间复杂度：每个任务只入队、出队、执行一次，整体 `O(n)`（n 为任务数）。
- 空间复杂度：队列最多同时存放所有未执行任务，`O(n)`。

---

## 7. 易错点与扩展

**易错点**

- 忘记在任务结束后递减 `runningCount`，导致槽位永远占满，后续任务不再执行。
- 用 `if` 调度时，误以为一次 `add` 只会启动一个任务就代表并发数正确——其实主要问题是槽位没有及时填满。
- 任务同步抛出异常（`task` 内部直接 `throw`）不会被 `.then` 捕获，需要 `Promise.resolve().then(task)` 兜底；本示例的任务均为异步失败，故从简。

**扩展方向**

- 支持**动态插入任务**：运行中继续 `add` 也能被调度（本实现天然支持）。
- 支持**取消 / 中断**：给任务传入 `AbortSignal`。
- 支持**优先级**：将 `tasks` 换成优先级队列。
- 结合「请求重试」：任务失败后自动重试，参见同级目录 `请求重试`。