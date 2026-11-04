# 计算机网络进阶面试题 · 01 HTTP协议与演进篇

[← 返回总览](README.md)

> 内容：HTTP 报文与状态码、HTTP/1.1 的性能瓶颈与优化、HTTP/2 的二进制分帧与 HPACK、HTTP/3 与 QUIC、TLS 1.3 握手、HTTP 缓存、Cookie/Session/Token、REST 与 GraphQL、WebSocket 帧协议、Range 与断点续传、大文件上传协议、安全响应头与 CORS（共 12 题）。本册讲协议层原理与报文细节，CORS 与 WebSocket 的使用层内容见 Browser 分册。

---

## 目录

1. [HTTP 报文结构与状态码](#1-http-报文结构与状态码)
2. [HTTP/1.1 的问题与优化](#2-http11-的问题与优化)
3. [HTTP/2 多路复用与 HPACK](#3-http2-多路复用与-hpack)
4. [HTTP/3 与 QUIC](#4-http3-与-quic)
5. [HTTPS 握手机制（TLS 1.3）](#5-https-握手机制tls-13)
6. [HTTP 缓存机制](#6-http-缓存机制)
7. [Cookie、Session 与 Token](#7-cookiesession-与-token)
8. [RESTful 与 GraphQL](#8-restful-与-graphql)
9. [WebSocket 协议原理](#9-websocket-协议原理)
10. [断点续传与 Range 请求](#10-断点续传与-range-请求)
11. [大文件上传的协议设计](#11-大文件上传的协议设计)
12. [HTTP 安全响应头与 CORS](#12-http-安全响应头与-cors)

---

## 1. HTTP 报文结构与状态码

**结论：** HTTP 是「请求-响应」式的应用层协议：请求由**请求行 + 头字段 + 空行 + 消息体**组成，响应由**状态行 + 头字段 + 空行 + 消息体**组成，字段之间用 `CRLF` 分行，头部与正文之间必须有一个空行。状态码是**协议层语义约定**，不是业务码；面试要能按五类讲清高频码，并说明 `301/302/307/308` 的方法语义与 `401/403`、`502/504` 的边界。

**报文结构：**

```text
HTTP-message   = start-line CRLF *( field-line CRLF ) CRLF [ message-body ]

请求：
    GET /api/users/42?fields=name HTTP/1.1 CRLF
    Host: api.example.com CRLF
    User-Agent: curl/8.5.0 CRLF
    Accept: application/json CRLF
    CRLF                             ← 空行表示头部结束，必须存在

响应：
    HTTP/1.1 200 OK CRLF
    Content-Type: application/json; charset=utf-8 CRLF
    Content-Length: 27 CRLF
    CRLF
    {"id":42,"name":"Alice"}
```

请求行中的 `request-target` 直连时是 origin-form（`/path?query`），经代理时可用 absolute-form（`http://host/path`）。HTTP/1.1 中 `Host` 必填，否则服务端无法做虚拟主机路由；HTTP/2 与 HTTP/3 改用伪头 `:authority`。

**状态码分类与高频码：**

| 类别 | 含义 | 高频码 | 关键点 |
| --- | --- | --- | --- |
| 1xx | 信息，请求已收到、继续处理 | `100 Continue`、`101 Switching Protocols` | `100` 用于大请求体先探路；`101` 是协议升级 |
| 2xx | 成功 | `200`、`201`、`204`、`206` | `201` 应带 `Location`；`204` 无正文；`206` 用于 Range |
| 3xx | 重定向或缓存命中 | `301`、`302`、`303`、`304`、`307`、`308` | 关注「方法是否改变、能否缓存」 |
| 4xx | 客户端错误 | `400`、`401`、`403`、`404`、`409`、`413`、`415`、`422`、`429` | 鉴权失败是 `401`，权限不足是 `403` |
| 5xx | 服务端错误 | `500`、`501`、`502`、`503`、`504` | `502` 网关收到非法响应，`504` 网关等待超时 |

**重定向码的区别（高频）：**

| 码 | 语义 | 方法是否保持 | 典型用途 |
| --- | --- | --- | --- |
| `301` | 永久移动 | 允许用户代理改为 GET | 域名迁移、强制 HTTPS |
| `302` | 临时移动 | 允许用户代理改为 GET | 登录跳转、灰度 |
| `303` | 见其他 | 一定改为 GET | POST 提交后跳结果页 |
| `307` | 临时重定向 | 保持方法与请求体 | 需要保留 POST 的临时跳转 |
| `308` | 永久重定向 | 保持方法与请求体 | 需要保留 POST 的永久迁移 |
| `304` | 未修改 | 不适用 | 协商缓存命中，响应无正文 |

**抓包示例：**

```bash
curl -v -X POST https://httpbin.org/post \
    -H "Content-Type: application/json" \
    -d '{"hello":"world"}'
```

```text
> POST /post HTTP/1.1
> Host: httpbin.org
> User-Agent: curl/8.5.0
> Accept: */*
> Content-Type: application/json
> Content-Length: 17
>
< HTTP/1.1 200 OK
< Date: Mon, 03 Nov 2026 02:10:00 GMT
< Content-Type: application/json
< Content-Length: 512
< Server: gunicorn
<
```

**工程取舍：** 不要用「HTTP 200 + 响应体 `{code: 500}`」掩盖所有错误，否则网关重试、监控告警、CDN 缓存、客户端拦截器全部失效。推荐「状态码表达协议层结果，响应体表达业务错误码」：`401` 触发重新登录，`429` 配合 `Retry-After` 触发退避，`503` 表达暂时不可用，`409` 表达并发冲突。重定向要区分永久与临时，否则用户会被长期锁在旧地址。

**面试怎么答：** 先画报文四段式，强调空行分隔、CRLF 与 `Host` 必填；再按五类状态码各点两三个高频码；最后讲 `301/302/307/308` 的方法语义、`401/403` 与 `502/504` 的边界，并给出「协议码 + 业务码分离」的实践。

**易错点：**

- 把 `304` 当错误；它是缓存命中，无正文，但仍可带 `ETag`、`Cache-Control`。
- 认为 `302` 一定保持 POST；需要保持方法时用 `307`。
- 混用 `401` 与 `403`：`401` 是未认证/凭证无效，应带 `WWW-Authenticate`；`403` 是已认证但无权。
- `204` 不能有响应体，返回 JSON 会让部分客户端解析异常。
- 把 `499` 当标准码；它是 Nginx 的私有码，表示客户端提前关闭连接。

---

## 2. HTTP/1.1 的问题与优化

**结论：** HTTP/1.1 的核心问题是**一条连接上响应必须按请求顺序返回**，形成消息级队头阻塞；叠加「每域约 6 个连接」的限制、纯文本头部重复传输、无法压缩头部，导致页面资源多时延迟被放大。历史上的一堆优化（域名分片、雪碧图、合并文件、内联）本质都是**绕过协议限制**，在 HTTP/2 下多数反而有害。

**队头阻塞的本质：**

```text
单条 HTTP/1.1 连接（持久连接）：

    时间 →
    [请求 A][响应 A ................................]
                    [请求 B][响应 B]
                                [请求 C][响应 C]

响应 B 必须等响应 A 的字节全部发完才能开始；A 慢则 B、C 一起等。
Pipelining 允许连续发请求，但响应仍必须按序返回，且中间设备兼容性差，
浏览器默认关闭，所以实际退化为「一问一答」。
```

**核心问题与代价：**

| 问题 | 表现 | 根因 |
| --- | --- | --- |
| 消息级队头阻塞 | 大响应阻塞后续小响应 | 响应必须按请求顺序返回 |
| 并发连接上限 | 同域约 6 条连接，超出排队 | 浏览器/服务端资源保护 |
| 头部不压缩 | 每次请求重复发送 Cookie、UA、Accept | 纯文本头，无索引与霍夫曼编码 |
| 建连成本 | 每个新连接都要 TCP 三次握手 + TLS 握手 | 连接不能无限复用 |
| 无法服务端推送 | 只能靠轮询、SSE、WebSocket | 协议没有推送原语 |
| 文本解析 | 逐行解析、边界依赖 CRLF | 报文是文本格式 |

**常见优化手段与其副作用：**

| 优化 | 做法 | 收益 | 副作用 |
| --- | --- | --- | --- |
| 持久连接 | `Connection: keep-alive` | 复用 TCP/TLS，省握手 | 空闲连接占资源，需要超时回收 |
| 域名分片 | 把资源分到 `static1`/`static2` 等域 | 突破 6 连接限制 | DNS 与建连成本增加；HTTP/2 下有害 |
| 雪碧图 | 多张小图合成一张 | 减少请求数 | 单图变大、改一处缓存全失效 |
| 资源内联 | 把 CSS/JS/小图塞进 HTML | 减少首屏请求 | HTML 变大、无法独立缓存 |
| 文件合并 | 多个 JS/CSS 合成一个 | 减少请求数 | 缓存粒度变粗、任一改动全量失效 |
| CDN | 静态资源就近分发 | 降低 RTT | 成本、缓存一致性 |
| 预连接 | `<link rel="preconnect">` | 提前建连 | 过多预连接浪费资源 |
| 压缩 | gzip/brotli | 减少传输字节 | CPU 开销，动态压缩要缓存 |

**测量示例：**

```bash
curl -s -o /dev/null -w \
    "dns=%{time_namelookup}s connect=%{time_connect}s tls=%{time_appconnect}s ttfb=%{time_starttransfer}s total=%{time_total}s\n" \
    https://example.com/
```

```text
dns=0.012s connect=0.031s tls=0.089s ttfb=0.210s total=0.245s
```

`time_connect` 与 `time_appconnect` 之差就是 TLS 握手成本；`ttfb` 包含服务端处理与首字节网络时间。优化前先分清瓶颈在 DNS、建连、TLS、服务端还是传输。

**工程取舍：** HTTP/1.1 时代「减少请求数」是第一优先级；迁移到 HTTP/2 后应反向操作：**拆小文件、去掉域名分片、停止文件合并**，让多路复用与缓存粒度发挥优势。是否升级要看客户端分布与链路：HTTP/2 需要 HTTPS（浏览器实现），且服务端、CDN、负载均衡都要支持。对 API 而言，Keep-Alive 与连接池比前端资源优化更重要。

**面试怎么答：** 先点出「响应按序返回」是根因，再列连接数、头部冗余、建连成本三个放大器；然后说优化手段都是绕过，并主动补一句「HTTP/2 下域名分片和合并文件是反模式」。能说出 pipelining 为什么没普及（中间设备不兼容、仍受队头阻塞）是加分项。

**易错点：**

- 把 HTTP/1.1 的队头阻塞和 HTTP/2 的 TCP 层队头阻塞混为一谈，前者是消息级，后者是传输级。
- 认为 `keep-alive` 能解决并发问题；它只复用连接，不改变串行语义。
- 在 HTTP/2 上继续做域名分片，反而拆散了连接、丢失多路复用收益。
- 忘记 `Connection` 是逐跳头，经过代理时可能被改写。
- 只看请求数不看资源体积；合并与内联可能让首屏更慢。

---

## 3. HTTP/2 多路复用与 HPACK

**结论：** HTTP/2 在一条 TCP 连接上引入**二进制分帧层**：请求与响应被切成带 Stream ID 的帧，多个流交错发送，实现多路复用；头部用 **HPACK** 压缩（静态表 + 动态表 + 霍夫曼编码）。它解决了 HTTP/1.1 的消息级队头阻塞与头部冗余，但**没有解决 TCP 层的队头阻塞**——丢一个包，整条连接上所有流都要等，这也是 HTTP/3 出现的直接原因。

**二进制帧格式（9 字节帧头）：**

```text
    +-----------------------------------------------+
    |                 Length (24 bit)               |  ← 帧体长度，不含 9 字节帧头
    +---------------+---------------+---------------+
    |   Type (8)    |   Flags (8)   |
    +-+-------------+---------------+---------------+
    |R|                 Stream ID (31 bit)          |  ← R 为保留位，必须为 0
    +-+---------------------------------------------+
    |                   Frame Payload               |
    +-----------------------------------------------+
```

**常见帧类型：**

| 帧 | 作用 | 关键点 |
| --- | --- | --- |
| `HEADERS` | 传递头部 | 可带 `END_HEADERS`、`END_STREAM` 标志 |
| `DATA` | 传递正文 | 可带 `END_STREAM`，受流控 |
| `SETTINGS` | 协商参数 | 如 `MAX_CONCURRENT_STREAMS`、`INITIAL_WINDOW_SIZE` |
| `WINDOW_UPDATE` | 调整流/连接窗口 | 流控是逐流 + 整条连接两级 |
| `RST_STREAM` | 中止某个流 | 只影响该流，不断连接 |
| `PING` | 保活/测 RTT | 必须回 PONG |
| `GOAWAY` | 优雅关闭连接 | 告知对方不再接受新流 |
| `PRIORITY` | 旧优先级机制 | 实现混乱，实际多被忽略 |

**连接建立：** 明文 `h2c` 可用 Upgrade 或直接发 `PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n` 前言；浏览器只通过 TLS 上的 **ALPN** 协商 `h2`。建连后双方先交换 `SETTINGS`，客户端发送带 `:method`、`:scheme`、`:path`、`:authority` 伪头的 HEADERS。

**多路复用示意：**

```text
一条 TCP 连接：

    流 1  HEADERS ──────────────── DATA ──────── END_STREAM
    流 3          HEADERS ── DATA ── DATA ── END_STREAM
    流 5                 HEADERS ─────────── DATA ── END_STREAM

帧按到达顺序交错发送，每个帧都带 Stream ID，接收端按 ID 重组。
```

**HPACK 的三件套：**

| 机制 | 内容 | 作用 |
| --- | --- | --- |
| 静态表 | 61 条预定义头（`:method: GET` 索引 2 等） | 常见头只发索引，1 字节搞定 |
| 动态表 | 连接级、先进先出，默认上限 4096 字节 | 重复出现的自定义头只发一次 |
| 霍夫曼编码 | 对字面量做变长编码 | 进一步压缩头字段文本 |

头部块中的表示形式：`1xxxxxxx` 为索引命中；`01xxxxxx` 为带增量索引的字面量（会写入动态表）；`0000xxxx` 为不索引字面量；`0001xxxx` 为永不索引（用于 `Cookie`、`Authorization` 等敏感头）。动态表是**每条连接独立**的，因此同一条连接上的请求才能共享压缩收益，这也是「不要域名分片」的原因之一。

**抓包示例：**

```bash
curl --http2 -v https://example.com/ -o /dev/null
```

```text
* ALPN: server accepted h2
* using HTTP/2
* h2h3 [:method: GET]
* h2h3 [:path: /]
* h2h3 [:scheme: https]
* h2h3 [:authority: example.com]
* h2h3 [user-agent: curl/8.5.0]
* h2h3 [accept: */*]
< HTTP/2 200
< content-type: text/html
< content-length: 1256
```

**工程取舍：** HTTP/2 适合资源多、并发高的站点，但服务端要处理：流控窗口、`MAX_CONCURRENT_STREAMS`、头部表大小、明文 `h2c` 的上游兼容。**服务端推送（Server Push）已在 RFC 9113 中移除**，不要在设计里依赖它；早期 `103 Early Hints` 才是更可用的预加载手段。CDN 回源若是 HTTP/1.1，边缘的多路复用收益会被回源串行抵消。

**面试怎么答：** 按「二进制分帧 → Stream ID 多路复用 → HPACK 压缩 → 仍受 TCP 队头阻塞」讲。加分点：帧头 9 字节、伪头、ALPN、动态表按连接隔离、Server Push 已从标准移除、流控是流级 + 连接级两层。

**易错点：**

- 认为 HTTP/2 彻底解决了队头阻塞；TCP 丢包时所有流仍会停等。
- 把 HPACK 当成 gzip；它针对头部，且依赖连接级动态表状态。
- 以为 HTTP/2 必须加密；规范允许 `h2c`，但浏览器只对 HTTPS 启用。
- 在 HTTP/2 上做域名分片，破坏动态表与连接复用。
- 忘记 `RST_STREAM` 只中止单流，不会断开整条连接。
- 认为 `PRIORITY` 帧能精确控制顺序；实际浏览器与服务器支持很不一致。

---

## 4. HTTP/3 与 QUIC

**结论：** HTTP/3 是把 HTTP 语义搬到 **QUIC** 上的版本（RFC 9114），QUIC 运行在 **UDP** 之上并内建 TLS 1.3、连接 ID、逐流多路复用与逐流丢包恢复。它解决的不是「HTTP 头太大」，而是 **TCP 层队头阻塞** 与中间设备对 TCP 新特性的固化阻碍。代价是 UDP 可能被网络封禁、CPU 成本更高、运维观测更复杂。

**协议栈对比：**

```text
HTTP/1.1        HTTP/2           HTTP/3
   |               |               |
  TCP             TCP            QUIC（用户态，跑在 UDP 上）
   |               |               |
  IP              IP             UDP
                                  |
                                 IP

HTTP/3 = HTTP 语义 + QPACK + QUIC + TLS 1.3（内建于 QUIC）
```

**QUIC 的关键设计：**

| 特性 | 说明 | 解决的问题 |
| --- | --- | --- |
| 流级多路复用 | 每个 QUIC Stream 独立编号与恢复 | 一个流丢包不阻塞其他流 |
| 内建 TLS 1.3 | 握手即密钥协商，1-RTT；会话复用可 0-RTT | 减少往返、避免明文降级 |
| 连接 ID | 不依赖四元组标识连接 | 换网/换 IP 不断连（连接迁移） |
| 头部保护 + AEAD | 包序号与部分头字段加密 | 防篡改、防中间设备窥探 |
| 用户态实现 | 协议逻辑在应用进程 | 快速迭代，不受内核与中间盒限制 |

**握手时序（首次连接，1-RTT）：**

```text
客户端                                        服务端
   |  Initial（含 TLS ClientHello、QUIC 传输参数）  |
   | --------------------------------------------> |
   |                                             |  验证、生成握手密钥
   |  Initial / Handshake（ServerHello、证书、Finished）
   | <-------------------------------------------- |
   |  Handshake（Client Finished）+ 1-RTT 请求      |
   | --------------------------------------------> |
   |  1-RTT 响应                                   |
   | <-------------------------------------------- |
```

0-RTT 复用会话时，客户端可在第一个包里带应用数据，但 0-RTT 数据**可能被重放**，只能用于幂等请求（如 GET 静态资源），不能用于下单、支付。

**QPACK 与 HPACK 的差别：** HTTP/3 的头压缩仍是「静态表 + 动态表 + 霍夫曼」，但因为流是乱序到达的，若某帧头部引用了尚未到达的动态表项就会阻塞解码。QPACK 因此把动态表更新拆到独立的 **Encoder Stream / Decoder Stream**，并引入阻塞上限与编码策略，用「少量阻塞风险」换取压缩率。

**发现与回退：** 服务端通过 `Alt-Svc` 告知 HTTP/3 端点，浏览器先走 HTTP/2，再尝试升级；失败则继续用 HTTP/2。

```http
HTTP/2 200 OK
Alt-Svc: h3=":443"; ma=86400
```

```bash
# curl 需编译时启用 HTTP/3（看 Features 是否含 HTTP3）
curl -V
curl --http3-only -v https://cloudflare-quic.com/ -o /dev/null
```

**工程取舍：** 上线 HTTP/3 的常见障碍是 UDP 443 被企业网/酒店网封锁，必须有 HTTP/2 回退；QUIC 把加密与传输放进用户态，单核吞吐与 CPU 占用通常高于内核 TCP，需要压测；抓包分析要用支持 QUIC 解密的工具（如带密钥日志的 Wireshark），传统 tcpdump 只能看到 UDP 外层。CDN 与负载均衡要支持 QUIC 终止或透传。

**面试怎么答：** 一句话定位「HTTP/3 = HTTP over QUIC over UDP」；然后讲 QUIC 的四个卖点：流级多路复用消除 TCP 队头阻塞、内建 TLS 1.3 与 0-RTT、连接 ID 支持迁移、用户态可演进。再补 QPACK、`Alt-Svc` 与回退，最后说清 UDP 被封与 CPU 成本这两个现实约束。

**易错点：**

- 说 HTTP/3「基于 UDP 所以不可靠」；可靠性与拥塞控制由 QUIC 在应用层实现。
- 把 QUIC 等同于 HTTP/3；QUIC 是传输层协议，HTTP/3 只是其上的应用协议。
- 认为 0-RTT 一定更快且安全；它有重放风险，只能用于幂等请求。
- 忘记 HTTP/3 仍需回退到 HTTP/2；UDP 443 并非处处可用。
- 以为 QUIC 的连接迁移不需要重新握手；迁移复用连接上下文，但需验证路径。
- 把 QPACK 的动态表当成连接无关；它同样有编码器/解码器状态。

---

## 5. HTTPS 握手机制（TLS 1.3）

**结论：** HTTPS 是 HTTP over TLS。TLS 1.3（RFC 8446）把完整握手压缩到 **1-RTT**，会话复用时可以 **0-RTT**；它删除了 RSA 密钥交换、CBC 模式、RC4、SHA-1 等弱算法，只保留 **(EC)DHE 前向保密 + AEAD**。握手的目标是三件事：**身份认证、密钥协商、参数协商**，而不是「加密 HTTP 报文」这么简单。

**TLS 1.3 完整握手（1-RTT）：**

```text
客户端                                              服务端
   |  ClientHello                                      |
   |    supported_versions=TLS1.3                      |
   |    key_share (ECDHE 公钥)                          |
   |    signature_algorithms, SNI, ALPN                |
   | ------------------------------------------------->|
   |                                                   |  选择参数、验证 SNI
   |  ServerHello                                      |
   |    key_share, cipher_suite                        |
   | <-------------------------------------------------|
   |  EncryptedExtensions                              |
   |  Certificate（证书链）                             |
   |  CertificateVerify（用私钥签握手转录）              |
   |  Finished（服务端握手完成）                         |
   | <-------------------------------------------------|
   |  [此后所有内容都用握手密钥加密]                     |
   |  Finished（客户端握手完成）                         |
   | ------------------------------------------------->|
   |  应用数据（HTTP 请求/响应）                         |
```

说明：服务端的 `ServerHello` 之后到 `Finished` 属于同一 flight，可连续发送；客户端只需一个 `Finished` 回应，因此是 1 个往返。`CertificateVerify` 的签名覆盖「握手转录（transcript）」，防止证书被替换或握手消息被篡改。

**握手各阶段的作用：**

| 消息 | 方向 | 作用 |
| --- | --- | --- |
| `ClientHello` | C→S | 声明版本、套件、密钥共享、SNI、ALPN |
| `ServerHello` | S→C | 选定版本与套件，回送 ECDHE 公钥与随机数 |
| `EncryptedExtensions` | S→C | 加密后的扩展（如 ALPN 结果、最大分片） |
| `Certificate` | S→C | 服务端证书链 |
| `CertificateVerify` | S→C | 证明持有证书私钥 |
| `Finished` | 双向 | 校验握手转录的 MAC，确认密钥一致 |

**密钥派生（HKDF）：** 预主密钥（ECDHE 共享秘密）经 `HKDF-Extract` 得到主密钥，再 `HKDF-Expand` 派生 `client_early_traffic`（0-RTT）、`handshake traffic`、`application traffic` 等密钥。TLS 1.3 的 record 层只做 AEAD 加密与序列号，不再有压缩与 MAC-then-Encrypt。

**TLS 1.2 与 1.3 对比：**

| 维度 | TLS 1.2 | TLS 1.3 |
| --- | --- | --- |
| 完整握手往返 | 2-RTT | 1-RTT |
| 会话复用 | 1-RTT（Session ID / Ticket） | 1-RTT，支持 0-RTT |
| 密钥交换 | RSA 或 (EC)DHE | 仅 (EC)DHE，强制前向保密 |
| 对称算法 | CBC/GCM/ChaCha20 | 仅 AEAD（GCM/ChaCha20-Poly1305/CCM） |
| 认证算法 | RSA/SHA-1 等 | RSA-PSS/ECDSA/Ed25519 等 |
| 记录层 | MAC-then-Encrypt 或 AEAD | 仅 AEAD |

**抓包/验证示例：**

```bash
openssl s_client -connect example.com:443 \
    -servername example.com -tls1_3 -alpn h2
```

```text
SSL-Session:
    Protocol  : TLSv1.3
    Cipher    : TLS_AES_256_GCM_SHA384
    Verify return code: 0 (ok)
ALPN protocol: h2
```

```bash
curl -v https://example.com/ -o /dev/null
```

```text
* TLSv1.3 (OUT), TLS handshake, Client hello (1)
* TLSv1.3 (IN), TLS handshake, Server hello (2)
* TLSv1.3 (IN), TLS handshake, Certificate (11)
* TLSv1.3 (IN), TLS handshake, Server finished (14)
* TLSv1.3 (OUT), TLS handshake, Client finished (8)
* SSL connection using TLSv1.3 / TLS_AES_128_GCM_SHA256
```

**工程取舍：** 优先启用 TLS 1.3 并保留 1.2 兼容老客户端；证书链要完整（中间证书缺失会导致部分客户端失败），开启 OCSP Stapling 减少验证延迟；在负载均衡/网关终止 TLS 时，内网回源要评估是否再次加密。HSTS 与 `preload` 能防降级，但一旦提交 preload 很难撤销。0-RTT 只给静态资源或幂等接口，服务端要能识别并拒绝重放。

**面试怎么答：** 先给「认证 + 密钥协商 + 参数协商」三个目标，再画 1-RTT 时序并点出 `CertificateVerify` 与 `Finished` 的作用；然后对比 TLS 1.2 的 2-RTT 与 RSA 密钥交换的缺陷，说明 1.3 为什么强制 ECDHE 与 AEAD；最后补 0-RTT 的重放风险与 HSTS。

**易错点：**

- 说 TLS 1.3 是 2-RTT；完整握手是 1-RTT，0-RTT 仅限会话复用。
- 认为 0-RTT 与 1-RTT 一样安全；0-RTT 数据可被重放，且部分前向保密性弱。
- 把 `CertificateVerify` 说成「加密证书」；它是私钥签名，证明持有者身份。
- 忘记 SNI 在 TLS 1.3 中默认仍是明文（除非部署 ECH）。
- 以为 TLS 1.3 支持所有旧套件；它已删除 RSA 密钥交换、CBC、RC4、SHA-1。
- 只配域名证书不配中间证书，导致部分安卓/Java 客户端握手失败。

---

## 6. HTTP 缓存机制

**结论：** HTTP 缓存分两级：**强缓存**看 `Cache-Control`/`Expires`，在有效期内直接用本地副本、不发请求；**协商缓存**看 `ETag`/`Last-Modified`，发请求带 `If-None-Match`/`If-Modified-Since`，未变化则服务端回 `304`。缓存的正确性依赖 `Vary`、`Age` 与缓存键设计；`no-cache` 不是「不缓存」，`no-store` 才是。

**缓存决策流程：**

```text
请求 → 查本地缓存
    │
    ├─ 无缓存 ──────────────────────────────→ 发请求，存响应
    │
    └─ 有缓存
        │
        ├─ 新鲜（fresh）？ ── 是 ──→ 直接用（可带 Age）
        │        │
        │        └─ 否（stale）
        │             │
        │             ├─ 有 ETag/Last-Modified ──→ 条件请求
        │             │        ├─ 304 → 复用本地副本，更新头部
        │             │        └─ 200 → 用新响应替换
        │             │
        │             └─ 无验证器 ──→ 重新拉取
        │
        └─ no-store ──→ 不读写任何缓存
```

**关键响应头：**

| 头 | 作用 | 细节 |
| --- | --- | --- |
| `Cache-Control: max-age=N` | 相对新鲜期 | 从响应生成时间算起，优先级高于 `Expires` |
| `Cache-Control: s-maxage=N` | 共享缓存新鲜期 | 只对 CDN/代理生效，覆盖 `max-age` |
| `Cache-Control: no-cache` | 可存但每次使用前必须验证 | 不是「不缓存」 |
| `Cache-Control: no-store` | 禁止存储 | 适用于含隐私数据的响应 |
| `Cache-Control: private` | 仅浏览器可缓存 | 共享缓存不得存储 |
| `Cache-Control: public` | 共享缓存可存 | 即使带 `Authorization` 也可存 |
| `Cache-Control: must-revalidate` | 过期后必须验证，不得用陈旧副本 | 强一致性 |
| `Cache-Control: stale-while-revalidate=N` | 过期后先给旧副本，同时后台刷新 | 降延迟，容忍短暂不一致 |
| `Expires` | 绝对时间 | 受客户端时钟影响，已被 `max-age` 取代 |
| `ETag` | 资源版本标识 | 强验证器 `"abc"`，弱验证器 `W/"abc"` |
| `Last-Modified` | 最后修改时间 | 精度 1 秒，弱验证器 |
| `Vary` | 缓存键维度 | 如 `Vary: Accept-Encoding, Origin` |
| `Age` | 已在缓存中存放的秒数 | 用于计算剩余新鲜期 |

**条件请求示例：**

```bash
# 首次请求，拿到 ETag
curl -i https://example.com/app.js

# 再次请求，带上验证器
curl -i https://example.com/app.js \
    -H 'If-None-Match: "5f2c8e1a-1f4"'
```

```http
HTTP/1.1 304 Not Modified
ETag: "5f2c8e1a-1f4"
Cache-Control: public, max-age=3600
Date: Mon, 03 Nov 2026 02:20:00 GMT
```

`304` 没有正文，但会刷新缓存的新鲜期；服务端不要给 `304` 返回错误的状态行或正文。`If-None-Match` 的优先级高于 `If-Modified-Since`，两者同时出现时以 ETag 为准。

**启发式缓存：** 当响应没有 `Cache-Control` 与 `Expires` 时，缓存可按 `(Date - Last-Modified)` 的约 10% 估算新鲜期（RFC 9111 允许的实现启发式）。生产环境应显式设置，不要依赖启发式。

**工程取舍：** 带哈希的静态资源用 `Cache-Control: public, max-age=31536000, immutable`，HTML 入口用 `no-cache` 或短 `max-age`，API 按业务一致性要求选择 `no-store`/短缓存/`stale-while-revalidate`。CDN 缓存键要包含 `Vary` 声明的维度，否则会把 A 用户的响应发给 B 用户；带 `Authorization` 的响应默认不被共享缓存存储，除非显式 `public`。发布新版本时用文件名哈希而非查询串，避免中间缓存忽略查询串。

**面试怎么答：** 先分强缓存与协商缓存，画出「新鲜 → 直接使用；过期 → 条件请求 → 304」的流程；再列 `Cache-Control` 的六个高频指令并纠正 `no-cache` 的误解；最后讲 `ETag` 强弱、`Vary` 与 CDN 缓存键、带哈希文件的长期缓存策略。

**易错点：**

- 把 `no-cache` 当成不缓存；它是「可存但必须验证」。
- 认为 `max-age=0` 等于 `no-store`；前者仍会存并验证。
- 只设 `Last-Modified` 不设 `ETag`，秒级修改会漏判。
- 忘记 `Vary`，CDN 把压缩版与未压缩版、不同 Origin 的响应串用。
- 给 `304` 带正文，或返回 `200` 却漏掉 `ETag`，导致缓存无法更新。
- 认为 `immutable` 是标准指令；它是浏览器扩展实现，广泛支持但非 RFC 正式指令。
- 用查询串做版本号，部分 CDN/代理缓存键会忽略查询串。

---

## 7. Cookie、Session 与 Token

**结论：** 三者不是同一层的东西：**Cookie 是 HTTP 的传输载体**（响应头 `Set-Cookie` 写入、请求头 `Cookie` 回传），**Session 是服务端保存的会话状态**（浏览器只拿一个 Session ID），**Token 是客户端持有的自包含凭证**（服务端用签名/解密验证，不查会话表）。选型的分水岭是「状态存在哪、能否横向扩展、如何撤销」。

**Cookie 的协议层行为：**

```http
HTTP/1.1 200 OK
Set-Cookie: sid=8f3a2c; Path=/; Max-Age=1800; Secure; HttpOnly; SameSite=Lax
Set-Cookie: theme=dark; Path=/; Max-Age=31536000; SameSite=Lax

GET /api/orders HTTP/1.1
Host: api.example.com
Cookie: sid=8f3a2c; theme=dark
```

`Set-Cookie` 可以出现多次，每个 Cookie 一条；`Cookie` 请求头把所有匹配的键值用 `; ` 拼接成一行。浏览器按**域、路径、Secure、SameSite、过期时间**决定是否附带，服务端无法强制客户端遵守，但可以通过属性表达意图。

**Session 模式：**

```text
浏览器                          服务端                    会话存储
   |  POST /login（账号密码）        |                        |
   | ------------------------------>|  校验                  |
   |                                |  生成 sid=随机 128bit   |
   |                                | ---------------------->| 写入 Redis
   |  Set-Cookie: sid=...; HttpOnly |                        |
   | <------------------------------|                        |
   |  GET /orders（自动带 Cookie）   |                        |
   | ------------------------------>|  用 sid 查会话          |
   |                                | <----------------------|
   |  200 + 数据                     |                        |
```

Session 的优点是**可即时撤销**（删除服务端记录即可）、权限变更立刻生效；缺点是服务端有状态，扩容要共享存储（Redis/数据库），跨域与多端支持更麻烦。

**Token 模式（JWT）：**

```text
JWT = base64url(header) . base64url(payload) . base64url(signature)

    header  : {"alg":"RS256","typ":"JWT","kid":"k1"}
    payload : {"sub":"42","role":"admin","exp":1762300000,"iat":1762296400}
    signature: 对前两段用服务端私钥签名（RS256）或共享密钥 HMAC（HS256）
```

JWT 只保证**完整性**，不保证**机密性**：payload 只是 Base64URL 编码，任何人可解码，不能放密码、身份证号等敏感信息。服务端验证签名与 `exp`/`iat`/`aud`/`iss` 后即可信任声明，无需查库，适合无状态横向扩展；代价是**主动撤销困难**，需要黑名单、短有效期 + Refresh Token 轮换，或改用不透明 Token。

**三者对比：**

| 维度 | Cookie | Session | Token（JWT） |
| --- | --- | --- | --- |
| 状态位置 | 浏览器（键值） | 服务端（会话表/Redis） | 客户端（自包含） |
| 传输方式 | 自动随请求头 | 通常借 Cookie 传 Session ID | `Authorization: Bearer` 或 Cookie |
| 服务端查询 | 无 | 每次查会话 | 无（验签即可） |
| 横向扩展 | 无状态 | 需共享存储 | 天然无状态 |
| 主动撤销 | 删 Cookie 即可 | 删服务端记录 | 困难，需黑名单/短过期 |
| 主要风险 | CSRF、XSS 读取 | Session 固定、会话泄露 | XSS 窃取、重放、算法混淆 |
| 多端支持 | 浏览器为主 | 依赖 Cookie 时较弱 | 移动端/服务端友好 |

**抓包与验证示例：**

```bash
# 登录并保存 Cookie
curl -i -c cookies.txt -X POST https://api.example.com/login \
    -H 'Content-Type: application/json' \
    -d '{"user":"alice","password":"***"}'

# 带 Cookie 访问
curl -i -b cookies.txt https://api.example.com/orders

# 带 Bearer Token 访问
curl -i https://api.example.com/orders \
    -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**工程取舍：** 浏览器单页应用若把 Token 放 `localStorage`，XSS 一旦发生即可被读走；放 `HttpOnly` Cookie 能防读取，但又回到 CSRF，需要 `SameSite=Lax/Strict` + CSRF Token 或自定义头。推荐「短期 Access Token（内存或 HttpOnly Cookie）+ 长期 Refresh Token（HttpOnly、路径受限、可轮换）」；服务端要校验 `alg` 白名单，禁止 `none`，并校验 `aud`/`iss`。Session 适合后台管理、需要强撤销的场景；JWT 适合网关鉴权、跨服务传递身份。

**面试怎么答：** 先纠正「Cookie 是存储、Session 是 Cookie」的混淆，明确 Cookie 只是传输层；再画 Session 查库与 JWT 验签两条链路；然后从「状态位置、扩展性、撤销能力、CSRF/XSS」四个维度对比；最后给出 Access + Refresh 的实践与 JWT 不可加密的提醒。

**易错点：**

- 说 JWT 是加密的；它默认只是签名，payload 可被解码。
- 把 Token 放 `localStorage` 还说「防 CSRF 所以安全」，忽略 XSS。
- 不校验 `alg`，遭受 `alg: none` 或 HS256/RS256 混淆攻击。
- Session ID 登录后不更换，存在 Session Fixation 风险。
- 认为 JWT 无法撤销就完全不用黑名单；短过期 + 轮换是必要配套。
- 把 `HttpOnly` 当成万能防御；它能防读取，不能防「借用浏览器发起请求」。

---

## 8. RESTful 与 GraphQL

**结论：** REST 是**架构风格**（一组约束），不是「JSON + 四个 HTTP 方法」；GraphQL 是**查询语言与运行时**，用一个端点让客户端声明所需字段。REST 的优势是 HTTP 语义、缓存与生态；GraphQL 的优势是减少往返、避免过度/不足取数，代价是缓存、限流、N+1 与查询复杂度控制更难。

**REST 的六个约束（Fielding）：**

| 约束 | 含义 | 工程体现 |
| --- | --- | --- |
| 客户端-服务器 | 界面与数据分离 | 前端/后端独立演进 |
| 无状态 | 每个请求自带全部上下文 | 不依赖服务端会话，易扩容 |
| 可缓存 | 响应明确标注可否缓存 | `Cache-Control`、`ETag` |
| 统一接口 | 资源标识、通过表述操作、自描述消息、HATEOAS | URI + 方法 + 媒体类型 |
| 分层系统 | 客户端不感知中间层 | 网关、CDN、代理 |
| 按需代码（可选） | 服务端下发可执行代码 | JavaScript、小程序 |

**HTTP 方法语义（REST 的基石）：**

| 方法 | 安全（只读） | 幂等 | 典型语义 |
| --- | --- | --- | --- |
| `GET` | 是 | 是 | 读取资源，可缓存 |
| `HEAD` | 是 | 是 | 只取头部 |
| `POST` | 否 | 否 | 创建、提交、非幂等动作 |
| `PUT` | 否 | 是 | 整体替换，重复执行结果一致 |
| `PATCH` | 否 | 不一定 | 局部更新，取决于补丁语义 |
| `DELETE` | 否 | 是 | 删除，重复删除结果一致 |

幂等不等于「返回相同响应」，而是「多次执行对资源状态的影响相同」。`POST /orders` 重复提交会创建多单，因此需要幂等键（`Idempotency-Key`）来防重。

**REST 请求示例：**

```bash
curl -i https://api.example.com/v1/users/42
curl -i -X PATCH https://api.example.com/v1/users/42 \
    -H 'Content-Type: application/merge-patch+json' \
    -d '{"name":"Alice"}'
curl -i -X DELETE https://api.example.com/v1/users/42
```

**GraphQL 的传输形态：** 通常是 `POST /graphql`，请求体是 JSON，包含 `query`、`variables`、`operationName`；响应体固定为 `{ "data": ..., "errors": [...] }`。**HTTP 状态码常为 200，即使业务报错也在 `errors` 里**，只有请求本身无法解析时才用 4xx。

```graphql
query OrderWithUser($id: ID!) {
    order(id: $id) {
        id
        total
        user {
            name
            email
        }
    }
}
```

```bash
curl -i -X POST https://api.example.com/graphql \
    -H 'Content-Type: application/json' \
    -d '{"query":"query($id:ID!){order(id:$id){id total user{name}}}","variables":{"id":"1001"}}'
```

```json
{
    "data": {
        "order": {
            "id": "1001",
            "total": 259.00,
            "user": { "name": "Alice" }
        }
    }
}
```

**对比：**

| 维度 | REST | GraphQL |
| --- | --- | --- |
| 端点 | 多资源、多 URL | 通常单端点 |
| 取数粒度 | 服务端决定，易过度/不足 | 客户端声明字段 |
| 请求次数 | 关联资源可能多次往返 | 一次查询拿多资源 |
| HTTP 缓存 | 天然可用 URL + 方法 + 状态码 | 默认 POST，需持久化查询/APQ 才能缓存 |
| 错误语义 | 状态码 + 响应体 | `200` + `errors` 数组 |
| 限流与复杂度 | 按 URL/方法限流 | 需查询深度、复杂度、别名次数限制 |
| 版本演进 | URL/媒体类型版本 | Schema 演进、字段废弃（`@deprecated`） |
| 实时能力 | SSE/WebSocket 另接 | Subscription（WebSocket 或 SSE） |

**工程取舍：** GraphQL 的坑主要在服务端：每个字段一个 resolver 容易造成 **N+1 查询**，要用 DataLoader 批量；必须限制查询深度、复杂度与单请求耗时，防止恶意嵌套；生产环境关闭 introspection 或仅内网开放，并启用持久化查询（Persisted Queries）减少攻击面与传输体积。REST 则要设计好资源边界、分页（cursor 优于 offset）、幂等键与错误码；不要把所有动作都塞进 `POST /doSomething`。

**面试怎么答：** 先纠正 REST 是架构风格而非协议，列出六约束与方法的幂等/安全语义；再讲 GraphQL 的请求形态与 `200 + errors` 的特殊性；然后用「取数粒度、请求次数、缓存、错误语义、复杂度控制」对比，最后补 N+1 与 DataLoader、查询深度限制这些落地细节。

**易错点：**

- 认为 REST 必须用 JSON；它取决于媒体类型，XML、Protobuf 也可以。
- 把 `PATCH` 当幂等；JSON Merge Patch 通常幂等，但某些操作型补丁不是。
- 认为 GraphQL 一定是 `200`；请求语法错误/变量缺失可用 `400`。
- 用 GET 发 GraphQL 查询并期望任意缓存；复杂查询通常走 POST。
- 忽略 GraphQL 的 N+1 与恶意深度查询，导致数据库被打穿。
- 把 REST 的「无状态」理解成「不能有数据库」；无状态指请求不依赖服务端会话。

---

## 9. WebSocket 协议原理

**结论：** WebSocket（RFC 6455）先用一个 HTTP/1.1 `Upgrade` 握手「借道」升级，之后在同一 TCP 连接上改用**帧（frame）**收发文本或二进制数据，实现全双工。它与 HTTP 的本质区别是：握手后不再有请求/响应配对，双方可随时主动发送；协议层自带分片、掩码、ping/pong 与关闭握手。

**握手与 `Sec-WebSocket-Accept`：**

```http
GET /chat HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Origin: https://app.example.com

HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

服务端计算方式：`base64(SHA-1(Sec-WebSocket-Key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"))`。`Key` 是客户端随机生成的 16 字节再 Base64，作用是让服务端证明自己确实理解 WebSocket 协议，而不是普通 HTTP 缓存或代理误回 101。`Origin` 由浏览器自动带上，服务端必须校验，防跨站 WebSocket 劫持。

**帧格式：**

```text
     0                   1                   2                   3
     0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
    +-+-+-+-+-------+-+-------------+-------------------------------+
    |F|R|R|R| opcode|M| Payload len |    Extended payload length    |
    |I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
    |N|V|V|V|       |S|             |   (if payload len==126/127)   |
    | |1|2|3|       |K|             |                               |
    +-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
    |     Extended payload length continued, if payload len == 127  |
    + - - - - - - - - - - - - - - - +-------------------------------+
    |                               |Masking key, if MASK set to 1  |
    +-------------------------------+-------------------------------+
    |      Masking key (continued)  |          Payload Data         |
    +-------------------------------- - - - - - - - - - - - - - - - +
    :                     Payload Data continued ...                :
    + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
    |                     Payload Data continued ...                |
    +---------------------------------------------------------------+
```

要点：`FIN` 表示是否为消息的最后一帧；`RSV1-3` 预留给扩展（如 `permessage-deflate`）；`opcode` 区分数据类型；`MASK` 表示是否掩码。**客户端发送的帧必须掩码**，服务端发送的帧不得掩码，掩码密钥每帧随机，解码时按字节与密钥异或。

**操作码与关闭码：**

| opcode | 含义 | 说明 |
| --- | --- | --- |
| `0x0` | continuation | 分片消息的后续帧 |
| `0x1` | text | UTF-8 文本 |
| `0x2` | binary | 二进制 |
| `0x8` | close | 关闭握手，可带关闭码与原因 |
| `0x9` | ping | 控制帧，接收方应回 pong |
| `0xA` | pong | 心跳响应 |

| 关闭码 | 含义 | 说明 |
| --- | --- | --- |
| `1000` | 正常关闭 | 双方协商结束 |
| `1001` | 离开 | 服务端重启/页面跳转 |
| `1002` | 协议错误 | 帧格式或 opcode 非法 |
| `1003` | 不支持的数据类型 | 如只收文本却收到二进制 |
| `1007` | 数据格式错误 | 文本不是合法 UTF-8 |
| `1008` | 策略违规 | 鉴权失败、越权 |
| `1009` | 消息过大 | 超过约定上限 |
| `1011` | 服务端内部错误 | 处理异常 |
| `1006` | 异常关闭 | 保留码，**不能出现在 close 帧中**，仅供客户端上报 |

控制帧（ping/pong/close）不能分片，负载不超过 125 字节；收到 ping 必须尽快回 pong，可用于保活与探测半开连接。关闭握手要双方各发一个 close 帧并互相 ACK，之后才断开 TCP，直接断连会让对端只看到 `1006`。

**握手验证示例：**

```bash
curl -i -N \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Version: 13" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    https://example.com/chat
```

```text
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

`curl` 只能完成握手并显示 101，无法方便地构造后续帧；实际调试用 `wscat`、浏览器 Network 的 WS 帧面板，或支持 WebSocket 解密的 Wireshark。

**工程取舍：** 反向代理要显式支持 `Upgrade`（Nginx 需 `proxy_http_version 1.1` 与 `proxy_set_header Upgrade $http_upgrade`），否则握手 400/502；`permessage-deflate` 省带宽但增加 CPU，且历史上存在压缩侧信道问题，敏感场景慎用。服务端要限制单帧与单消息大小、设置读写超时、校验 `Origin`，并在关闭时走 close 握手。HTTP/2 的 WebSocket 需要 RFC 8441 的 `CONNECT` 扩展，并非所有网关都支持。

**面试怎么答：** 按「HTTP Upgrade 握手 → Accept 计算 → 帧结构 → 掩码规则 → close/ping 控制帧」讲。加分点：客户端必须掩码、`1006` 不能主动发送、控制帧不可分片、`Origin` 必须校验、Nginx 要放行 Upgrade、HTTP/2 需要 RFC 8441。

**易错点：**

- 说 WebSocket 是「独立的新 TCP 连接」；它是同一连接上的协议升级。
- 认为 `Sec-WebSocket-Key` 是加密密钥；它只是握手校验的随机数。
- 服务端帧也加掩码，或客户端不掩码，都会违反 RFC。
- 直接 `socket.close()` 不走 close 帧，对端只能看到异常关闭。
- 不校验 `Origin`，遭受跨站 WebSocket 劫持（CSWSH）。
- 把 ping/pong 与业务心跳混为一谈；控制帧由协议层处理，业务心跳另有语义。

---

## 10. 断点续传与 Range 请求

**结论：** HTTP Range 让客户端只请求资源的一部分，服务端用 `206 Partial Content` + `Content-Range` 返回对应片段；断点续传就是「记录已下载偏移 → 用 `Range` 续传 → 用 `If-Range` 防止文件已变更导致拼接错乱」。它依赖服务端声明 `Accept-Ranges: bytes`，并且**必须校验完整性**，不能假设 206 一定对。

**关键头字段：**

| 头 | 方向 | 作用 |
| --- | --- | --- |
| `Accept-Ranges: bytes` | 响应 | 声明支持按字节范围请求 |
| `Range: bytes=0-499` | 请求 | 请求前 500 字节；`bytes=500-` 表示到末尾 |
| `Content-Range: bytes 0-499/1234` | 206 响应 | 当前片段范围与总长度 |
| `Content-Length` | 响应 | 当前片段长度，不是文件总长 |
| `If-Range` | 请求 | 验证器未变才返回 206，否则回 200 全量 |
| `416 Range Not Satisfiable` | 响应 | 范围越界，附带 `Content-Range: bytes */1234` |
| `ETag` / `Last-Modified` | 响应 | 作为 `If-Range` 的强验证器 |

**单段请求示例：**

```bash
curl -i -r 0-1023 https://example.com/big.zip
```

```http
HTTP/1.1 206 Partial Content
Content-Range: bytes 0-1023/10485760
Content-Length: 1024
Accept-Ranges: bytes
ETag: "9c1f2e7a-9f0000"

（1024 字节数据）
```

`Content-Range` 的格式是 `bytes start-end/total`；`total` 未知时可用 `*`。如果客户端请求的范围超出文件末尾，服务端应返回 `416`，并带 `Content-Range: bytes */total`，让客户端知道总长度。

**`If-Range` 的作用：**

```text
客户端：Range: bytes=5242880-
        If-Range: "9c1f2e7a-9f0000"

服务端：
    验证器一致  → 206 + 从 5MB 开始的数据
    验证器不一致 → 200 + 完整文件（客户端必须丢弃旧片段重下）
```

没有 `If-Range` 时，如果文件在下载期间被替换，客户端会把旧片段与新片段拼在一起，得到损坏文件。`If-Range` 只接受**强验证器**（强 ETag，或足够精确的 Last-Modified）；弱 ETag `W/"..."` 不应用于字节范围拼接。

**多段请求：** 一个 `Range` 可以请求多个区间，如 `bytes=0-99,200-299`，服务端返回 `206` 与 `Content-Type: multipart/byteranges; boundary=...`，每段有自己的 `Content-Range`。多段响应解析复杂、代理支持不一，实际断点续传多用单段请求。

**下载器流程：**

```text
1. HEAD / GET 首字节 → 读 Content-Length、ETag、Accept-Ranges
2. 本地记录：url、etag、total、已写入字节数 offset
3. 续传：Range: bytes=<offset>-  +  If-Range: <etag>
4. 206 → 追加写入；200 → 文件已变，清空重下
5. 416 → 偏移越界，重新拉取元数据
6. 完成后校验 SHA-256 / 文件大小，再原子重命名
```

```bash
# curl 自动续传：-C - 从已有文件的长度继续
curl -C - -o big.zip https://example.com/big.zip

# 指定偏移续传
curl -C 5242880 -o big.zip https://example.com/big.zip
```

**工程取舍：** 断点续传适合大文件、弱网、移动端；小文件用 Range 反而增加请求复杂度。服务端要保证 `ETag` 随内容变化，且范围请求与压缩不要混用（对压缩后的表示做 Range 会得到不可拼接的片段，通常对 `Content-Encoding: identity` 才启用）。CDN 必须支持 Range 透传与 `If-Range`；分片下载要限制并发、校验每片哈希、最后合并校验，避免「每片都对、拼起来错」。

**面试怎么答：** 先讲 `Range`/`206`/`Content-Range` 三件套，再讲 `If-Range` 解决「文件变了」的拼接问题，最后给下载器的状态记录与完整性校验流程。加分点：`416` 的 `Content-Range: bytes */total`、强 ETag 要求、压缩与 Range 的冲突、CDN 透传。

**易错点：**

- 把 206 响应的 `Content-Length` 当文件总长；总长在 `Content-Range` 里。
- 续传不带 `If-Range`，文件更新后拼出损坏文件。
- 用弱 ETag 做范围验证；弱验证器不保证字节级一致。
- 对 gzip 压缩表示做 Range，片段无法直接拼接。
- 收到 `200` 还继续追加，导致重复数据。
- 只记录字节偏移不记录 URL/ETag，换文件后续传错位。

---

## 11. 大文件上传的协议设计

**结论：** 大文件上传的核心不是「一个 POST 传完」，而是**分片、可续、可校验、可并发、可合并**。协议层有三条主流路线：对象存储的 **Multipart Upload**（S3 风格）、开放的 **tus** 断点续传协议、以及**预签名 URL 直传**。共同点是：先创建上传会话，再按片上传，最后提交合并，任何一步失败都能从已确认的偏移继续。

**先分清两种「分」：**

| 机制 | 层次 | 作用 |
| --- | --- | --- |
| `Transfer-Encoding: chunked` | HTTP 传输层 | 不必预先知道总长度，边生成边发送；**不是**断点续传 |
| `multipart/form-data` | 请求体编码 | 一个请求里放多个字段/文件，用 boundary 分隔 |
| 应用层分片 | 业务协议 | 把大文件切成固定大小的 part，逐片上传、记录进度、最后合并 |

`chunked` 一旦连接断开，已发送的数据无法精确续传；真正的断点续传必须由应用层记录「哪个分片已成功」。

**multipart/form-data 的报文：**

```http
POST /upload HTTP/1.1
Host: api.example.com
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Length: 1234567

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="video.mp4"
Content-Type: video/mp4

（二进制内容）
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

boundary 必须在正文中不出现；解析时要按 `CRLF + boundary` 切分，不能简单按字符串搜索。

**S3 风格分片上传（事实标准）：**

| 步骤 | 请求 | 关键参数 |
| --- | --- | --- |
| 初始化 | `CreateMultipartUpload` | 对象 key、元数据、存储类 |
| 上传分片 | `UploadPart` | `uploadId`、`partNumber`（1-10000）、分片数据 |
| 完成 | `CompleteMultipartUpload` | 提交分片列表与 ETag，服务端按序合并 |
| 取消 | `AbortMultipartUpload` | 清理未完成会话，避免存储泄漏 |

约束：除最后一片外，每片至少 **5 MiB**；单片最大 **5 GiB**；最多 **10000** 片；单对象最大 **5 TiB**。分片大小要按「文件大小 / 10000」反推，常见 8-64 MiB。

```bash
curl -X POST "https://bucket.oss.example.com/video.mp4?uploads"

curl -X PUT "https://bucket.oss.example.com/video.mp4?partNumber=1&uploadId=abc" \
    -H "Content-MD5: ..." \
    --data-binary @part-1.bin

curl -X POST "https://bucket.oss.example.com/video.mp4?uploadId=abc" \
    -H "Content-Type: application/xml" \
    -d '<CompleteMultipartUpload><Part><PartNumber>1</PartNumber><ETag>"..."</ETag></Part></CompleteMultipartUpload>'
```

**业务侧预签名直传流程：**

```text
客户端                     业务服务                        对象存储
   | 1. 申请上传会话            |                               |
   | ------------------------->| 鉴权、限额、CreateMultipart     |
   |                           | ----------------------------->|
   | <--- uploadId + 分片预签名 | <------ uploadId -------------|
   | 2. PUT part 1..N（直传，可并发）                          |
   | --------------------------------------------------------->|
   | 3. 提交完成（校验 ETag/大小/哈希）                         |
   | ------------------------->| ----------------------------->|
   | <--- 访问地址             | <------ 合并完成 -------------|
```

预签名 URL 的价值是把大流量从业务服务器卸载到对象存储；业务服务只做鉴权、签发与完成校验，避免应用层成为带宽瓶颈。

**tus 协议（开放标准）：**

```http
POST /files HTTP/1.1
Tus-Resumable: 1.0.0
Upload-Length: 104857600
Upload-Metadata: filename dmlkZW8ubXA0,filetype dmlkZW8vbXA0

HTTP/1.1 201 Created
Location: https://upload.example.com/files/abc123
Tus-Resumable: 1.0.0
```

续传时先 `HEAD` 拿 `Upload-Offset`，再用 `PATCH` 追加：

```http
PATCH /files/abc123 HTTP/1.1
Tus-Resumable: 1.0.0
Upload-Offset: 5242880
Content-Type: application/offset+octet-stream

（从 5MB 偏移开始的数据）
```

服务端返回新的 `Upload-Offset`；`Upload-Offset` 必须与当前偏移严格相等，否则 `409 Conflict`，从而保证分片不重不漏。

**工程取舍：** 分片太小会导致请求数爆炸与合并开销，太大则失败重传成本高；通常按网络质量动态选 5-16 MiB，并限制 3-6 个并发。每片要带哈希（`Content-MD5`、CRC32C 或 SHA-256），完成时校验整体哈希；上传会话要设 TTL 并定期 `Abort` 清理未完成分片。秒传靠「内容哈希查重」，但要注意不同用户的数据隔离与隐私。断点信息（uploadId、partNumber、ETag、offset）要持久化，不能只放内存。

**面试怎么答：** 先区分传输层 chunked 与业务分片，再给「初始化 → 分片 → 记录偏移 → 合并 → 校验」的完整状态机；然后对比 S3 Multipart、tus、预签名直传三种方案；最后讲分片大小与并发、幂等重试、未完成会话清理、秒传的哈希查重。

**易错点：**

- 把 `Transfer-Encoding: chunked` 当断点续传；它不记录已确认分片。
- S3 分片小于 5 MiB（最后一片除外），合并直接失败。
- 只用内存记录进度，刷新/换设备后无法续传。
- 完成合并前不校验 ETag/哈希，损坏文件被当成成功。

---

## 12. HTTP 安全响应头与 CORS

**结论：** 安全响应头是服务端**声明浏览器应采取的安全策略**：HSTS 强制 HTTPS、CSP 限制资源来源、`nosniff` 阻止 MIME 嗅探、`frame-ancestors` 防点击劫持。CORS 则是浏览器执行的**跨源读取授权**：浏览器自动加 `Origin`，服务端用 `Access-Control-Allow-*` 回答「这个源能不能读这个响应」。CORS 不是服务端安全边界，它只约束浏览器里的 JS。

**常用安全响应头：**

| 头 | 作用 | 推荐值/要点 |
| --- | --- | --- |
| `Strict-Transport-Security` | 强制后续请求走 HTTPS | `max-age=31536000; includeSubDomains; preload` |
| `Content-Security-Policy` | 限制脚本、样式、图片等来源 | `default-src 'self'; script-src 'self' 'nonce-...'` |
| `X-Content-Type-Options` | 禁止 MIME 嗅探 | `nosniff` |
| `X-Frame-Options` | 防 iframe 嵌套 | `DENY` 或 `SAMEORIGIN`（CSP `frame-ancestors` 更优先） |
| `Referrer-Policy` | 控制 Referer 泄露 | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | 关闭不需要的浏览器能力 | `camera=(), microphone=(), geolocation=()` |
| `Cross-Origin-Opener-Policy` | 隔离浏览上下文 | `same-origin` |
| `Cross-Origin-Embedder-Policy` | 要求跨源资源显式授权 | `require-corp`（配合 COOP 启用 `SharedArrayBuffer`） |
| `Cross-Origin-Resource-Policy` | 限制资源被跨源嵌入 | `same-origin` / `same-site` / `cross-origin` |

注意：`X-XSS-Protection` 已被现代浏览器废弃，不要作为主要防御；CSP 要避免 `unsafe-inline` 与过宽的 `*`，优先 nonce/hash。

**CORS 的协议判定：**

```text
浏览器发起跨源请求
    │
    ├─ 是否简单请求？
    │    方法 ∈ {GET, HEAD, POST}
    │    且请求头都在安全列表内
    │    且 Content-Type ∈ {text/plain, multipart/form-data, application/x-www-form-urlencoded}
    │         │
    │         ├─ 是 → 直接发请求，检查响应 ACAO
    │         │
    │         └─ 否 → 先发 OPTIONS 预检
    │                 请求带 Origin / ACRM / ACRH
    │                 响应需 ACAM / ACAH / ACAO，凭证模式还需 ACAC=true
    │                 预检通过后才发真实请求
    │
    └─ 真实响应仍必须带 Access-Control-Allow-Origin
```

**预检报文：**

```http
OPTIONS /api/orders HTTP/1.1
Host: api.example.com
Origin: https://app.example.com
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: content-type, authorization

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 600
Vary: Origin
```

| 头 | 方向 | 语义 |
| --- | --- | --- |
| `Origin` | 请求 | 浏览器自动添加，页面 JS 无法伪造 |
| `Access-Control-Request-Method` | 预检请求 | 真实请求要用的方法 |
| `Access-Control-Request-Headers` | 预检请求 | 真实请求要用的非安全列表头 |
| `Access-Control-Allow-Origin` | 响应 | 允许的源，具体值或 `*`；凭证模式禁止 `*` |
| `Access-Control-Allow-Methods` | 预检响应 | 允许的方法 |
| `Access-Control-Allow-Headers` | 预检响应 | 允许的请求头 |
| `Access-Control-Allow-Credentials` | 响应 | 只能是 `true`，表示允许携带 Cookie |
| `Access-Control-Expose-Headers` | 响应 | 允许 JS 读取的非安全列表响应头 |
| `Access-Control-Max-Age` | 预检响应 | 预检结果可缓存的秒数 |

**几个协议层细节：**

- `application/json` 会触发预检；带 `Authorization` 也会触发预检。
- 预检请求**不带 Cookie**，所以 `OPTIONS` 路由不能要求登录，否则预检直接 401。
- 预检不允许 3xx 重定向；真实请求可以重定向，但最终响应仍要带 CORS 头。
- 凭证模式（`credentials: include`）下，`Allow-Origin`、`Allow-Headers`、`Expose-Headers` 都不能用 `*`。
- 响应要带 `Vary: Origin`，否则 CDN/代理可能把一个源的 CORS 响应急给另一个源。
- CORS 头必须加在**实际响应**上，只在预检里加是无效的。

**验证示例：**

```bash
# 检查预检
curl -i -X OPTIONS https://api.example.com/orders \
    -H "Origin: https://app.example.com" \
    -H "Access-Control-Request-Method: PUT" \
    -H "Access-Control-Request-Headers: content-type,authorization"

# 检查实际响应头
curl -i https://api.example.com/orders \
    -H "Origin: https://app.example.com"
```

```bash
# 安全检查响应头
curl -sI https://example.com/ | grep -iE \
    'strict-transport|content-security|x-content-type|x-frame|referrer-policy|permissions-policy'
```

**工程取舍：** 安全头要在**所有响应**上统一注入（包括错误页、静态资源、API），最好在网关/中间件层做，避免某个服务漏配。HSTS 的 `preload` 与 `includeSubDomains` 是不可逆的强承诺，先确认所有子域都支持 HTTPS。CSP 上线先用 `Content-Security-Policy-Report-Only` 收集违规报告，再切换为强制。CORS 白名单要精确匹配源（含协议与端口），不要用字符串 `startsWith` 或反射任意 `Origin`，否则等于开放所有站点读取。

**面试怎么答：** 先分两块：安全头是「声明浏览器策略」，CORS 是「跨源读取授权」。安全头按 HSTS、CSP、nosniff、frame-ancestors、Referrer-Policy 各说一句作用；CORS 讲简单请求条件、预检流程、凭证规则与 `Vary: Origin`。收尾强调「CORS 只约束浏览器、不保护服务端」「安全头要在网关统一注入」。

**易错点：**

- 认为 CORS 能防止服务端被跨站调用；它只决定浏览器是否把响应交给 JS，攻击者可直接用 curl。
- 凭证模式用 `Access-Control-Allow-Origin: *`，浏览器直接拒绝。
- 反射任意 `Origin` 且带 `Allow-Credentials: true`，等价于对所有站点开放。
- 忘记 `Vary: Origin`，CDN 缓存串源。
