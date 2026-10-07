# HTML 常见面试题

> 本文件收录 HTML 相关的高频面试题及参考答案，按「概念 → 元素 → 表单/多媒体 → 存储/通信」的顺序整理。

---

## 目录

1. [什么是 DOCTYPE？有什么作用？](#1-什么是-doctype有什么作用)
2. [HTML5 有哪些新特性？](#2-html5-有哪些新特性)
3. [HTML5 的 input 元素有哪些 type 属性？](#3-html5-的-input-元素有哪些-type-属性)
4. [什么是 HTML 语义化？有哪些语义化标签？](#4-什么是-html-语义化有哪些语义化标签)
5. [src 和 href 的区别？](#5-src-和-href-的区别)
6. [link 标签和 @import 的区别？](#6-link-标签和-import-的区别)
7. [iframe 有哪些优缺点及使用场景？](#7-iframe-有哪些优缺点及使用场景)
8. [块级元素、行内元素、行内块元素的区别？](#8-块级元素行内元素行内块元素的区别)
9. [置换元素和非置换元素？为什么 img 是 inline 却能设置宽高？](#9-置换元素和非置换元素为什么-img-是-inline-却能设置宽高)
10. [HTML 全局属性有哪些？](#10-html-全局属性有哪些)
11. [meta 标签有哪些作用？](#11-meta-标签有哪些作用)
12. [alt 和 title 的区别？](#12-alt-和-title-的区别)
13. [响应式图片：srcset、sizes 和 picture 标签](#13-响应式图片srcsetsizes-和-picture-标签)
14. [常见图片格式及区别？](#14-常见图片格式及区别)
15. [表单元素与表单属性](#15-表单元素与表单属性)
16. [data-* 自定义属性的作用？](#16-data--自定义属性的作用)
17. [cookie、localStorage、sessionStorage 的区别？](#17-cookielocalstoragesessionstorage-的区别)
18. [canvas 和 svg 的区别？](#18-canvas-和-svg-的区别)
19. [什么是 Web Worker？](#19-什么是-web-worker)
20. [常见 HTML 实体字符（转义）](#20-常见-html-实体字符转义)
21. [script 的 async 和 defer 有什么区别？放在哪里？](#21-script-的-async-和-defer-有什么区别放在哪里)
22. [资源提示：preload、prefetch、preconnect、dns-prefetch](#22-资源提示preloadprefetchpreconnectdns-prefetch)
23. [如何实现图片懒加载？](#23-如何实现图片懒加载)
24. [HTML 层面如何做 SEO 优化？](#24-html-层面如何做-seo-优化)
25. [什么是 Web Components？](#25-什么是-web-components)
26. [什么是无障碍（a11y）？ARIA 是什么？](#26-什么是无障碍a11yaria-是什么)

---

## 1. 什么是 DOCTYPE？有什么作用？

`DOCTYPE`（文档类型声明）是 HTML 文档最顶端的一行声明，用来告诉浏览器**以哪种文档标准来解析页面**。

```html
<!DOCTYPE html>
```

**作用：**

- 告诉浏览器使用 **标准模式（Standards Mode）** 渲染页面，而不是怪异模式（Quirks Mode）。
- 在怪异模式下，浏览器会模拟旧版本（如 IE5）的解析行为，导致盒模型、行高、百分比宽度等表现异常。
- 现代写法 `<!DOCTYPE html>` 即 HTML5 标准声明，简洁且不区分大小写。

**怪异模式常见差异示例：**

| 表现 | 标准模式 | 怪异模式 |
| --- | --- | --- |
| 盒模型 | `width` 只含 content | `width` 含 padding + border |
| 行内元素行高 | 按标准 | 会出现无法撑开父元素的问题 |

> 注意：`DOCTYPE` 不是 HTML 标签，它必须写在文档的第一行、`<html>` 之前。

---

## 2. HTML5 有哪些新特性？

**1）语义化标签**

`header`、`nav`、`main`、`article`、`section`、`aside`、`footer`、`figure`、`figcaption` 等，让结构更清晰、利于 SEO 与可访问性。

**2）新的表单能力**

- 新的 `type`：`email`、`url`、`number`、`range`、`date`、`time`、`color`、`search` 等。
- 新的属性：`placeholder`、`required`、`autofocus`、`pattern`、`min`、`max`、`step`、`multiple`。
- 新的元素：`datalist`、`output`、`progress`、`meter`。
- **原生表单验证**，无需 JS 即可做基础校验。

**3）多媒体**

`<audio>`、`<video>`、`<source>`、`<track>`，摆脱了对 Flash 的依赖。

**4）图形与特效**

`<canvas>`（位图，脚本绘制）、`<svg>`（矢量）。

**5）存储**

`localStorage`、`sessionStorage`、IndexedDB，容量远大于 cookie。

**6）新 API**

- 地理定位 `Geolocation`
- 拖放 `Drag and Drop`
- Web Worker（多线程）
- WebSocket（全双工通信）
- History API（`pushState` / `replaceState`）
- 文件 API `FileReader`

**7）其他**

- `data-*` 自定义数据属性
- 更简洁的 `<!DOCTYPE html>` 和字符集声明 `<meta charset="utf-8">`

---

## 3. HTML5 的 input 元素有哪些 type 属性？

| type | 说明 |
| --- | --- |
| `text` | 单行文本（默认） |
| `password` | 密码，输入内容以圆点显示 |
| `email` | 邮箱，自带格式校验 |
| `url` | 网址 |
| `tel` | 电话号码（不校验格式） |
| `number` | 数字，配合 `min`/`max`/`step` |
| `range` | 滑块 |
| `search` | 搜索框 |
| `date` / `time` / `datetime-local` / `month` / `week` | 日期时间类 |
| `color` | 颜色选择器 |
| `file` | 文件上传，可用 `multiple`、`accept` |
| `checkbox` | 复选框 |
| `radio` | 单选框（同名互斥） |
| `submit` / `reset` / `button` | 提交 / 重置 / 普通按钮 |
| `hidden` | 隐藏域，随表单一起提交 |
| `image` | 用图片作为提交按钮 |

```html
<input type="email" required placeholder="请输入邮箱">
<input type="number" min="1" max="100" step="5" value="10">
<input type="file" accept="image/*" multiple>
```

---

## 4. 什么是 HTML 语义化？有哪些语义化标签？

**语义化**是指：根据内容的**含义**选择恰当的标签，而不是一味用 `div` + `span` 堆砌。

**好处：**

- **对 SEO 友好**：爬虫能更好地理解页面结构。
- **可读性/可维护性高**：代码结构清晰，便于团队协作。
- **无障碍（a11y）**：屏幕阅读器等辅助设备能正确朗读。

**常用的语义化标签：**

- 结构：`header`、`nav`、`main`、`article`、`section`、`aside`、`footer`
- 文本：`h1`~`h6`、`p`、`strong`（强调重要性）、`em`（强调语气）、`blockquote`、`code`、`pre`
- 图表：`figure`、`figcaption`
- 表单：`label`、`fieldset`、`legend`

**反例：**

```html
<!-- 不推荐：全是 div，没有语义 -->
<div class="header">
  <div class="nav">...</div>
</div>
```

**推荐：**

```html
<header>
  <nav>...</nav>
</header>
```

---

## 5. src 和 href 的区别？

| | `src` | `href` |
| --- | --- | --- |
| 含义 | source，**替换**当前元素 | hypertext reference，**引用/关联**资源 |
| 加载行为 | 会**阻塞**页面解析，等资源加载完再继续 | 并行下载，不阻塞解析 |
| 作用对象 | `img`、`script`、`iframe`、`video` 等 | `link`、`a`、`area` 等 |
| 本质 | 把资源内容嵌入到当前位置 | 建立与目标资源的关联 |

- `src`：浏览器遇到 `<img src="a.png">` 会暂停解析、下载图片并替换 `<img>` 元素。
- `href`：`<link href="a.css">` 只是建立关联，样式表会并行下载。

---

## 6. link 标签和 @import 的区别？

| | `<link>` | `@import` |
| --- | --- | --- |
| 归属 | HTML 标签 | CSS 语法 |
| 加载时机 | 与页面**并行**加载 | 等 CSS 文件下载并解析后才加载 |
| 兼容性 | 所有浏览器 | IE5+（现代浏览器均支持） |
| 阻塞 | 会阻塞渲染（`rel=stylesheet`） | 也是，但串行更容易造成 FOUC |
| 动态修改 | 可通过 JS 动态插入/删除 | 不能动态插入 |
| 权重 | 同条件下 `link` 优先 | —— |

```html
<!-- 推荐 -->
<link rel="stylesheet" href="a.css">

<!-- 不推荐：@import 会导致串行加载 -->
<style>
  @import url("a.css");
</style>
```

**结论：优先使用 `<link>`**，`@import` 仅在无法修改 HTML（如内联样式）时才考虑。

---

## 7. iframe 有哪些优缺点及使用场景？

**优点：**

- 内容可完全隔离（独立的文档环境、独立的 CSS/JS）。
- 便于嵌入第三方内容（广告、地图、视频、支付）。
- 可以并行加载、局部刷新，不必重载整个页面。

**缺点：**

- **阻塞主页面 `onload`**（可通过 JS 动态设置 `src` 缓解）。
- **SEO 不友好**，搜索引擎一般不会索引 iframe 内容。
- 会增加 HTTP 请求，性能开销大。
- 每次进入都要重新加载，无法共享缓存。
- 可能带来**安全问题**（点击劫持、XSS），需要配合 `sandbox`、`X-Frame-Options`。
- 移动端兼容性差、滚动条/自适应高度处理麻烦。

**使用场景：**

- 嵌入第三方页面（地图、广告、在线编辑器）。
- 独立的微前端子系统。
- 需要强隔离的运行环境（如在线代码沙箱）。

**安全示例：**

```html
<iframe src="https://example.com" sandbox="allow-scripts allow-same-origin"></iframe>
```

---

## 8. 块级元素、行内元素、行内块元素的区别？

| | 块级 block | 行内 inline | 行内块 inline-block |
| --- | --- | --- | --- |
| 是否换行 | 独占一行 | 不换行，并排 | 不换行，并排 |
| 宽高 | 可设置，默认撑满父容器 | **不可设置**，由内容决定 | 可设置 |
| margin/padding | 四方向都有效 | 水平有效，垂直不撑开父元素 | 四方向都有效 |
| 常用标签 | `div`、`p`、`h1`、`ul`、`li` | `span`、`a`、`em`、`strong` | `img`、`input`、`button` |

**补充：**

- 行内元素垂直方向的 `margin`/`padding` 虽然会占位，但**不会撑开父元素高度**。
- `inline-block` 之间会有**空白间隙**（由 HTML 中的换行/空格产生），可通过父元素 `font-size: 0` 或用 `float`/`flex` 解决。

---

## 9. 置换元素和非置换元素？为什么 img 是 inline 却能设置宽高？

- **置换元素（Replaced Element）**：元素内容由外部资源决定，浏览器用外部资源替换元素内容。典型：`img`、`input`、`textarea`、`select`、`video`、`canvas`。
- **非置换元素**：内容由 CSS/文档内容决定，如 `div`、`span`、`p`。

`img` 的默认 `display` 是 `inline`，但它属于**置换元素**，浏览器规范允许置换元素设置 `width`/`height`。所以在 `<img>` 上写宽高是生效的。

> 常见坑：`img` 作为 inline 元素，底部会留有几像素的空白（基线对齐问题），可通过 `display: block` 或 `vertical-align: middle` 消除。

---

## 10. HTML 全局属性有哪些？

全局属性（Global Attributes）可用于**所有** HTML 元素。

| 属性 | 作用 |
| --- | --- |
| `id` | 唯一标识 |
| `class` | 类名，可复用 |
| `style` | 内联样式 |
| `title` | 悬停提示文本 |
| `lang` | 元素内容的语言 |
| `hidden` | 隐藏元素 |
| `tabindex` | Tab 键聚焦顺序 |
| `contenteditable` | 元素内容是否可编辑 |
| `draggable` | 是否可拖拽 |
| `data-*` | 自定义数据属性 |
| `accesskey` | 快捷键 |
| `spellcheck` | 拼写检查 |
| `dir` | 文本方向（ltr/rtl） |

```html
<div contenteditable="true">这里可以直接编辑</div>
<div data-id="1001" data-role="admin"></div>
```

---

## 11. meta 标签有哪些作用？

`<meta>` 用于描述文档的**元信息**，位于 `<head>` 中，不会显示在页面上。

```html
<!-- 字符编码，必须放在最前面 -->
<meta charset="utf-8">

<!-- 视口设置，移动端适配关键 -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">

<!-- SEO -->
<meta name="description" content="页面描述">
<meta name="keywords" content="关键词1,关键词2">
<meta name="author" content="作者">

<!-- 搜索引擎索引控制 -->
<meta name="robots" content="noindex,nofollow">

<!-- 等价于 HTTP 头，如定时刷新、缓存控制 -->
<meta http-equiv="refresh" content="5;url=https://example.com">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
```

**常用名：** `viewport` 是移动端适配的基础，`description` 影响搜索结果的摘要展示。

---

## 12. alt 和 title 的区别？

| | `alt` | `title` |
| --- | --- | --- |
| 适用 | `img`、`area`、`input[image]` | 几乎所有元素（全局属性） |
| 作用 | 图片无法显示时**替代显示**的文字；屏幕阅读器朗读 | 鼠标悬停时的**提示文字** |
| 是否显示 | 图片加载成功时不显示 | 悬停时显示 |
| SEO | 对图片 SEO 重要 | 影响较小 |

```html
<img src="cat.png" alt="一只橘猫" title="点击查看大图">
```

> 最佳实践：`alt` 应描述图片内容；纯装饰性图片使用 `alt=""`，让屏幕阅读器忽略它。

---

## 13. 响应式图片：srcset、sizes 和 picture 标签

**1）`srcset` + `sizes`：让浏览器按分辨率和视口宽度自动选择**

```html
<img
  src="small.jpg"
  srcset="small.jpg 480w, medium.jpg 800w, large.jpg 1200w"
  sizes="(max-width: 600px) 100vw, 50vw"
  alt="示例图片"
>
```

- `480w` 表示图片实际宽度 480px。
- `sizes` 告诉浏览器在不同视口下图片的显示宽度。
- 浏览器综合 **DPR + 视口宽度** 选出最合适的一张。

**2）`<picture>`：用于艺术方向（art direction）或格式降级**

```html
<picture>
  <source media="(min-width: 800px)" srcset="wide.jpg">
  <source media="(max-width: 799px)" srcset="narrow.jpg">
  <source type="image/webp" srcset="a.webp">
  <img src="fallback.jpg" alt="示例">
</picture>
```

浏览器会从上到下匹配，选择第一个满足条件的 `<source>`；`<img>` 作为最终兜底。

---

## 14. 常见图片格式及区别？

| 格式 | 特点 | 适用场景 |
| --- | --- | --- |
| JPEG/JPG | 有损压缩，体积小，不支持透明 | 照片、色彩丰富的图片 |
| PNG | 无损压缩，支持透明，体积较大 | 图标、需要透明的图 |
| GIF | 支持动画，只有 256 色 | 简单动图 |
| WebP | 同时支持有损/无损、透明、动画，体积比 JPEG/PNG 小 25%~35% | 现代浏览器首选 |
| AVIF | 压缩率更高，但兼容性与编码速度一般 | 追求极致体积 |
| SVG | 矢量图，无限缩放不失真，体积小 | 图标、logo、简单插画 |

> 实践：优先 WebP，用 `<picture>` 为老浏览器降级到 JPEG/PNG。

---

## 15. 表单元素与表单属性

**常用表单元素：** `form`、`input`、`textarea`、`select`、`option`、`button`、`label`、`fieldset`、`legend`、`datalist`、`output`、`progress`、`meter`。

**常用表单属性：**

- `action`：提交地址
- `method`：`GET` / `POST`
- `enctype`：编码方式，文件上传需 `multipart/form-data`
- `target`：提交结果打开位置
- `novalidate`：关闭原生校验

**input 常用校验属性：**

```html
<form action="/submit" method="post" enctype="multipart/form-data">
  <label for="name">姓名</label>
  <input id="name" name="name" type="text" required minlength="2" placeholder="请输入姓名">

  <label for="age">年龄</label>
  <input id="age" name="age" type="number" min="0" max="120">

  <input type="submit" value="提交">
</form>
```

**重点：`label` 的 `for` 与 `input` 的 `id` 关联**，点击文字即可聚焦输入框，且提升无障碍体验。

**GET 与 POST 的区别：**

| | GET | POST |
| --- | --- | --- |
| 参数位置 | URL 查询串 | 请求体 |
| 长度限制 | 有（受 URL 限制） | 无硬性限制 |
| 安全性 | 明文可见，不适合敏感数据 | 相对安全 |
| 幂等/缓存 | 幂等、可缓存 | 非幂等、默认不缓存 |

---

## 16. data-* 自定义属性的作用？

`data-*` 允许在元素上存储**自定义数据**，且符合标准、不会与未来属性冲突。

```html
<div id="user" data-id="123" data-role="admin" data-user-name="Tom"></div>
<script>
  const el = document.getElementById('user');
  // dataset 中：驼峰命名（data-user-name -> userName）
  console.log(el.dataset.id);       // "123"
  console.log(el.dataset.userName); // "Tom"
  el.dataset.role = 'guest';        // 修改
</script>
```

**用途：** 在 HTML 与 JS 之间传递数据、标记状态、配合事件委托定位元素。

---

## 17. cookie、localStorage、sessionStorage 的区别？

| | cookie | localStorage | sessionStorage |
| --- | --- | --- | --- |
| 生命周期 | 可设置过期时间，默认会话结束失效 | 永久，除非手动清除 | 当前标签页会话，关闭即清除 |
| 容量 | 约 4KB | 约 5MB | 约 5MB |
| 是否随请求发送 | **会**（同源请求自动带上） | 不会 | 不会 |
| 作用域 | 同源 + 路径/域 | 同源（不同标签共享） | 同源且同标签页 |
| API | `document.cookie`（较繁琐） | `setItem/getItem/removeItem` | 同 localStorage |
| 服务端可读 | 可以 | 不可以 | 不可以 |

**使用建议：**

- 需要服务端读取（如登录态）：用 cookie，并配合 `HttpOnly`、`Secure`、`SameSite`。
- 缓存大量数据、减少请求：用 localStorage / sessionStorage。
- 敏感信息不要明文存在前端存储中。

---

## 18. canvas 和 svg 的区别？

| | canvas | svg |
| --- | --- | --- |
| 类型 | 位图（像素） | 矢量（点线面） |
| 缩放 | 放大会失真 | 无限缩放不失真 |
| 绘制方式 | JS 脚本逐像素绘制 | XML 描述元素 |
| DOM | 单个元素，内部不可访问 | 每个图形都是 DOM 节点，可绑定事件 |
| 性能 | 图形多时更优，适合频繁重绘 | 图形多时 DOM 开销大 |
| 适用 | 游戏、视频处理、大量数据可视化、图像编辑 | 图标、logo、地图、需交互的矢量图 |

---

## 19. 什么是 Web Worker？

Web Worker 让 JS 在**后台线程**运行，避免耗时计算阻塞主线程（UI 渲染）。

```js
// main.js
const worker = new Worker('worker.js');
worker.postMessage({ num: 1000000 });
worker.onmessage = (e) => console.log('结果：', e.data);

// worker.js
onmessage = (e) => {
  let sum = 0;
  for (let i = 0; i < e.data.num; i++) sum += i;
  postMessage(sum);
};
```

**限制：**

- 不能直接操作 DOM。
- 与主线程通过 `postMessage` 通信（结构化克隆，大数据建议用 `Transferable`）。
- 遵守同源策略。

**适用：** 大量计算、数据处理、图像处理、加密运算。

---

## 20. 常见 HTML 实体字符（转义）

HTML 中 `<`、`>`、`&` 等字符有特殊含义，需要转义后才能作为文本显示。

| 字符 | 实体 |
| --- | --- |
| `<` | `&lt;` |
| `>` | `&gt;` |
| `&` | `&amp;` |
| `"` | `&quot;` |
| `'` | `&#39;` 或 `&apos;` |
| 空格 | `&nbsp;`（不换行空格） |
| © | `&copy;` |
| ® | `&reg;` |

```html
<p>1 &lt; 2 &amp;&amp; 3 &gt; 2</p>
<!-- 渲染为：1 < 2 && 3 > 2 -->
```

---

## 21. script 的 async 和 defer 有什么区别？放在哪里？

`<script>` 默认是**同步阻塞**的：浏览器解析 HTML 时遇到它，必须停下解析，下载并执行完脚本后才继续。

| | 普通 script | async | defer |
| --- | --- | --- | --- |
| 是否阻塞解析 | **阻塞** | 不阻塞（并行下载） | 不阻塞（并行下载） |
| 执行时机 | 下载完立即执行 | 下载完**立即执行**（可能打断解析） | HTML 解析完成后、`DOMContentLoaded` 之前执行 |
| 执行顺序 | 按出现顺序 | **不保证**（谁先下载完谁先执行） | **保证**按出现顺序 |
| 适用场景 | 少量必须同步执行的脚本 | 独立无依赖的脚本（统计、广告） | 需要操作 DOM、有依赖关系的脚本 |

```html
<head>
  <!-- 推荐：放在 head 中配合 defer，既不阻塞解析又保证顺序 -->
  <script src="main.js" defer></script>
  <script src="analytics.js" async></script>
</head>
```

**放置位置的历史演变：**

- 传统做法把 `<script>` 放在 `</body>` 前，避免阻塞首屏解析。
- 现代做法放在 `<head>` 中并加 `defer`。

**相关事件：**

- `DOMContentLoaded`：DOM 解析完成（`defer` 脚本执行完毕）后触发。
- `load`：页面所有资源（图片、样式、iframe）加载完成后触发。

---

## 22. 资源提示：preload、prefetch、preconnect、dns-prefetch

通过 `<link rel="...">` 提前做网络准备，缩短关键资源的加载时间。

```html
<!-- 提前做 DNS 解析（最轻量） -->
<link rel="dns-prefetch" href="//cdn.example.com">

<!-- 提前建立 TCP/TLS 连接 -->
<link rel="preconnect" href="https://cdn.example.com" crossorigin>

<!-- 提前以高优先级加载当前页需要的资源，必须写 as -->
<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin>

<!-- 预取将来（如下一页）可能用到的资源，空闲时下载 -->
<link rel="prefetch" href="next-page.js">

<!-- 非阻塞加载 CSS -->
<link rel="preload" as="style" href="critical.css" onload="this.rel='stylesheet'">
```

| 指令 | 作用 | 优先级 |
| --- | --- | --- |
| `dns-prefetch` | 提前解析域名 | 低 |
| `preconnect` | 提前完成 DNS + TCP + TLS 握手 | 低 |
| `preload` | 提前加载**当前页**确实需要的资源 | 高 |
| `prefetch` | 预取**将来**可能用到的资源 | 最低 |

**注意：** `preload` 必须声明 `as`，否则浏览器会重复下载；也不要 `preload` 用不到的资源，会白白占用带宽。

---

## 23. 如何实现图片懒加载？

**懒加载**：只加载进入或接近视口的图片，减少首屏请求、提升加载速度。

**方式一：原生属性（最简单）**

```html
<img src="photo.jpg" loading="lazy" alt="示例">
<!-- eager（默认）立即加载，lazy 延迟加载 -->
```

**方式二：IntersectionObserver（推荐）**

```js
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;      // 用真实地址替换占位
      observer.unobserve(img);        // 加载后停止观察
    }
  });
});

document.querySelectorAll('img[data-src]').forEach((img) => observer.observe(img));
```

```html
<img data-src="real.jpg" src="placeholder.png" alt="示例">
```

**方式三：scroll + getBoundingClientRect（兼容老浏览器）**

```js
const rect = img.getBoundingClientRect();
if (rect.top < window.innerHeight) {
  img.src = img.dataset.src;
}
```

> 实现要点：用占位图/固定宽高避免布局抖动，图片加载后停止监听。

---

## 24. HTML 层面如何做 SEO 优化？

- **语义化结构**：合理使用 `header`/`nav`/`main`/`article`/`h1~h6`，`h1` 全页唯一，标题层级不跳级。
- **`<title>` 与 `meta description`**：准确描述页面内容，影响搜索结果标题与摘要。
- **图片 `alt`**：描述图片内容，利于图片搜索与无障碍。
- **链接**：锚文本有意义（避免「点击这里」），外链加 `rel="noopener noreferrer"`。
- **可抓取**：核心内容用 HTML 直出，避免全靠 JS 渲染；配合 `robots.txt`、`sitemap.xml`。
- **避免重复内容**：使用 `<link rel="canonical" href="...">` 指定规范链接。
- **结构化数据**：用 JSON-LD 标注（如文章、面包屑、评分）。
- **移动端与性能**：响应式适配 + 良好的 LCP/CLS 等核心指标。

---

## 25. 什么是 Web Components？

Web Components 是 W3C 的原生组件标准，用浏览器能力封装可复用、可隔离的组件，由三部分组成：

1. **Custom Elements（自定义元素）**：注册自定义标签。
2. **Shadow DOM（影子 DOM）**：结构与样式隔离，外部样式不影响内部。
3. **HTML Templates**：`<template>`、`<slot>` 定义可复用模板。

```js
class MyCard extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>p { color: #6f42c1; }</style>
      <p><slot></slot></p>
    `;
  }
}
customElements.define('my-card', MyCard);
```

```html
<my-card>插槽内容</my-card>
```

**优点：** 原生、无需框架、天然样式隔离、可跨框架复用。

**缺点：** 数据绑定/状态管理需自己实现，SSR 支持较弱，生态不如 React/Vue。

---

## 26. 什么是无障碍（a11y）？ARIA 是什么？

**无障碍（accessibility，简称 a11y）**：让视障、听障、运动障碍用户也能正常使用网页。

**常见实践：**

- 语义化标签、`alt`、`<label>` 关联表单控件。
- **键盘可达**：所有交互元素可聚焦、有可见的焦点样式，`tabindex` 顺序合理。
- **颜色对比度**达标，不单靠颜色传递信息。
- 支持屏幕阅读器（VoiceOver、NVDA）。

**ARIA（Accessible Rich Internet Applications）**：当原生语义不足时，用角色和属性补充语义。

```html
<button aria-label="关闭弹窗" aria-expanded="false">×</button>
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">...</div>
<img src="chart.png" alt="2024 年销售额同比增长 30%">
```

**常用 ARIA 属性：** `role`、`aria-label`、`aria-labelledby`、`aria-hidden`、`aria-expanded`、`aria-live`。

> 原则：「No ARIA is better than bad ARIA」——能用原生语义标签解决就不要用 ARIA。