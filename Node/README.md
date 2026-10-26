# Node.js 常见面试题

> 本目录收录 Node.js 服务端开发相关的高频面试题及参考答案。因内容较多，按主题拆分为五个分册。默认以 **Node 18.x / 20.x LTS** 为背景，涉及 `fetch` 稳定化、`AsyncLocalStorage.snapshot()`、`node:test` 等版本差异时会单独标注；所有代码均可在 Node 18+ 直接运行。

---

## 目录

| 分册 | 内容 | 题量 |
| --- | --- | --- |
| [01 - 基础与模块机制篇](01-基础与模块机制篇.md) | Node.js 的定位与运行时构成、适用场景、CommonJS 模块机制、CJS 与 ESM 互操作、`module.exports` 与 `exports`、`package.json` 关键字段、Buffer、`process` 与全局变量、`path` 与 `fs`、环境变量、版本管理与 LTS、错误处理 | 12 |
| [02 - 异步与事件循环篇](02-异步与事件循环篇.md) | 事件循环六阶段、Node 与浏览器事件循环差异、`process.nextTick` 与微任务优先级、`setTimeout`/`setImmediate`/`Promise` 顺序、`async/await` 执行与错误处理、阻塞事件循环排查、回调地狱与 `util.promisify`、`EventEmitter` 原理、定时器 `unref`/`ref`、`AsyncLocalStorage`、`worker_threads`/`child_process`/`cluster` 选型、并发控制与限流 | 12 |
| [03 - 核心API与Stream篇](03-核心API与Stream篇.md) | `fs` 与 Promise API、四种流、`pipe` 与背压、`pipeline`、大文件流式处理、`http` 最小服务器、请求与响应、静态资源与 MIME、multipart 上传、TCP/UDP、`crypto` 与 JWT、`zlib` 压缩、进程间通信 | 12 |
| [04 - 性能与进程篇](04-性能与进程篇.md) | 内存结构与 V8 垃圾回收、内存泄漏排查、CPU 性能分析、`cluster` 多进程与负载均衡、`worker_threads` 实战、PM2 进程守护、日志与可观测性、数据库连接池、缓存设计、限流熔断降级、优雅退出与健康检查、服务性能优化清单 | 12 |
| [05 - 框架与工程实践篇](05-框架与工程实践篇.md) | Express 与 Koa 对比、Koa 洋葱模型、中间件编写与错误处理、路由设计与版本管理、参数校验与分层架构、鉴权方案、配置/日志/异常中间件、Web 安全实践、服务测试（Jest + supertest）、部署（Docker/Nginx/PM2）、BFF 与 SSR、微服务与任务队列 | 12 |

---

## 学习路径建议

```
基础与模块机制篇（运行时、模块、Buffer、错误处理——所有后续内容的地基）
   ↓
异步与事件循环篇（面试区分度最高，决定你是否真的理解 Node）
   ↓
核心 API 与 Stream 篇（动手能力：文件、网络、流、压缩、IPC）
   ↓
性能与进程篇（从“能写”到“能扛”，项目经验的主要来源）
   ↓
框架与工程实践篇（落地能力：框架选型、分层、测试、部署、安全）
```

> 面试策略：**事件循环与模块机制是硬门槛**（答不清基本会被判定为“只用过 API”），**Stream 与背压是分水岭**（能讲清内存为什么不会爆才算做过文件/网络处理），**性能排查与进程模型是加分项**（体现线上经验），**框架原理与工程实践决定定级**。

---

## 高频必背 TOP 10

| 序号 | 题目 | 所在分册 |
| --- | --- | --- |
| 1 | Node.js 是什么？与浏览器中的 JavaScript 有什么区别？ | [01 - 基础与模块机制篇](01-基础与模块机制篇.md#1-nodejs-是什么与浏览器中的-javascript-有什么区别) |
| 2 | CommonJS 的模块机制（require 流程、缓存、循环依赖） | [01 - 基础与模块机制篇](01-基础与模块机制篇.md#3-commonjs-的模块机制require-流程缓存循环依赖) |
| 3 | Buffer 的原理与常见用法 | [01 - 基础与模块机制篇](01-基础与模块机制篇.md#7-buffer-的原理与常见用法) |
| 4 | Node 事件循环的六个阶段 | [02 - 异步与事件循环篇](02-异步与事件循环篇.md#1-node-事件循环的六个阶段) |
| 5 | Node 与浏览器事件循环的差异 | [02 - 异步与事件循环篇](02-异步与事件循环篇.md#2-node-与浏览器事件循环的差异) |
| 6 | process.nextTick 与微任务的优先级 | [02 - 异步与事件循环篇](02-异步与事件循环篇.md#3-processnexttick-与微任务的优先级) |
| 7 | setTimeout、setImmediate、Promise 的执行顺序 | [02 - 异步与事件循环篇](02-异步与事件循环篇.md#4-settimeoutsetimmediatepromise-的执行顺序) |
| 8 | 四种流：可读流、可写流、双工流、转换流 | [03 - 核心API与Stream篇](03-核心API与Stream篇.md#2-四种流可读流可写流双工流转换流) |
| 9 | Stream 的 pipe、背压与 pipeline | [03 - 核心API与Stream篇](03-核心API与Stream篇.md#3-stream-的-pipe背压与-pipeline) |
| 10 | worker_threads、child_process、cluster 的区别与选型 | [02 - 异步与事件循环篇](02-异步与事件循环篇.md#11-worker_threadschild_processcluster-的区别与选型) |

---

## 核心速查表

**事件循环六阶段**

```
timers             → setTimeout / setInterval（只执行已到期的）
pending callbacks  → 上一轮推迟的 I/O 错误回调
idle, prepare      → libuv 内部
poll               → 等待并处理 I/O；队列空时按 timer / immediate 决定是否阻塞
check              → setImmediate
close callbacks    → socket / stream 的 close
```

```
每个回调之后、每个阶段之间：先清空 process.nextTick 队列，再清空 Promise 微任务队列
循环存活条件：存在 ref 的 handle、活跃请求、正在关闭的 handle
```

**执行顺序速查**

```
同步代码 > process.nextTick > Promise 微任务 > timer / I/O / setImmediate
顶层：setTimeout(0) 与 setImmediate 顺序不确定（1ms 取整）
I/O 回调内：setImmediate 必先于 setTimeout（poll 之后紧邻 check）
```

**模块加载流程**

| 阶段 | CommonJS | ES Module |
| --- | --- | --- |
| 解析 | `require.resolve` 按路径规则找到文件 | 解析说明符，`exports` 字段决定入口 |
| 缓存 | 以解析后的绝对路径为键，命中直接返回 `module.exports` | 以 URL 为键，模块只求值一次 |
| 实例化 | 包装成 `(exports, require, module, __filename, __dirname)` 后执行 | 先建立依赖图并绑定导入导出（链接阶段） |
| 求值 | 同步执行，循环依赖时拿到未完成的 `exports` | 深度优先后序求值，存在 TDZ 与暂时性死区 |
| 异步 | 不支持顶层 `await` | 支持顶层 `await`，可用动态 `import()` |

**进程与线程模型**

```
主线程         ：唯一执行 JS 的线程，阻塞即全阻塞
libuv 线程池   ：默认 4 个线程（UV_THREADPOOL_SIZE），负责文件、DNS、crypto、zlib
worker_threads ：同进程多线程，独立 isolate 与事件循环，可共享 SharedArrayBuffer
child_process  ：独立进程，内存隔离，适合外部命令与故障隔离
cluster        ：多进程共享端口，铺满多核，不共享内存与 session
容器多副本     ：云原生主流，配合负载均衡替代 cluster
```

**异步工具速查**

```
Promise 化    ：util.promisify / fs.promises / timers/promises / stream/promises
并发控制      ：信号量 + 队列（p-limit 思路），限制在途请求数
限流          ：固定窗口 / 滑动窗口 / 令牌桶 / 漏桶；多实例用 Redis + Lua
上下文传递    ：AsyncLocalStorage（traceId、租户、事务）
阻塞排查      ：perf_hooks.monitorEventLoopDelay + node --cpu-prof 火焰图
```

**易错点清单**

```
1. 把“单线程”理解成 Node 只有一个线程：libuv 线程池、worker、cluster 都会引入并行
2. 认为 setTimeout(fn, 0) 真为 0ms：Node 最小 1ms，浏览器嵌套调用还有 4ms 限制
3. 认为 setImmediate 永远先于 setTimeout：只在 I/O 回调内成立
4. await 只排微任务，不让出 I/O；密集 await 与同步循环一样会阻塞
5. unref() 不是取消定时器，只是不阻止进程退出；进程退出后回调不会执行
6. EventEmitter 的 error 事件没有监听器会直接抛出，常导致进程崩溃
7. 大文件用 readFile 一次性读入内存，应该用流 + pipeline 处理背压
8. 用 cluster 后仍把 session/限流计数放在进程内存，多 worker 之间不共享
9. worker_threads 不共享普通变量，跨线程只能消息传递或 SharedArrayBuffer
10. 限流只做单机内存版，多副本部署后实际配额被放大 N 倍
```

---

[← 返回仓库根目录](../README.md)
