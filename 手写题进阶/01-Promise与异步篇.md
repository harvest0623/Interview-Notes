# 手写题进阶 · 01 Promise 与异步篇

[← 返回总览](README.md)

> 内容：手写 `Promise.all`、`allSettled`、`race`、`any`，带超时/重试/取消的 `fetch` 封装，以及异步任务的串行执行与顺序保证（共 4 题）。

---

## 目录

1. [手写 Promise.all](#1-手写-promiseall)
2. [手写 Promise.allSettled、race、any](#2-手写-promiseallsettledraceany)
3. [手写带超时、重试、取消的 fetch](#3-手写带超时重试取消的-fetch)
4. [异步任务串行执行与顺序保证](#4-异步任务串行执行与顺序保证)

---

## 1. 手写 Promise.all

**题目：** 实现 `promiseAll(list)`，行为与原生 `Promise.all` 一致。

**语义（先背下来，再写代码）：**

| 情况 | 结果 |
| --- | --- |
| 全部成功 | resolve 一个数组，**顺序与输入一致** |
| 任一失败 | 立即 reject 该失败原因（短路，后续结果丢弃） |
| 传入空数组 | 立即 resolve `[]` |
| 元素不是 Promise | 当作已成功的值处理 |
| 传入非可迭代对象 | 同步抛 `TypeError` |

**思路：**

1. 返回一个新的 Promise。
2. 用 `Promise.resolve(list)` 拿到迭代器（这样能兼容数组、Set、生成器等）。
3. 计数：每成功一个 `count++`，等于总数时 resolve。
4. 结果用**索引赋值**，不要用 `push`，否则顺序会变成完成顺序。

**实现：**

```js
function promiseAll(list) {
  return new Promise((resolve, reject) => {
    // 统一转成迭代器，兼容数组 / Set / 生成器
    let items;
    try {
      items = Array.from(list);
    } catch (e) {
      return reject(new TypeError('argument is not iterable'));
    }

    const total = items.length;
    if (total === 0) return resolve([]);

    const result = new Array(total);
    let count = 0;

    items.forEach((item, index) => {
      // 非 Promise 值也要包一层，才能统一走 then
      Promise.resolve(item).then(
        (value) => {
          result[index] = value; // 按索引写，保证顺序
          if (++count === total) resolve(result);
        },
        reject // 任一失败立即整体失败
      );
    });
  });
}
```

**验证：**

```js
const delay = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));

promiseAll([delay(30, 'a'), 2, delay(10, 'c')]).then(console.log);
// [ 'a', 2, 'c' ]，顺序与输入一致，而不是按 10/30ms 的完成顺序
```

**复杂度：** 时间 O(n)（并发等待，总耗时取决于最慢的那个），空间 O(n)。

**面试怎么答：** 先复述语义，再说三个关键点——「空数组立即 resolve」「非 Promise 值用 `Promise.resolve` 包一层」「结果按索引写保证顺序」，最后补「任一失败立即 reject，不做取消」。

**易错点：**

- 用 `result.push(value)`：结果顺序变成完成顺序。
- 忘记处理 `total === 0`，导致永远不 resolve。
- 在 `forEach` 里 `return reject`，只退出当前回调，不会中断外层。
- 直接 `for...of list`：`list` 不是可迭代对象时会在 Promise 内部同步抛错，需要包 try/catch 并 reject。

---

## 2. 手写 Promise.allSettled、race、any

**四者对比（面试常要求一张表说清）：**

| 方法 | 何时 resolve | 何时 reject | 结果形态 |
| --- | --- | --- | --- |
| `all` | 全部成功 | 任一失败（立即） | 值数组 |
| `allSettled` | 全部落定 | 永不 reject | `{status, value/reason}` 数组 |
| `race` | 第一个**成功** | 第一个**失败** | 第一个落定者的值/原因 |
| `any` | 第一个**成功** | 全部失败 | 第一个成功的值；失败时 `AggregateError` |

**`allSettled`：**

```js
function allSettled(list) {
  return new Promise((resolve) => {
    const items = Array.from(list);
    if (items.length === 0) return resolve([]);

    const result = new Array(items.length);
    let count = 0;

    items.forEach((item, i) => {
      Promise.resolve(item)
        .then(
          (value) => (result[i] = { status: 'fulfilled', value }),
          (reason) => (result[i] = { status: 'rejected', reason })
        )
        .finally(() => {
          if (++count === items.length) resolve(result);
        });
    });
  });
}
```

注意 `.finally` 返回的新 Promise 若在回调里抛错会影响链，但这里回调只做计数，安全。

**`race`：**

```js
function race(list) {
  return new Promise((resolve, reject) => {
    for (const item of list) {
      Promise.resolve(item).then(resolve, reject);
    }
  });
}
```

第一个落定者胜出，其余结果被忽略（但**不会取消**，底层任务仍在跑）。

**`any`：**

```js
function any(list) {
  return new Promise((resolve, reject) => {
    const items = Array.from(list);
    const errors = new Array(items.length);
    let rejectedCount = 0;

    if (items.length === 0) {
      return reject(new AggregateError([], 'All promises were rejected'));
    }

    items.forEach((item, i) => {
      Promise.resolve(item).then(resolve, (reason) => {
        errors[i] = reason;
        if (++rejectedCount === items.length) {
          reject(new AggregateError(errors, 'All promises were rejected'));
        }
      });
    });
  });
}
```

**三者的共同边界：**

- 空数组：`race([])` **永远 pending**；`any([])` 立即 reject `AggregateError`；`allSettled([])` 立即 resolve `[]`。
- 传入非 Promise 值：`race([1, p])` 中 `1` 会同步胜出，但回调仍是微任务，不是同步返回。
- 失败短路：`all` 和 `race` 会「提前结束」，但不会中止其他任务，需要 `AbortController` 才能真正取消。

**面试怎么答：** 把语义表背下来是第一步；第二步说清「空数组行为」「是否取消底层任务」——这两个追问能区分是否真正用过。

**易错点：**

- `race` 里直接写 `item.then(resolve, reject)`，元素不是 Promise 时会抛 `item.then is not a function`。
- `any` 忘记空数组的立即 reject，导致永远 pending。
- `allSettled` 用 `then` 计数而不用 `finally`，失败分支忘记计数，导致永远不 resolve。

---

## 3. 手写带超时、重试、取消的 fetch

**题目：** 封装 `request(url, options)`，要求支持：

1. 超时（默认 5s），超时后中止请求；
2. 失败重试（默认 2 次，指数退避）；
3. 外部可通过 `AbortSignal` 主动取消；
4. 只对「网络错误 / 5xx / 429」重试，4xx 不重试。

**关键 API：`AbortController`**

```js
const controller = new AbortController();
fetch(url, { signal: controller.signal });
controller.abort(); // 触发 fetch 的 reject，reason 是 AbortError
```

**实现：**

```js
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isRetryable(error, response) {
  if (response) return response.status >= 500 || response.status === 429;
  // 网络错误可重试；主动取消不重试
  return error.name !== 'AbortError' || error.cause === 'timeout';
}

async function request(url, options = {}) {
  const {
    timeout = 5000,
    retries = 2,
    retryDelay = 300,
    signal: outerSignal,
    ...rest
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // 每次尝试都用独立 controller：超时取消不能污染下一次
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error('timeout')), timeout);

    // 外部取消要能传递进来
    const onOuterAbort = () => controller.abort(outerSignal.reason);
    outerSignal?.addEventListener('abort', onOuterAbort, { once: true });

    try {
      const response = await fetch(url, { ...rest, signal: controller.signal });
      if (!response.ok && isRetryable(null, response)) {
        lastError = new Error(`HTTP ${response.status}`);
      } else {
        return response; // 2xx 或不可重试的 4xx，直接返回给调用方
      }
    } catch (error) {
      lastError = error;
      if (!isRetryable(error)) throw error;
    } finally {
      clearTimeout(timer);
      outerSignal?.removeEventListener('abort', onOuterAbort);
    }

    // 已经取消，不再重试
    if (outerSignal?.aborted) throw outerSignal.reason;

    if (attempt < retries) {
      // 指数退避 + 抖动，避免重试风暴
      const delay = retryDelay * 2 ** attempt + Math.random() * 100;
      await sleep(delay);
    }
  }

  throw lastError;
}
```

**三个设计点必须能讲出来：**

| 设计点 | 原因 |
| --- | --- |
| 每次尝试新建 controller | 超时 abort 的 signal 一旦触发就永久 aborted，复用会导致后续请求立刻失败 |
| 区分取消与超时 | 用户主动取消不应重试；超时属于可重试 |
| 只重试幂等请求 | POST 非幂等，重试可能造成重复下单；真实项目应加幂等键 |

**易错点：**

- 把 `AbortError` 也拿去重试，用户点了「取消」却还在后台重试。
- 用 `Promise.race([fetch, timeout])` 做超时：虽然能返回，但**请求没有被中止**，仍在消耗连接。
- 在 `finally` 里清 timer 前就 `await` 重试等待，导致超时定时器继续计时。
- 4xx 也重试，放大无效请求。

---

## 4. 异步任务串行执行与顺序保证

**题目：** 实现 `series(tasks)`：按顺序依次执行任务，前一个完成后再执行下一个，返回结果数组；支持「遇错即停」与「继续执行」两种策略。

**为什么面试爱问：** 它考察对 `for` + `await` 与 `forEach` 的理解，以及「串行 vs 并发」的取舍。

**实现：**

```js
/**
 * @param {Array<() => Promise<any>>} tasks
 * @param {{ stopOnError?: boolean }} options
 */
async function series(tasks, { stopOnError = true } = {}) {
  const results = [];
  const errors = [];

  // 必须用 for...of：forEach 里的 await 不会阻塞下一轮
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
```

**错误写法对比：**

```js
// 错误：所有任务几乎同时启动，并没有串行
tasks.forEach(async (task) => {
  await task();
});

// 正确：串行
for (const task of tasks) {
  await task();
}
```

**串行、并发、限并发的取舍：**

| 模式 | 总耗时 | 适用场景 |
| --- | --- | --- |
| 串行 | 各任务耗时之和 | 有依赖、需要顺序、写操作 |
| 全并发 | 最慢任务耗时 | 相互独立、无 QPS 限制 |
| 限并发（N） | 介于两者之间 | 大量独立请求，需要保护后端 |

限并发的完整实现在 [控制并发](../控制并发/) 目录，这里不重复。

**易错点：**

- `forEach(async ...)` 无法 `await`，外层会立即继续。
- `map(async ...)` 得到的是 Promise 数组，仍需 `Promise.all`。
- 串行中的错误如果没有 `try/catch`，后续任务全部不执行——要确认业务要「快速失败」还是「尽力执行」。
- 结果用 `push` 而不是按索引写，出错跳过后索引会错位。

---

[← 返回总览](README.md) · 下一册：[02 - 对象与函数篇](02-对象与函数篇.md)
