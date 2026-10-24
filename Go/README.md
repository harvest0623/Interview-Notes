# Go 常见面试题

> 本目录收录 Go 相关的高频面试题及参考答案。因内容较多，按主题拆分为若干分册。默认以 **Go 1.21+** 为背景，涉及历史版本差异（如 Go 1.22 的循环变量语义、Go 1.20 的 PGO、Go 1.18 的泛型）时会单独标注。

---

## 目录

| 分册 | 内容 | 题量 |
| --- | --- | --- |
| [01 - 语言基础篇](01-语言基础篇.md) | Go 语言特点、变量与 iota、值类型与引用类型、数组与切片、切片扩容、map 底层、map 并发安全、字符串不可变、结构体嵌入、方法接收者、接口与空接口、类型断言、defer、panic 与 recover、函数与闭包 | 15 |
| [02 - 并发编程篇](02-并发编程篇.md) | goroutine 与线程、GMP 调度模型、调度时机与抢占、channel 底层、缓冲与非缓冲 channel、select、Mutex 与 RWMutex、WaitGroup、Once 与 Pool、context、atomic、并发模式、数据竞争、死锁与 goroutine 泄漏 | 14 |
| [03 - 进阶原理篇](03-进阶原理篇.md) | 内存分配与逃逸分析、垃圾回收、三色标记与写屏障、GC 调优、interface 底层、反射、unsafe.Pointer、编译与链接、程序启动流程、栈与栈扩容、内存对齐、零值与可比较性、深拷贝与浅拷贝、值传递与引用传递 | 14 |
| [04 - 工程实践与标准库篇](04-工程实践与标准库篇.md) | 错误处理、errors 包装、泛型、表驱动测试、基准测试、pprof、Go Modules、JSON 序列化、HTTP 服务、database/sql 与连接池、日志、配置管理、Cobra、代码规范与静态检查 | 14 |
| [05 - 实战与生态篇](05-实战与生态篇.md) | Web 框架对比、Gin 中间件、gRPC 与 Protobuf、微服务实践、限流与熔断、优雅关闭、缓存与 Redis、消息队列、分布式锁、定时任务、容器化部署、常见陷阱、内存泄漏排查、项目结构 | 14 |

---

## 学习路径建议

```
语言基础篇（语法与内置类型，面试必答）
   ↓
并发编程篇（goroutine / channel / GMP，Go 岗分水岭）
   ↓
进阶原理篇（内存、GC、interface 与反射，区分「会用」与「懂原理」）
   ↓
工程实践与标准库篇（错误处理、测试、性能分析——团队协作能力）
   ↓
实战与生态篇（Web、gRPC、微服务与线上问题排查，体现项目经验）
```

> 面试策略：**切片、map、defer、接口是必问四件套**，**GMP 与 channel 是分水岭**，**GC 与逃逸分析体现深度**，**并发陷阱与线上排查体现工程能力**。

---

## 高频必背 TOP 10

| 序号 | 题目 | 所在分册 |
| --- | --- | --- |
| 1 | 数组与切片的区别？ | [01 - 语言基础篇](01-语言基础篇.md#4-数组与切片的区别) |
| 2 | 切片的扩容机制？ | [01 - 语言基础篇](01-语言基础篇.md#5-切片的扩容机制) |
| 3 | map 的底层实现？ | [01 - 语言基础篇](01-语言基础篇.md#6-map-的底层实现) |
| 4 | defer 的执行顺序与原理？ | [01 - 语言基础篇](01-语言基础篇.md#13-defer-的执行顺序与原理) |
| 5 | goroutine 与线程的区别？ | [02 - 并发编程篇](02-并发编程篇.md#1-goroutine-与线程的区别) |
| 6 | GMP 调度模型？ | [02 - 并发编程篇](02-并发编程篇.md#2-gmp-调度模型) |
| 7 | channel 的底层原理？ | [02 - 并发编程篇](02-并发编程篇.md#4-channel-的底层原理) |
| 8 | context 的作用与用法？ | [02 - 并发编程篇](02-并发编程篇.md#10-context-的作用与用法) |
| 9 | 什么是逃逸分析？ | [03 - 进阶原理篇](03-进阶原理篇.md#1-内存分配与逃逸分析) |
| 10 | Go 的垃圾回收机制？ | [03 - 进阶原理篇](03-进阶原理篇.md#2-go-的垃圾回收机制) |

---

## 核心速查表

**内置类型与零值**

```
bool            false
整型             0
浮点型           0
string          ""（空串，非 nil）
数组            元素全部为各自零值
struct          各字段为各自零值
slice/map/chan   nil（可读、不可写；nil map 写入 panic）
pointer/interface/function  nil
```

**切片三要素**

```
array 指针 + len + cap
s := arr[1:3]    → 与 arr 共享底层数组，修改会互相影响
append 超出 cap   → 分配新数组并拷贝，此后与原数组脱钩
copy 是深拷贝元素值，s2 := s1 只是复制 slice header
```

**并发原语选型**

```
只传信号、不需数据        → channel（无缓冲）
带缓冲的生产消费          → channel（有缓冲）
保护共享状态              → sync.Mutex / RWMutex
只执行一次初始化          → sync.Once
复用临时对象降 GC 压力    → sync.Pool
等待一组任务完成          → sync.WaitGroup
超时、取消、跨调用传值    → context.Context
简单计数                  → sync/atomic
```

**常用工程工具链**

```
依赖管理：go mod / go work（多模块）
测试　　：go test、table-driven、go test -bench、go test -fuzz
覆盖率　：go test -cover / -coverprofile
竞态检测：go test -race、go run -race
性能剖析：go tool pprof（cpu / heap / goroutine / block / mutex）
静态检查：go vet、staticcheck、golangci-lint、gofmt / goimports
构建发布：go build -trimpath -ldflags "-s -w"、多阶段 Docker
```

**易错点清单**

```
1. range 取地址：Go 1.22 前循环变量是复用的，&v 全都指向同一个变量
2. nil slice 可 append，nil map 直接赋值会 panic
3. 接口判 nil 要看动态类型，(*T)(nil) 装进接口后接口本身不为 nil
4. defer 参数在注册时就求值，不是执行时
5. 值接收者方法无法修改原对象，大结构体应使用指针接收者
6. 无缓冲 channel 读写都会阻塞，忘记关闭会导致 goroutine 泄漏
7. context 只用于传递取消与元数据，不要塞业务参数
8. 循环里启动 goroutine 捕获循环变量要显式传参（Go 1.22 前）
```
