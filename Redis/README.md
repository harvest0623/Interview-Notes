# Redis 常见面试题

> 本目录收录 Redis 相关的高频面试题及参考答案。因内容较多，按主题拆分为三个分册。默认以 **Redis 7.x** 为背景（7.0 引入多 Part AOF 与 Function，7.2 为 Set 增加 listpack 编码），涉及 6.x 及更早版本差异时会单独标注。命令、默认值均以官方 `redis.conf` 与 `COMMAND` 文档为准。

---

## 目录

| 分册 | 内容 | 题量 |
| --- | --- | --- |
| [01 - 数据结构与基础篇](01-数据结构与基础篇.md) | 为什么快与单线程、五种基本类型、底层编码、SDS、跳表、字典与渐进式 rehash、过期与淘汰、6.0 IO 多线程、Pipeline/事务/Lua、大 key 与热 key、key 设计、与 Memcached 对比 | 12 |
| [02 - 持久化与高可用篇](02-持久化与高可用篇.md) | RDB、AOF 与刷盘、混合持久化、主从复制、哨兵、Cluster 分片、脑裂、一致性哈希、持久化选型、扩缩容、故障演练、多级缓存 | 12 |
| [03 - 缓存与实战篇](03-缓存与实战篇.md) | 穿透/击穿/雪崩、缓存一致性、分布式锁、限流、排行榜、分布式 Session、Stream 消息队列、布隆过滤器、预热与容量规划、监控与线上问题 | 12 |

---

## 学习路径建议

```
数据结构与基础篇（命令、编码、过期淘汰、单线程模型——面试的入场券）
   ↓
持久化与高可用篇（RDB/AOF、主从、哨兵、Cluster——区分「会用」与「敢上生产」）
   ↓
缓存与实战篇（穿透击穿雪崩、一致性、锁、限流、消息队列——项目深挖的主战场）
```

> 面试策略：**「为什么快 + 五种类型 + 过期淘汰」是必答项**；**持久化与主从、哨兵、Cluster 是后端岗的分水岭**；**缓存三兄弟与分布式锁几乎必被追问项目细节**。回答时先给结论，再讲机制，最后落到命令、参数与线上取舍。

---

## 高频必背 TOP 10

| 序号 | 题目 | 所在分册 |
| --- | --- | --- |
| 1 | Redis 为什么快？单线程为什么还能高并发？ | [01 - 数据结构与基础篇](01-数据结构与基础篇.md#1-redis-为什么快单线程为什么还能高并发) |
| 2 | 五种基本数据类型及典型使用场景？ | [01 - 数据结构与基础篇](01-数据结构与基础篇.md#2-五种基本数据类型及典型使用场景) |
| 3 | 底层数据结构与编码转换？ | [01 - 数据结构与基础篇](01-数据结构与基础篇.md#3-底层数据结构与编码转换intsetlistpackquicklisthashtable) |
| 4 | 过期删除策略与内存淘汰策略？ | [01 - 数据结构与基础篇](01-数据结构与基础篇.md#7-过期删除策略与内存淘汰策略) |
| 5 | RDB 与 AOF 的区别？混合持久化是什么？ | [02 - 持久化与高可用篇](02-持久化与高可用篇.md#3-rdb-与-aof-的混合持久化) |
| 6 | 主从复制的全量同步与增量同步？ | [02 - 持久化与高可用篇](02-持久化与高可用篇.md#4-主从复制的原理与全量增量同步) |
| 7 | 哨兵模式如何做故障转移？ | [02 - 持久化与高可用篇](02-持久化与高可用篇.md#5-哨兵模式的原理与故障转移) |
| 8 | 缓存穿透、击穿、雪崩的区别与方案？ | [03 - 缓存与实战篇](03-缓存与实战篇.md#1-缓存穿透及解决方案) |
| 9 | 缓存与数据库如何保证一致性？ | [03 - 缓存与实战篇](03-缓存与实战篇.md#4-缓存与数据库的一致性旁路缓存延迟双删binlog-订阅) |
| 10 | Redis 分布式锁怎么实现？有哪些坑？ | [03 - 缓存与实战篇](03-缓存与实战篇.md#5-分布式锁setnx看门狗redlock) |

---

## 核心速查表

**五种数据类型与典型场景**

```
String：缓存对象、计数器（INCR）、分布式锁（SET NX PX）、Bitmap 签到、Session
List：栈/队列（LPUSH+RPOP）、最新列表（LPUSH+LTRIM）、阻塞队列（BLMOVE）
Hash：对象字段部分读写（HSET/HGET）、购物车、配置表，避免整对象序列化
Set：去重、标签、共同好友（SINTER）、抽奖（SRANDMEMBER）、黑白名单
ZSet：排行榜（ZINCRBY/ZREVRANGE）、延迟队列（score=时间戳）、范围查询
```

**缓存三兄弟**

```
穿透：查不存在的数据，缓存永远不命中 → 缓存空值（短 TTL）、布隆过滤器、参数校验、限流
击穿：单个热点 key 过期，瞬间打到 DB → 互斥重建（SET NX）、逻辑过期、热点不过期 + 异步更新
雪崩：大量 key 同时过期或 Redis 整体故障 → TTL 加随机、集群/哨兵、本地缓存、熔断降级、预热
```

**分布式锁与限流核心命令**

```
加锁：SET lock:order:1001 <token> NX PX 30000
解锁：EVAL "if redis.call('get',KEYS[1])==ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end" 1 lock:order:1001 <token>
续期：Redisson 看门狗默认 30s，每 10s（1/3 周期）续一次
限流：固定窗口 INCR + EXPIRE；滑动窗口 ZADD/ZREMRANGEBYSCORE/ZCARD；令牌桶 Lua 脚本
```

**持久化与高可用关键参数**

```
RDB：save 3600 1 300 100 60 10000；bgsave fork + COW；stop-writes-on-bgsave-error yes
AOF：appendonly yes；appendfsync everysec（默认）；auto-aof-rewrite-percentage 100
混合：aof-use-rdb-preamble yes（默认）；7.0 多 Part：base.rdb + incr.aof + manifest
主从：replicaof host port；repl-backlog-size 1mb；min-replicas-to-write 1
哨兵：sentinel monitor mymaster 127.0.0.1 6379 2；down-after-milliseconds 30000
集群：cluster-enabled yes；16384 槽；cluster-node-timeout 15000；MOVED / ASK
```

---

## 易错点清单

- **单线程指的是「命令执行」单线程**：Redis 6.0 起网络读写可用 IO 线程，另有 bio 线程负责关闭文件、AOF fsync 等后台任务。
- **「Redis 6.0 多线程」不等于命令并行执行**：命令仍在主线程串行执行，多线程只分担 socket 读写。
- **不是所有命令都 O(1)**：`KEYS`、`SMEMBERS`、`HGETALL`、`LRANGE 0 -1`、`ZRANGE 0 -1` 都是 O(N)，大 key 上会阻塞主线程。
- **编码阈值有双条件**：listpack 不只限制元素个数，还限制单个元素长度（`*-max-listpack-value`，默认 64 字节）。
- **编码转换通常不可逆**：listpack 转 hashtable/skiplist 后，即使删到很小也不会自动转回。
- **过期键不会立刻释放内存**：惰性删除 + 定期删除，未命中时仍占内存；从库不主动过期，等主库同步 DEL。
- **`volatile-*` 淘汰策略可能「淘汰不动」**：没有设置 TTL 的 key 不参与淘汰，内存仍会打满并报 OOM。
- **RDB 的 `save` 是阻塞的，`bgsave` 才 fork 子进程**；fork 本身会短暂阻塞，且 COW 在写入多时可能造成内存翻倍。
- **AOF `everysec` 最多丢约 1 秒数据**，不是「不丢」；`always` 也受操作系统与磁盘缓存影响。
- **主从复制是异步的**：写主库成功不代表从库已有，故障切换可能丢最后一段数据，`WAIT` 只能降低概率。
- **哨兵的 quorum 不等于 majority**：主观下线票数用于判定客观下线，真正选 leader 还需多数哨兵投票。
- **Cluster 的 16384 个槽是固定的**，扩容是搬槽而不是重新哈希；多 key 命令要求 key 在同一槽（可用 hash tag `{}`）。
- **`MOVED` 是永久重定向，`ASK` 是临时重定向**：槽迁移过程中客户端要先问目标节点，且本次请求要发 `ASKING`。
- **延迟双删不能保证强一致**：它只是缩小不一致窗口，彻底解决要靠 binlog 订阅或接受最终一致。
- **`SETNX + EXPIRE` 两条命令不是原子的**，必须用 `SET key value NX PX ms` 一条命令。
- **Redlock 不等于绝对安全**：它依赖时钟与网络假设，强一致场景应使用带 fencing token 的方案或 ZooKeeper/etcd。
- **布隆过滤器只有「可能存在 / 一定不存在」**，有假阳性、没有假阴性，标准布隆过滤器不支持删除。
- **`maxmemory` 只统计数据与部分开销**，不含 fork COW、复制缓冲区、碎片，实际内存会高于配置值。
