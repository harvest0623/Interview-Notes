# 计算机网络进阶面试题

> 本目录收录计算机网络进阶相关的高频面试题及参考答案，按主题拆分为 4 册，共 48 题。默认以 **HTTP/1.1、HTTP/2、HTTP/3（QUIC）、TCP/IP 协议栈与 Linux 网络工具** 为背景；命令示例以 Linux 为主，Windows 与 macOS 的差异在题目中单独说明。

---

## 目录

| 分册 | 内容 | 题量 |
| --- | --- | --- |
| [01 - HTTP 协议与演进篇](01-HTTP协议与演进篇.md) | HTTP 报文与状态码、HTTP/1.1 的性能瓶颈与优化、HTTP/2 二进制分帧与 HPACK、HTTP/3 与 QUIC、TLS 1.3 握手、HTTP 缓存、Cookie/Session/Token、REST 与 GraphQL、WebSocket、Range 与断点续传、大文件上传、安全响应头与 CORS | 12 |
| [02 - TCP 与 UDP 篇](02-TCP与UDP篇.md) | TCP 三次握手与四次挥手、TIME_WAIT 与 2MSL、可靠传输、滑动窗口与流量控制、拥塞控制、粘包与拆包、TCP/UDP 选型、QUIC 为什么基于 UDP、长连接保活、连接池与内核参数、常见网络攻击、局域网/NAT/代理 | 12 |
| [03 - DNS 与 CDN 与负载均衡篇](03-DNS与CDN与负载均衡篇.md) | DNS 解析与记录类型、缓存与 TTL、劫持与 HTTPDNS、CDN 原理与回源、CDN 缓存策略与刷新、负载均衡层次与算法、LVS/Nginx/HAProxy 对比、会话保持、反向代理与跨域、API 网关、边缘计算、全球加速与多地域部署 | 12 |
| [04 - 抓包与网络排障篇](04-抓包与网络排障篇.md) | tcpdump/Wireshark 原理、过滤表达式、完整 HTTP 请求分析、TCP 重传与乱序、连接超时、DNS 解析失败、TLS 握手失败、高延迟与丢包、带宽瓶颈、502 与 504、弱网模拟与移动网络、线上案例复盘 | 12 |

---

## 学习路径建议

```
    01 HTTP 协议与演进：报文、状态码、HTTP/1.1 → 2 → 3、TLS 1.3、缓存
    ↓
    02 TCP 与 UDP：握手挥手、可靠传输、窗口与拥塞、连接池与内核参数
    ↓
    03 DNS / CDN / 负载均衡：解析、缓存、回源、四层与七层调度
    ↓
    04 抓包与网络排障：tcpdump/Wireshark、超时/DNS/TLS/502 的证据链
```

> 面试策略：**HTTP 语义与 TCP 可靠性是硬门槛**（答不出状态码边界、握手挥手、重传与窗口，基本说明没系统学过）；**HTTP/2 与 HTTP/3 是分水岭**（能讲清多路复用、HPACK/QPACK、QUIC 解决什么问题，才算跟上现代协议）；**DNS/CDN/负载均衡是工程能力的体现**（能落到回源、TTL、调度与会话保持）；**抓包排障是加分项**（能给出可执行命令与判读标准的人，通常真的处理过线上问题）。

---

## 高频必背 TOP 10

| 序号 | 题目 | 所在分册 |
| --- | --- | --- |
| 1 | TCP 三次握手与四次挥手 | [02 - TCP 与 UDP 篇](02-TCP与UDP篇.md#1-tcp-三次握手与四次挥手) |
| 2 | TCP 可靠传输机制 | [02 - TCP 与 UDP 篇](02-TCP与UDP篇.md#3-tcp-可靠传输机制) |
| 3 | HTTP/1.1 的问题与优化 | [01 - HTTP 协议与演进篇](01-HTTP协议与演进篇.md#2-http11-的问题与优化) |
| 4 | HTTP/2 多路复用与 HPACK | [01 - HTTP 协议与演进篇](01-HTTP协议与演进篇.md#3-http2-多路复用与-hpack) |
| 5 | HTTP/3 与 QUIC | [01 - HTTP 协议与演进篇](01-HTTP协议与演进篇.md#4-http3-与-quic) |
| 6 | HTTPS 握手机制（TLS 1.3） | [01 - HTTP 协议与演进篇](01-HTTP协议与演进篇.md#5-https-握手机制tls-13) |
| 7 | DNS 解析流程与记录类型 | [03 - DNS 与 CDN 与负载均衡篇](03-DNS与CDN与负载均衡篇.md#1-dns-解析流程与记录类型) |
| 8 | CDN 原理与回源 | [03 - DNS 与 CDN 与负载均衡篇](03-DNS与CDN与负载均衡篇.md#4-cdn-原理与回源) |
| 9 | 负载均衡的层次与算法 | [03 - DNS 与 CDN 与负载均衡篇](03-DNS与CDN与负载均衡篇.md#6-负载均衡的层次与算法) |
| 10 | 排查 502 与 504 | [04 - 抓包与网络排障篇](04-抓包与网络排障篇.md#10-排查-502-与-504) |

---

## 核心速查表

**HTTP 版本对比**

| 版本 | 传输层 | 连接与复用 | 头部编码 | 主要瓶颈 | 典型优化 |
| --- | --- | --- | --- | --- | --- |
| HTTP/1.0 | TCP | 每请求一个连接，默认不复用 | 文本头，无压缩 | 连接建立与 DNS 开销 | 显式 `Connection: keep-alive` |
| HTTP/1.1 | TCP | 持久连接，同域约 6 个并发连接，管道化基本未被浏览器采用 | 文本头，无压缩 | 队头阻塞、头部冗余 | 域名分片、资源合并、雪碧图 |
| HTTP/2 | TCP | 单连接多路复用，二进制分帧 | HPACK 静态表 + 动态表 | TCP 层队头阻塞，丢包恢复慢 | 多路复用、头部压缩、服务端推送（已弃用） |
| HTTP/3 | UDP + QUIC | 多路复用，0-RTT，连接迁移 | QPACK | UDP 可能被限速或阻断 | QUIC 握手、0-RTT、连接迁移 |

**TCP 状态机**

```
    CLOSED -> SYN_SENT（主动打开） -> ESTABLISHED
    CLOSED -> LISTEN（被动打开） -> SYN_RCVD -> ESTABLISHED
    ESTABLISHED -> FIN_WAIT_1（主动关闭） -> FIN_WAIT_2 -> TIME_WAIT -> CLOSED
    ESTABLISHED -> CLOSE_WAIT（被动关闭） -> LAST_ACK -> CLOSED
    FIN_WAIT_1 -> CLOSING（同时关闭） -> TIME_WAIT
    异常：SYN_SENT 堆积 = 目标不可达或 SYN 被丢
    异常：CLOSE_WAIT 堆积 = 应用未调用 close()
    异常：TIME_WAIT 过多 = 短连接过多，主动关闭方承担
```

**排查命令**

```
    连通性：ping -c 20 host
    路径　：mtr -n -c 50 host
    端口　：nc -vz -w 3 host 443
    DNS　 ：dig host A +short
    系统解析：getent hosts host
    HTTP　：curl -o /dev/null -s -w 'dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer} total=%{time_total}\n' https://host/path
    TLS　 ：openssl s_client -connect host:443 -servername host -showcerts
    抓包　：sudo tcpdump -i eth0 -nn -s 0 -w /tmp/cap.pcap 'host 10.0.0.5 and tcp port 443'
    重传　：tshark -r /tmp/cap.pcap -Y 'tcp.analysis.retransmission'
    连接　：ss -lnt / ss -ti dst 10.0.0.5 / ss -s
    带宽　：sar -n DEV 1 10 / iftop -n -i eth0 / iperf3 -c 10.0.0.5 -P 4
    日志　：tail -f /var/log/nginx/error.log / nginx -T
    弱网　：sudo tc qdisc add dev eth0 root netem delay 100ms 20ms loss 5%
```

---

## 易错点清单

```
    1. 把递归查询与迭代查询说反：递归是客户端对解析器，迭代是解析器对各级 DNS
    2. 改 DNS 记录后立刻断言「生效」，忽略浏览器、系统与 LocalDNS 的各级缓存
    3. CDN 回源 Host 配错导致 404，却误判为文件未上传
    4. CDN 缓存键保留全部 query 参数，命中率被 utm 等无关参数打散
    5. 把四层 LVS 说成能做 URL 路由，它看不到 HTTP 内容
    6. Nginx 开启 keepalive 却未把 Connection 置空，长连接没有真正复用
    7. 跨域带 Cookie 时把 Allow-Origin 设为 *，浏览器会直接拒绝
    8. proxy_pass 末尾斜杠写错，路径被截断或重复，接口 404
    9. 把「连接超时」与「连接被拒绝」混为一谈，RST 立即返回不是超时
    10. 看到重传就认定链路丢包，乱序同样会产生重复 ACK
    11. 在抓包机开启 GRO/TSO，把卸载后的巨包误判为分片或异常
    12. 只测单流就断言带宽不足，忽略 cwnd 与 RTT 对单流吞吐的限制
    13. 502 与 504 混查：502 多为连不上或被断开，504 是等上游超时
    14. 对所有接口开自动重试，非幂等请求在故障时放大流量
    15. 只在办公室 Wi-Fi 验证，忽略移动网络的 RRC、切换与丢包
```
