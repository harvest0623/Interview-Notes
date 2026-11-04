# 计算机网络进阶面试题 · 03 DNS与CDN与负载均衡篇

[← 返回总览](README.md)

> 内容：DNS 解析流程与记录类型、DNS 缓存与 TTL、DNS 劫持与 HTTPDNS、CDN 原理与回源、CDN 缓存策略与刷新、负载均衡的层次与算法、LVS/Nginx/HAProxy 对比、会话保持、反向代理与跨域、API 网关、边缘计算、全球加速与多地域部署（共 12 题）。

---

## 目录

1. [DNS 解析流程与记录类型](#1-dns-解析流程与记录类型)
2. [DNS 缓存与 TTL](#2-dns-缓存与-ttl)
3. [DNS 劫持与 HTTPDNS](#3-dns-劫持与-httpdns)
4. [CDN 原理与回源](#4-cdn-原理与回源)
5. [CDN 缓存策略与刷新](#5-cdn-缓存策略与刷新)
6. [负载均衡的层次与算法](#6-负载均衡的层次与算法)
7. [LVS、Nginx、HAProxy 对比](#7-lvsnginxhaproxy-对比)
8. [会话保持](#8-会话保持)
9. [反向代理与跨域](#9-反向代理与跨域)
10. [API 网关](#10-api-网关)
11. [边缘计算](#11-边缘计算)
12. [全球加速与多地域部署](#12-全球加速与多地域部署)

---

## 1. DNS 解析流程与记录类型

**原理：** DNS 是一棵分布式的层级命名树：根域 `.` → 顶级域 `com`/`cn` → 权威域 `example.com` → 子域 `api.example.com`。每一层由不同的权威服务器负责，父域通过 NS 记录把子域委派出去。理解这一点，排障时才能判断「这一问该由谁回答」。

**两种查询模式：**

- **递归查询**：客户端（浏览器 / stub resolver）把请求交给递归解析器，要求「给我最终答案」，中途不再关心过程。
- **迭代查询**：递归解析器依次问根、TLD、权威，每一级只返回下一步该问的 NS 记录，由解析器自己继续追。

**关键事实：**

- 根服务器只做委派，不做递归；全球 13 组根逻辑服务器通过 Anycast 扩散为上千个物理节点。
- 权威服务器是记录的唯一真相来源，递归解析器只负责缓存与转发。
- 默认 UDP/53；报文超长时置 TC（truncated）位，客户端改用 TCP/53 重查；EDNS0 把可接受长度提升到 1232 字节左右。
- DoH 走 443、DoT 走 853、DoQ 走 853/UDP，用于加密解析，可规避明文链路上的劫持与污染。

**解析流程（一次冷启动）：**

1. 浏览器 DNS 缓存：Chrome 默认缓存约 60 秒，可在 `chrome://net-internals/#dns` 清理。
2. 操作系统 stub resolver 缓存与 `hosts` 文件，`hosts` 优先级高于 DNS。
3. `resolv.conf` 中配置的 nameserver，通常是运营商 LocalDNS、内网 DNS 或公共 DNS。
4. 递归解析器查自身缓存；未命中则发起迭代查询：根 → TLD → 权威。
5. 权威返回 A/AAAA 及 TTL，递归解析器按 TTL 缓存，并回填各层缓存。
6. 客户端拿到地址后建连；若同时返回 A 与 AAAA，现代客户端按 Happy Eyeballs 竞速连接。

**记录类型：**

| 类型 | 作用 | 典型用法 |
| --- | --- | --- |
| A | 域名 → IPv4 | 站点主记录 |
| AAAA | 域名 → IPv6 | 双栈接入 |
| CNAME | 域名别名 | CDN 接入、多环境切换 |
| MX | 邮件交换 | 需配优先级，不能与 CNAME 共存 |
| TXT | 文本 | SPF、DKIM、域名所有权校验 |
| NS | 委派 | 指定子域权威服务器 |
| SOA | 区域元信息 | 序列号、刷新、重试、负缓存参考值 |
| SRV | 服务定位 | 微服务、Kafka 等发现 |
| CAA | 证书颁发授权 | 限制可签发证书的 CA |
| PTR | IP → 域名 | 反解，邮件场景重要 |

**配置示例（权威区域文件）：**

```dns
    $TTL 300
    @       IN  SOA ns1.example.com. admin.example.com. (
                2026010101 ; serial，每次变更必须递增
                3600       ; refresh
                600        ; retry
                604800     ; expire
                300 )      ; minimum，负缓存参考值
    @       IN  NS  ns1.example.com.
    @       IN  NS  ns2.example.com.
    @       IN  A   203.0.113.10
    www     IN  CNAME edge.example.com.
    api     IN  A   203.0.113.20
    api     IN  AAAA 2001:db8::20
    @       IN  MX  10 mail.example.com.
    @       IN  TXT "v=spf1 include:_spf.example.com ~all"
```

**验证命令：**

```bash
    # 完整迭代过程，观察根、TLD、权威的 NS 委派
    dig +trace www.example.com A

    # 指定解析器，只看答案区
    dig @8.8.8.8 www.example.com A +noall +answer

    # 查询 CNAME 链与 MX 优先级
    dig www.example.com CNAME +short
    dig example.com MX +short

    # 检查 DNSSEC 是否生效
    dig +dnssec example.com A
```

**取舍：**

| 选择 | 优点 | 代价 |
| --- | --- | --- |
| CNAME 接入 CDN | 切 CDN 只改一处，灵活 | 多一次解析，apex 域不适合直接挂 |
| Apex 用 A/ALIAS | 少一跳，根域可用 | 换 IP 要改记录，受 TTL 约束 |
| 自建权威 DNS | 完全可控、内网闭环 | 运维与 Anycast 容灾投入高 |
| 云解析 | 免运维，带健康检查与分线路 | 依赖厂商，跨云调度受限 |

**面试怎么答：** 先讲清「递归是客户端与递归解析器之间，迭代是解析器与各级 DNS 之间」，再按浏览器缓存 → hosts → LocalDNS → 根 → TLD → 权威的顺序展开，最后落到记录类型的工程含义：CNAME 接 CDN、A/AAAA 双栈、MX 不能与 CNAME 共存。

**易错点：**

- 说「根服务器帮我们递归查询」，根只做委派，递归是 LocalDNS 的职责。
- 把 TTL 当成固定过期时间，实际 TTL 是上限，解析器可能提前淘汰，也会被负缓存影响。
- 在 apex 域上直接挂 CNAME，这会与 SOA/NS 冲突，应使用 ALIAS 或直接 A 记录。
- 忽略 `hosts` 与浏览器缓存，改了 DNS 却仍解析到旧 IP。

---

## 2. DNS 缓存与 TTL

**原理：** DNS 缓存是分级存在的：浏览器缓存、操作系统 stub resolver 缓存、`hosts` 文件、递归解析器缓存、以及部分权威服务器的应答缓存。真正决定「改记录后多久生效」的是**整条链路上最长的那个缓存**，而不是权威记录上的 TTL 一个数字。

**几个容易忽略的机制：**

- **TTL 递减**：递归解析器返回给客户端时，会把剩余 TTL 一并返回，所以连续 `dig` 会看到数字变小，这是正常现象。
- **负缓存**：NXDOMAIN 与 NODATA 也会被缓存，时长按 RFC 2308 取 SOA 的 minimum 字段与该 SOA 记录自身 TTL 的较小值，常见 60~300 秒。刚创建的记录「查不到」往往是负缓存。
- **缓存键**：通常是 `qname + qtype + qclass`，启用 ECS 时还会带上客户端网段，这也是不同用户拿到不同 CDN 节点 IP 的原因。
- **预取（prefetch）**：Unbound 等解析器在 TTL 剩余 10% 时提前回源刷新，用户侧几乎感知不到过期。
- **TTL 与故障切换**：TTL 300 意味着最坏 5 分钟后流量才切走，缩容、切 IP、灰度都受它约束。

**缓存命中流程：**

1. 应用发起 `getaddrinfo`，先查 `/etc/nsswitch.conf` 决定 hosts 与 DNS 的先后。
2. stub resolver 检查本地缓存，命中则直接返回剩余 TTL。
3. 未命中转发给递归解析器；递归解析器命中缓存则按剩余 TTL 返回。
4. 均未命中才走根 → TLD → 权威，回填时按权威 TTL 截断到本机配置的上下限。
5. 记录过期后，客户端下一次请求触发回源；预取开启时由解析器后台刷新。

**排查与验证命令：**

```bash
    # 连续两次，观察 TTL 递减
    dig www.example.com A +noall +answer
    sleep 5
    dig www.example.com A +noall +answer

    # 以人类可读单位显示 TTL
    dig www.example.com A +ttlunits

    # 对比不同解析器的结果，判断是权威问题还是本地缓存
    dig @223.5.5.5 www.example.com A +short
    dig @8.8.8.8 www.example.com A +short

    # Linux 清理 systemd-resolved 缓存
    sudo resolvectl flush-caches

    # Windows 清理本机 DNS 缓存
    ipconfig /flushdns

    # macOS 清理 mDNSResponder 缓存
    sudo dscacheutil -flushcache
    sudo killall -HUP mDNSResponder

    # BIND 清理指定区域缓存
    sudo rndc flush
```

**配置示例（递归解析器缓存参数）：**

```yaml
    # Unbound 关键参数
    server:
        cache-min-ttl: 60          # 下限，防止过短 TTL 打爆上游
        cache-max-ttl: 3600        # 上限，防止过长 TTL 拖慢切换
        prefetch: yes              # 剩余 10% TTL 时提前刷新
        prefetch-key: yes
        num-threads: 4
        msg-cache-size: 128m
        rrset-cache-size: 256m
```

```nginx
    # Nginx 作为反向代理时的运行时解析缓存
    resolver 223.5.5.5 119.29.29.29 valid=30s ipv6=off;
    resolver_timeout 5s;
```

**取舍：**

| 策略 | 适用场景 | 代价 |
| --- | --- | --- |
| TTL 60~300 秒 | 需要快速切流、故障转移 | 解析量上升，权威与递归压力大 |
| TTL 600~3600 秒 | 稳定服务、减少解析抖动 | 切 IP、切 CDN 生效慢 |
| 变更前先降 TTL | 计划内迁移的标准做法 | 需提前一个旧 TTL 周期操作 |
| 开启预取 | 用户侧无感知刷新 | 解析器回源请求略增 |

**变更的标准动作：** 先把 TTL 降到 60 秒并等待一个旧 TTL 周期 → 改记录 → 观察解析分布 → 稳定后再把 TTL 调回。直接在原 TTL 上改记录，等于把「生效时间」交给运气。

**面试怎么答：** 强调「缓存是分级的，生效时间取决于最长的一环」，讲清 TTL 递减、负缓存、缓存键与 ECS，再给出计划内变更的降 TTL 流程，最后补一句「递归解析器可以设上下限，避免业务配置过短或过长」。

**易错点：**

- 以为改了权威记录就立刻全网生效，忽略浏览器与 LocalDNS 缓存。
- 新记录查不到就怀疑权威，实际是上一次 NXDOMAIN 的负缓存。
- 把 TTL 调到 1 秒当作「实时」，结果是权威被打爆、解析超时率上升。
- 只在一台机器上 `dig` 就下结论，没有对比不同出口与不同解析器。

---

## 3. DNS 劫持与 HTTPDNS

**原理：** DNS 劫持的本质是「答案在到达客户端之前被替换」。常见形式有四类：

- **运营商 LocalDNS 劫持**：对不存在域名返回广告页，或把流量导向劫持服务器。
- **链路污染**：明文 UDP/53 在传输途中被篡改，返回错误 IP。
- **缓存投毒**：攻击递归解析器缓存，让错误答案服务所有下游用户。
- **本地劫持**：恶意软件改 `hosts`、改路由器 DNS、改系统 DNS 设置。

**HTTPDNS 的思路：** 客户端不再走系统 DNS，而是用 HTTPS/HTTP 直接向权威的 HTTPDNS 服务查询，服务端按客户端真实出口 IP 返回最优节点。因为走加密 HTTP，链路中间设备无法篡改；又因为拿到了真实客户端 IP，调度精度高于「按 LocalDNS 出口 IP 调度」。

**HTTPDNS 架构：**

1. 客户端 SDK 启动时拉取 IP 列表与 TTL，写入本地缓存。
2. 业务发起请求前，用域名向 HTTPDNS 服务查询，得到一组 IP 与 TTL。
3. SDK 在本地做轮询/竞速，选一个可用 IP 建连。
4. 建连时仍使用原域名的 SNI 与 `Host` 头，保证证书校验与虚拟主机路由正确。
5. 查询失败或超时，降级回系统 DNS，避免整体不可用。
6. TTL 到期或 App 切前后台时触发刷新，兼顾调度精度与请求量。

**检测劫持的命令：**

```bash
    # 对比多个解析器的答案，出现明显不同的 IP 段即可疑
    dig @223.5.5.5 www.example.com A +short
    dig @8.8.8.8 www.example.com A +short
    dig @119.29.29.29 www.example.com A +short

    # 直接问权威，作为「标准答案」
    dig @ns1.example.com www.example.com A +short

    # 查看是否被本地 hosts 覆盖
    getent hosts www.example.com
    type C:\Windows\System32\drivers\etc\hosts

    # 观察 TTL 是否为 0 或异常小，劫持常返回 TTL=0
    dig www.example.com A +noall +answer
```

**配置示例（客户端接入 HTTPDNS）：**

```bash
    # 腾讯 DNSPod 的 HTTPDNS 明文接口，返回 "ip,ip" 形式
    curl -s "http://119.29.29.29/d?dn=api.example.com"

    # 阿里云 HTTPDNS 的解析接口（account_id 为控制台分配）
    curl -s "http://203.107.1.33/123456/d?host=api.example.com"
```

```kotlin
    // OkHttp 自定义 Dns，把系统解析替换为 HTTPDNS
    class HttpDns(private val client: HttpDnsClient) : Dns {
        override fun lookup(hostname: String): List<InetAddress> {
            val ip = client.resolve(hostname)
            if (ip == null) {
                return Dns.SYSTEM.lookup(hostname)
            }
            return listOf(InetAddress.getByName(ip))
        }
    }

    val okHttpClient = OkHttpClient.Builder()
        .dns(HttpDns(httpDnsClient))
        .build()
```

```nginx
    # 服务端侧：用变量 proxy_pass 时必须配 resolver，否则启动报错
    resolver 223.5.5.5 valid=10s;
    set $upstream_host "api.example.com";
    proxy_pass https://$upstream_host$request_uri;
    proxy_set_header Host $upstream_host;
    proxy_ssl_server_name on;
```

**取舍：**

| 方案 | 优点 | 局限 |
| --- | --- | --- |
| 系统 DNS | 零改造，全平台通用 | 易被劫持，调度精度依赖 LDNS |
| HTTPDNS | 防劫持、调度准、可灰度 | 需 SDK 接入，多一次查询开销 |
| DoH / DoT | 加密解析，浏览器原生支持 | 部分系统与网络环境不支持，仍受 LDNS 调度影响 |
| 固定 IP + 证书 | 彻底绕开解析 | 失去弹性调度，IP 变更成本高 |

**面试怎么答：** 先定义「劫持是答案被替换」，列出运营商劫持、链路污染、缓存投毒、本地 hosts 四类；再讲 HTTPDNS 用加密 HTTP 直连权威、按真实客户端 IP 调度，并强调建连仍要保留 SNI 与 Host；最后补降级策略与 TTL 控制。

**易错点：**

- 换成 HTTPDNS 后忘记设置 SNI 与 `Host`，导致证书不匹配或落到默认站点。
- 认为 HTTPDNS 能解决 CDN 调度，实际上 CDN 仍可能按 LDNS 调度，需要 ECS 或厂商支持。
- 查询失败没有降级，HTTPDNS 服务抖动直接变成全站不可用。
- 忽略 App 切网、切前后台后的缓存刷新，长期使用旧 IP。

---

## 4. CDN 原理与回源

**原理：** CDN 的本质是「把内容提前放到离用户更近的节点」，用空间换时间。系统由三部分组成：

- **边缘节点（Edge）**：直接面向用户，负责缓存与就近响应。
- **中间源 / 二级缓存（Mid-tier）**：边缘未命中时先向它取，避免所有边缘同时压到源站。
- **源站（Origin）**：内容的最终来源，可以是对象存储、自建 Nginx 或业务服务。

**调度原理：** 业务域名 CNAME 到 CDN 厂商的调度域名，用户解析时由 CDN 的 GSLB 按「LDNS 出口 IP 归属、节点健康、节点负载、探测延迟、权重」返回一个边缘节点 IP。所以「用户解析到哪个节点」取决于他的 LocalDNS，而不是他的真实位置，这也是调度误差的来源。

**一次请求的完整流程：**

1. 用户解析 `static.example.com`，GSLB 返回边缘节点 IP。
2. 客户端与边缘节点建连，发送 HTTP 请求（`Host` 为业务域名）。
3. 边缘节点查本地缓存，命中则直接返回，响应头带 `Age` 与 `X-Cache: HIT`。
4. 未命中则回源：先查中间源，仍未命中再由中间源回源站。
5. 回源请求按配置改写 `Host`、协议（HTTP/HTTPS）、端口与 URI。
6. 源站返回内容，CDN 按缓存规则决定是否落盘、缓存多久。
7. 响应返回用户，同时异步预热或等待下次请求命中。

**配置示例（源站侧）：**

```nginx
    server {
        listen 80;
        server_name origin.example.com;

        root /data/www;
        etag on;

        location / {
            add_header X-Origin "origin-1" always;
            add_header Cache-Control "public, max-age=600" always;
        }

        location /static/ {
            add_header Cache-Control "public, max-age=31536000, immutable" always;
        }
    }
```

**CDN 控制台需要重点确认的配置项：**

| 配置项 | 说明 | 常见错误 |
| --- | --- | --- |
| 加速域名 | 用户实际访问的域名 | 与证书域名不一致 |
| 源站类型 | 域名 / IP / 对象存储 | 源站域名又指回 CDN，形成回源环 |
| 回源 Host | 源站虚拟主机识别 | 配错导致落到默认站点返回 404 |
| 回源协议 | HTTP / HTTPS / 协议跟随 | 源站只开 443 却配了 HTTP |
| 缓存规则 | 按后缀 / 路径 / 参数配置 TTL | 把动态接口也缓存了 |
| Range 回源 | 大文件分片 | 关闭后视频拖动卡顿 |

**验证命令：**

```bash
    # 看是否命中、缓存了多久、由哪个节点服务
    curl -sI https://static.example.com/app.js \
        | grep -Ei 'HTTP/|age|x-cache|via|server|cache-control'

    # 指定边缘节点 IP 验证单个节点，绕过本地 DNS
    curl -sI --resolve static.example.com:443:203.0.113.5 \
        https://static.example.com/app.js

    # 对比多次请求的 Age 是否递增，判断是否真的命中
    for i in 1 2 3; do
        curl -sI https://static.example.com/app.js | grep -i age
        sleep 2
    done
```

**取舍：**

| 选择 | 优点 | 代价 |
| --- | --- | --- |
| 云 CDN | 节点多、免运维、带防护与报表 | 单价高，调度与配置受厂商限制 |
| 自建 CDN | 可控、内网与专有场景灵活 | 节点覆盖与容灾成本极高 |
| 多 CDN 容灾 | 单厂商故障可切流 | 缓存不一致、刷新要多家执行 |
| 动态加速 | 动态请求也能走优化链路 | 提升有限，成本高于静态加速 |

**回源率是核心指标：** 回源率 = 回源请求数 / 边缘请求数。回源率高说明缓存键太细、TTL 太短或参数未归一化；回源带宽打满则会拖垮源站，表现为 504 与源站 CPU 飙升。

**面试怎么答：** 用「边缘 → 中间源 → 源站」三层结构讲清架构，再讲 GSLB 按 LDNS 出口调度的原理与误差，最后落到回源 Host、回源协议、缓存规则三个最容易配错的点，并说明回源率与命中率的关系。

**易错点：**

- 把 CDN 当作「DNS 加速」，说不清边缘缓存与回源的关系。
- 回源 Host 配错，源站返回 404 却误判为文件没上传。
- 源站域名 CNAME 回 CDN 域名，形成回源环，请求量指数放大。
- 只看命中率不看回源带宽，命中率 95% 仍可能被大文件回源打满。

---

## 5. CDN 缓存策略与刷新

**原理：** CDN 缓存由三层规则共同决定：**缓存键（Cache Key）** 决定「什么算同一个资源」，**TTL** 决定「存多久」，**刷新/预热** 决定「如何提前失效或提前填充」。三者任一配错，都会表现成「发布了但用户还是旧版本」或「缓存击穿打满源站」。

**关键机制：**

- **缓存键**通常由 `scheme + host + path + 指定 query 参数` 组成。默认保留全部 query，会让 `?utm_source=xxx` 这类参数把缓存打散；直接忽略全部 query，又会让带版本号的资源互相覆盖。
- **TTL 分层**：浏览器缓存（`Cache-Control: max-age`）与 CDN 缓存（`s-maxage` 或控制台 TTL）是两层，`s-maxage` 优先级高于 `max-age`。
- **协商缓存**：`ETag` / `Last-Modified` 配合 `If-None-Match` / `If-Modified-Since`，命中时返回 304，省带宽但仍有一次回源请求。
- **stale-while-revalidate / stale-if-error**：允许在后台刷新期间继续返回旧内容，或在回源失败时用旧内容兜底，显著降低长尾延迟与故障放大。
- **`immutable`**：告诉浏览器在 `max-age` 内不要发起任何校验请求，适合带内容哈希的静态资源。
- **刷新 vs 预热**：刷新是「删掉旧缓存」，下一次请求回源；预热是「主动把内容推到边缘」，避免发布瞬间的回源尖峰。

**发布流程（静态资源标准做法）：**

1. 构建产物文件名带内容哈希，如 `app.3f2a1b.js`。
2. 全量上传到源站或对象存储，确认 `Content-Type` 与 `Content-Encoding` 正确。
3. 先预热新文件，再发布引用新文件的 HTML。
4. HTML 使用 `no-cache`，保证用户每次都校验最新入口。
5. 需要覆盖同名文件时，提交刷新任务并确认全网生效。
6. 用多个节点 `curl -I` 验证 `Age`、`X-Cache` 与内容哈希。

**配置示例（源站缓存头）：**

```nginx
    # 带哈希的静态资源：一年强缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff2)$ {
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        etag on;
    }

    # HTML 入口：每次校验，避免旧入口引用已删除的旧资源
    location = /index.html {
        add_header Cache-Control "no-cache, must-revalidate" always;
    }

    # 接口：不缓存，避免脏数据
    location /api/ {
        add_header Cache-Control "no-store" always;
    }
```

```nginx
    # 自建缓存层时可用的 proxy_cache 配置
    proxy_cache_path /data/cache levels=1:2 keys_zone=edge:100m inactive=7d max_size=10g use_temp_path=off;
    proxy_cache_key "$scheme$host$request_uri";
    proxy_cache_valid 200 302 10m;
    proxy_cache_valid 404 1m;
    add_header X-Cache-Status $upstream_cache_status always;
```

**刷新与预热命令：**

```bash
    # 阿里云 CLI：按文件刷新，多个路径用逗号分隔
    aliyun cdn RefreshObjectCaches \
        --ObjectType File \
        --ObjectPath "https://static.example.com/index.html,https://static.example.com/app.js"

    # 阿里云 CLI：目录刷新
    aliyun cdn RefreshObjectCaches \
        --ObjectType Directory \
        --ObjectPath "https://static.example.com/static/"

    # 预热：把源站内容主动推到边缘
    aliyun cdn PushObjectCache \
        --ObjectPath "https://static.example.com/app.3f2a1b.js"
```

**取舍：**

| 策略 | 适用 | 代价 |
| --- | --- | --- |
| 长 TTL + 文件名哈希 | JS/CSS/图片等静态资源 | 需要构建系统支持哈希 |
| 短 TTL + 刷新 | 需要覆盖同名文件的场景 | 刷新有延迟、配额有限 |
| 协商缓存 ETag | 频繁变更但体积大的文件 | 仍有 304 回源请求 |
| 忽略全部 query | 纯静态资源 | 带版本参数时互相覆盖 |
| 保留全部 query | 参数确实影响内容 | 缓存被打散，命中率下降 |

**面试怎么答：** 先讲「缓存键、TTL、刷新」三要素，再区分浏览器缓存与 CDN 缓存两层，说明 `s-maxage` 与 `immutable` 的作用；发布流程讲「哈希文件名 + HTML no-cache + 预热 + 刷新」，最后用回源率与命中率收尾。

**易错点：**

- 只刷 CDN 不刷浏览器缓存，用户侧仍是旧文件。
- HTML 也配了长强缓存，用户永远拿不到新入口。
- 刷新接口有配额与延迟，把它当作实时生效手段。
- 缓存键保留全部 query，`?v=时间戳` 让命中率接近 0。

---

## 6. 负载均衡的层次与算法

**原理：** 负载均衡按工作的协议层次分为两类：

- **四层（L4）**：只看 IP、端口、协议，转发 TCP/UDP 连接，不解析应用内容，性能高、延迟低，但无法按 URL、Header、Cookie 做路由。
- **七层（L7）**：终止或解析 HTTP/HTTPS，可按域名、路径、Header、Cookie 路由，能做重写、限流、灰度，但开销更大。

**常见算法：**

| 算法 | 适用 | 说明 |
| --- | --- | --- |
| 轮询 RR | 后端同构、请求耗时均匀 | 实现简单，不考虑负载 |
| 加权轮询 | 机器配置不同 | 按权重分配，支持平滑加权 |
| 最少连接 | 长连接、请求耗时差异大 | 按当前活跃连接数选最小 |
| 一致性哈希 | 缓存类服务 | 同一 key 落到同一节点，扩缩容影响小 |
| IP Hash | 需要简单会话保持 | 同一客户端 IP 固定后端，NAT 后易倾斜 |
| 最短响应时间 | 后端性能动态变化 | 需要持续采样，实现复杂 |

**健康检查：**

- **主动检查**：LB 定期发 TCP/HTTP 探测，失败则摘除，恢复则加回。要设 `rise`/`fall` 次数，避免抖动。
- **被动检查**：根据真实请求的失败率摘除，反应快但可能误杀。
- 摘除后要配合 `backup` 节点与重试，避免容量骤降。

**转发模式（LVS 为例）：**

1. 客户端请求到达 VIP，LVS 按算法选后端。
2. **DR 模式**：只改 MAC，不改 IP，后端直接把响应发给客户端，回程不经过 LVS，吞吐最高。
3. **NAT 模式**：双向都经过 LVS，支持跨网段，但 LVS 成为带宽瓶颈。
4. **TUN 模式**：IP 隧道跨机房，适合异地分发，需后端支持隧道解封装。

**配置示例（Nginx 七层）：**

```nginx
    upstream api_backend {
        least_conn;
        server 10.0.0.11:8080 weight=3 max_fails=2 fail_timeout=10s;
        server 10.0.0.12:8080 weight=1 max_fails=2 fail_timeout=10s;
        server 10.0.0.13:8080 backup;
        keepalive 64;
    }

    server {
        listen 80;
        server_name api.example.com;

        location / {
            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_next_upstream error timeout http_502 http_503;
            proxy_connect_timeout 3s;
            proxy_read_timeout 30s;
        }
    }
```

```nginx
    # 一致性哈希：同一 URL 固定后端，适合缓存节点
    upstream cache_backend {
        hash $request_uri consistent;
        server 10.0.0.21:8080;
        server 10.0.0.22:8080;
        server 10.0.0.23:8080;
    }
```

**配置示例（LVS 四层）：**

```bash
    # 添加虚拟服务，RR 算法
    ipvsadm -A -t 203.0.113.10:80 -s rr

    # 添加后端，-g 表示 DR 模式，-w 为权重
    ipvsadm -a -t 203.0.113.10:80 -r 10.0.0.11:80 -g -w 1
    ipvsadm -a -t 203.0.113.10:80 -r 10.0.0.12:80 -g -w 1

    # 查看连接数与转发状态
    ipvsadm -Ln
    ipvsadm -Lnc
```

**取舍：**

| 维度 | L4 | L7 |
| --- | --- | --- |
| 性能 | 高，接近线速 | 较低，需解析 HTTP |
| 路由能力 | 仅 IP/端口 | 域名、路径、Header、Cookie |
| TLS | 透传，证书在后端 | 可终止，统一证书与卸载 |
| 典型场景 | 数据库、长连接、入口第一层 | Web 网关、灰度、鉴权 |

**面试怎么答：** 先分 L4/L7，再讲算法选择依据（同构用轮询、长连接用最少连接、缓存用一致性哈希、会话用 IP Hash），然后说明健康检查的主被动区别与摘除风险，最后给一个分层架构：LVS 做四层入口、Nginx 做七层路由。

**易错点：**

- 认为「最少连接」一定最优，短请求场景下它和轮询差别很小。
- 开 `keepalive` 却不把 `Connection` 置空，长连接实际没有复用。
- 健康检查间隔太短，后端瞬时抖动就被整批摘除。
- IP Hash 在 NAT、运营商出口复用场景下严重倾斜。

---

## 7. LVS、Nginx、HAProxy 对比

**原理：** 三者定位不同，不能简单用「谁更强」比较：

- **LVS** 是 Linux 内核里的四层转发器（IPVS），工作在网络层，转发不改应用内容，DR 模式下回程绕过 LVS，吞吐可达数十 Gbps。
- **Nginx** 以七层反向代理著称，同时提供 `stream` 模块做四层代理；静态资源与缓存能力强，配置生态成熟。
- **HAProxy** 是专职的七层/四层代理，健康检查、连接管理、统计指标非常细，高并发下延迟稳定，配置语法自成一派。

**能力对比：**

| 维度 | LVS | Nginx | HAProxy |
| --- | --- | --- | --- |
| 工作层次 | L4 | L4（stream）/ L7 | L4 / L7 |
| 性能 | 最高，内核转发 | 高，七层有解析开销 | 很高，事件驱动 |
| 协议解析 | 不解析 | HTTP/HTTPS、gRPC | HTTP/1.1、HTTP/2、gRPC |
| 健康检查 | 较弱，需配合 keepalived | 主动 HTTP/TCP | 主动 + 被动，粒度最细 |
| 动态配置 | 需 ipvsadm/keepalived | reload 生效 | runtime API / socket |
| 会话保持 | 源地址哈希 | ip_hash、sticky | cookie 插入/重写 |
| 统计监控 | 连接数、包量 | stub_status 有限 | 内置 CSV/统计页 |
| 典型角色 | 四层入口、VIP | Web 网关、静态与缓存 | API 代理、精细流量治理 |

**配置示例（LVS + keepalived 高可用）：**

```bash
    # 后端节点需在回环口绑定 VIP，并关闭 ARP 响应
    ip addr add 203.0.113.10/32 dev lo
    sysctl -w net.ipv4.conf.all.arp_ignore=1
    sysctl -w net.ipv4.conf.all.arp_announce=2
```

```conf
    # keepalived 主节点片段
    vrrp_instance VI_1 {
        state MASTER
        interface eth0
        virtual_router_id 51
        priority 100
        advert_int 1
        virtual_ipaddress {
            203.0.113.10/24
        }
    }
```

**配置示例（Nginx stream 四层）：**

```nginx
    stream {
        upstream mysql_cluster {
            least_conn;
            server 10.0.0.31:3306 max_fails=3 fail_timeout=10s;
            server 10.0.0.32:3306 max_fails=3 fail_timeout=10s;
        }

        server {
            listen 3306;
            proxy_pass mysql_cluster;
            proxy_connect_timeout 5s;
            proxy_timeout 300s;
        }
    }
```

**配置示例（HAProxy 七层）：**

```conf
    global
        maxconn 20000
        log stdout format raw local0

    defaults
        mode http
        timeout connect 3s
        timeout client 30s
        timeout server 30s
        option httplog

    frontend web
        bind *:80
        default_backend app

    backend app
        balance leastconn
        option httpchk GET /healthz
        http-check expect status 200
        server app1 10.0.0.41:8080 check inter 2s rise 2 fall 3
        server app2 10.0.0.42:8080 check inter 2s rise 2 fall 3
```

**取舍：**

| 场景 | 推荐 | 理由 |
| --- | --- | --- |
| 超大流量四层入口 | LVS + keepalived | 内核转发，DR 回程不经 LB |
| 通用 Web 网关 | Nginx | 配置生态成熟，静态与缓存强 |
| API 精细治理 | HAProxy | 健康检查、队列、统计最完整 |
| 已有 K8s | Ingress Controller / Service | 由集群统一管理，少一层自建 |
| 需要 TLS 卸载 | Nginx / HAProxy | LVS 只透传，证书要放后端 |

**面试怎么答：** 不要背参数，按「层次 → 性能 → 能力 → 角色」四步对比：LVS 是四层高性能入口，Nginx 是七层全能网关，HAProxy 是专业代理与治理；再给组合方案「LVS 在最前、Nginx 做七层、HAProxy 管 API」，并说明高可用靠 keepalived 或云 LB。

**易错点：**

- 说 LVS 能做 URL 路由，它工作在四层，看不到 HTTP 内容。
- DR 模式忘记回环绑定 VIP 或没关 ARP，导致 VIP 冲突。
- Nginx `stream` 与 `http` 块混写，配置直接报错。
- HAProxy 的 `timeout server` 设得过短，长任务被误判超时。

---

## 8. 会话保持

**原理：** 会话保持要解决的是「同一个用户的连续请求落到同一台后端」。它和「会话共享」不是一回事：

- **会话保持（sticky）** 是负载均衡层的路由约束，保证同一客户端固定后端。
- **会话共享** 是把 session 外置到 Redis 等集中存储，任何后端都能读，天然不依赖路由。

**常见实现：**

| 方式 | 原理 | 适用 |
| --- | --- | --- |
| 源地址哈希 | 按客户端 IP 取模选后端 | 无 Cookie 的老系统 |
| Cookie 插入 | LB 在响应中写入后端标识 | 浏览器场景，最常用 |
| Cookie 重写 | 改写后端下发的 session cookie | 后端已有 cookie 逻辑 |
| 共享 Session | Session 存 Redis/DB | 需要弹性扩缩容 |
| JWT / 无状态令牌 | 状态放客户端，服务端只验签 | 前后端分离、API 场景 |

**Cookie 保持的流程：**

1. 客户端首次请求，LB 按算法选后端，并在响应中 `Set-Cookie: route=app1; Path=/`。
2. 客户端后续请求自动带上该 Cookie。
3. LB 解析 Cookie 中的后端标识，直接转发到对应节点。
4. 后端故障时，LB 需要能识别并重新分配，同时处理该节点上的会话数据。
5. 扩容时新节点拿不到旧会话，需要配合共享存储或会话迁移。

**配置示例（Nginx ip_hash）：**

```nginx
    upstream web_backend {
        ip_hash;
        server 10.0.0.51:8080;
        server 10.0.0.52:8080;
        server 10.0.0.53:8080 down;
    }
```

```nginx
    # 开源版 Nginx 可用第三方 sticky 模块；商业版用 sticky 指令
    upstream web_sticky {
        sticky cookie srv_id expires=1h domain=.example.com path=/;
        server 10.0.0.51:8080;
        server 10.0.0.52:8080;
    }
```

**配置示例（HAProxy cookie 插入）：**

```conf
    backend web
        balance roundrobin
        cookie SRV insert indirect nocache httponly secure
        server web1 10.0.0.61:8080 cookie a check
        server web2 10.0.0.62:8080 cookie b check
```

**配置示例（Spring Session + Redis）：**

```yaml
    spring:
        session:
            store-type: redis
            timeout: 30m
        redis:
            host: 10.0.0.71
            port: 6379
            timeout: 2s
```

**取舍：**

| 方案 | 优点 | 代价 |
| --- | --- | --- |
| IP Hash | 零改造、无 Cookie 依赖 | NAT 后大量用户共享 IP，严重倾斜 |
| Cookie 插入 | 精准、支持多数客户端 | 依赖 Cookie，API 客户端可能不保存 |
| 共享 Session | 任意扩缩容、故障无感 | 引入 Redis 依赖与网络开销 |
| JWT | 无状态、易水平扩展 | 无法即时吊销，令牌体积大 |

**面试怎么答：** 先区分「会话保持」与「会话共享」，再按 IP Hash、Cookie 插入、共享 Session、JWT 四条路线讲适用场景；强调会话保持的代价是扩缩容与故障转移，最终方向是把状态外置，让负载均衡退回无状态路由。

**易错点：**

- 认为 IP Hash 一定可靠，忽略 NAT 与移动网络出口复用。
- Cookie 没设 `HttpOnly` / `Secure`，带来安全风险。
- 后端故障后会话丢失，却没有降级到重新登录的引导。
- 共享 Session 的 Redis 变成单点，没做哨兵或集群。

---

## 9. 反向代理与跨域

**原理：** 浏览器的同源策略规定：协议、域名、端口三者一致才算同源。跨域请求能否发送、响应能否读取，由 CORS 规范约束：

- **简单请求**：方法为 GET/HEAD/POST，且 `Content-Type` 仅限 `text/plain`、`multipart/form-data`、`application/x-www-form-urlencoded`，直接发送，浏览器检查响应是否带 `Access-Control-Allow-Origin`。
- **预检请求**：其他情况先发 `OPTIONS`，带上 `Access-Control-Request-Method` 与 `Access-Control-Request-Headers`，服务端返回允许列表后才发真实请求。
- **带凭据请求**：`credentials: include` 时，`Access-Control-Allow-Origin` 不能为 `*`，且必须返回 `Access-Control-Allow-Credentials: true`。

**反向代理消除跨域的思路：** 让浏览器只访问同源地址，由 Nginx 把 `/api` 转发到后端。浏览器看到的是同源请求，不触发 CORS；后端也不需要感知前端域名。

**代理流程：**

1. 前端请求 `https://www.example.com/api/users`，与页面同源。
2. Nginx 匹配 `location /api/`，转发到 `http://api.internal:8080/users`。
3. 转发时补上 `Host`、`X-Real-IP`、`X-Forwarded-For`、`X-Forwarded-Proto`。
4. 后端返回响应，Nginx 透传状态码与响应头。
5. Cookie 的 `Domain` 与 `Path` 需与前端同域，否则浏览器不会保存。

**配置示例（Nginx 反向代理）：**

```nginx
    server {
        listen 443 ssl;
        server_name www.example.com;

        ssl_certificate     /etc/nginx/cert/example.pem;
        ssl_certificate_key /etc/nginx/cert/example.key;

        location / {
            root /data/www;
            try_files $uri $uri/ /index.html;
        }

        location /api/ {
            proxy_pass http://api_backend/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Cookie $http_cookie;
            proxy_connect_timeout 3s;
            proxy_read_timeout 30s;
        }
    }
```

注意 `proxy_pass http://api_backend/;` 末尾的斜杠：带斜杠会替换掉 `location` 匹配的前缀，不带则保留完整 URI。这是最常见的 404 来源。

**配置示例（服务端 CORS 头）：**

```nginx
    location /api/ {
        add_header Access-Control-Allow-Origin "https://www.example.com" always;
        add_header Access-Control-Allow-Credentials "true" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
        add_header Access-Control-Max-Age "86400" always;

        if ($request_method = OPTIONS) {
            return 204;
        }
    }
```

**取舍：**

| 方案 | 优点 | 代价 |
| --- | --- | --- |
| 反向代理 | 无预检、Cookie 同域、后端零改造 | 多一层转发，需运维网关 |
| CORS | 纯前端可解，适合公开 API | 预检增加 RTT，凭据场景配置复杂 |
| JSONP | 兼容极老浏览器 | 只支持 GET，有安全风险 |
| 统一网关 | 多服务统一鉴权与跨域 | 架构复杂度上升 |

**面试怎么答：** 先讲同源策略与简单请求/预检的判定条件，再给「反向代理让请求变同源」的方案与 Nginx 配置，重点说明 `proxy_pass` 斜杠、`X-Forwarded-*`、Cookie 域；最后补 CORS 的凭据场景限制。

**易错点：**

- `proxy_pass` 斜杠写错，路径被重复或截断，接口 404。
- 只配 `Access-Control-Allow-Origin`，漏了预检的 `Allow-Methods/Headers`。
- 带 Cookie 的请求把 `Allow-Origin` 设为 `*`，浏览器直接拒绝。
- 代理后后端拿不到真实 IP，日志与风控全部失真。

---

## 10. API 网关

**原理：** API 网关是所有外部流量进入微服务体系的统一入口，把「横切关注点」从业务服务里抽出来：

- **路由**：按域名、路径、Header、版本号转发到不同服务。
- **鉴权**：JWT 校验、API Key、OAuth2、mTLS。
- **限流与熔断**：按租户、接口、IP 限流，下游异常时快速失败。
- **可观测**：统一访问日志、Trace ID、指标与告警。
- **协议转换**：HTTP/1.1 与 HTTP/2、gRPC、WebSocket 之间转换。
- **灰度与发布**：按权重、Header、用户白名单分流。

**与 Nginx / Service Mesh 的区别：**

| 组件 | 关注点 | 位置 |
| --- | --- | --- |
| Nginx | 反向代理、静态资源、基础限流 | 边缘或每台机器 |
| API 网关 | 业务级鉴权、配额、协议转换 | 南北向流量入口 |
| Service Mesh | 服务间通信、mTLS、重试 | 东西向流量，Sidecar |

**一次网关请求的流程：**

1. 客户端请求到达网关 VIP 或负载均衡。
2. 网关匹配路由规则，确定目标服务与版本。
3. 执行鉴权插件，校验令牌、签名、配额。
4. 执行限流与熔断策略，超限直接返回 429。
5. 转发请求，注入 Trace ID 与用户上下文。
6. 记录访问日志与耗时指标，返回响应。
7. 失败时按策略重试或降级，返回统一错误结构。

**配置示例（Nginx 实现基础网关能力）：**

```nginx
    limit_req_zone $binary_remote_addr zone=per_ip:10m rate=20r/s;
    limit_req_zone $http_authorization zone=per_token:10m rate=100r/s;

    server {
        listen 80;
        server_name api.example.com;

        location /v1/orders/ {
            limit_req zone=per_ip burst=40 nodelay;
            limit_req_status 429;

            auth_request /_auth;
            auth_request_set $auth_user_id $upstream_http_x_user_id;
            proxy_pass http://order_service/;
            proxy_set_header X-User-Id $auth_user_id;
        }

        location = /_auth {
            internal;
            proxy_pass http://auth_service/verify;
            proxy_pass_request_body off;
            proxy_set_header Content-Length "";
            proxy_set_header X-Original-URI $request_uri;
        }
    }
```

**补充说明（Kong / APISIX）：** 主流网关用「服务 + 路由 + 插件」三要素描述流量规则，配置随代码一起评审与发布，具体字段以所选网关版本文档为准。

**取舍：**

| 方案 | 优点 | 代价 |
| --- | --- | --- |
| Nginx + Lua | 性能高、可深度定制 | 插件生态与可维护性弱 |
| Kong / APISIX | 插件丰富、动态路由 | 引入新组件与学习成本 |
| 云厂商网关 | 免运维、按量计费 | 供应商锁定，定制受限 |
| 业务自研 | 完全贴合业务 | 重复造轮子，稳定性风险 |

**面试怎么答：** 先列网关的五项核心职责（路由、鉴权、限流、可观测、协议转换），再说明它与 Nginx、Service Mesh 的分工，最后讲部署要点：网关必须无状态、配置要能动态下发、自身不能成为单点。

**易错点：**

- 把业务逻辑塞进网关，导致每次改业务都要动全局入口。
- 网关只部署一个实例，入口故障即全站故障。
- 限流按 IP 做，NAT 后整栋楼共享一个配额。
- 鉴权在网关做完，后端就完全不校验，内网横向移动风险大。

---

## 11. 边缘计算

**原理：** 边缘计算是把计算从中心机房下沉到离用户更近的 CDN 边缘节点。它解决的问题是「网络往返本身无法被缓存优化」：静态内容可以缓存，但个性化、鉴权、AB 测试、重定向这类逻辑每次都要回源，RTT 成为主要成本。

**典型形态：**

- **边缘函数（Edge Function）**：在边缘节点运行 JavaScript/WASM，请求到达即执行，如 Cloudflare Workers、边缘云函数。
- **边缘容器**：在边缘节点跑轻量容器，适合需要更多依赖的逻辑。
- **边缘缓存 + 计算**：先查边缘 KV/缓存，再决定回源还是直接响应。

**能力与限制：**

| 维度 | 说明 |
| --- | --- |
| 运行时长 | 通常限制 CPU 时间（如 10~50ms）与总时长 |
| 状态 | 无状态，跨节点不共享内存，需外部 KV |
| 冷启动 | V8 隔离比容器快，但仍需预热热门节点 |
| 网络 | 可发起子请求，但有数量与超时限制 |
| 调试 | 日志分散、本地模拟器与线上行为有差异 |

**典型场景：**

1. **边缘重定向**：根据 UA、地理、语言把用户跳到正确站点，不回到源站。
2. **A/B 测试**：在边缘分流，避免业务代码里堆实验开关。
3. **鉴权前置**：校验 JWT，非法请求在边缘直接 401，保护源站。
4. **图片处理**：按参数裁剪、转 WebP，缓存结果。
5. **HTML 注入**：统一注入埋点、安全头、灰度标记。

**配置示例（Cloudflare Workers 风格的边缘函数）：**

```javascript
    export default {
        async fetch(request, env, ctx) {
            const url = new URL(request.url);

            // 边缘直接处理健康检查，不回源
            if (url.pathname === '/healthz') {
                return new Response('ok', { status: 200 });
            }

            // 按 Cookie 做灰度，命中实验组则改写上游
            const bucket = request.headers.get('Cookie')?.includes('exp=b')
                ? 'origin-b'
                : 'origin-a';

            const upstream = new Request(
                `https://${bucket}.example.com${url.pathname}${url.search}`,
                request
            );
            upstream.headers.set('X-Edge-Pop', 'sha1');

            const response = await fetch(upstream);
            const out = new Response(response.body, response);
            out.headers.set('X-Edge-Handled', '1');
            return out;
        },
    };
```

**配置示例（Nginx + Lua 的轻量边缘逻辑）：**

```nginx
    location / {
        access_by_lua_block {
            local token = ngx.var.http_authorization
            if not token then
                ngx.status = 401
                ngx.say('{"code":401,"msg":"unauthorized"}')
                return ngx.exit(401)
            end
        }
        proxy_pass http://origin;
    }
```

**取舍：**

| 维度 | 边缘计算 | 回源计算 |
| --- | --- | --- |
| 延迟 | 低，靠近用户 | 受 RTT 与骨干网影响 |
| 能力 | 受限运行时、无本地状态 | 完整环境与依赖 |
| 成本 | 按请求计费，热门路径便宜 | 需要常驻容量 |
| 运维 | 日志分散、调试难 | 传统发布与排查体系 |
| 一致性 | 多节点版本需统一发布 | 版本集中可控 |

**面试怎么答：** 先讲边缘计算解决的是「无法缓存的动态逻辑也要吃 RTT」这一问题，再列边缘函数、边缘容器、边缘 KV 三种形态；然后给出适用场景（重定向、鉴权、AB、图片处理），最后主动说明限制：无状态、执行时长、调试与版本一致性。

**易错点：**

- 把有状态逻辑放边缘，节点之间数据不一致。
- 忽视执行时长限制，复杂逻辑直接超时。
- 边缘函数里做同步阻塞 IO，尾延迟反而更高。
- 多节点发布不同步，用户在不同地区看到不同版本。

---

## 12. 全球加速与多地域部署

**原理：** 跨地域访问慢，根因通常不是带宽不够，而是 **RTT 太长 + 丢包导致拥塞窗口缩小**。TCP 的吞吐上限近似 `窗口 / RTT`，中美 RTT 150ms 时，单流很难跑满带宽。全球加速的做法是：

- **Anycast**：同一 IP 在多地宣告，用户被路由到最近入口。
- **专线 / 骨干网加速**：用户就近接入厂商边缘，之后走内网专线到源站，规避公网抖动。
- **多地域部署**：在多个 Region 部署完整服务，用 GeoDNS 或全局负载均衡把用户带到最近的一套。
- **协议优化**：HTTP/3（QUIC）减少握手往返，BBR 提升丢包下的吞吐。

**多地域架构模式：**

| 模式 | 说明 | 适用 |
| --- | --- | --- |
| 主备（Active-Passive） | 一个地域承载，另一个待命 | 数据强一致、切换可控 |
| 双活（Active-Active） | 多地同时承载，就近接入 | 读多写少、可接受最终一致 |
| 单元化 | 按用户维度切分到不同单元 | 超大流量、故障隔离 |
| 数据分离 | 计算多地、数据集中 | 计算密集、数据强一致 |

**关键问题：数据一致性。** 多地域最难的不是部署，而是「用户在上海写入，在北京读到」。可选方案：中心主库 + 多地只读副本（最终一致）、多主双向同步（冲突处理复杂）、按用户分片到单元（单元内闭环）。

**全球加速的请求路径：**

1. 用户解析域名，Anycast 或 GeoDNS 返回最近接入点。
2. 接入点与源站之间走厂商专线，避开公网绕行与丢包。
3. 源站按地域选择最近的一套服务。
4. 响应沿加速链路返回，TCP 优化与压缩在链路上完成。
5. 健康检查发现某地域故障，全局调度把流量切到备用地域。

**配置示例（GeoDNS 分线路解析）：**

```dns
    ; 分线路解析示意：以下记录分别存在于不同线路视图中，每个视图只返回其中一条
    www.example.com.    300  IN  A  203.0.113.10   ; 默认
    www.example.com.    300  IN  A  198.51.100.10 ; 中国大陆
    www.example.com.    300  IN  A  192.0.2.10    ; 亚太
    www.example.com.    300  IN  A  198.18.0.10   ; 欧美
```

```nginx
    # 源站按 X-Forwarded-For 或 CDN 回源头做地域灰度
    map $http_x_edge_region $backend_pool {
        default   "origin_default";
        "cn"      "origin_cn";
        "ap"      "origin_ap";
        "eu"      "origin_eu";
    }

    upstream origin_cn      { server 10.1.0.10:8080; }
    upstream origin_ap      { server 10.2.0.10:8080; }
    upstream origin_eu      { server 10.3.0.10:8080; }
    upstream origin_default { server 10.0.0.10:8080; }

    server {
        location / {
            proxy_pass http://$backend_pool;
        }
    }
```

**测量与验证命令：**

```bash
    # 从不同地域测量 RTT 与丢包（在对应地域的机器上执行）
    ping -c 20 origin.example.com
    mtr -n -c 50 origin.example.com

    # 对比直连与加速域名的总耗时
    curl -o /dev/null -s -w 'dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer} total=%{time_total}\n' \
        https://origin.example.com/api/health
    curl -o /dev/null -s -w 'dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer} total=%{time_total}\n' \
        https://accelerated.example.com/api/health

    # 验证 QUIC 是否生效（HTTP/3 会显示 h3）
    curl -sI --http3 https://accelerated.example.com/ | head -n 3
```

**取舍：**

| 方案 | 优点 | 代价 |
| --- | --- | --- |
| Anycast + 专线加速 | 无需改架构，见效快 | 按流量计费，厂商绑定 |
| 多地域双活 | 容灾能力强、就近访问 | 数据一致性复杂度高 |
| GeoDNS 调度 | 成本低、实现简单 | 受 LDNS 影响，调度不准 |
| 全量单元化 | 故障隔离彻底 | 改造成本极高 |

**面试怎么答：** 先讲 RTT 与 TCP 窗口对吞吐的限制，再给 Anycast、专线、多地域、协议优化四类手段；然后按主备、双活、单元化讲架构选择，主动点出「多地域真正难的是数据一致性」，最后用测量命令收尾。

**易错点：**

- 认为加了带宽就能解决跨国慢，忽略 RTT 与丢包对窗口的限制。
- 多地域部署但数据库只有一套，跨地域写延迟反而更差。
- GeoDNS 依赖 LocalDNS 出口 IP，调度结果与用户真实位置不符。
- 双活没有冲突解决策略，双向同步导致数据互相覆盖。
