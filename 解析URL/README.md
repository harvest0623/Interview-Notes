# 解析 URL（手写 URL 解析器）

> **题目：手写一个 `urlParser`，把 URL 拆解成协议、主机名、端口、路径、查询参数、hash 等部分。要求同名查询参数合并为数组。**

示例：

```
输入：https://www.baidu.com:8080/order/home?user=Tom&id=123&city=%E5%8D%97%E6%98%8C&id=56#top

输出：
{
    protocol: 'https',
    hostname: 'www.baidu.com',
    port: '8080',
    path: '/order/home',
    query: { user: 'Tom', id: ['123', '56'], city: '南昌' },
    hash: 'top'
}
```

考察点：字符串切分、查询参数的手动解析、`decodeURIComponent` 解码。

---

## 目录

1. [URL 的组成部分](#1-url-的组成部分)
2. [手写解析思路](#2-手写解析思路)
3. [完整实现](#3-完整实现)
4. [原生 API 做法](#4-原生-api-做法)
5. [易错点](#5-易错点)

---

## 1. URL 的组成部分

以 `https://www.baidu.com:8080/order/home?user=Tom#top` 为例：

| 部分 | 值 | 说明 |
| --- | --- | --- |
| protocol | `https` | 协议，`://` 之前 |
| hostname | `www.baidu.com` | 主机名 |
| port | `8080` | 端口，`:` 之后（可省略） |
| path | `/order/home` | 路径，主机之后的 `/` 开始 |
| query | `user=Tom` | 查询参数，`?` 之后、`#` 之前 |
| hash | `top` | 锚点，`#` 之后 |

---

## 2. 手写解析思路

1. 先用 `#` 切出 **hash**。
2. 再用 `?` 切出 **query 字符串**，剩下的就是「协议 + 主机 + 路径」。
3. 用 `://` 切出 **protocol**。
4. 主机部分取 `/` 之前的片段，再用 `:` 分出 **hostname** 和 **port**。
5. 去掉主机部分、截到 `?` 之前就是 **path**。
6. 把 query 字符串按 `&` 拆分，再按 `=` 拆成键值对；**同名 key 合并成数组**，并对键值做 `decodeURIComponent`。

---

## 3. 完整实现

```js
function urlParser(url) {
    // 1. hash
    const [main, hash = ''] = url.split('#');
    // 2. query 字符串
    const [prefix, queryStr = ''] = main.split('?');
    // 3. 协议
    const [protocol, rest] = prefix.split('://');
    // 4. 主机 + 端口
    const hostPart = rest.split('/')[0];
    const [hostname, port = ''] = hostPart.split(':');
    // 5. 路径
    const path = rest.slice(hostPart.length).split('?')[0];
    // 6. 查询参数
    const query = {};
    if (queryStr) {
        queryStr.split('&').forEach((pair) => {
            if (!pair) return;
            const [rawKey, rawValue = ''] = pair.split('=');
            const key = decodeURIComponent(rawKey);
            const value = decodeURIComponent(rawValue);
            query[key] = key in query ? [].concat(query[key], value) : value;
        });
    }
    return { protocol, hostname, port, path, query, hash };
}
```

对应 [index.js](index.js)。

**关于同名参数为何转数组**：`?id=123&id=56` 这种查询串，用对象存时会互相覆盖，因此约定「重复出现 → 合并为数组」。

---

## 4. 原生 API 做法

生产环境不必手写，浏览器提供了 `URL` 与 `URLSearchParams`：

```js
const u = new URL('https://www.baidu.com:8080/order/home?user=Tom&id=123&id=56#top');

u.protocol; // 'https:'
u.hostname; // 'www.baidu.com'
u.port;     // '8080'
u.pathname; // '/order/home'
u.hash;     // '#top'
u.searchParams.getAll('id'); // ['123', '56']  ← 自动处理同名参数
u.searchParams.get('user');  // 'Tom'
```

> 区别：原生 `URL` 的 `protocol` 带冒号（`'https:'`）、`hash` 带井号（`'#top'`）；`searchParams` 默认已做解码。手写版通常按题目要求去掉这些符号。面试中「能手写 + 知道原生 API」是最佳回答。

---

## 5. 易错点

- **切分顺序**：必须先切 `#` 再切 `?`，否则 hash 里若含 `?` 会解析错乱。
- **端口缺省**：URL 中常常没有端口（`https` 默认 443、`http` 默认 80），此时 `port` 应为空字符串。
- **同名参数被覆盖**：直接用对象赋值会丢失重复项，需合并为数组。
- **中文/特殊字符需要解码**：查询串里的中文通常被编码为 `%E5%8D%97%E6%98%8C`，要用 `decodeURIComponent` 还原为「南昌」；反之拼接 URL 时要用 `encodeURIComponent`。
- **值的类型**：本实现保留**字符串**（`'123'` 而非 `123`），因为字符串更无损（能保留前导零等）；若业务需要数字，再显式 `Number(value)` 转换。
- **`decodeURIComponent` 可能抛错**：碰到非法编码（如孤立的 `%`）会抛异常，健壮实现应 `try/catch` 兜底。