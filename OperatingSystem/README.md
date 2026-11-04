# 操作系统与 Linux 面试题

> 本目录收录操作系统与 Linux 相关的高频面试题及参考答案。内容较多，按主题拆分为 4 个分册，共 48 题。默认以 Linux 5.x/6.x（cgroup v2）、x86-64 与 ARM64、glibc 2.31+、Java 8/17 为背景；涉及内核版本差异（如 futex、cgroup v1/v2、`ss` 替代 `netstat`）时会单独标注。

---

## 目录

| 分册 | 内容 | 题量 |
| --- | --- | --- |
| [01 - 进程与线程篇](01-进程与线程篇.md) | 进程与线程的区别、进程状态与切换、进程间通信的六种方式、线程同步、用户态与内核态、上下文切换开销、`fork` 与 `exec`、僵尸与孤儿进程、协程与线程、调度算法、多进程/多线程/多协程选型、并发与并行（Amdahl 定律） | 12 |
| [02 - 内存管理与 IO 篇](02-内存管理与IO篇.md) | 虚拟内存与地址转换、分页与分段、页面置换算法（LRU / Clock）、缺页中断与 swap、内存碎片与分配器、堆与栈的区别、零拷贝（sendfile / mmap）、IO 模型（阻塞、非阻塞与多路复用）、select / poll / epoll 对比、Reactor 与 Proactor 模式、文件系统与 page cache、内存泄漏与 OOM Killer | 12 |
| [03 - Linux 命令与排查篇](03-Linux命令与排查篇.md) | USE 排查方法、CPU/内存/磁盘 IO/网络四类资源定位、`lsof` 与 `fuser`、`journalctl` 与 `dmesg`、文本处理三件套、权限与用户、定时任务与 systemd、Shell 脚本规范、容器内排查差异 | 12 |
| [04 - 并发同步与死锁篇](04-并发同步与死锁篇.md) | 竞态条件与临界区、互斥锁与自旋锁、读写锁与乐观锁、信号量与条件变量、死锁四条件、检测与恢复、预防与避免（银行家算法）、活锁与饥饿、CAS 与原子操作、内存屏障与可见性、无锁队列、分布式锁与本地锁 | 12 |

---

## 学习路径建议

```text
01 进程与线程篇（地基：并发模型、状态机、调度与通信，几乎所有问题都从这里长出来）
      ↓
02 内存管理与 IO 篇（虚拟内存、置换、IO 模型——性能问题的理论来源）
      ↓
03 Linux 命令与排查篇（把理论落到可执行的命令，面试与工作最实用的一册）
      ↓
04 并发同步与死锁篇（锁、CAS、内存屏障，后端与中间件岗位必问）
```

> 面试策略：**进程线程与内存是硬门槛**（答不清「线程切换开销」「虚拟内存作用」基本会被判定基础薄弱），**排查命令是分水岭**（能给出「现象 → 命令 → 判读 → 处置」完整链路才算真正上过生产），**并发与锁是加分项**（能把 CAS、内存屏障、死锁四条件讲透，说明写过高并发代码）。

---

## 高频必背 TOP 10

| 序号 | 题目 | 所在分册 |
| --- | --- | --- |
| 1 | 进程与线程的区别？ | [01 - 进程与线程篇](01-进程与线程篇.md#1-进程与线程的区别) |
| 2 | 进程间通信有哪六种方式？ | [01 - 进程与线程篇](01-进程与线程篇.md#3-进程间通信的六种方式) |
| 3 | 什么是虚拟内存？地址如何转换？ | [02 - 内存管理与 IO 篇](02-内存管理与IO篇.md#1-虚拟内存与地址转换) |
| 4 | 堆与栈有什么区别？ | [02 - 内存管理与 IO 篇](02-内存管理与IO篇.md#6-堆与栈的区别) |
| 5 | CPU 使用率高如何排查？ | [03 - Linux 命令与排查篇](03-Linux命令与排查篇.md#2-cpu-使用率高toppidstatperf) |
| 6 | 内存使用率高如何排查？ | [03 - Linux 命令与排查篇](03-Linux命令与排查篇.md#3-内存使用率高freevmstatsmem) |
| 7 | 死锁的四个必要条件是什么？ | [04 - 并发同步与死锁篇](04-并发同步与死锁篇.md#5-死锁的四个必要条件) |
| 8 | CAS 是什么？有哪些问题？ | [04 - 并发同步与死锁篇](04-并发同步与死锁篇.md#9-cas-与原子操作) |
| 9 | 内存屏障与可见性如何理解？ | [04 - 并发同步与死锁篇](04-并发同步与死锁篇.md#10-内存屏障与可见性) |
| 10 | 分布式锁与本地锁有什么区别？ | [04 - 并发同步与死锁篇](04-并发同步与死锁篇.md#12-分布式锁与本地锁的区别) |

---

## 核心速查表

**排查命令速查**

```
CPU
    uptime                         1/5/15 分钟平均负载，与 nproc 对比
    vmstat 1 5                     r 运行队列、us/sy/id/wa、si/so
    mpstat -P ALL 1                每核利用率，定位单核跑满
    top -H -p <PID>                展开线程，找热点线程
    pidstat -u 1 5 -t -p <PID>     每线程 %usr/%system/%wait
    perf top / perf record -F 99 -g 采样调用栈，生成火焰图

内存
    free -h                        available 才是可用，buff/cache 可回收
    vmstat 1                       si/so 非 0 表示正在换页
    smem -tk -r                    按 PSS 排序，摊分共享库
    /proc/<PID>/smaps_rollup       Rss / Pss / Anonymous 增量判泄漏
    dmesg -T | grep -i oom         OOM Killer 记录

磁盘
    iostat -x 1 3                  %util、aqu-sz、r_await/w_await
    iotop -oPa                     按进程看真实读写
    pidstat -d 1 5                 每进程读写速率
    df -h / df -i                  空间与 inode 双检查

网络
    ss -s                          各状态连接计数
    ss -lntp                       Recv-Q/Send-Q 与监听队列
    ss -ti dst <IP>                重传、cwnd、rtt
    netstat -s                     协议栈重传、溢出、丢包
    tcpdump -i any -nn -c 200      抓包，-w 存 pcap
    mtr -rw <IP>                   逐跳丢包定位

进程与文件
    lsof -i :8080                  端口被谁占用
    lsof +L1                       已删除但未释放的文件
    fuser -vm /data                挂载点被谁占用
    ps aux --sort=-rss             按 RSS 找内存大户

日志
    journalctl -u <unit> -n 200    服务日志
    journalctl -b -1               上一次启动
    journalctl -k -T               内核日志
    coredumpctl info <PID>         崩溃栈

容器
    docker stats / crictl stats    容器资源用量
    cat /sys/fs/cgroup/memory.max  cgroup v2 内存上限
    cat /sys/fs/cgroup/memory.current
    cat /sys/fs/cgroup/cpu.stat    nr_throttled / throttled_usec
    kubectl describe pod           Last State 与 Events
    kubectl debug -it <pod> --image=nicolaka/netshoot
```

**IO 模型对比**

| 模型 | 等待数据阶段 | 拷贝数据阶段 | 典型 API | 适用场景 |
| --- | --- | --- | --- | --- |
| 阻塞 IO | 阻塞 | 阻塞 | `read` / `write` | 连接数少、逻辑简单 |
| 非阻塞 IO | 轮询，不阻塞 | 阻塞 | `O_NONBLOCK` + `read` | 配合多路复用使用 |
| IO 多路复用 | 阻塞在 `select`/`epoll` | 阻塞 | `select` / `poll` / `epoll` | 高并发网络（Redis、Nginx） |
| 信号驱动 IO | 不阻塞，`SIGIO` 通知 | 阻塞 | `fcntl` + `SIGIO` | 特殊场景，较少使用 |
| 异步 IO | 不阻塞 | 不阻塞 | `io_uring` / POSIX `aio` | 高吞吐磁盘、数据库 |

```
关键结论：前四种都是「同步 IO」，因为真正的数据拷贝仍由用户线程完成；
只有异步 IO 是「内核把数据准备好并拷贝完成后再通知」，回调时数据已在用户缓冲区。
epoll 的价值在于「一个线程管理大量连接」，不是「让单次 IO 变快」。
```

**锁对比**

| 锁 | 等待方式 | 获取开销 | 适用场景 | 主要风险 |
| --- | --- | --- | --- | --- |
| 互斥锁 | 阻塞睡眠（futex） | 微秒级，含上下文切换 | 临界区长、可能阻塞 | 死锁、锁粒度过大 |
| 自旋锁 | 忙等，不让出 CPU | 纳秒级，无切换 | 内核、临界区极短、多核 | 单核无意义、持锁睡眠会烧 CPU |
| 读写锁 | 读共享、写独占 | 比 mutex 高（维护读者计数） | 读多写少、读临界区长 | 写饥饿、锁升级死锁 |
| 乐观锁 | 不等待，提交校验 | 版本号比较 | 冲突率低 | 冲突高时重试放大、ABA |
| 分布式锁 | 网络请求 + TTL | 毫秒级 | 跨机器互斥 | 锁超时、误删他人锁、脑裂 |

```
选型口诀：
    临界区短且多核        → 自旋锁
    临界区长或会阻塞      → 互斥锁
    读多写少且读开销大    → 读写锁
    冲突率低、单变量      → CAS / 乐观锁
    跨进程跨机器          → 分布式锁 + 幂等兜底
```

**易错点清单**

```
1.  把 volatile 当锁用：它只保证可见性与有序性，i++ 仍然不是原子操作
2.  只给写加锁、读不加锁：读者会看到撕裂的中间状态，等于没锁
3.  free 的 used 高就判定内存泄漏：used 含可回收的 page cache，要看 available
4.  iostat 第一次输出当结论：那是自开机以来的平均值，必须看第二次之后
5.  uniq -c 前面不 sort：只对相邻重复行生效，统计结果必然错
6.  crontab 里用相对路径与依赖 PATH：cron 环境只有极少数变量，手工能跑定时不跑
7.  df 有空间却报 No space left：inode 耗尽，要 df -i 而不是只看 df -h
8.  容器内用 free/nproc 判断资源：读到的是宿主机数据，应看 cgroup 的 max/current
9.  认为满足死锁四条件就一定死锁：四条件是必要不充分，破坏任一即可预防
10. 用 SET NX 加锁却用裸 DEL 释放：超时后会删掉别人的锁，必须比对 token
11. 认为无锁一定比加锁快：高竞争下 CAS 重试会退化，吞吐可能低于 mutex
12. 把活锁当死锁重启：线程在 RUNNABLE 空转、业务无进展才是活锁，重启后会复现
```

---

[← 返回仓库首页](../README.md)
