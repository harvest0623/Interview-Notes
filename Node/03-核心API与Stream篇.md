# Node.js 面试题 · 03 核心API与Stream篇

[← 返回总览](README.md)

> 内容：fs 模块与 Promise API、四种流、pipe 与背压、pipeline、大文件流式处理、http 最小服务器、请求与响应处理、静态资源与 MIME、multipart 文件上传、TCP/UDP、crypto 与 JWT、zlib 压缩、进程间通信（共 12 题）。

---

## 目录

1. [fs 模块的文件读写与 Promise API](#1-fs-模块的文件读写与-promise-api)
2. [四种流：可读流、可写流、双工流、转换流](#2-四种流可读流可写流双工流转换流)
3. [Stream 的 pipe、背压与 pipeline](#3-stream-的-pipe背压与-pipeline)
4. [用流处理大文件（逐行读取、边读边写）](#4-用流处理大文件逐行读取边读边写)
5. [http 模块与一个最小 HTTP 服务器](#5-http-模块与一个最小-http-服务器)
6. [HTTP 请求与响应处理（请求头、状态码、Cookie）](#6-http-请求与响应处理请求头状态码cookie)
7. [手写静态资源服务与 MIME 处理](#7-手写静态资源服务与-mime-处理)
8. [文件上传处理（multipart 解析与流式落盘）](#8-文件上传处理multipart-解析与流式落盘)
9. [net 与 dgram：TCP/UDP 网络编程](#9-net-与-dgramtcpudp-网络编程)
10. [crypto 模块与哈希、HMAC、JWT 签名](#10-crypto-模块与哈希hmacjwt-签名)
11. [zlib 压缩与 gzip 响应](#11-zlib-压缩与-gzip-响应)
12. [进程间通信与 IPC](#12-进程间通信与-ipc)

---

## 1. fs 模块的文件读写与 Promise API

**结论：** Node 的 `fs` 同时提供三种调用风格——回调、同步、Promise。业务代码应优先使用 `node:fs/promises`；只有进程启动前读取配置、CLI 脚本这类「一次性、无并发」场景才考虑同步 API。大文件一律不要用 `readFile`。

**三套 API 的定位：**

| 风格 | 入口 | 特点 | 适用场景 |
| --- | --- | --- | --- |
| 回调 | `require('node:fs')` | 历史最久，`(err, data)` 风格，易回调地狱 | 维护老代码 |
| 同步 | `fs.readFileSync` 等 | 阻塞事件循环，简单直接 | 启动阶段、CLI、测试 |
| Promise | `require('node:fs/promises')` | 可 `await`，配合 `try/catch` | 绝大多数异步业务 |

**关键行为：**

1. 不传 `encoding` 时 `readFile` 返回 `Buffer`；传 `'utf8'` 才返回字符串。读二进制（图片、压缩包）必须保留 Buffer。
2. 读取失败抛出的错误带 `code` 字段，常见 `ENOENT`（不存在）、`EACCES`（无权限）、`EISDIR`（目标是目录）、`EMFILE`（打开文件数超限）。按 `err.code` 分支处理，比匹配错误消息可靠。
3. `writeFile` 默认 `flag: 'w'`，会**截断**原文件；追加要用 `appendFile` 或 `flag: 'a'`。
4. `mkdir(dir, { recursive: true })` 在目录已存在时不报错；`rm(dir, { recursive: true, force: true })` 才等价于 `rm -rf`。
5. `rename` 在同一文件系统内是**原子**的，因此「写临时文件 + rename」是生成配置文件、上传落盘的常用原子写方案。
6. `stat` 会跟随符号链接，`lstat` 不会；要防符号链接逃逸时用 `realpath` 或 `lstat`。
7. `fs.access` 做「先检查再操作」存在 TOCTOU 竞态，正确做法是直接操作并处理错误。

```js
// Node 18+，CommonJS 写法
const fsp = require('node:fs/promises');
const path = require('node:path');

// 1) 读配置：区分「文件不存在」与「真正的错误」
async function loadConfig(file) {
  try {
    const text = await fsp.readFile(file, 'utf8'); // 指定编码，得到字符串
    return JSON.parse(text);
  } catch (err) {
    if (err.code === 'ENOENT') return {};          // 首次启动没有配置文件是正常情况
    throw err;                                     // 其它错误继续向上抛
  }
}

// 2) 原子写：先写同目录临时文件，再 rename 覆盖
async function saveConfig(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fsp.rename(tmp, file);                     // 同分区 rename 原子生效
}

// 3) 目录遍历：withFileTypes 避免每个文件再 stat 一次
async function listDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  return entries.map((e) => ({
    name: e.name,
    isDir: e.isDirectory(),                        // Dirent 自带类型判断
    size: null,
  }));
}

// 4) FileHandle：同一文件多次读写时复用句柄，减少 open/close 开销
async function appendLine(file, line) {
  const fh = await fsp.open(file, 'a');            // 'a' = 追加，文件不存在则创建
  try {
    await fh.appendFile(`${line}\n`);
  } finally {
    await fh.close();                              // 必须关闭，否则泄漏 fd
  }
}

// 5) 复制与删除（Node 16.7+ 提供 fs.cp）
async function backup(src, dest) {
  await fsp.cp(src, dest, { recursive: true, force: true });
}
```

**大文件为什么不能用 `readFile`：** `readFile` 会把整个文件读进内存并一次性分配 Buffer。一个 2 GB 的日志文件会直接把进程推到堆外内存上限，且期间无法处理其它请求。正确方式是 `createReadStream` 分块读取（见第 4 题）。

**面试怎么答：** 先讲三套 API 与选型，再讲 `Buffer/string` 的编码差异、错误码分支、原子写、目录递归创建，最后补一句「大文件走流，不要 `readFile`」。

**易错点：**

- 忘记传 `encoding`，对 Buffer 直接 `JSON.parse` 会得到 `Unexpected token` 之类错误。
- `writeFile` 不是原子操作，进程在写入中途崩溃会留下半截文件。
- 同步 API 在请求处理函数里调用会阻塞整个事件循环，QPS 会断崖下跌。
- `readdir` 返回的是文件名数组，不是完整路径；拼路径要用 `path.join`。

---

## 2. 四种流：可读流、可写流、双工流、转换流

**结论：** Node 的流本质是「带内部缓冲、可施加背压的异步数据通道」。四种类型按数据方向与是否转换划分，所有流都继承自 `EventEmitter`，核心是 `Readable`、`Writable`、`Duplex`、`Transform` 四个基类。

**四种类型对照：**

| 类型 | 方向 | 内部方法 | 常见实例 | 典型用途 |
| --- | --- | --- | --- | --- |
| `Readable` | 只读（source） | `_read()`、`push()` | `fs.createReadStream`、`process.stdin`、`http.IncomingMessage` | 读文件、读请求体 |
| `Writable` | 只写（sink） | `_write()`、`_final()` | `fs.createWriteStream`、`http.ServerResponse`、`process.stdout` | 写文件、写响应 |
| `Duplex` | 双向，读写通道独立 | `_read()` + `_write()` | `net.Socket`、`tls.TLSSocket` | TCP 连接、WebSocket 底层 |
| `Transform` | 双向，写入经转换后读出 | `_transform()`、`_flush()` | `zlib.createGzip`、`crypto.createCipheriv` | 压缩、加密、编解码 |

> 记忆点：`Duplex` 的读和写**互不依赖**（像一条双向马路）；`Transform` 的读**由写驱动**（像一台加工机，进去什么才能出来什么）。`Transform` 本身是 `Duplex` 的子类。

**可读流的三种状态（高频追问）：**

| `readableFlowing` | 含义 | 触发方式 |
| --- | --- | --- |
| `null` | 初始态，没有消费者 | 刚创建 |
| `false` | 暂停态，数据积压在内部缓冲 | `pause()`、`readable` 事件消费 |
| `true` | 流动态，数据持续推给消费者 | `on('data')`、`pipe()`、`resume()` |

**核心事件：**

| 事件 | 属于 | 含义 |
| --- | --- | --- |
| `data` | Readable | 有数据可读，进入流动模式 |
| `end` | Readable | 数据读完（`null` 被 push） |
| `finish` | Writable | `end()` 后所有数据已交给底层 |
| `close` | 两者 | 资源关闭（不一定代表成功） |
| `error` | 两者 | 出错，未监听会导致进程崩溃 |

**不要在 `data` 事件里做重 CPU 计算**：它同步执行，会阻塞事件循环；也不要混用 `data` 与 `read()`，两种消费方式会互相抢数据。

```js
const { Readable, Writable, Duplex, Transform, pipeline } = require('node:stream');

// 1) 可读流：用 async generator 构造，最简洁（Node 12.2+）
const source = Readable.from((async function* () {
  for (let i = 1; i <= 3; i++) yield `第 ${i} 行\n`;
})());

// 2) 转换流：继承 Transform，实现 _transform
class UpperCase extends Transform {
  _transform(chunk, encoding, callback) {
    callback(null, chunk.toString().toUpperCase()); // 第二个参数是输出数据
  }
  _flush(callback) {                                // 流结束时补一段尾部数据
    callback(null, '=== END ===\n');
  }
}

// 3) 双工流：读写各自独立，这里做一个回显通道
class EchoDuplex extends Duplex {
  _read() {}                                        // 数据由 push 主动送入
  _write(chunk, encoding, callback) {
    this.push(chunk);                               // 写入的数据原样进入读缓冲
    callback();
  }
}

// 4) 可写流：必须实现 _write，处理完调用 callback
class Counter extends Writable {
  constructor() {
    super();
    this.bytes = 0;
    this.lines = 0;
  }
  _write(chunk, encoding, callback) {
    this.bytes += chunk.length;
    this.lines += chunk.toString().split('\n').length - 1;
    callback();                                     // 不调用会永远卡住
  }
  _final(callback) {
    console.log({ bytes: this.bytes, lines: this.lines });
    callback();
  }
}

pipeline(source, new UpperCase(), new Counter(), (err) => {
  if (err) console.error('管道失败：', err);
});
```

**`objectMode`：** 普通流只接受 `Buffer`/`string`/`Uint8Array`；设置 `objectMode: true` 后可传任意 JS 对象，但 `highWaterMark` 的单位会从字节变成「对象个数」（默认 16）。数据库游标、日志解析常用对象流。

**面试怎么答：** 先按「方向 × 是否转换」画出四象限，各举一个内置实例，再补可读流三态与 `objectMode`，就能体现你真正用过流而不是背概念。

**易错点：**

- 自定义 `Writable` 忘记调用 `callback`，流会永久挂起，`finish` 永不触发。
- `close` 不等于成功，判断成功要看 `finish`（写）或 `end`（读）。
- `Readable.from` 传普通数组会同步快速推送，仍建议配合 `pipeline` 控制下游。
- 在 `_transform` 里抛同步异常不会自动销毁流，应 `callback(err)`。

---

## 3. Stream 的 pipe、背压与 pipeline

**结论：** `pipe` 只负责「把数据搬过去」，不处理错误传播与资源清理；`pipeline` 在此之上补齐了**错误传播、失败时销毁所有流、Promise 化**，生产代码应优先 `pipeline`。背压是流的核心价值：下游处理不过来时，必须让上游暂停，而不是把数据堆进内存。

**背压是怎么工作的：**

1. 每个 `Writable` 有内部缓冲，容量阈值是 `highWaterMark`（普通流默认 16 KiB，`fs.createReadStream` 默认 64 KiB）。
2. `writable.write(chunk)` 在缓冲未满时返回 `true`；超过阈值返回 `false`，但**数据仍会被接收并缓冲**，只是发出「请暂停」的信号。
3. 缓冲区排空到阈值以下时触发 `drain` 事件，上游收到后恢复写入。
4. `pipe` 内部正是这套逻辑：`write` 返回 `false` 就 `src.pause()`，监听 `drain` 再 `src.resume()`；源 `end` 时调用 `dest.end()`。

| 对比项 | `pipe` | `pipeline` |
| --- | --- | --- |
| 错误传播 | 不自动传递，源和中间流可能泄漏 | 任一环节出错，销毁全部流并回调错误 |
| 资源清理 | 需手动 `destroy` | 自动清理 |
| 返回值 | 目标流，可继续 `.pipe()` | Promise 版本返回 Promise |
| 中途取消 | 手动处理 | 支持 `AbortSignal` |
| 适用 | 简单脚本、快速原型 | 生产代码 |

```js
const { createReadStream, createWriteStream } = require('node:fs');
const { pipeline } = require('node:stream/promises');
const { createGzip } = require('node:zlib');
const { once } = require('node:events');

// 1) 推荐：Promise 版 pipeline，自动清理 + 可超时取消
async function gzipFile(src, dest) {
  await pipeline(
    createReadStream(src),
    createGzip({ level: 6 }),
    createWriteStream(dest),
    { signal: AbortSignal.timeout(30_000) }        // Node 18 支持 options.signal
  );
}

// 2) 手动写数据时必须自己处理背压
async function writeAll(stream, chunks) {
  for (const chunk of chunks) {
    if (!stream.write(chunk)) {                     // false：内部缓冲已满
      await once(stream, 'drain');                  // 等排空，避免内存膨胀
    }
  }
  stream.end();
  await once(stream, 'finish');                     // 确认全部落盘
}

// 3) 错误处理：pipe 不会把源的错误带给目标
const src = createReadStream('missing.txt');
const dest = createWriteStream('out.txt');
src.on('error', (err) => {
  console.error('读取失败', err.code);
  dest.destroy(err);                                // 手动清理下游
});
src.pipe(dest);
```

**为什么背压重要：** 假设数据库导出 10 GB 数据，下游网络每秒只能发 50 MB。没有背压时，读端会以磁盘速度把数据全部读进内存，几分钟内 RSS 冲到数 GB 然后 OOM。有背压时，读端被暂停，内存稳定在 `highWaterMark` 量级。

**`highWaterMark` 怎么调：** 太小会导致系统调用/事件回调过多，吞吐下降；太大会增加内存与延迟。经验值：文件流 64 KB 到 1 MB，网络流按带宽时延积估算，对象流按「一批处理条数」设置。

**面试怎么答：** 先解释「write 返回 false + drain」的机制，再对比 `pipe` 与 `pipeline` 的错误处理差异，最后举一个 OOM 的反例说明背压的实际价值。

**易错点：**

- 以为 `write` 返回 `false` 就不能再写——其实可以写，只是要尽快停止并等待 `drain`。
- 用 `pipe` 串联后不监听 `error`，源文件不存在时目标流不会关闭，fd 泄漏。
- `pipeline` 回调里既能拿到 err 又继续使用流对象，此时流已被销毁。
- 压缩/加密后 `Content-Length` 不再等于原文件大小，HTTP 响应必须改用 chunked。

---

## 4. 用流处理大文件（逐行读取、边读边写）

**结论：** 大文件处理的固定套路是「`createReadStream` 分块读 → 逐行/逐块转换 → `createWriteStream` 写」，全程只在内存中保留一个块或一行。按行处理优先用 `readline`，它会在消费者变慢时自动暂停输入流；需要精确控制字节边界时，用 `StringDecoder` 处理跨块的多字节字符。

**三种方案对比：**

| 方案 | 内存占用 | 适用 | 注意 |
| --- | --- | --- | --- |
| `readFile` + `split('\n')` | 整个文件 + 行数组 | 小于几十 MB 的配置/日志 | 大文件必 OOM |
| `readline.createInterface` | 一行 + 读缓冲 | 按行统计、过滤、导入 | 逐行 `await` 时自动背压 |
| 自定义 `Transform` 分块 | 一个 chunk | 需要按字节/分隔符精确控制 | 必须处理跨块残留 |

**为什么按行读取不能直接 `chunk.toString().split('\n')`：** 一个 UTF-8 汉字占 3 字节，chunk 边界可能恰好切在字符中间，`toString()` 会产生乱码；一行也可能被切在两个 chunk 里。`readline` 内部用 `StringDecoder` 与残留缓冲解决了这两个问题。

```js
const { createReadStream, createWriteStream } = require('node:fs');
const { once } = require('node:events');
const readline = require('node:readline');

// 1) 统计行数：内存恒定，适合 GB 级日志
async function countLines(file) {
  let count = 0;
  const rl = readline.createInterface({
    input: createReadStream(file, { highWaterMark: 64 * 1024 }),
    crlfDelay: Infinity,                 // 把 \r\n 也识别为一个换行
  });
  for await (const line of rl) {
    count++;
  }
  return count;
}

// 2) 边读边写：过滤 ERROR 行写入新文件
async function extractErrors(src, dest) {
  const rl = readline.createInterface({
    input: createReadStream(src),
    crlfDelay: Infinity,
  });
  const out = createWriteStream(dest, { flags: 'w' });

  let kept = 0;
  for await (const line of rl) {         // for await 期间 readline 会暂停输入
    if (!line.includes('ERROR')) continue;
    if (!out.write(`${line}\n`)) {       // 下游满了就等 drain
      await once(out, 'drain');
    }
    kept++;
  }

  out.end();
  await once(out, 'finish');             // 等所有数据真正写入磁盘
  return kept;
}

// 3) 逐块处理二进制：用 StringDecoder 保证多字节字符不被切断
const { StringDecoder } = require('node:string_decoder');
const { Transform } = require('node:stream');

class LineSplitter extends Transform {
  constructor(options = {}) {
    super({ ...options, readableObjectMode: true }); // 输出对象（行）
    this.decoder = new StringDecoder('utf8');
    this.rest = '';
  }
  _transform(chunk, encoding, callback) {
    const text = this.rest + this.decoder.write(chunk);
    const lines = text.split('\n');
    this.rest = lines.pop();                         // 最后一段可能不完整，留到下次
    for (const line of lines) this.push(line);
    callback();
  }
  _flush(callback) {
    const tail = this.rest + this.decoder.end();
    if (tail) this.push(tail);
    callback();
  }
}

// 4) 完整流水线：读 -> 分行 -> 过滤 -> 写
const { pipeline } = require('node:stream/promises');
async function filterWithPipeline(src, dest) {
  await pipeline(
    createReadStream(src),
    new LineSplitter(),
    new Transform({
      objectMode: true,
      transform(line, enc, cb) {
        cb(null, line.includes('ERROR') ? `${line}\n` : '');
      },
    }),
    createWriteStream(dest)
  );
}
```

**流式写 JSON / CSV 的注意点：**

- JSON 数组不能边写边 `JSON.stringify`，应改成 JSON Lines（每行一个对象）或用 `JSONStream` 这类库拼装。
- CSV 要处理逗号、引号、换行转义，字段内含逗号时用双引号包裹并把 `"` 转义为 `""`。
- 写完必须等 `finish` 再返回成功，否则进程退出时缓冲区数据可能丢失。

**面试怎么答：** 先否定 `readFile`，给出「读流 → 逐行/逐块 → 写流」的骨架，强调背压与 `StringDecoder` 两个细节，最后说明「何时用 `readline`、何时自定义 Transform」。

**易错点：**

- `readline` 的 `for await` 只在循环体内 `await` 时才真正背压；如果 `break` 后不 `close()`，输入流可能继续读。
- 只监听 `end` 不监听 `error`，磁盘满（`ENOSPC`）时会静默失败。
- `write` 后立即 `end` 而没有等 `drain`，数据可能被截断。
- 用 `fs.appendFile` 在循环里逐行写，会反复 open/close，吞吐极差。

---

## 5. http 模块与一个最小 HTTP 服务器

**结论：** `http.createServer` 接收一个 `(req, res)` 回调，`req` 是可读流，`res` 是可写流。一个可用的服务器只需要 `listen` + 路由 + 响应，但要上生产还必须补齐请求体大小限制、错误处理、超时、优雅退出。

**最小服务器拆解：**

| 步骤 | API | 说明 |
| --- | --- | --- |
| 创建 | `http.createServer(handler)` | 每个请求触发一次 handler |
| 监听 | `server.listen(port, host, cb)` | 不传 host 会监听所有网卡 |
| 取路径 | `new URL(req.url, base)` | `req.url` 只含路径与查询串 |
| 读请求体 | `for await (const chunk of req)` | `req` 是 `Readable` |
| 写响应 | `res.writeHead(status, headers)` + `res.end(body)` | `writeHead` 后不能再 `setHeader` |
| 关闭 | `server.close()` | 停止接收新连接，等待存量请求结束 |

**协议层要知道的：**

- Node 的 `http` 只实现 HTTP/1.x；HTTP/2 要用 `http2` 模块，HTTP/3 需要第三方库（如 `quic`）。
- HTTP/1.1 默认 `keep-alive`，一个 TCP 连接可复用多个请求；`server.keepAliveTimeout` 默认 5 秒，建议比反向代理的 keepalive 略大，避免代理复用已被服务端关闭的连接。
- 未设置 `Content-Length` 且 HTTP/1.1 时，Node 自动使用 `Transfer-Encoding: chunked`。
- `req.socket` 是底层 `net.Socket`，可用于取客户端 IP 与 TLS 信息（注意反向代理场景要解析 `X-Forwarded-For`）。
- 升级 WebSocket 走 `server.on('upgrade')`，由 `ws` 等库接管 socket。

```js
const http = require('node:http');

const MAX_BODY = 1024 * 1024; // 1 MB，防止超大请求打爆内存

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('请求体过大'), { statusCode: 413 }));
        req.destroy();                       // 停止继续接收
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      return json(res, 200, { ok: true, uptime: process.uptime() });
    }

    if (req.method === 'POST' && url.pathname === '/echo') {
      const raw = await readBody(req);
      const data = raw ? JSON.parse(raw) : {};   // 生产环境要 try/catch 并返回 400
      return json(res, 201, { received: data });
    }

    return json(res, 404, { error: 'Not Found' });
  } catch (err) {
    json(res, err.statusCode ?? 500, { error: err.message });
  }
});

server.listen(3000, '127.0.0.1', () => {
  console.log('listening on http://127.0.0.1:3000');
});

// 优雅退出：停止接收新连接，等待存量请求
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref(); // 兜底强制退出
});
```

**为什么不建议直接用原生 `http` 写业务：** 路由、body 解析、错误处理、参数校验都要自己实现。原生 `http` 适合写网关、代理、静态服务，或者理解框架底层；业务服务一般用 Express/Koa/Fastify。

**面试怎么答：** 先手写一个可运行的最小服务器，再讲 `req`/`res` 都是流、`writeHead` 与 `setHeader` 的关系、chunked 与 keep-alive，最后补充请求体限制与优雅退出。

**易错点：**

- `req.url` 是相对路径，直接 `new URL(req.url)` 会抛 `Invalid URL`，需要提供 base。
- `writeHead` 之后再 `setHeader` 会抛 `ERR_HTTP_HEADERS_SENT`。
- 不限制请求体大小，攻击者发一个 10 GB 的 body 就能拖垮进程。
- `listen` 不传 host 会绑定 `::`/`0.0.0.0`，把内部服务暴露到公网。

---

## 6. HTTP 请求与响应处理（请求头、状态码、Cookie）

**结论：** 请求头统一小写、多值头（如 `set-cookie`）以数组或逗号拼接形式出现；响应必须遵循「先设头再写体」的顺序。Cookie 没有内置解析器，需要自己拆分，且安全属性（`HttpOnly`、`Secure`、`SameSite`）比 Cookie 内容本身更值得关注。

**请求对象上常用的字段：**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `req.method` | string | 已大写，如 `GET`、`POST` |
| `req.url` | string | 路径 + 查询串，不含协议与主机 |
| `req.headers` | object | 键全部小写；`cookie` 是单个字符串 |
| `req.httpVersion` | string | 如 `1.1` |
| `req.socket.remoteAddress` | string | 直连对端 IP，代理后不可信 |
| `req.on('data')` | 事件 | 读取请求体，注意大小限制 |

**响应对象上常用的字段：**

| API | 说明 |
| --- | --- |
| `res.statusCode` | 可写，默认 200；`204`/`304` 不应带响应体 |
| `res.setHeader(name, value)` | 值可以是字符串、数字或数组 |
| `res.writeHead(code, headers)` | 一次性写入状态行与头部，之后头部锁定 |
| `res.write(chunk)` | 写响应体，返回 `false` 表示需要等待 `drain` |
| `res.end([chunk])` | 结束响应；带 body 且未设 `Content-Length` 时自动 chunked |
| `res.headersSent` | 只读，判断头部是否已发出 |

**状态码语义（常考）：**

| 区间 | 含义 | 典型场景 |
| --- | --- | --- |
| 2xx | 成功 | `200` 查询成功、`201` 创建成功、`204` 成功但无内容 |
| 3xx | 重定向/缓存 | `301` 永久、`302` 临时、`304` 协商缓存命中 |
| 4xx | 客户端错误 | `400` 参数错、`401` 未认证、`403` 无权限、`404` 不存在、`405` 方法不允许、`409` 冲突、`413` 体过大、`429` 限流 |
| 5xx | 服务端错误 | `500` 未捕获异常、`502` 上游不可用、`503` 过载、`504` 上游超时 |

**Cookie 的两条通道：**

- 请求：浏览器把所有 Cookie 合成一个 `Cookie` 头，形如 `a=1; b=2`，需要自己 `split(';')` 并 `decodeURIComponent`。
- 响应：每个 Cookie 一个 `Set-Cookie` 头，Node 用数组表达多值：`res.setHeader('Set-Cookie', ['a=1; Path=/', 'b=2; Path=/'])`。

**Cookie 安全属性：**

| 属性 | 作用 |
| --- | --- |
| `HttpOnly` | 禁止 JS 读取，降低 XSS 窃取会话的风险 |
| `Secure` | 仅 HTTPS 发送 |
| `SameSite=Lax/Strict` | 限制跨站携带，缓解 CSRF；`None` 必须配合 `Secure` |
| `Path` / `Domain` | 控制作用域，默认只对当前路径生效 |
| `Max-Age` / `Expires` | 过期时间，`Max-Age` 优先 |

```js
const http = require('node:http');

// 最小 Cookie 解析：处理 key=value、忽略非法片段
function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;                      // 非法编码时保留原值
    }
  }
  return out;
}

const server = http.createServer((req, res) => {
  const cookies = parseCookies(req.headers.cookie);

  // 登录：写两个 Cookie，注意多值要用数组
  if (req.method === 'GET' && req.url === '/login') {
    res.setHeader('Set-Cookie', [
      'sid=abc123; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600',
      'theme=dark; Path=/; Max-Age=86400',
    ]);
    res.statusCode = 302;
    res.setHeader('Location', '/');
    return res.end();                      // 302 响应体可为空
  }

  // 读取 Cookie 并返回 JSON
  if (req.method === 'GET' && req.url === '/me') {
    const body = JSON.stringify({ sid: cookies.sid ?? null });
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
      'Cache-Control': 'no-store',
    });
    return res.end(body);
  }

  // HEAD 请求：Node 会自动抑制响应体，但仍需正确设置 Content-Length
  if (req.method === 'HEAD' && req.url === '/me') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end();
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

server.listen(3000);
```

**几个容易忽略的行为：**

1. `res.end(string)` 时会按 UTF-8 计算字节长度，但不会自动设置 `Content-Type`，必须自己设，否则浏览器按 `text/plain` 或嗅探处理。
2. 对 `HEAD` 请求，Node 的 `ServerResponse` 会把 `_hasBody` 置为 false，不会真的发送 body，但 `Content-Length` 应保持与 GET 一致。
3. `304` 与 `204` 禁止带响应体；`304` 还应带 `ETag`/`Last-Modified`。
4. 反向代理后 `req.socket.remoteAddress` 是代理 IP，要取真实 IP 需解析 `X-Forwarded-For`，且只能在可信代理层数内采信。
5. 重复调用 `res.end()` 会触发 `ERR_STREAM_WRITE_AFTER_END`。

**面试怎么答：** 从「请求头小写、Cookie 单头合并、Set-Cookie 多值数组」三个细节切入，再讲状态码选择与安全属性，最后补 HEAD/304 无 body 的规范。

**易错点：**

- 把 `Set-Cookie` 用 `setHeader` 设成逗号拼接的字符串，浏览器会把整串当成一个 Cookie。
- `SameSite=None` 不带 `Secure` 会被现代浏览器直接拒绝。
- Cookie 里存明文用户信息或 JWT，却没有 `HttpOnly`，XSS 后可被直接读走。
- 忘记 `decodeURIComponent`，中文/特殊字符的 Cookie 值会读成 `%E4%B8%AD`。

---

## 7. 手写静态资源服务与 MIME 处理

**结论：** 静态服务的三个核心是**路径安全**（防目录穿越）、**正确的 Content-Type**（决定浏览器如何解析）、**缓存协商**（ETag/Last-Modified 减少传输）。任何把 URL 直接拼到文件路径的实现都必须先规范化再校验前缀。

**目录穿越的防御链：**

1. `decodeURIComponent` 解码，防止 `%2e%2e%2f` 绕过字符串检查。
2. 拒绝包含 `\0` 的路径（部分系统 API 会截断）。
3. `path.resolve(ROOT, '.' + pathname)` 归一化，消掉 `..` 与 `.`。
4. 校验结果仍以 `ROOT + path.sep` 开头，否则返回 403。
5. 需要防符号链接逃逸时，再 `realpath` 一次并重复校验。

**MIME 映射（常见项）：**

| 扩展名 | Content-Type |
| --- | --- |
| `.html` | `text/html; charset=utf-8` |
| `.css` | `text/css; charset=utf-8` |
| `.js` / `.mjs` | `text/javascript; charset=utf-8` |
| `.json` | `application/json; charset=utf-8` |
| `.svg` | `image/svg+xml` |
| `.png` / `.jpg` / `.webp` | `image/png` / `image/jpeg` / `image/webp` |
| `.woff2` | `font/woff2` |
| `.wasm` | `application/wasm` |
| 未知 | `application/octet-stream` |

**缓存协商：**

| 头 | 方向 | 作用 |
| --- | --- | --- |
| `ETag` | 响应 | 资源指纹，内容或 mtime 变化即变化 |
| `If-None-Match` | 请求 | 与 ETag 比对，命中返回 304 |
| `Last-Modified` | 响应 | 最后修改时间（秒级） |
| `If-Modified-Since` | 请求 | 与 Last-Modified 比对 |
| `Cache-Control` | 响应 | `max-age`、`immutable`、`no-cache` 等策略 |

> 带 hash 的构建产物用 `Cache-Control: public, max-age=31536000, immutable`；`index.html` 用 `no-cache`，保证发版后立即生效。

```js
const http = require('node:http');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { createReadStream } = require('node:fs');
const { pipeline } = require('node:stream/promises');

const ROOT = path.resolve(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

async function serveStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400);
    return res.end('Bad Request');
  }
  if (pathname.includes('\0')) {
    res.writeHead(400);
    return res.end('Bad Request');
  }
  if (pathname.endsWith('/')) pathname += 'index.html';

  const filePath = path.resolve(ROOT, `.${pathname}`);
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    return res.end('Forbidden');           // 目录穿越
  }

  let stat;
  try {
    stat = await fsp.stat(filePath);
  } catch (err) {
    const code = err.code === 'ENOENT' ? 404 : 500;
    res.writeHead(code);
    return res.end(code === 404 ? 'Not Found' : 'Internal Error');
  }
  if (!stat.isFile()) {
    res.writeHead(404);
    return res.end('Not Found');
  }

  const etag = `W/"${stat.size}-${Math.floor(stat.mtimeMs)}"`;
  const ext = path.extname(filePath).toLowerCase();

  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, { ETag: etag });   // 协商缓存命中，无响应体
    return res.end();
  }

  res.writeHead(200, {
    'Content-Type': MIME[ext] ?? 'application/octet-stream',
    'Content-Length': stat.size,
    'ETag': etag,
    'Last-Modified': stat.mtime.toUTCString(),
    'Cache-Control': 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',  // 禁止浏览器嗅探
    'Accept-Ranges': 'bytes',
  });

  if (req.method === 'HEAD') return res.end();
  await pipeline(createReadStream(filePath), res);
}

http.createServer((req, res) => {
  serveStatic(req, res).catch(() => {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
}).listen(8080);
```

**Range 请求（断点续传/视频拖动）：** 解析 `Range: bytes=start-end`，返回 `206 Partial Content` 与 `Content-Range: bytes start-end/total`，用 `createReadStream(filePath, { start, end })` 读取片段。多段 Range 需要用 `multipart/byteranges`，实现复杂，一般交给 Nginx。

**为什么不建议自己写生产静态服务：** Nginx/CDN 在 sendfile、零拷贝、Range、缓存、压缩上更成熟；Node 适合做需要鉴权、动态改写、A/B 分流的静态层。

**面试怎么答：** 按「路径安全 → MIME → 缓存协商 → 流式输出」四步讲，重点说清 `decodeURIComponent + resolve + startsWith` 的防御链，以及 ETag 命中返回 304。

**易错点：**

- 只检查 `pathname.includes('..')`，攻击者用 URL 编码或反斜杠即可绕过。
- 用 `path.join(ROOT, pathname)` 且 `pathname` 以 `/` 开头时，`path.join` 不会越界，但若拼接方式写错成 `ROOT + pathname` 就可能逃逸。
- 304 响应误带 body 或错误的 `Content-Length`。
- 不设 `X-Content-Type-Options: nosniff`，上传的 HTML 可能被当作页面执行。

---

## 8. 文件上传处理（multipart 解析与流式落盘）

**结论：** `multipart/form-data` 是把多个字段按 `boundary` 分隔编码的格式。服务端必须**边解析边落盘**，不能等整个请求体进内存；生产环境用 `busboy` 这类流式解析器，并同时限制文件大小、文件数量、字段数量与文件名。

**请求体格式：**

```text
POST /upload HTTP/1.1
Content-Type: multipart/form-data; boundary=----X

------X
Content-Disposition: form-data; name="title"

我的照片
------X
Content-Disposition: form-data; name="file"; filename="a.png"
Content-Type: image/png

<二进制数据>
------X--
```

解析要点：

1. 从 `Content-Type` 中取 `boundary`，缺失或格式不对直接 400。
2. 每段有头部、空行、内容；内容长度由下一个 boundary 决定，不能按 `Content-Length` 切。
3. 文件流是 `Readable`，可以 `pipeline` 到磁盘；字段是字符串，量很小。
4. 边界字符串可能出现在二进制内容中，必须按完整 `\r\n--boundary` 匹配，不能简单 `indexOf`。

**安全与工程约束：**

| 风险 | 措施 |
| --- | --- |
| 超大文件打爆磁盘 | `limits.fileSize`，超限销毁流并删除半成品 |
| 大量小文件耗尽 inode | `limits.files` + 每请求配额 |
| 文件名穿越 | `path.basename` + 白名单字符 |
| 可执行文件被访问 | 存储目录不在静态服务根下，或强制 `Content-Disposition: attachment` |
| 上传中断留下垃圾 | `error`/`abort` 时 `unlink` 临时文件 |
| 同名覆盖 | 用 `randomUUID()` 生成存储名，原始名只存数据库 |

```js
// 需要先安装：npm i busboy
const http = require('node:http');
const path = require('node:path');
const fsp = require('node:fs/promises');
const { createWriteStream } = require('node:fs');
const { pipeline } = require('node:stream/promises');
const { randomUUID } = require('node:crypto');
const busboy = require('busboy');

const UPLOAD_DIR = path.resolve(__dirname, 'uploads');
const MAX_SIZE = 10 * 1024 * 1024;

async function handleUpload(req, res) {
  let bb;
  try {
    bb = busboy({
      headers: req.headers,
      limits: { fileSize: MAX_SIZE, files: 3, fields: 10, parts: 20 },
    });
  } catch {
    res.writeHead(400);
    return res.end('Invalid multipart');
  }

  const fields = {};
  const files = [];
  const tasks = [];

  bb.on('field', (name, value) => {
    fields[name] = value;
  });

  bb.on('file', (name, file, info) => {
    const { filename, mimeType } = info;
    const safeName = path.basename(filename).replace(/[^\w.\-\u4e00-\u9fa5]/g, '_');
    const key = `${randomUUID()}-${safeName}`;
    const target = path.join(UPLOAD_DIR, key);
    const ws = createWriteStream(target, { flags: 'wx' }); // 已存在则失败，防覆盖

    file.on('limit', () => {
      ws.destroy(new Error('文件超过限制'));               // 触发 pipeline 失败
    });

    // 流式落盘：文件数据不经过内存聚合
    tasks.push(
      pipeline(file, ws)
        .then(() => {
          if (file.truncated) throw new Error('文件被截断');
          files.push({ field: name, key, mimeType });
        })
        .catch(async (err) => {
          await fsp.unlink(target).catch(() => {});         // 清理半成品
          throw err;
        })
    );
  });

  const done = new Promise((resolve, reject) => {
    bb.on('close', resolve);
    bb.on('error', reject);
    req.on('aborted', () => reject(new Error('客户端中断')));
  });

  req.pipe(bb);                                             // 请求体流入解析器

  try {
    await done;
    await Promise.all(tasks);
    const body = JSON.stringify({ fields, files });
    res.writeHead(201, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
  } catch (err) {
    if (!res.headersSent) {
      res.writeHead(err.message.includes('超过') ? 413 : 400);
    }
    res.end(JSON.stringify({ error: err.message }));
  }
}

(async () => {
  await fsp.mkdir(UPLOAD_DIR, { recursive: true });
  http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/upload') {
      return handleUpload(req, res);
    }
    res.writeHead(404);
    res.end();
  }).listen(3000);
})();
```

**为什么用 `busboy` 而不是手写：** 手写需要处理边界跨 chunk、头部编码、`Content-Disposition` 引号转义、CRLF 细节，极易出安全漏洞。`busboy` 是流式实现，`multer` 内部也用它；`formidable` 是另一套成熟实现。

**大文件直传方案：** 让客户端先请求「预签名 URL」，直接把文件传到对象存储（S3/OSS），Node 只处理元数据与回调。这样应用服务器完全不承载文件字节流，是当前主流做法。

**面试怎么答：** 先讲 multipart 的 boundary 结构，再讲「流式落盘 + limits + 文件名清洗 + 失败清理」四件事，最后补预签名直传的生产方案。

**易错点：**

- 先 `await readBody(req)` 再交给 busboy，请求流已被消费，解析必然失败。
- 只限制 `fileSize` 不限制 `files`，攻击者可以发上万个空文件。
- 用原始文件名直接拼路径，`../../etc/passwd` 可覆盖任意文件。
- `pipeline` 失败后不删临时文件，磁盘会被半成品逐渐占满。

---

## 9. net 与 dgram：TCP/UDP 网络编程

**结论：** `net` 提供 TCP（面向连接、可靠、字节流），`dgram` 提供 UDP（无连接、不可靠、数据报）。TCP 没有消息边界，应用层必须自己分帧；UDP 保留消息边界，但不保证到达、顺序与去重。

**TCP 与 UDP 对比：**

| 维度 | TCP（`net`） | UDP（`dgram`） |
| --- | --- | --- |
| 连接 | 三次握手，面向连接 | 无连接，直接 send |
| 可靠性 | 确认、重传、有序 | 不保证到达、顺序、去重 |
| 数据形态 | 字节流，无边界 | 数据报，保留边界 |
| 拥塞控制 | 有 | 无（应用自己控制） |
| 典型用途 | HTTP、数据库、RPC | DNS、日志、实时音视频、游戏 |
| Node 对象 | `net.Socket`（Duplex） | `dgram.Socket`（EventEmitter） |

**TCP 分帧的三种做法：**

| 方式 | 说明 | 适用 |
| --- | --- | --- |
| 分隔符（`\n`、`\0`） | 简单，但内容需转义 | 文本协议、Redis 风格 |
| 长度前缀 | 先读 4 字节长度，再读 N 字节 | 二进制协议、RPC |
| 固定长度 | 每条消息长度固定 | 定长报文 |

```js
const net = require('node:net');

// TCP 服务端：换行分帧的回显服务
const server = net.createServer((socket) => {
  socket.setEncoding('utf8');
  socket.setNoDelay(true);                 // 关闭 Nagle，降低小包延迟
  socket.setKeepAlive(true, 60_000);       // 60 秒探测保活
  socket.setTimeout(120_000, () => {
    socket.destroy(new Error('idle timeout'));
  });

  let buffer = '';
  socket.on('data', (chunk) => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (!socket.write(`echo: ${line}\n`)) {
        socket.once('drain', () => {});    // 生产代码应暂停后续处理
      }
    }
  });

  socket.on('error', (err) => {
    console.error('socket error', err.code); // 必须监听，否则未捕获错误崩进程
  });
});

server.listen(7000, '127.0.0.1', () => {
  console.log('TCP server on 7000');
});

// TCP 客户端：连接、发送、接收
const client = net.createConnection({ port: 7000, host: '127.0.0.1' });
client.setEncoding('utf8');
client.on('connect', () => client.write('hello\n'));
client.on('data', (data) => console.log('收到:', data.trim()));
client.on('end', () => console.log('服务端关闭连接'));
client.on('error', console.error);
```

```js
const dgram = require('node:dgram');

// UDP 服务端：收到什么回什么
const udp = dgram.createSocket('udp4');   // 'udp6' 用于 IPv6
udp.on('message', (msg, rinfo) => {
  console.log(`来自 ${rinfo.address}:${rinfo.port} 的 ${msg.length} 字节`);
  udp.send(`echo:${msg}`, rinfo.port, rinfo.address, (err) => {
    if (err) console.error('发送失败', err);
  });
});
udp.on('error', (err) => {
  console.error('UDP error', err);
  udp.close();
});
udp.bind(7001, '127.0.0.1');

// UDP 客户端：无连接，直接发
const sender = dgram.createSocket('udp4');
sender.send('ping', 7001, '127.0.0.1', (err) => {
  if (err) console.error(err);
  sender.close();
});
```

**协议细节：**

- UDP 单个数据报理论上限：IPv4 为 65507 字节，IPv6 为 65527 字节（减去 IP/UDP 头），超过会在发送端报 `EMSGSIZE`。
- `dgram` 的 `message` 事件一次对应一个完整数据报，不存在粘包，但可能丢包、重复、乱序。
- `socket.connect()` 对 UDP 不是建立连接，只是固定对端地址，便于用 `send` 省略参数并接收 ICMP 错误。
- TCP 的 `allowHalfOpen` 默认 `false`：收到 FIN 后 Node 会自动结束写端；设为 `true` 需自己 `end()`。
- 大量短连接场景要开启 `setNoDelay` 与连接池，避免三次握手与 TIME_WAIT 压力。

**面试怎么答：** 先对比 TCP/UDP 的可靠性与边界语义，再重点讲「TCP 必须分帧」以及三种分帧方式，最后补 `write` 背压与 `error` 监听这两个工程细节。

**易错点：**

- 认为 TCP 的每次 `data` 就是一条消息——它只是当前可读的一块字节。
- UDP 直接用超大 JSON 发送，超过 64 KB 会被内核拒绝。
- 不监听 `socket.on('error')`，对端 RST 时进程直接崩溃。
- 用 UDP 做文件传输却不自己做重传与排序，丢一个包文件就损坏。

---

## 10. crypto 模块与哈希、HMAC、JWT 签名

**结论：** 哈希用于完整性校验，HMAC 在此之上加入密钥用于身份认证，JWT 则是「base64url 编码的 JSON + HMAC/RSA 签名」。三者都不能替代加密：JWT 的 payload 是明文可读的；密码存储必须用 `scrypt`/`bcrypt`/`argon2` 这类慢哈希，而不是 `sha256`。

**概念辨析：**

| 机制 | 是否有密钥 | 能否防篡改 | 能否还原原文 | 典型用途 |
| --- | --- | --- | --- | --- |
| 哈希（SHA-256） | 否 | 能发现内容变化 | 否 | 文件校验、去重、缓存键 |
| HMAC | 是（共享密钥） | 能，且能验证来源 | 否 | 接口签名、Webhook 校验 |
| 对称加密（AES-GCM） | 是 | 能（带认证标签） | 能 | 敏感字段加密 |
| 非对称签名（RSA/ECDSA） | 私钥签、公钥验 | 能 | 否 | JWT、证书、软件发布 |

**密码存储的正确做法：**

1. 每个用户独立随机盐（`randomBytes(16)`）。
2. 使用慢哈希 + 可调成本：`crypto.scrypt(password, salt, 64)`，参数 `N=16384, r=8, p=1` 起步。
3. 存储格式包含算法与参数，便于后续升级：`scrypt$N=16384,r=8,p=1$<salt>$<hash>`。
4. 校验用 `timingSafeEqual`，且先比较长度（长度不同会直接抛错）。

**JWT 的三段结构：**

```text
base64url(header) . base64url(payload) . base64url(signature)
{"alg":"HS256","typ":"JWT"} . {"sub":"1","exp":1700000000} . HMAC-SHA256(...)
```

校验必须做的事：

1. 用 `.` 切成三段，段数不对直接拒绝。
2. 解析 header，**只允许白名单算法**（如仅 `HS256`），防 `alg: none` 与算法混淆攻击。
3. 用服务端密钥重新计算签名，`timingSafeEqual` 比较。
4. 校验 `exp`、`nbf`、`iat`，允许少量时钟偏移。
5. 校验 `iss`、`aud`，防止令牌被其它系统复用。

```js
const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);

// 1) 通用哈希：流式更新，适合大文件
function sha256File(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// 2) HMAC：密钥不随消息传输
function hmacSign(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

// 3) 定长安全比较：先比长度，避免 timingSafeEqual 抛异常
function safeEqual(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// 4) 密码哈希与校验
async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}

async function verifyPassword(password, stored) {
  const [, saltB64, keyB64] = stored.split('$');
  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(keyB64, 'base64');
  const actual = await scrypt(password, salt, expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// 5) 最小 JWT 实现（HS256）
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

function jwtSign(payload, secret, ttlSeconds = 3600) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ ...payload, iat: now, exp: now + ttlSeconds });
  const data = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function jwtVerify(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('JWT 格式非法');
  const [h, p, s] = parts;

  const header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8'));
  if (header.alg !== 'HS256') throw new Error('不支持的算法'); // 白名单，防 alg 混淆

  const expected = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
  if (!safeEqual(s, expected)) throw new Error('签名无效');

  const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now >= payload.exp) throw new Error('已过期');
  if (payload.nbf && now < payload.nbf) throw new Error('尚未生效');
  return payload;
}

// 6) 其它常用能力
const token = crypto.randomBytes(32).toString('hex'); // 会话 ID、重置令牌
const id = crypto.randomUUID();                        // 请求 ID、文件名
const n = crypto.randomInt(100000, 1000000);           // 验证码（比 Math.random 安全）
```

**JWT 的工程实践：**

| 方案 | 说明 |
| --- | --- |
| Access Token 短有效期 | 5~15 分钟，泄露窗口小 |
| Refresh Token 长有效期 | 存服务端（Redis/数据库），可撤销、可轮换 |
| 刷新令牌轮换 | 每次刷新签发新 refresh，旧的立即失效，检测重放 |
| 不存敏感信息 | payload 只放 `sub`、`role`、`exp`，不放手机号/身份证 |
| 注销 | 纯无状态 JWT 无法主动失效，需黑名单或版本号（`tokenVersion`） |
| 传输 | `HttpOnly` Cookie 或 `Authorization: Bearer`，不要放 localStorage |

**RSA/ECDSA 签名：** 用 `crypto.sign('sha256', data, privateKey)` 与 `crypto.verify('sha256', data, publicKey, sig)`；JWT 对应 `RS256`/`ES256`，公钥可公开分发，适合多服务共享验签。

**面试怎么答：** 先区分哈希、HMAC、签名、加密四种能力，再讲 JWT 三段结构与「算法白名单 + 常量时间比较 + 过期校验」三个校验要点，最后补密码必须慢哈希。

**易错点：**

- 用 `sha256(password)` 存密码，GPU 每秒可尝试数十亿次。
- 直接信任 JWT header 里的 `alg` 去选择验签方式，存在算法混淆漏洞。
- 用 `===` 比较签名，理论上可被时序攻击逐字节猜测。
- 把 JWT 当加密用，payload 里放身份证号，任何人 base64 解码即可看到。

---

## 11. zlib 压缩与 gzip 响应

**结论：** 文本类响应（HTML/CSS/JS/JSON/SVG）压缩后通常能减少 60%~80% 传输量。Node 内置 `zlib` 支持 gzip、deflate、brotli，HTTP 层要按 `Accept-Encoding` 协商，并加上 `Vary: Accept-Encoding`，且压缩后不能再发送原始 `Content-Length`。

**三种算法对比：**

| 算法 | 模块 API | 压缩率 | CPU 开销 | 浏览器支持 | 建议 |
| --- | --- | --- | --- | --- | --- |
| gzip | `zlib.createGzip` | 中 | 中 | 全部 | 通用默认 |
| deflate | `zlib.createDeflate` | 中 | 中 | 全部 | 兼容老客户端 |
| brotli | `zlib.createBrotliCompress` | 高（文本高 15%~25%） | 较高 | 现代浏览器（HTTPS） | 静态资源优先 |

**协商规则（简化版）：**

1. 解析 `Accept-Encoding: gzip, deflate, br`，并处理 `q=0`（明确拒绝）与 `q` 权重排序。
2. 优先 `br`（若客户端支持），否则 `gzip`，都不支持则 `identity`。
3. 响应加 `Vary: Accept-Encoding`，避免 CDN 把 gzip 版本发给不支持的客户端。
4. 小于约 1 KB 的响应不压缩，压缩头本身可能比内容还大。
5. 图片、视频、zip 等已压缩格式不再压缩，纯浪费 CPU。

```js
const http = require('node:http');
const zlib = require('node:zlib');
const { pipeline } = require('node:stream/promises');
const { Readable } = require('node:stream');

// 解析 Accept-Encoding，处理 q 值
function pickEncoding(header = '') {
  const items = header
    .split(',')
    .map((part) => {
      const [name, ...params] = part.trim().split(';');
      const qParam = params.find((p) => p.trim().startsWith('q='));
      return {
        name: name.trim().toLowerCase(),
        q: qParam ? Number(qParam.split('=')[1]) : 1,
      };
    })
    .filter((item) => item.name && item.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { name } of items) {
    if (name === 'br') return 'br';
    if (name === 'gzip') return 'gzip';
    if (name === 'deflate') return 'deflate';
  }
  return 'identity';
}

function createCompressor(encoding) {
  if (encoding === 'br') return zlib.createBrotliCompress();
  if (encoding === 'gzip') return zlib.createGzip({ level: 6 });
  if (encoding === 'deflate') return zlib.createDeflate({ level: 6 });
  return null;
}

const payload = JSON.stringify({
  items: Array.from({ length: 200 }, (_, i) => ({ id: i, name: `商品 ${i}` })),
});

const server = http.createServer(async (req, res) => {
  const encoding = pickEncoding(req.headers['accept-encoding']);
  const raw = Buffer.from(payload, 'utf8');

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Vary', 'Accept-Encoding');     // 关键：告诉缓存按编码区分

  if (encoding === 'identity' || raw.length < 1024) {
    res.writeHead(200, { 'Content-Length': raw.length });
    return res.end(raw);
  }

  res.writeHead(200, {
    'Content-Encoding': encoding,
    // 不能设置原始 Content-Length，压缩后的长度未知，交给 chunked
  });

  const compressor = createCompressor(encoding);
  await pipeline(Readable.from(raw), compressor, res);
});

server.listen(3000);
```

**压缩级别怎么选：**

| 场景 | 建议 |
| --- | --- |
| 动态接口（每次请求都压缩） | gzip level 4~6，兼顾 CPU 与压缩率 |
| 构建产物（一次性压缩） | brotli level 11，压缩率优先，产物落盘 |
| 静态服务 | 预压缩 `.gz`/`.br` 文件，运行时直接读，不重复压缩 |

**BREACH 攻击提示：** 当响应同时包含「攻击者可控输入」与「敏感信息（CSRF token）」且开启压缩时，攻击者可通过压缩后长度变化逐字节推断秘密。缓解手段：对含秘密的响应禁用压缩、随机化响应内容、分离敏感数据接口。

**面试怎么答：** 先讲协商流程（`Accept-Encoding` → 选算法 → 设置 `Content-Encoding`/`Vary` → 移除 `Content-Length`），再讲「小响应不压、已压缩格式不压、静态资源预压缩」，最后提 BREACH。

**易错点：**

- 压缩后仍发送原始 `Content-Length`，客户端会截断或报协议错误。
- 忘记 `Vary`，CDN 缓存了 gzip 版本，导致不支持 gzip 的客户端拿到乱码。
- 对图片、视频开 gzip，CPU 飙高但体积几乎不变。
- 每个请求都 `gzipSync` 大 JSON，同步压缩会直接阻塞事件循环。

---

## 12. 进程间通信与 IPC

**结论：** Node 的 IPC 有三套：`child_process.fork` 的内置消息通道（父子进程）、`cluster` 的 primary/worker 通道（本质也是 fork IPC）、`worker_threads` 的 `MessagePort`（同进程线程间）。它们都靠序列化传值，不是共享内存；只有 `SharedArrayBuffer` 能让线程真正共享同一块内存。

**三种并发单元对比：**

| 维度 | `child_process.fork` | `cluster` | `worker_threads` |
| --- | --- | --- | --- |
| 隔离级别 | 独立进程、独立内存 | 独立进程、独立内存 | 同进程、独立 V8 isolate |
| 通信方式 | `send`/`message`（IPC 管道） | 同 fork | `postMessage`/`MessagePort` |
| 共享内存 | 不支持 | 不支持 | 支持 `SharedArrayBuffer` |
| 启动开销 | 大（几十 ms） | 大 | 较小（几 ms） |
| 崩溃影响 | 不影响父进程 | 不影响其它 worker | 可使整个进程退出 |
| 典型用途 | 执行脚本、隔离任务 | 利用多核跑 HTTP 服务 | CPU 密集计算 |

**`fork` 的 IPC 机制：**

1. `fork` 会以当前 `execPath` 启动一个新 Node 进程，并额外建立一条 IPC 管道（Windows 上是命名管道）。
2. 父子双方通过 `child.send()` / `process.send()` 发送消息，对方用 `message` 事件接收。
3. 默认序列化是 JSON：`Date` 变字符串、`Buffer` 变 `{ type: 'Buffer', data: [...] }`、函数与 `undefined` 丢失。`fork` 时传 `serialization: 'advanced'` 可支持 `BigInt`、`Map`、`Set`、`TypedArray`。
4. `send` 是异步的，可传 callback 得知是否送达；消息不保证对方一定处理成功。
5. 子进程的 IPC 通道会阻止事件循环退出，`child.disconnect()` 或 `process.disconnect()` 可关闭；`child.unref()` 让父进程不被它拖住。
6. 子进程崩溃时父进程收到 `exit`，必须监听并决定是否重启（配合退避）。

```js
// parent.js
const path = require('node:path');
const { fork } = require('node:child_process');

const child = fork(path.join(__dirname, 'worker.js'), ['--level=info'], {
  serialization: 'advanced',        // 支持 Map/Set/BigInt/TypedArray
  execArgv: ['--max-old-space-size=512'],
  env: { ...process.env, NODE_ENV: 'production' },
});

child.on('message', (msg) => {
  console.log('父进程收到:', msg);
  if (msg.type === 'ready') {
    child.send({ type: 'task', id: 1, payload: new Map([['a', 1]]) });
  }
});

child.on('exit', (code, signal) => {
  console.log('子进程退出', { code, signal });
});

child.on('error', (err) => console.error('启动失败', err));

// worker.js
process.on('message', (msg) => {
  if (msg.type === 'task') {
    const result = { id: msg.id, ok: true, size: msg.payload.size };
    process.send(result, (err) => {
      if (err) console.error('回传失败', err);
    });
  }
});

process.send({ type: 'ready' });    // 通知父进程已就绪

// 主动断开 IPC 通道，让进程可以自然退出
process.on('SIGTERM', () => {
  process.disconnect?.();
  process.exit(0);
});
```

```js
// worker_threads 的 MessageChannel：在同一进程内建立专用通道
const { Worker, isMainThread, parentPort, MessageChannel } = require('node:worker_threads');

if (isMainThread) {
  const worker = new Worker(__filename);
  const { port1, port2 } = new MessageChannel();

  port1.on('message', (msg) => console.log('主线程收到:', msg));
  worker.postMessage({ port: port2 }, [port2]);  // 第二个参数是 transferList

  // 转移 ArrayBuffer 所有权，零拷贝
  const buf = new ArrayBuffer(1024 * 1024);
  worker.postMessage({ buf }, [buf]);
  console.log('转移后主线程 byteLength:', buf.byteLength); // 0
} else {
  parentPort.once('message', ({ port }) => {
    port.postMessage('来自 worker 的问候');
  });
}
```

**传输方式的成本：**

| 方式 | 是否复制 | 适用 |
| --- | --- | --- |
| `postMessage(obj)` | 结构化克隆（深拷贝） | 小对象、低频 |
| `postMessage(obj, [buf])` | 转移所有权，零拷贝 | 大块 `ArrayBuffer` |
| `SharedArrayBuffer` + `Atomics` | 真正共享 | 高频读写、计数器、并行计算 |

**cluster 的 IPC 额外说明：** primary 与 worker 之间除了消息，还会通过 IPC 传递 TCP 连接句柄（`server.handle`），这就是多个 worker 能监听同一端口的原因。默认轮询调度（`SCHED_RR`）由 primary 分发连接；Windows 上退化为共享句柄由操作系统调度。

**面试怎么答：** 先区分「进程隔离 vs 线程共享」，再讲 fork 的 IPC 管道与 JSON 序列化的坑，最后对比 `postMessage` 的克隆、转移、共享三种数据传递方式。

**易错点：**

- 通过 IPC 传大 Buffer 会整份序列化，既慢又占内存；应转移 `ArrayBuffer` 或用共享内存。
- 子进程里 `process.send` 在通道断开后调用会抛错，需先判断 `process.connected`。
- 父进程不监听 `exit`，子进程崩溃后任务永久丢失。
- 认为 `fork` 能共享变量——两个进程的内存完全独立，只能靠消息同步。
