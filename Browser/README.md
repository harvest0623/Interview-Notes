# 浏览器常见面试题

> 本目录收录浏览器相关的高频面试题及参考答案。因内容较多，按主题拆分为三个分册：渲染与性能、存储与通信、安全。题目以现代 Chrome/Chromium 行为为基准，涉及兼容性差异时会单独标注。

---

## 目录

| 分册 | 内容 | 题量 |
| --- | --- | --- |
| [01 - 渲染原理与性能篇](01-渲染原理与性能篇.md) | 多进程架构、从 HTML 到像素的渲染流程、DOM/CSSOM 与渲染树、布局与绘制、分层合成与 GPU 加速、重排重绘、关键渲染路径、defer/async、帧与 rAF、Core Web Vitals、Performance API、长任务拆分、页面生命周期与 bfcache、内存泄漏、排查实战 | 15 |
| [02 - 存储与通信篇](02-存储与通信篇.md) | 六种存储方案对比、Cookie 属性与发送规则、localStorage 与 sessionStorage、IndexedDB 事务与版本升级、Cache API 与 Service Worker、同源策略、跨域方案总览、CORS 细节、跨标签页通信、三类 Worker、WebSocket/SSE/长轮询、浏览器缓存链路、iframe 与 postMessage | 13 |
| [03 - 安全篇](03-安全篇.md) | 前端威胁模型、XSS 三型与防御、CSP、CSRF、点击劫持、CORS 错误配置、HTTPS 与 TLS、前端加密误区、JWT 与登录态存储、postMessage 与 iframe 安全、开放重定向、第三方脚本与供应链安全 | 13 |

---

## 学习路径建议

```
01 渲染原理与性能篇（浏览器怎么工作，面试的底盘）
   ↓
02 存储与通信篇（数据放哪、请求怎么发、跨域怎么通）
   ↓
03 安全篇（谁不可信、攻击怎么发生、防线怎么叠）
```

> 面试策略：**渲染流程与缓存是硬门槛**（答不清说明没真正排查过性能），**同源与 CORS 是分水岭**（能讲清「限制读、不限制发」才算理解），**XSS/CSRF/HTTPS 是安全基本盘**（能说出防御组合而不是单个函数）。三个分册交叉复习效果最好：缓存影响性能，Cookie 同时涉及存储、通信与安全。

---

## 高频必背 TOP 10

| 序号 | 题目 | 所在分册 |
| --- | --- | --- |
| 1 | 从 HTML 到像素：完整的渲染流程 | [01 - 渲染原理与性能篇](01-渲染原理与性能篇.md#2-从-html-到像素完整的渲染流程) |
| 2 | 重排与重绘的触发与优化 | [01 - 渲染原理与性能篇](01-渲染原理与性能篇.md#6-重排与重绘的触发与优化与-css-篇的题目错开重点讲浏览器内部机制) |
| 3 | 浏览器缓存的完整链路 | [02 - 存储与通信篇](02-存储与通信篇.md#12-浏览器缓存的完整链路memory-cachedisk-cachehttp-缓存sw-缓存) |
| 4 | CORS 详解（简单请求、预检、凭证、报错） | [02 - 存储与通信篇](02-存储与通信篇.md#8-cors-详解简单请求预检凭证响应头常见报错) |
| 5 | Cookie 机制与六个核心属性 | [02 - 存储与通信篇](02-存储与通信篇.md#2-cookie-机制详解domainpathsamesitehttponlysecure大小限制) |
| 6 | localStorage 与 sessionStorage 的区别与坑 | [02 - 存储与通信篇](02-存储与通信篇.md#3-localstorage-与-sessionstorage-的细节与坑同步阻塞容量跨标签页) |
| 7 | 跨标签页通信的几种方案 | [02 - 存储与通信篇](02-存储与通信篇.md#9-跨标签页通信storage-事件broadcastchannelsharedworker) |
| 8 | XSS 的防御手段 | [03 - 安全篇](03-安全篇.md#3-xss-的防御手段转义csphttponly富文本白名单) |
| 9 | CSRF 的原理与防御 | [03 - 安全篇](03-安全篇.md#5-csrf-的原理与防御tokensamesitereferer双重-cookie) |
| 10 | HTTPS 与 TLS 握手、证书链 | [03 - 安全篇](03-安全篇.md#8-https-与-tls-握手证书链中间人攻击) |

---

## 核心速查表

**渲染流水线**

```
HTML 字节流 → DOM
CSS → CSSOM
DOM + CSSOM → 样式计算 → 布局树 → 绘制指令
→ 分层 → 提交合成线程 → 分块 → 光栅化 → 合成 → 上屏

只触发合成：transform / opacity（已独立分层）
触发绘制：color / background / box-shadow
触发布局：width / height / margin / top / left
主线程被长任务占住 → 渲染全停 → 掉帧、INP 变差
```

**存储选型**

```
Cookie        ：4KB/条，随请求自动发送，会话标识专用，必须 HttpOnly + Secure + SameSite
localStorage  ：约 5MB/源，同步、永久、只能存字符串，放轻量配置，不放凭证
sessionStorage：约 5MB，标签页会话级，刷新保留、关标签页即丢，适合表单草稿
IndexedDB     ：异步、事务、索引、大容量，适合结构化数据与离线库
CacheStorage  ：存 Request/Response，配合 SW 做离线与资源策略
OPFS          ：源私有文件系统，Worker 中可同步，适合大文件
```

**跨域与通信**

```
同源 = 协议 + 主机 + 端口
同源策略限制「读」：DOM、响应体、存储、Canvas 像素
不限制「发」：表单、img、script、iframe、简单请求、WebSocket

CORS：Origin → 预检 OPTIONS → Allow-Origin/Methods/Headers/Credentials
带凭证：具体 Origin + Allow-Credentials: true + credentials: include
代理：开发用 Vite，生产用 Nginx 同域转发
跨标签页：BroadcastChannel > storage 事件 > SharedWorker
实时推送：双向 WebSocket / 单向 SSE / 兜底长轮询
```

**安全防御清单**

```
XSS   ：上下文输出编码 + 富文本白名单 + CSP nonce + HttpOnly
CSRF  ：SameSite=Lax + CSRF Token + Origin 校验，GET 不做写操作
点击劫持：CSP frame-ancestors 'none' + X-Frame-Options
CORS  ：精确源白名单 + Vary: Origin，禁止反射任意 Origin 与 null
登录态：内存 Access Token + HttpOnly Refresh Cookie，或 BFF
HTTPS ：TLS 1.2+ + 完整证书链 + HSTS + 无混合内容
供应链：SRI + CSP + lockfile + 私有 registry + 不公开 sourcemap
```

**易错点清单**

```
1. 把 no-cache 当成不缓存；它是「用前必须校验」
2. 认为跨域请求没发出去；请求已到服务端，只是响应被拦截
3. 认为同源策略能防 CSRF；它只限制读，不限制发请求
4. CORS 只给预检加头，忘了实际响应也要 Access-Control-Allow-Origin
5. 删除 Cookie 时 Domain/Path 与写入不一致，导致删不掉
6. 认为 sessionStorage 跨标签页共享；它是最标签页私有的
7. IndexedDB 事务里 await fetch，导致事务提前提交
8. 认为 HttpOnly 能防 XSS；它只保护 Cookie 不被 JS 读取
9. 前端哈希密码后传输，把哈希值变成了密码等价物
10. 认为 CORS 配得严就能防 CSRF；表单请求不需要 CORS 授权
11. postMessage 用 "*" 发送且接收端不校验 origin
12. 生产环境公开 sourcemap，源码与内网信息一起泄露
```
