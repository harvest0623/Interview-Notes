# 操作系统与 Linux 面试题 · 03 Linux 命令与排查篇

[← 返回总览](README.md)

> 内容：性能排查的 USE 方法、CPU / 内存 / 磁盘 IO / 网络四类资源的定位命令、文件与进程占用、日志检索、文本处理三件套、权限与用户、定时任务与 systemd、Shell 脚本规范、容器内排查差异（共 12 题）。每题按「现象 → 排查命令 → 判读标准 → 处置建议」组织，命令可直接复制执行，输出字段均为真实字段名。

---

## 目录

1. [性能排查的整体思路（USE 方法）](#1-性能排查的整体思路use-方法)
2. [CPU 使用率高：top、pidstat、perf](#2-cpu-使用率高toppidstatperf)
3. [内存使用率高：free、vmstat、smem](#3-内存使用率高freevmstatsmem)
4. [磁盘 IO 排查：iostat、iotop](#4-磁盘-io-排查iostatiotop)
5. [网络排查：ss、netstat、tcpdump](#5-网络排查ssnetstattcpdump)
6. [文件与进程排查：lsof、fuser](#6-文件与进程排查lsoffuser)
7. [日志排查：journalctl、dmesg](#7-日志排查journalctldmesg)
8. [常用文本处理命令（grep、awk、sed、sort、uniq）](#8-常用文本处理命令grepawksedsortuniq)
9. [权限与用户管理](#9-权限与用户管理)
10. [定时任务与 systemd](#10-定时任务与-systemd)
11. [Shell 脚本与管道组合](#11-shell-脚本与管道组合)
12. [容器内的排查差异](#12-容器内的排查差异)

---

## 1. 性能排查的整体思路（USE 方法）

**现象：** 「系统变慢」但说不出具体指标；监控面板 CPU、内存、磁盘、网络全是黄色；重启后短暂恢复，过一会儿又慢。最常见的错误是 `top` 看一眼，看到一个高数值就下结论，结果优化了不是瓶颈的那一环。

**USE 方法**：对每一类资源，依次检查三个维度，任何一个命中就继续往下钻。

- **Utilization（利用率）**：资源在采样窗口内有多忙，如 CPU 的 `%us`、磁盘的 `%util`、网卡的 `rxkB/s`。
- **Saturation（饱和度）**：资源排队有多严重，如运行队列 `r`、磁盘 `aqu-sz`、监听的 `Send-Q`。
- **Errors（错误）**：资源是否在报错，如网卡 `rx_dropped`、`dmesg` 里的 I/O error、内核 OOM 记录。

| 资源 | 利用率 | 饱和度 | 错误 |
| --- | --- | --- | --- |
| CPU | `mpstat -P ALL 1` 的 `%usr/%sys` | `vmstat` 的 `r`、`/proc/pressure/cpu` | `dmesg` 的 MCE、`perf` 的报警 |
| 内存 | `free -h` 的 `used` | `vmstat` 的 `si/so`、`/proc/pressure/memory` | `dmesg` 的 `Out of memory` |
| 磁盘 | `iostat -x` 的 `%util` | `iostat -x` 的 `aqu-sz`、`r_await` | `dmesg` 的 `I/O error`、`smartctl` |
| 网络 | `sar -n DEV 1` 的带宽 | `ss -lnt` 的 `Send-Q`、`netstat -s` 的重传 | `ip -s link` 的 `dropped` |

**排查命令（按顺序执行，先全局后局部）：**

```bash
# 1. 第一眼：负载与运行时长（1/5/15 分钟平均负载）
uptime

# 2. 逐秒看全局 5 次：r 队列、si/so、bi/bo、cs、us/sy/id/wa
vmstat 1 5

# 3. 每核利用率，确认是单核跑满还是全核跑满
mpstat -P ALL 1 3

# 4. 磁盘扩展指标：排队深度与延迟
iostat -x 1 3

# 5. 内存真实可用量（available 才是可用，buff/cache 可回收）
free -h

# 6. 文件系统空间与 inode
df -h; df -i

# 7. 网络连接总览与监听队列
ss -s; ss -lnt

# 8. 锁与调度等待（可选，需要内核支持 PSI）
cat /proc/pressure/cpu /proc/pressure/memory /proc/pressure/io
```

**判读标准：**

- `load average` 持续大于 CPU 核数，说明有任务在排队；但负载高不等于 CPU 高，`wa` 高时负载也会被 I/O 拉起来。用 `nproc` 取核数作基准。
- `vmstat` 的 `r` 列是运行队列长度（含正在运行的进程），`r` 长期大于核数即为 CPU 饱和；`b` 列是阻塞在 I/O 或锁上的进程数。
- `si/so` 非 0 表示正在换页，内存已经不够，此时任何 CPU 优化都是徒劳。
- `wa` 高只说明 CPU 在等 I/O，真正原因要看 `iostat -x` 的 `%util` 与 `r_await/w_await`。
- `/proc/pressure/*` 的 `some avg10` 表示至少有一个任务被该资源阻塞的时间占比，比负载更直接反映干扰。

**处置建议：**

- 先定位到**单一资源**再动手：CPU 饱和去查热点函数，内存不足去查泄漏与大页，磁盘瓶颈去查随机写放大，网络受限去查重传与连接数。
- 用「三段时间」工具：`sar`（历史 24 小时）、`iostat`/`vmstat`（当前）、`perf`（代码级），避免只看当前一瞬间。
- 压测复现优于线上猜测：`stress-ng` 造负载、`fio` 造 IO、`tc` 造延迟，对比指标变化确认瓶颈。
- 改动前记录基线（`sar -u 1 60 > baseline.txt`），改后同条件对比，避免「感觉变快了」。

**收敛路径（从现象到代码，逐层缩小）：**

```text
全局资源（uptime / vmstat 1 / iostat -x 1 / ss -s）
      ↓ 锁定唯一瓶颈资源：CPU、内存、磁盘、网络
进程级（top -o %CPU、pidstat -u 1、iotop -oPa、lsof -i）
      ↓ 锁定 PID
线程级（top -H -p PID、pidstat -t、jstack、py-spy）
      ↓ 锁定热点线程
代码级（perf record -g、strace -cp、火焰图）
```

**排查记录模板（避免反复回到现场）：**

```bash
{
    date
    uname -a
    uptime
    vmstat 1 5
    free -h
    df -h
    ss -s
} > /tmp/diag_$(date +%Y%m%d%H%M).txt 2>&1
```

**常见误判：**

| 误判 | 为什么错 | 正确做法 |
| --- | --- | --- |
| `load average` 高就加 CPU | 负载包含 I/O 阻塞与不可中断睡眠 | 看 `vmstat` 的 `r` 与 `b`，区分计算型与等待型 |
| 内存 `used` 高就判定泄漏 | `used` 含可回收的 page cache | 看 `available` 与 `smaps_rollup` 的 `Anonymous` 增量 |
| `%util` 100% 就判定磁盘到顶 | NVMe 高并发下该值可长期为 100% | 结合 `aqu-sz` 与 `await` 判断是否真的排队 |

**面试怎么答：** 先给 USE 三个维度，再给「全局 → 进程 → 线程 → 代码」的收敛顺序，最后补一句「先确认瓶颈资源，再谈优化手段，不要一上来就调内核参数」。

---

## 2. CPU 使用率高：top、pidstat、perf

**现象：** 监控告警 CPU 超过 80%；`top` 显示某个 Java 进程 `%CPU` 300%+；接口 P99 从 50ms 涨到 800ms；或者负载很高但 CPU 空闲（此时方向是 I/O 而不是 CPU）。

**排查命令：**

```bash
# 1. 找到消耗 CPU 的进程（-o 按 CPU 排序，-H 展开线程）
top -o %CPU
top -H -p 12345

# 2. 确认是用户态还是内核态在烧 CPU
pidstat -u 1 5 -p 12345
pidstat -u 1 5 -t -p 12345

# 3. 把线程号转成十六进制，去 jstack 里对线程栈（Java 场景）
printf '%x\n' 12377

# 4. 采样调用栈生成火焰图（需要 perf 与 debuginfo）
perf top -p 12345
perf record -F 99 -g -p 12345 -- sleep 30
perf report --stdio | head -n 40

# 5. 查看进程在等什么（内核栈）
cat /proc/12345/stack
cat /proc/12345/wchan

# 6. 确认是否被虚拟机抢占（steal 高说明宿主机超卖）
mpstat 1 3
```

**判读标准：**

| 指标 | 含义 | 典型根因 |
| --- | --- | --- |
| `%us` 高 | 用户态代码在算 | 死循环、正则回溯、序列化、GC 频繁、加解密 |
| `%sy` 高 | 内核态在跑 | 系统调用过多、锁竞争、页表遍历、容器网络转发 |
| `%wa` 高 | 等磁盘 I/O | 同步写日志、随机读、swap 换页 |
| `%hi/%si` 高 | 硬/软中断 | 网卡小包多、中断未做多队列绑定 |
| `%st` 高 | 被宿主机抢占 | 云主机超卖、CPU 配额被限流 |
| `%CPU` 超过 100% | 多线程累加值 | 单进程多线程跑满多核，不是异常 |

`pidstat -t` 输出中 `%usr + %system` 之和接近 `%CPU`，且 `CPU` 列（编号）在同一线程上不变，说明该线程在单核上空转，是典型的死循环或忙等。

**处置建议：**

- 死循环：用 `perf record -g` 看热点栈，火焰图顶端的宽平顶就是热点函数；忙等自旋改用条件变量或阻塞队列。
- GC 频繁：`jstat -gcutil 12345 1000` 看 `FGC` 与 `FGCT`，调整堆大小或换收集器；不是 CPU 问题的 CPU 问题。
- `%sy` 高：`strace -cp 12345` 统计系统调用耗时，重点看 `futex`（锁竞争）、`write`（日志）、`epoll_wait`（空转）。
- 中断不均：`ethtool -l eth0` 看队列数，`irqbalance` 或手动绑核；RPS/RFS 打开。
- 限流兜底：`systemd` 的 `CPUQuota=200%`、`cgroup` 的 `cpu.max`，避免单进程拖垮整机。

**排查步骤（从进程到代码）：**

1. 用 `top -o %CPU` 找到 Top 1 进程，记下 PID 与 `%CPU`。
2. 用 `pidstat -u 1 5 -p <PID>` 判断是 `%usr` 还是 `%system` 高。
3. 用 `top -H -p <PID>` 找到最热的线程，记下线程 ID。
4. Java 用 `jstack <PID>` 结合十六进制线程号定位栈；Go/C++ 用 `perf`，Python 用 `py-spy`。
5. 拿到函数名后回代码找循环、正则、序列化、锁与 GC。

```bash
# 一条命令完成「进程 → 线程」的初筛
ps -eo pid,comm,%cpu --sort=-%cpu | head -n 5
top -b -n 1 -H -p "$(pgrep -f myapp | head -n 1)" | head -n 20
```

**典型输出对照：**

```text
# pidstat -u 1 5 -p 12345
UID   PID   %usr %system  %guest   %wait    %CPU   CPU  Command
app  12345 298.00    2.00    0.00    0.00  300.00     3  java
```

`%usr` 远大于 `%system` 且 `CPU` 列不变，说明是纯计算型热点；若 `%wait` 明显，线程其实在等锁或等 I/O，方向应转向 `futex` 与 `iostat`。

**易错点：** `top` 第一行的 `load average` 在容器里读到的是宿主机数值，不能直接用于判断容器负载；`pidstat` 需要 `sysstat` 包，精简镜像里通常没有。

---

## 3. 内存使用率高：free、vmstat、smem

**现象：** `free` 显示 `available` 很小；进程 RSS 持续上涨形成阶梯；`dmesg` 出现 `Out of memory: Kill process`；服务被 OOM Killer 杀掉后 `exit code 137`。

**排查命令：**

```bash
# 1. 全局内存：used / buff/cache / available
free -h
cat /proc/meminfo | grep -E 'MemTotal|MemFree|MemAvailable|Buffers|Cached|Swap'

# 2. 是否在换页（si/so 非 0 就是内存压力）
vmstat 1 5

# 3. 按进程粒度看真实占用（PSS 比 RSS 更准，能摊分共享库）
smem -tk -r | head -n 20

# 4. RSS 排序，找大户
ps aux --sort=-rss | head -n 10

# 5. 单进程内存构成（匿名页 / 文件页 / 共享内存）
cat /proc/12345/smaps_rollup

# 6. 确认是否发生过 OOM
dmesg -T | grep -i -E 'oom|killed process'
journalctl -k --since '-2h' | grep -i oom

# 7. 内核内存被谁占了（slab 异常增长也是「内存消失」的原因）
slabtop -o | head -n 15
```

**判读标准：**

- `free -h` 的 `available` 才代表还能分配给新进程的量；`used` 含 `buff/cache`，在 Linux 上「内存被缓存吃满」是正常设计，不是泄漏。
- `vmstat` 的 `si/so`（swap in/out，单位 KB/s）持续非 0，说明物理内存不足，性能会断崖式下跌。
- `smaps_rollup` 中 `Rss` 与 `Pss` 差距大，说明大量是共享库；`Anonymous` 持续上涨才是典型堆泄漏。
- `dmesg` 的 `Out of memory: Killed process 12345 (java) total-vm:...` 记录包含被杀进程与当时的 RSS，是 OOM 的直接证据。
- `slabtop` 的 `dentry`/`inode_cache` 过大，通常是遍历海量小文件导致，属可回收缓存。

**处置建议：**

- 泄漏：`smaps_rollup` 连续采样对比，配合 `pmap -x 12345 | tail -n 1` 看增量；堆内问题用 `jmap -histo:live` 或 `pprof`。
- 突发：先限流降级，再扩容；容器设 `resources.limits.memory`，JVM 设 `-XX:MaxRAMPercentage=75`，留出堆外与页缓存余量。
- 缓存误判：不要执行 `echo 3 > /proc/sys/vm/drop_caches` 来「释放内存」，它只会让下一次读盘变慢；只用于测试基线。
- 大页与透明大页：数据库类进程评估 `THP` 的收益与延迟抖动，`/sys/kernel/mm/transparent_hugepage/enabled` 可临时关闭。

**排查步骤（三步定性）：**

1. **定性**：`free -h` 看 `available`，`vmstat` 看 `si/so`，先确认是「真的不够」还是「缓存占用」。
2. **定位**：`ps aux --sort=-rss` 与 `smem -tk` 找到大户，`/proc/PID/smaps_rollup` 看是匿名页还是文件页。
3. **确认泄漏**：间隔 5 分钟两次采样，`Anonymous` 持续上涨且不回落即为泄漏；`RssFile` 上涨只是缓存。

```bash
# 两次采样对比，只看关键行
grep -E 'Rss|Anonymous' /proc/12345/smaps_rollup
sleep 300
grep -E 'Rss|Anonymous' /proc/12345/smaps_rollup
```

**内存构成对照：**

| 字段 | 含义 | 是否可回收 |
| --- | --- | --- |
| `AnonPages` | 进程堆、栈等匿名页 | 否，只能 swap 或释放 |
| `Cached` | 文件页缓存 | 是，内存压力下自动回收 |
| `Buffers` | 块设备元数据 | 是 |
| `SReclaimable` | 可回收 slab（dentry、inode） | 是 |
| `SUnreclaim` | 不可回收 slab | 否，异常增长多为内核侧问题 |

**易错点：** 容器内 `free` 读到的是宿主机的 `/proc/meminfo`（除非挂载了 lxcfs），必须用 cgroup 的 `memory.current/max` 判断容器内存。

---

## 4. 磁盘 IO 排查：iostat、iotop

**现象：** 写日志的接口偶发超时；`%wa` 高；`df -h` 显示磁盘还有空间但应用报 `No space left on device`；数据库 `fsync` 抖动。

**排查命令：**

```bash
# 1. 设备级：利用率、排队、延迟（-x 扩展指标，1 秒 3 次）
iostat -x 1 3

# 2. 进程级：只显示真正产生 IO 的进程（-o 仅活跃，-a 累计，-P 显示进程号）
iotop -oPa

# 3. 每进程读写速率与延迟
pidstat -d 1 5

# 4. 空间与 inode 双检查（小文件过多会先耗尽 inode）
df -h; df -i

# 5. 定位大文件与目录占用
du -sh /* 2>/dev/null | sort -rh | head -n 10
find /var/log -type f -size +500M -exec ls -lh {} \;

# 6. 确认设备是否报错、是否机械盘
dmesg -T | grep -i -E 'I/O error|medium error|reset'
lsblk -d -o NAME,ROTA,SCHED

# 7. 基线测试：区分「应用写放大」与「磁盘本身慢」
fio --name=randwrite --rw=randwrite --bs=4k --iodepth=32 --size=1G --runtime=30 --filename=/tmp/fio.test
```

**判读标准：**

| 字段 | 含义 | 阈值参考 |
| --- | --- | --- |
| `%util` | 设备繁忙时间占比 | 持续 > 80% 且有 `await` 抬升即瓶颈（NVMe 上该值参考意义弱） |
| `aqu-sz` | 平均排队请求数 | > 1 表示存在排队 |
| `r_await/w_await` | 单次请求平均耗时（含排队） | HDD 超过 20ms、SSD 超过 5ms 需关注 |
| `rareq-sz/wareq-sz` | 平均请求大小 | 远小于 4K 说明大量小随机 IO |
| `rkB/s/wkB/s` | 吞吐 | 接近设备带宽上限即为吞吐瓶颈 |

`df -h` 有空间而应用报 `No space left on device`，先看 `df -i`：inode 用尽（`IUse%` 100%）最常见于海量小文件与临时文件堆积。

**处置建议：**

- 写放大：日志改异步/批量刷盘（`fsync` 合并）、调大 `dirty_ratio` 与 `dirty_expire_centisecs`，但要权衡丢数据窗口。
- 随机读多：加 page cache 或本地缓存层；数据库场景换 NVMe、调 `io scheduler`（`none`/`mq-deadline`）。
- 单进程独占：`iotop -oPa` 拿到 PID 后限速（`ionice -c2 -n7 -p PID`，cgroup v2 用 `io.max`）。
- inode 耗尽：清理临时文件与旧日志，必要时重建文件系统并调大 `-i` 参数。

**排查步骤：**

1. `iostat -x 1 3` 看哪块盘 `%util` 与 `await` 同时抬升。
2. `iotop -oPa` 找到写盘最多的进程，记录 `DISK READ/WRITE` 与 `IO` 列。
3. `pidstat -d 1` 区分读多还是写多；`strace -e trace=fsync,write -c -p <PID>` 看是否同步刷盘。
4. `df -h` 与 `df -i` 排除空间与 inode；`dmesg` 排除硬件错误。

**顺序 IO 与随机 IO 的区分：**

```bash
# 平均请求大小远小于 4K，说明是随机小 IO（读索引、随机查页）
iostat -x 1 3 | awk '$1 ~ /^(sd|nvme|vd)/ {print $1, $6, $7}'

# 用 fio 对比同盘的顺序与随机能力，判断是否已到设备极限
fio --name=seqread --rw=read --bs=128k --size=1G --filename=/data/fio.test
fio --name=randread --rw=randread --bs=4k --iodepth=32 --size=1G --filename=/data/fio.test
```

**易错点：** `iostat` 第一次输出是自开机以来的平均值，必须看第二次之后的值；`iotop` 需要 root 与 `CONFIG_TASK_IO_ACCOUNTING` 支持。

---

## 5. 网络排查：ss、netstat、tcpdump

**现象：** 接口偶发超时但服务端 CPU 正常；连接数暴涨；`connection reset by peer`；`Cannot assign requested address`；DNS 解析慢。

**排查命令：**

```bash
# 1. 连接总览：各类 TCP 状态计数
ss -s

# 2. 监听队列：Recv-Q 是已完成三次握手等待 accept 的队列（backlog）
ss -lnt

# 3. 按状态与端口过滤，带进程
ss -antp state time-wait
ss -antp '( sport = :8080 )'

# 4. 单连接的内核细节：重传、拥塞窗口、RTT
ss -ti dst 10.0.0.5

# 5. 协议栈统计：重传、丢包、半连接溢出
netstat -s | grep -E 'retrans|overflow|dropped|SYNs'

# 6. 抓包：只看某端口某 IP，-nn 不做名字解析，-S 显示绝对序号
tcpdump -i any -nn -S 'tcp port 8080 and host 10.0.0.5' -c 200 -w /tmp/8080.pcap

# 7. 网卡层错误与队列
ip -s link show eth0
ethtool -S eth0 | grep -E 'drop|err|miss'

# 8. DNS 与连通性
dig +trace example.com
time curl -o /dev/null -s -w 'dns:%{time_namelookup} conn:%{time_connect} tls:%{time_appconnect} ttfb:%{time_starttransfer}\n' https://example.com/
```

**判读标准：**

- `ss -lnt` 的 `Send-Q` 列在监听套接字上表示 backlog 上限，业务套接字上表示未被对端确认的字节数；`Recv-Q` 在 `LISTEN` 状态持续非 0，说明应用 `accept` 跟不上，是全连接队列溢出。
- `ss -s` 的 `timewait` 数量上万且持续增长，通常是短连接 + 主动关闭方；`orphaned` 增长说明应用没 `close`。
- `netstat -s` 的 `segments retransmitted` 占比超过 1%，或 `SYNs to LISTEN sockets dropped` 增长，分别对应链路丢包与队列溢出。
- `tcpdump` 里看到 `R` 标志（RST）后紧跟 `F`，多见于应用提前关闭或中间设备（SLB/WAF）超时切断。
- `Cannot assign requested address` = 本地端口耗尽，`ss -s` 的 `TCP: ...` 与 `net.ipv4.ip_local_port_range` 对照。

**处置建议：**

- 全连接队列溢出：调大应用 `backlog` 与 `net.core.somaxconn`，同时排查 `accept` 线程是否被阻塞。
- TIME_WAIT 过多：用连接池复用、`tcp_tw_reuse=1`（仅对主动连接有效）；不要动 `tcp_max_tw_buckets` 掩盖问题。
- 重传高：先 `mtr` 定位丢包段落，再判断是链路、SLB 还是会话粘滞；应用侧重试要加退避，避免放大。
- 抓包分析：下载 pcap 后用 Wireshark 看 `Statistics → TCP Stream Graphs`，重点看 `Retransmission`、`Zero Window`。
- 端口耗尽：扩大 `ip_local_port_range`（如 `10240 65000`），并让调用方使用长连接。

**排查步骤（分层收敛）：**

1. **本机连接层**：`ss -s` 看总量与状态分布，`ss -lnt` 看监听队列。
2. **单连接层**：`ss -ti dst <ip>` 看重传、`cwnd`、`rtt`，判断是丢包还是窗口限制。
3. **协议栈层**：`netstat -s` 或 `nstat -az` 看重传、半连接溢出、端口耗尽。
4. **链路层**：`mtr -rw <ip>` 定位丢包跳数，`ip -s link` 看 `dropped/errors`。
5. **报文层**：`tcpdump` 抓包后用 Wireshark 看时序图与 RST 来源。

**tcpdump 常用过滤器：**

```bash
# 只看握手与挥手标志
tcpdump -i any -nn 'tcp[tcpflags] & (tcp-syn|tcp-fin|tcp-rst) != 0' -c 50

# 抓 10 分钟，按 100MB 切片，避免单文件过大
tcpdump -i eth0 -nn -s 0 -G 600 -W 6 -w /tmp/net_%Y%m%d%H%M.pcap

# 离线统计每秒重传数（tshark 与 tcpdump 同属 wireshark 工具集）
tshark -r /tmp/net.pcap -q -z io,stat,1,"tcp.analysis.retransmission"
```

**易错点：** 容器内 `tcpdump` 抓的是容器命名空间的网卡，抓宿主机侧需要 `nsenter`；`netstat` 在多数新发行版已被移除，优先用 `ss`。

---

## 6. 文件与进程排查：lsof、fuser

**现象：** `df` 显示磁盘满，删掉大文件后空间不释放；启动服务报 `Address already in use`；`umount` 报 `device is busy`；排查「谁在写这个文件」。

**排查命令：**

```bash
# 1. 端口被谁占用
lsof -i :8080
ss -lntp 'sport = :8080'

# 2. 某进程打开的所有文件与网络句柄
lsof -p 12345 | head -n 30
ls -l /proc/12345/fd | head -n 20

# 3. 关键：已删除但仍被持有的文件（磁盘不释放的根因）
lsof +L1
lsof -nP | grep '(deleted)'

# 4. 某目录/文件被谁打开
lsof +D /var/log
fuser -v /var/log/app.log

# 5. 谁占用了挂载点，导致无法卸载
fuser -vm /data
fuser -k -TERM /data

# 6. 文件描述符上限与泄漏判断
cat /proc/12345/limits | grep -i 'open files'
ls /proc/12345/fd | wc -l
```

**判读标准：**

- `lsof` 输出第 4 列 `FD`：`cwd` 当前目录、`txt` 程序代码、`mem` 内存映射、数字为文件描述符，后缀 `u/w/r` 表示读写模式。
- `lsof +L1` 的 `NLINK` 为 0 表示文件已 unlink 但仍有进程持有，这与 `df` 显示已用但 `du` 找不到大文件是同一现象。
- `fuser -v` 输出 `USER PID ACCESS COMMAND`，`ACCESS` 为 `f`（打开文件）、`c`（当前目录）、`e`（可执行文件）。
- `/proc/PID/fd` 数量持续上涨接近 `limits` 的 `Max open files`，即为 fd 泄漏，最终报 `Too many open files`。

**处置建议：**

- 已删除文件不释放：重启持有进程，或 `truncate -s 0 /proc/12345/fd/999`（对日志类文件安全，对数据文件先确认语义）。
- fd 泄漏：查代码里未关闭的连接与流（`with`/`defer close`），并把 `LimitNOFILE` 在 systemd unit 中显式提高。
- 端口占用：`ss -lntp` 拿 PID 后确认是否为残留进程或旧版本实例，避免直接 `kill -9` 造成数据损坏。
- `umount busy`：先 `fuser -vm` 找到占用者，按序 `TERM`、`KILL`，再 `umount -l`（延迟卸载）收尾。

**典型场景与对应命令：**

| 场景 | 首选命令 | 关注字段 |
| --- | --- | --- |
| 端口被占用 | `ss -lntp 'sport = :8080'` | `users:("java",pid=12345,fd=88)` |
| 磁盘满但不释放 | `lsof +L1` | `NLINK` 为 0、`SIZE/OFF` 很大 |
| 进程 fd 泄漏 | 统计 `/proc/PID/fd` 条目数 | 数量持续增长并接近 `limits` |
| 无法 umount | `fuser -vm /data` | `ACCESS` 与 PID |
| 文件被谁改写 | `lsof /var/log/app.log` | `FD` 为 `1u`、`2w` |

**排查步骤：**

1. 先用 `ss` 或 `fuser` 拿到 PID，避免全量 `lsof` 扫描。
2. `ls -l /proc/PID/fd` 与 `lsof -p PID` 交叉验证，前者不受 `lsof` 版本与权限限制。
3. 已删除文件用 `lsof +L1` 确认，再用 `du -sh /proc/PID/fd` 估算占用（部分内核不支持）。
4. 处置前确认文件语义：日志可 `truncate`，数据文件必须让进程自行关闭或重启。

**易错点：** `lsof` 全量扫描在大机器上很慢，优先按端口或 PID 过滤；`fuser -k` 会直接杀进程，生产环境先 `-v` 看清楚再动手。

---

## 7. 日志排查：journalctl、dmesg

**现象：** 服务重启但不知道原因；`systemctl status` 只显示 `failed`；内核层问题（OOM、段错误、磁盘错误、驱动报错）在应用日志里看不到。

**排查命令：**

```bash
# 1. 某服务的全部日志，最近 200 行并持续跟踪
journalctl -u myapp.service -n 200 --no-pager
journalctl -u myapp.service -f

# 2. 按时间与级别过滤（级别：emerg/alert/crit/err/warning/notice/info/debug）
journalctl --since '2026-11-03 09:00:00' --until '2026-11-03 10:00:00' -p err

# 3. 上一次启动的日志（定位崩溃前后）
journalctl -u myapp.service -b -1

# 4. 内核日志：OOM、段错误、硬件错误（-T 转人类可读时间）
journalctl -k -T --since '-1h'
dmesg -T -l err,crit,alert,emerg

# 5. 磁盘与 journal 自身占用
journalctl --disk-usage
ls -lh /var/log/

# 6. 崩溃转储（需要 systemd-coredump 或 core_pattern 配置）
coredumpctl list
coredumpctl info 12345
```

**判读标准：**

- `journalctl -u` 输出里 `Main PID: 12345 (code=exited, status=1/FAILURE)` 与 `status=137`（128+9，被 SIGKILL，多半是 OOM）是关键线索，`status=143` 是 128+15。
- `dmesg -T` 出现 `Out of memory: Killed process`、`segfault at ... ip ... sp ... error 4`、`EXT4-fs error`、`blk_update_request: I/O error`，分别对应 OOM、空指针类崩溃、文件系统损坏、磁盘故障。
- `journalctl -b -1` 能拿到上次开机日志的前提是 journal 持久化（`/var/log/journal` 存在）；默认在 `/run/log/journal` 的内存环形缓冲里，重启即丢。
- `journalctl --disk-usage` 超过 `SystemMaxUse` 会触发自动清理，日志缺失时应先查这个配置。

**处置建议：**

- 持久化：`mkdir -p /var/log/journal`，在 `/etc/systemd/journald.conf` 设 `Storage=persistent`、`SystemMaxUse=2G`、`MaxRetentionSec=30day`。
- 应用日志：统一输出到 stdout 交由 journald 或容器日志驱动收集，避免双写文件导致轮转冲突。
- 崩溃分析：开启 `coredumpctl`，用 `gdb /usr/bin/app /var/lib/systemd/coredump/core.*` 看栈；容器内需 `--ulimit core` 与挂载目录。
- 轮转：`logrotate` 配 `daily`、`rotate 7`、`compress`、`copytruncate`（不重开文件句柄时用），并 `postrotate` 通知服务重开。

**常用过滤组合：**

```bash
# 只看失败重启与退出码
journalctl -u myapp.service | grep -E 'Failed|status=|Main PID'

# 定位某次崩溃前 200 行（配合 -b -1 看上一次启动）
journalctl -u myapp.service -b -1 -n 200 --no-pager

# 结合应用关键字过滤，忽略大小写
journalctl -u myapp.service --since '-30min' | grep -i -E 'panic|fatal|oom'

# 导出为文本交给他人分析（short-iso 带完整时间戳）
journalctl -u myapp.service --since '2026-11-03 09:00' -o short-iso > /tmp/myapp.log
```

**日志级别与排查含义：**

| 级别 | 数值 | 排查含义 |
| --- | --- | --- |
| `emerg` | 0 | 系统不可用，通常伴随内核 panic |
| `crit` | 2 | 关键硬件或文件系统故障 |
| `err` | 3 | 服务启动失败、依赖不可达 |
| `warning` | 4 | 资源接近阈值、重试、降级 |

**排查步骤：**

1. `systemctl status` 拿到退出码与 `Main PID`。
2. `journalctl -u <unit> -n 200` 看应用侧报错。
3. `journalctl -k -T` 看内核侧 OOM、段错误、磁盘错误。
4. `coredumpctl` 有记录时直接取栈，没有则补配 `core_pattern`。

**易错点：** `journalctl` 的时间过滤默认按服务端时区，跨时区排查要显式写 `UTC`；`dmesg` 的环形缓冲默认只有几百 KB，出问题要立刻导出，否则会被冲掉。

---

## 8. 常用文本处理命令（grep、awk、sed、sort、uniq）

**现象：** 需要在几十 GB 日志里统计 Top IP、接口耗时分布、错误码占比；手工翻日志效率极低，且容易漏。

**排查命令（组合拳，均可直接执行）：**

```bash
# 1. 统计访问量 Top 10 的 IP（awk 取列 → sort → uniq -c → 再排序）
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -n 10

# 2. 统计状态码分布
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn

# 3. 找出 5xx 且耗时超过 1 秒的请求（假设 $9 状态码、$NF 为 request_time）
awk '$9 >= 500 && $NF > 1 {print $7, $9, $NF}' /var/log/nginx/access.log | head -n 20

# 4. 按分钟统计 QPS
awk -F'[' '{print $2}' /var/log/nginx/access.log | cut -d: -f1-3 | uniq -c | tail -n 20

# 5. grep：递归、排除、计数、上下文
grep -rn --include='*.log' 'Exception' /var/log | head -n 20
grep -c 'ERROR' app.log
grep -B 3 -A 10 'OutOfMemory' app.log

# 6. sed：流式替换与按行号打印（-i 直接改文件，先备份）
sed -n '100,120p' app.log
sed -i.bak 's/10.0.0.5/10.0.0.6/g' config.ini

# 7. sort 多键与数值排序，uniq 只对相邻行去重
sort -t, -k2,2nr -k1,1 data.csv | head
sort -u ips.txt

# 8. 大文件截取与并行处理
tail -n 100000 app.log | grep 'ERROR' | wc -l
split -l 1000000 app.log part_ && ls part_* | xargs -P 4 -I{} grep -c ERROR {}
```

**判读标准：**

- `uniq -c` 必须紧跟在 `sort` 之后，否则只对相邻重复行生效，这是最常见的统计错误。
- `awk` 的 `$NF` 是最后一个字段，`$9`/`$7` 依赖日志格式，动手前先 `head -n 3` 确认列序。
- `grep -c` 统计的是**匹配行数**而非匹配次数，同一行多次出现只算一次。
- `sed -i` 无输出且立即生效，务必先 `sed -n '...p'` 预览；`-i.bak` 保留备份最稳。
- `sort -k2,2nr` 中 `n` 是数值排序、`r` 是倒序，不加 `n` 会按字典序把 `9` 排在 `100` 后面。

**处置建议：**

- 高频分析固化成脚本：`analyze.sh <logfile>`，内部用 `set -euo pipefail` 并输出到文件，避免每次手敲。
- 超大数据用 `awk` 一次遍历完成多指标统计，比多次 `grep` 快一个数量级。
- 时间窗口统计用 `awk` 做桶聚合，避免 `sort` 对全量数据的 O(n log n) 开销。
- 结果复核：随机抽 20 行 `grep` 比对总数，防止列偏移导致结论错误。

**结构化日志的统计（JSON 日志优先用 jq）：**

```bash
# 统计各接口的计数、平均耗时与最大耗时（每行是 JSON，含 path 与 cost_ms）
jq -r 'select(.cost_ms != null) | "\(.path) \(.cost_ms)"' app.json.log \
    | awk '{c[$1]++; s[$1]+=$2; if ($2>m[$1]) m[$1]=$2} END {for (k in c) printf "%s count=%d avg=%.1f max=%d\n", k, c[k], s[k]/c[k], m[k]}'

# 找出耗时超过 500ms 的请求及其 trace_id
jq -c 'select(.cost_ms > 500) | {ts, path, cost_ms, trace_id}' app.json.log | head -n 20
```

**多文件与压缩日志的处理：**

```bash
# zgrep 直接检索 .gz，无需先解压
zgrep -h 'ERROR' /var/log/app/app.log.*.gz | wc -l

# 按天归档的目录，用 find 限定时间范围再交给 grep
find /var/log/app -name '*.log' -newermt '2026-11-02' -print0 | xargs -0 grep -l 'OutOfMemory'
```

**排查步骤：**

1. `head -n 3` 确认字段位置与分隔符，再写 `awk`/`jq` 表达式。
2. 先在小样本（`head -n 1000`）上验证，确认口径正确后再跑全量。
3. 大文件按时间或大小切分，多进程并行统计。
4. 结论抽样复核，避免列错位导致统计结果失真。

**易错点：** 日志里有空格或引号时字段会错位，优先用 `-F` 指定分隔符或改用 JSON 解析（`jq`）；`grep` 默认按行缓冲，接管道做实时统计时要加 `--line-buffered`。

---

## 9. 权限与用户管理

**现象：** `Permission denied`；`sudo: command not allowed`；服务以非 root 启动后无法绑定 80 端口；SSH 登录报 `Authentication refused`；文件被写入后属主变化导致下次启动失败。

**排查命令：**

```bash
# 1. 当前身份与所属组（含附加组）
id
whoami; groups

# 2. 逐级检查路径上每一层的权限（哪一层缺 x 一眼看出）
namei -l /var/www/app/config.yml

# 3. 文件权限、属主、ACL、扩展属性
ls -l /var/www/app/config.yml
getfacl /var/www/app/config.yml
getfattr -d /var/www/app/config.yml 2>/dev/null

# 4. 进程实际以谁的身份运行
ps -o pid,user,group,cmd -p 12345
cat /proc/12345/status | grep -E 'Uid|Gid|Cap'

# 5. sudo 授权范围
sudo -l
sudo -u www-data -H ls -l /var/www

# 6. 安全模块是否拦截（SELinux / AppArmor）
getenforce; sestatus
ls -Z /var/www/app | head -n 5
ausearch -m AVC -ts recent | tail -n 20
aa-status 2>/dev/null | head -n 5

# 7. 端口绑定能力（1024 以下需要特权或 capability）
getcap /usr/bin/nginx
sysctl net.ipv4.ip_unprivileged_port_start
```

**判读标准：**

- 目录缺少 `x` 位时，即使文件是 `644` 也无法 `cd` 或访问，`namei -l` 会逐层标出。
- `ls -l` 的 `rwx` 三段依次是属主、属组、其他人；`s`/`S` 表示 setuid/setgid（`S` 表示对应执行位缺失，属于配置错误）。
- `getfacl` 出现 `user:www-data:r-x` 说明走的是 ACL 而非传统三位权限，`ls -l` 末尾的 `+` 是提示。
- `ls -Z` 的 `system_u:object_r:httpd_sys_content_t` 与进程域不匹配时，SELinux 会拒绝访问，`ausearch -m AVC` 能看到 `denied` 记录。
- `getcap` 显示 `cap_net_bind_service=ep` 表示非 root 也能绑 80 端口，这是容器化部署的常见做法。

**处置建议：**

- 最小权限：服务用专用用户（`www-data`/`app`）运行，只给必要目录 `rwx`，不要 `chmod 777` 掩盖问题。
- 属主修复：`chown -R app:app /var/www/app`，并在部署脚本中固定 `umask 022`，避免不同机器产物权限不一致。
- sudo 精细化：`visudo` 编辑，按命令白名单授权（`app ALL=(root) NOPASSWD: /usr/bin/systemctl restart myapp`），禁止 `ALL`。
- SELinux 排障：优先用 `semanage fcontext` + `restorecon` 修正上下文，而不是 `setenforce 0` 关闭。
- 端口：`setcap cap_net_bind_service=+ep` 或把 `ip_unprivileged_port_start` 调到 80，避免为了端口给 root。

**权限位与常见组合：**

| 八进制 | 符号 | 含义 | 典型用途 |
| --- | --- | --- | --- |
| `644` | `rw-r--r--` | 属主读写，其他人只读 | 普通配置文件 |
| `600` | `rw-------` | 仅属主读写 | 私钥、含密码的 env |
| `755` | `rwxr-xr-x` | 属主可执行，其他人可读可执行 | 目录、可执行脚本 |
| `750` | `rwxr-x---` | 同组可进入 | 多用户共享目录 |
| `1777` | `rwxrwxrwt` | 粘滞位，仅属主可删除 | `/tmp` |

**umask 与默认权限的计算：**

```bash
umask
# 0022 → 新建文件 666 & ~022 = 644，新建目录 777 & ~022 = 755
umask 0027
touch /tmp/a.txt && ls -l /tmp/a.txt
```

**排查步骤：**

1. `id` 确认身份与附加组，很多 `Permission denied` 是组不匹配。
2. `namei -l` 逐层看路径权限，定位到底卡在哪一级。
3. `getfacl` 与 `ls -Z` 排除 ACL 与 SELinux 上下文。
4. `ausearch -m AVC` 确认是否被安全模块拒绝，再决定改策略还是改标签。

**易错点：** `chmod 777` 会让任何用户可写，是安全审计的头号问题；`chown -R` 作用于软链接目标时容易误改，加 `-h` 只改链接本身。

---

## 10. 定时任务与 systemd

**现象：** crontab 里的脚本手工执行正常，定时不执行；执行了但报 `command not found`；服务开机不自启；`systemctl restart` 后立刻退出。

**排查命令：**

```bash
# 1. 查看当前用户的定时任务与系统级任务
crontab -l
ls -l /etc/cron.d /etc/cron.daily /etc/cron.hourly
cat /etc/crontab

# 2. cron 服务是否在跑，日志里是否有执行记录
systemctl status cron 2>/dev/null || systemctl status crond
journalctl -u cron --since '-1h'
grep CRON /var/log/syslog | tail -n 20

# 3. 复刻 cron 的最小环境验证 PATH 问题
env -i /bin/bash -c '/usr/local/bin/backup.sh'

# 4. systemd 单元状态与失败原因
systemctl status myapp.service
systemctl cat myapp.service
journalctl -u myapp.service -n 100 --no-pager

# 5. 启动耗时与依赖顺序
systemd-analyze blame | head -n 10
systemd-analyze critical-chain myapp.service

# 6. 定时器（systemd 替代 cron 的推荐方式）
systemctl list-timers --all
systemctl status backup.timer
```

**判读标准：**

- cron 的环境只有 `HOME`、`LOGNAME`、`PATH=/usr/bin:/bin` 等少数变量，脚本里依赖的 `PATH`、虚拟环境、`JAVA_HOME` 都不会继承，是「手工能跑、定时不跑」的首要原因。
- crontab 中的 `%` 有特殊含义（换行），日期格式化里的 `%` 必须转义为 `\%`。
- `systemctl status` 的 `Active: failed (Result: exit-code)` 配合 `status=203/EXEC` 表示可执行文件路径或权限错误，`status=1` 是程序自身返回失败。
- `systemd-analyze critical-chain` 输出中的 `+` 前是自身耗时，若某服务在 `network-online.target` 之前启动，网络依赖必然失败。
- `list-timers` 的 `NEXT` 与 `LAST` 列能直接看出定时器是否被触发，`PASSED` 表示已错过。

**处置建议：**

- cron 脚本内使用绝对路径，并在头部显式 `export PATH=/usr/local/bin:/usr/bin:/bin`、`source /etc/profile`（或直接写全路径）。
- 全部输出重定向到日志：`*/5 * * * * /opt/app/backup.sh >> /var/log/backup.log 2>&1`，否则失败无声。
- 迁移到 systemd timer：`OnCalendar=*-*-* 02:00:00` + `Persistent=true`（停机补偿）+ `RandomizedDelaySec`（避免整点雪崩），可拿到 journald 日志与失败重试。
- 服务单元补全：`Restart=on-failure`、`RestartSec=5`、`LimitNOFILE=65535`、`WorkingDirectory`、`EnvironmentFile`，避免「手工能起、systemd 起不来」。
- 长任务用 `Type=notify` 或 `Type=simple` 并自行 daemon 化，不要用 `Type=forking` 却不适配 `PIDFile`。

**cron 表达式速查：**

| 表达式 | 含义 |
| --- | --- |
| `*/5 * * * *` | 每 5 分钟 |
| `0 2 * * *` | 每天 02:00 |
| `30 9 * * 1-5` | 工作日 09:30 |
| `0 0 1 * *` | 每月 1 日 00:00 |
| `@reboot` | 开机执行一次 |

字段顺序为「分 时 日 月 周」，取值范围 `0-59`、`0-23`、`1-31`、`1-12`、`0-7`（0 与 7 都表示周日）。

**systemd 服务单元模板：**

```ini
[Unit]
Description=My App
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=app
WorkingDirectory=/opt/app
EnvironmentFile=/etc/myapp/env
ExecStart=/opt/app/bin/myapp
Restart=on-failure
RestartSec=5
LimitNOFILE=65535
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**排查步骤：**

1. `crontab -l` 与 `/etc/cron.d` 确认任务真的被加载。
2. `journalctl -u cron` 看是否有执行记录，无记录说明语法或服务问题。
3. 有执行记录但对端失败，用 `env -i` 复刻最小环境重现。
4. `systemctl status` 配合 `journalctl -u` 拿到退出码，对照错误码说明定位。

**易错点：** 修改 unit 文件后必须 `systemctl daemon-reload`；`systemctl enable` 只是建软链，不会立即启动，需要 `enable --now`。

---

## 11. Shell 脚本与管道组合

**现象：** 脚本中途失败但退出码是 0，CI 显示成功而产物缺失；管道中前面的命令失败被忽略；文件名带空格导致批量操作误删；变量未定义导致 `rm -rf /` 类事故。

**排查命令与代码：**

```bash
# 1. 严格模式：任一命令失败、未定义变量、管道任一环节失败都退出
set -euo pipefail

# 2. 打印执行轨迹（调试用，生产记得关）
set -x

# 3. 退出时清理临时文件
tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

# 4. 正确传递参数：必须用 "$@"，不要用 $*
for arg in "$@"; do
    echo "arg: $arg"
done

# 5. 读文件用 while read -r，保留反斜杠与首尾空白
while IFS= read -r line; do
    echo "$line"
done < hosts.txt

# 6. 处理含空格/换行的文件名：-0 与 -print0 配对
find . -name '*.log' -mtime +7 -print0 | xargs -0 rm -f

# 7. 判断命令是否成功，而不是判断输出是否为空
if ! grep -q 'ready' health.txt; then
    echo "not ready" >&2
    exit 1
fi

# 8. 管道中保留中间结果，便于排查
tar -czf - ./data | tee /tmp/backup.tar.gz | sha256sum
```

**判读标准：**

- 无 `pipefail` 时 `false | true` 的退出码是 0，只有加上它才会反映第一个失败环节。
- `$*` 会把参数按 `IFS` 拼成一个字符串，参数含空格时被拆散；`"$@"` 逐个保留。
- `while read` 不加 `-r` 会吞掉反斜杠；不设 `IFS=` 会去掉行首尾空白，处理配置时出错。
- `set -e` 在 `if`、`&&`、`||` 的上下文里不生效，属于预期行为，不要因此以为严格模式失效。
- `xargs` 不带 `-0` 时按空白切分，文件名有空格就会被拆成多个参数，最坏情况误删。

**处置建议：**

- 所有脚本统一模板：`#!/usr/bin/env bash`、`set -euo pipefail`、`trap` 清理、日志函数带时间戳。
- 用 `shellcheck script.sh` 做静态检查，重点看 SC2086（未加引号）、SC2181（用 `$?` 判断）、SC2046。
- 危险操作加确认：删除或覆盖前打印目标清单，生产脚本禁止裸 `rm -rf $VAR`，改用 `${VAR:?}` 强制非空。
- 幂等设计：脚本可重复执行，创建目录用 `mkdir -p`，配置写入用临时文件 + `mv` 原子替换。
- 退出码规范：0 成功、1 通用失败、2 用法错误，便于上层编排判断。

**常用片段：**

```bash
# 参数校验：缺失即退出，并提示用法
usage() {
    echo "usage: $0 <env> <version>" >&2
    exit 2
}
[ $# -eq 2 ] || usage

# 临时文件 + 原子替换，避免半成品配置被读取
cp /etc/app/config.yml /etc/app/config.yml.bak
sed 's/^timeout:.*/timeout: 30/' /etc/app/config.yml.bak > /tmp/config.yml
mv /tmp/config.yml /etc/app/config.yml

# 带重试的调用，指数退避
for i in 1 2 3; do
    curl -fsS http://127.0.0.1:8080/health && break
    sleep $((i * 2))
done

# 并发控制：xargs 限制 4 个并行
printf '%s\n' hosts/* | xargs -P 4 -I{} sh -c 'echo "{}: $(wc -l < "{}")"'
```

**排查步骤：**

1. `bash -n script.sh` 做语法检查，`shellcheck script.sh` 做静态分析。
2. `bash -x script.sh` 或临时 `set -x` 定位失败的具体命令行。
3. 用 `set -euo pipefail` 重跑，确认是哪个环节返回非 0。
4. 在干净环境（`env -i`）复跑，排除本地变量与别名干扰。

**易错点：** `export VAR=value` 与 `VAR=value` 的差别在于是否传给子进程；在管道里 `cd` 不会影响父 shell，因为每段管道都在独立子进程中。

---

## 12. 容器内的排查差异

**现象：** 容器里 `top` 只看到一两个进程，看不到宿主机的繁忙进程；`free` 显示宿主机几十 G 内存，但容器被 OOMKilled；容器里没有 `ps`、`ss`、`netstat`、`jstack`；`df` 显示的磁盘与容器配额不符。

**排查命令：**

```bash
# 1. 容器视角的资源用量（CPU/内存/网络/块 IO）
docker stats --no-stream
crictl stats

# 2. cgroup v2：容器的真实限额与当前用量（路径随容器 ID）
cat /sys/fs/cgroup/memory.max
cat /sys/fs/cgroup/memory.current
cat /sys/fs/cgroup/memory.events
cat /sys/fs/cgroup/cpu.max
cat /sys/fs/cgroup/cpu.stat

# 3. cgroup v1 的对应文件
cat /sys/fs/cgroup/memory/memory.limit_in_bytes
cat /sys/fs/cgroup/memory/memory.usage_in_bytes

# 4. 确认自己是否在容器里、以及容器 ID
cat /proc/1/cgroup
ls /.dockerenv 2>/dev/null

# 5. 进入宿主机命名空间排查（PID 为目标容器的 init 进程）
nsenter -t 12345 -m -u -i -n -p -- ps aux
nsenter -t 12345 -n -- ss -lntp

# 6. Kubernetes：事件与上次退出原因
kubectl describe pod myapp-xxx
kubectl logs myapp-xxx --previous
kubectl top pod myapp-xxx

# 7. 用带工具的临时容器排查（不污染业务镜像）
kubectl debug -it myapp-xxx --image=nicolaka/netshoot --target=myapp
```

**判读标准：**

- `memory.events` 中 `oom_kill 1` 或 `oom 1` 增长，说明容器内发生过 OOM；`kubectl describe` 的 `Last State: Terminated, Reason: OOMKilled, Exit Code: 137` 是同一结论。
- `cpu.stat` 的 `nr_throttled` 与 `throttled_usec` 持续增长，说明 CPU 被 cgroup 限流，表现为「CPU 没用满但接口变慢」，属于配额问题而非代码问题。
- `/proc/1/cgroup` 里出现 `/docker/<id>`、`/kubepods/...` 或 `0::/`（cgroup v2）即可判定在容器内。
- 容器内 `free`、`nproc`、`uptime` 反映的是宿主机数据（未挂载 lxcfs 时），只有 cgroup 文件才是容器真实配额。
- `nsenter` 后 `ps` 看到的进程数远多于容器内，说明排查必须站在目标命名空间，否则会漏掉 sidecar 与宿主机干扰。

**处置建议：**

- 精简镜像不要装排查工具，用 `kubectl debug` 注入临时容器，或 `docker run --pid=container:xxx --net=container:xxx` 共享命名空间。
- 内存限额：Java 用 `-XX:MaxRAMPercentage=75` 并显式 `-Xmx`，Go 注意 `GOMEMLIMIT`；给页缓存与堆外留余量，避免 RSS 触顶被杀。
- CPU 限额：`requests` 决定调度、`limits` 决定上限，`limits` 过小会导致频繁 throttling，用 `cpu.stat` 验证后再调。
- 日志：容器只写 stdout/stderr，交给日志驱动；容器内文件在重启后丢失，排障证据要及时 `docker cp` 出来。
- 时区与 DNS：容器默认 UTC 且 DNS 走宿主配置，跨时区排查与解析问题先确认这两项。

**cgroup v1 与 v2 对照：**

| 指标 | cgroup v1 | cgroup v2 |
| --- | --- | --- |
| 内存上限 | `memory/memory.limit_in_bytes` | `memory.max` |
| 内存当前值 | `memory/memory.usage_in_bytes` | `memory.current` |
| CPU 配额 | `cpu/cpu.cfs_quota_us` 与 `cpu.cfs_period_us` | `cpu.max`（如 `200000 100000`） |
| 限流统计 | `cpu.stat` 的 `nr_throttled` | `cpu.stat` 的 `nr_throttled` 与 `throttled_usec` |
| OOM 计数 | `memory.oom_control` | `memory.events` |

**容器退出码速查：**

| 退出码 | 含义 |
| --- | --- |
| `137` | 128 + 9，被 SIGKILL，多数为 OOMKilled |
| `139` | 128 + 11，段错误（SIGSEGV） |
| `143` | 128 + 15，收到 SIGTERM，正常优雅退出 |
| `126` | 命令存在但不可执行（权限问题） |
| `127` | 命令不存在 |

**排查步骤：**

1. `kubectl describe pod` 看 `Last State` 与 `Events`，先确认退出原因。
2. `docker stats` 或 `crictl stats` 对照 `limits`，确认是配额问题还是真实泄漏。
3. 需要进程视角时用 `nsenter` 进入目标命名空间，而不是在容器里盲查。
4. 需要工具时用 `kubectl debug` 注入临时容器，避免为排查污染生产镜像。

**易错点：** 在容器里 `kill -9 1` 会直接终止容器（PID 1 有特殊语义，且不响应默认信号处理）；容器内的 `df` 统计的是 overlay 层，与镜像层大小无直接关系。

---

[← 返回总览](README.md)
