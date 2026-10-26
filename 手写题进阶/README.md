# 手写题进阶（Promise / 对象函数 / 数据结构与 DOM）

> 本目录收录「手写实现」类高频面试题，与根目录下已有的单题实践（[控制并发](../控制并发/)、[请求重试](../请求重试/)、[对象扁平化](../对象扁平化/)、[千分位处理](../千分位处理/)、[解析URL](../解析URL/)、[红绿灯算法](../红绿灯算法/)）互补，聚焦 **Promise 全家桶、工具函数、数据结构与简易框架**。
>
> 每题都配有 `code/` 下可运行示例：`node 手写题进阶/code/xxx.js` 即可看到断言结果。

---

## 目录

| 分册 | 内容 | 题量 |
| --- | --- | --- |
| [01 - Promise 与异步篇](01-Promise与异步篇.md) | `Promise.all`、`allSettled`、`race`、`any`、带超时/重试/取消的 `fetch` 封装、异步任务串行执行 | 4 |
| [02 - 对象与函数篇](02-对象与函数篇.md) | `EventEmitter`、`LRU` 缓存、`compose`/`pipe`、`memoize`、`once`、链式调用与惰性求值 | 6 |
| [03 - 数据结构与 DOM 篇](03-数据结构与DOM篇.md) | 数组转树/树转数组、大数相加、hash 路由、虚拟 DOM 与 diff、模板引擎、深比较 | 6 |

---

## 学习路径建议

```
Promise 与异步篇（异步控制是手写题的基本盘，几乎每场必考）
   ↓
对象与函数篇（工具函数体现代码功底，常作为一面手写题）
   ↓
数据结构与 DOM 篇（数组/树 + 简易框架，二面与高阶岗的区分点）
```

> 面试策略：手写题的重点不是「背出代码」，而是能说清 **边界条件**（空数组、同步值、异常、this、循环引用）与 **复杂度**。写完主动补一句「这里还要处理 xxx」，比写出完美代码更能加分。

---

## 高频必背 TOP 10

| 序号 | 题目 | 所在分册 |
| --- | --- | --- |
| 1 | 手写 `Promise.all` | [01 - Promise 与异步篇](01-Promise与异步篇.md#1-手写-promiseall) |
| 2 | 手写 `Promise.allSettled`、`race`、`any` | [01 - Promise 与异步篇](01-Promise与异步篇.md#2-手写-promiseallsettledraceany) |
| 3 | 手写带超时、重试、取消的 `fetch` | [01 - Promise 与异步篇](01-Promise与异步篇.md#3-手写带超时重试取消的-fetch) |
| 4 | 手写 `EventEmitter`（发布订阅） | [02 - 对象与函数篇](02-对象与函数篇.md#1-手写-eventemitter发布订阅) |
| 5 | 手写 `LRU` 缓存 | [02 - 对象与函数篇](02-对象与函数篇.md#2-手写-lru-缓存) |
| 6 | 手写 `compose` 与 `pipe` | [02 - 对象与函数篇](02-对象与函数篇.md#3-手写-compose-与-pipe) |
| 7 | 手写 `memoize` | [02 - 对象与函数篇](02-对象与函数篇.md#4-手写-memoize) |
| 8 | 数组转树与树转数组 | [03 - 数据结构与 DOM 篇](03-数据结构与DOM篇.md#1-数组转树与树转数组) |
| 9 | 手写虚拟 DOM 与 diff | [03 - 数据结构与 DOM 篇](03-数据结构与DOM篇.md#4-虚拟-dom-与-diff) |
| 10 | 手写深比较 `deepEqual` | [03 - 数据结构与 DOM 篇](03-数据结构与DOM篇.md#6-手写深比较-deepequal) |

---

## 核心速查表

**Promise 静态方法语义**

```
Promise.all       ：全部成功才成功，任一失败立即失败（短路）
Promise.allSettled：等全部结束，返回 { status, value | reason }，永不 reject
Promise.race      ：第一个「落定」（成功或失败）的结果决定最终结果
Promise.any       ：第一个「成功」的结果，全部失败才 reject AggregateError
```

**手写题通用边界清单**

```
1. 空输入：all([]) 应立即 resolve([])；reduce 无初值会抛错
2. 同步值：数组元素可能不是 Promise，需要 Promise.resolve 包一层
3. 异常：迭代器中途抛错要 reject；回调抛错不能让进程崩
4. 顺序：结果数组必须与输入顺序一致，不能按完成顺序
5. this：工具函数是否依赖调用者，箭头函数与 function 的取舍
6. 重复调用：once / memoize 的缓存命中与并发穿透
7. 循环引用：deepEqual / 深拷贝的 WeakMap 记录
8. 清理：定时器、事件监听、AbortController 必须能释放
```

**复杂度速记**

```
LRU（Map 实现）        ：get / put 均为 O(1)，空间 O(capacity)
数组转树（一次遍历）   ：时间 O(n)，空间 O(n)
深比较                 ：时间 O(n)，空间 O(depth)
虚拟 DOM diff（同层）  ：时间 O(n)，仅做同层比较
大数相加               ：时间 O(max(len1, len2))
```

---

## 易错点清单

```
1. Promise.all 用 push 收集结果会打乱顺序——必须按索引赋值 result[i]
2. 手写 race 时忘记给非 Promise 值包 Promise.resolve，导致直接抛错
3. EventEmitter 的 once 包装后，off 要用原函数才能移除，需要保存映射
4. LRU 用数组实现，get 时 splice 是 O(n)，面试官会追问复杂度
5. compose 的 reduce 方向容易写反：compose 从右到左，pipe 从左到右
6. memoize 直接拿对象做 key 会全部命中 '[object Object]'，需要序列化或 WeakMap
7. 数组转树时先建 map 再挂载，避免 O(n²) 的嵌套查找
8. diff 的 key 缺失会退化成按索引复用，导致输入框状态错位
9. 模板引擎用 new Function 有 XSS 风险，生产应使用可信模板或转义
10. deepEqual 忘记处理 NaN、Date、RegExp、Map/Set 与循环引用
```
