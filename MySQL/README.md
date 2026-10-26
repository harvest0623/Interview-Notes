# MySQL 面试题

> 本目录收录 MySQL 相关的高频面试题及参考答案。因内容较多，按主题拆分为若干分册。默认以 **MySQL 8.0 + InnoDB** 为背景，涉及与 5.7 的差异时会单独标注。题目覆盖后端开发、运维与数据方向常见考点，重点在「机制 + 可执行命令 + 线上经验」。

---

## 目录

| 分册 | 内容 | 题量 |
| --- | --- | --- |
| [01 - 基础与索引篇](01-基础与索引篇.md) | 整体架构、InnoDB 与 MyISAM、B+ 树、聚簇索引与回表、覆盖索引与索引下推、最左前缀与索引失效、联合索引设计、EXPLAIN、慢查询、深分页、索引统计、表设计 | 12 |
| [02 - 事务与锁篇](02-事务与锁篇.md) | ACID、隔离级别、MVCC、快照读与当前读、行锁/表锁/意向锁、间隙锁与 Next-Key Lock、幻读、死锁、redo log 与 WAL、undo log、binlog 与两阶段提交、长事务 | 12 |
| [03 - 架构与优化篇](03-架构与优化篇.md) | 主从复制、读写分离与延迟、分库分表、分布式 ID、高可用、连接池、缓存一致性、大表 DDL、数据迁移、监控告警、报表优化、线上故障排查 | 12 |

---

## 学习路径建议

```
基础与索引篇（架构 / 索引 / EXPLAIN / 表设计，面试必答）
   ↓
事务与锁篇（ACID / MVCC / 锁 / 日志，区分「会写 SQL」与「懂存储引擎」）
   ↓
架构与优化篇（复制 / 分库分表 / 高可用 / 迁移 / 排障，体现线上经验）
```

> 面试策略：**索引与事务是硬门槛**，**MVCC、锁与日志是分水岭**，**架构与排障决定能否承担核心系统**。回答时先给结论，再讲机制，最后落到「线上怎么验证、怎么处理」。

---

## 高频必背 TOP 10

| 序号 | 题目 | 所在分册 |
| --- | --- | --- |
| 1 | 为什么用 B+ 树而不是 B 树、红黑树、哈希？ | [01 - 基础与索引篇](01-基础与索引篇.md#3-为什么用-b-树而不是-b-树红黑树哈希) |
| 2 | 聚簇索引、二级索引与回表是什么？ | [01 - 基础与索引篇](01-基础与索引篇.md#4-聚簇索引二级索引与回表) |
| 3 | 最左前缀原则与索引失效场景？ | [01 - 基础与索引篇](01-基础与索引篇.md#6-最左前缀原则与索引失效场景) |
| 4 | 如何读懂 EXPLAIN 执行计划？ | [01 - 基础与索引篇](01-基础与索引篇.md#8-如何读懂-explain-执行计划) |
| 5 | 四种隔离级别与并发问题？ | [02 - 事务与锁篇](02-事务与锁篇.md#2-四种隔离级别与并发问题) |
| 6 | MVCC 的原理（undo log、Read View、版本链）？ | [02 - 事务与锁篇](02-事务与锁篇.md#3-mvcc-的原理undo-logread-view版本链) |
| 7 | 间隙锁与 Next-Key Lock 是什么？ | [02 - 事务与锁篇](02-事务与锁篇.md#6-间隙锁与-next-key-lock) |
| 8 | redo log 与 WAL 机制？ | [02 - 事务与锁篇](02-事务与锁篇.md#9-redo-log-与-wal-机制) |
| 9 | 主从复制的原理与复制模式？ | [03 - 架构与优化篇](03-架构与优化篇.md#1-主从复制的原理与复制模式) |
| 10 | 分库分表的策略与问题？ | [03 - 架构与优化篇](03-架构与优化篇.md#3-分库分表的策略与问题) |

---

## 核心速查表

**索引失效清单**

```
1. 列上做函数/运算：WHERE DATE(created_at) = '2026-01-01'、WHERE id + 1 = 10
2. 隐式类型转换：字符串列传数字、数字列传字符串（以列的类型为准判断）
3. 前导模糊：LIKE '%张三'、LIKE '%张三%'（LIKE '张三%' 可用）
4. 联合索引不满足最左前缀：索引 (a,b,c)，只查 b 或 b,c
5. OR 连接非索引列：a 有索引、b 无索引，WHERE a=1 OR b=2
6. 范围条件后的列失效：索引 (a,b)，WHERE a>1 AND b=2，b 只能靠 ICP 过滤
7. 排序/分组与索引顺序不一致：ORDER BY 方向混用、排序字段不在索引中
8. 优化器认为全表扫描更便宜：低选择性、表很小、统计信息过期
9. 字符集/排序规则不一致：utf8mb4 列与 utf8mb3 常量比较
10. 使用不等于、NOT IN、IS NOT NULL 时可能放弃索引（不是绝对）
```

**隔离级别对比**

```
READ UNCOMMITTED：脏读、不可重复读、幻读都可能发生
READ COMMITTED  ：解决脏读；每条语句新建 Read View；InnoDB 关闭间隙锁（外键/唯一性检查除外）
REPEATABLE READ ：解决脏读、不可重复读；事务首次快照读建立 Read View；当前读用 Next-Key Lock 防幻读（MySQL 默认）
SERIALIZABLE    ：读写都加锁，等同串行；并发最低；InnoDB 会把普通 SELECT 转为共享锁
```

**三类日志对比**

```
redo log：InnoDB 物理日志，记录页的修改，循环写；用于崩溃恢复与 WAL
undo log：InnoDB 逻辑日志，记录反向操作；用于回滚与 MVCC 版本链
binlog  ：Server 层逻辑日志，记录 SQL 或行变更；用于复制、审计、备份恢复
```

**线上排查常用命令**

```sql
-- 当前连接与正在执行的语句
SHOW FULL PROCESSLIST;
SELECT * FROM performance_schema.threads WHERE PROCESSLIST_COMMAND <> 'Sleep';

-- 锁与事务
SELECT * FROM information_schema.innodb_trx ORDER BY trx_started;
SELECT * FROM performance_schema.data_locks;
SELECT * FROM performance_schema.data_lock_waits;
SHOW ENGINE INNODB STATUS\G

-- 执行计划与慢查询
EXPLAIN FORMAT=TREE SELECT ...;
EXPLAIN ANALYZE SELECT ...;
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';

-- 复制状态
SHOW REPLICA STATUS\G
```

---

## 易错点清单

- **索引不是越多越好**：每个二级索引都要维护 B+ 树、占用缓冲池、增加写入与 DDL 成本；优先保证高频查询，清理长期未使用的冗余索引。
- **`type=index` 不是好现象**：它表示扫描整棵索引树，和全表扫描同属「扫全部」，只是扫描对象更小。
- **`Using filesort` 不等于磁盘排序**：数据量小或 `sort_buffer_size` 足够时在内存完成，但它仍意味着无法直接利用索引顺序。
- **回表不是必然发生**：覆盖索引可以避免；`SELECT *` 最容易破坏覆盖。
- **RR 不是「完全消灭幻读」**：快照读靠 MVCC，当前读靠 Next-Key Lock；两者混用时要注意语义差异。
- **间隙锁只在 RR 及以上生效**：RC 下普通业务查询不加间隙锁，因此并发更高，但当前读可能出现幻读。
- **行锁锁的是索引**：没有可用索引时，UPDATE/DELETE 会扫描并锁定大量记录，表现为接近表锁。
- **redo log 不是 binlog**：前者属于 InnoDB、用于崩溃恢复；后者属于 Server 层、用于复制与备份。
- **`innodb_flush_log_at_trx_commit=1` 也不是绝对不丢数据**：还受磁盘写缓存、文件系统与硬件故障影响。
- **主从延迟不能只看 `Seconds_Behind_Master`**：它为 0 也可能有尚未执行的 relay log；大事务执行期间该值还可能跳变。
- **分库分表不是性能银弹**：会引入跨库 JOIN、分布式事务、全局 ID、分页聚合与扩容迁移等复杂度，应先做索引与架构优化。
- **连接池不是越大越好**：超过数据库承载能力后只会增加上下文切换与锁竞争，`maxLifetime` 还应小于 `wait_timeout`。
