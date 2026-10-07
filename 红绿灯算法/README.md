# 红绿灯算法（循环切换）

> **题目：用代码模拟红绿灯，红灯亮 3 秒 → 绿灯亮 2 秒 → 黄灯亮 1 秒，如此循环往复。**

考察点：`Promise` / `async-await` / `setTimeout` / 生成器，以及「如何优雅地表达一个循环的时序流程」。

---

## 目录

1. [思路](#1-思路)
2. [解法一：async / await](#2-解法一async--await)
3. [解法二：Promise 链式递归](#3-解法二promise-链式递归)
4. [解法三：定义灯序 + setInterval](#4-解法三定义灯序--setinterval)
5. [解法四：生成器函数](#5-解法四生成器函数)
6. [几种解法对比](#6-几种解法对比)
7. [易错点](#7-易错点)

---

## 1. 思路

先封装一个「点亮某颜色、持续一段时间」的异步函数，返回 Promise；灯亮多久就 `setTimeout` 多久，时间到后 `resolve`。

```js
function setColor(color, time) {
    return new Promise((resolve) => {
        console.log(color, `亮 ${time / 1000} 秒`);
        setTimeout(() => resolve(color), time); // 时间到 → 切换下一盏灯
    });
}
```

有了这个函数，剩下的问题就变成：**如何按 红 → 绿 → 黄 → 红… 的顺序不断调用它。**

---

## 2. 解法一：async / await

最简单直观，一个 `while(true)` 循环即可：

```js
async function run() {
    while (true) {
        await setColor('红', 3000);
        await setColor('绿', 2000);
        await setColor('黄', 1000);
    }
}
run();
```

`await` 会暂停在当前灯上，直到该灯的时长结束才继续下一盏。

---

## 3. 解法二：Promise 链式递归

不借助 `async/await`，用 `.then` 串联并在末尾递归：

```js
function run() {
    setColor('红', 3000).then(() => {
        setColor('绿', 2000).then(() => {
            setColor('黄', 1000).then(() => {
                run(); // 一轮结束，递归开始下一轮
            });
        });
    });
}
run();
```

缺点：嵌套层级深，可读性差（回调地狱的雏形）。

---

## 4. 解法三：定义灯序 + setInterval

把一轮灯序封装成一个函数，用总时长 `3000 + 2000 + 1000 = 6000` 作为定时器周期：

```js
function lightSequence() {
    return setColor('红', 3000)
        .then(() => setColor('绿', 2000))
        .then(() => setColor('黄', 1000));
}

setInterval(lightSequence, 6000); // 每 6 秒跑一轮
lightSequence();                  // 立即执行一次，避免首次空等 6 秒
```

缺点：`setInterval` 的周期是**固定**的，依赖「每盏灯时长之和 = 周期」这一假设，一旦某盏灯耗时变化就容易错位；用 `setTimeout` 递归反而更稳妥。

---

## 5. 解法四：生成器函数

用生成器 `yield` 出每一盏灯的 Promise，再统一消费：

```js
function* lightGenerator() {
    while (true) {
        yield setColor('红', 3000);
        yield setColor('绿', 2000);
        yield setColor('黄', 1000);
    }
}

// 方式 A：for await 自动迭代（会自动 await 每个 yield 出的 Promise）
async function runGenerator() {
    for await (const _ of lightGenerator()) {
        // 每个灯的时间到后才会进入下一轮
    }
}
runGenerator();
```

> `for await...of` 既能迭代异步可迭代对象，也能迭代「产出 Promise 的同步可迭代对象」，这里会把每个 `yield` 出的 Promise 依次 `await`。

也可以手动驱动：

```js
async function runGenerator() {
    const gen = lightGenerator();
    for (const p of gen) {
        await p; // 手动 await 每一盏灯
    }
}
```

---

## 6. 几种解法对比

| 解法 | 可读性 | 是否易扩展 | 说明 |
| --- | --- | --- | --- |
| async / await | 高 | 高 | **推荐**，写法最简洁 |
| Promise 链递归 | 低 | 中 | 嵌套深，回调地狱 |
| setInterval | 中 | 低 | 依赖固定周期，易错位 |
| 生成器 | 中 | 高 | 可暂停/恢复，适合复杂时序 |

---

## 7. 易错点

- **不要用 `setInterval` 精确控制灯序**：定时器回调的执行时间并非绝对精确，长时间运行会累积误差；用「上一个灯的 Promise 结束 → 再启动下一个灯」更可靠。
- **`while(true)` 不会阻塞主线程**：`await` 会交出执行权，`setTimeout` 属于宏任务，不会造成死循环卡死。
- **`for await` 与 `for...of` 的区别**：`for await` 会自动 `await` 迭代出的值；普通 `for...of` 拿到的仍是 Promise，需要手动 `await`。
- **时长单位**：`setTimeout` 的单位是毫秒，3 秒要写 `3000`。