# 手写题进阶 · 03 数据结构与 DOM 篇

[← 返回总览](README.md)

> 内容：数组转树与树转数组、大数相加、简易 hash 路由、虚拟 DOM 与 diff、模板引擎、深比较 `deepEqual`（共 6 题）。

---

## 目录

1. [数组转树与树转数组](#1-数组转树与树转数组)
2. [大数相加](#2-大数相加)
3. [简易 hash 路由](#3-简易-hash-路由)
4. [虚拟 DOM 与 diff](#4-虚拟-dom-与-diff)
5. [模板引擎](#5-模板引擎)
6. [手写深比较 deepEqual](#6-手写深比较-deepequal)

---

## 1. 数组转树与树转数组

**题目：**

```js
const list = [
  { id: 1, parentId: null, name: '总经办' },
  { id: 2, parentId: 1, name: '研发部' },
  { id: 3, parentId: 2, name: '前端组' },
  { id: 4, parentId: 1, name: '市场部' },
];
// toTree(list)  → 嵌套结构
// flattenTree(tree) → 回到扁平数组
```

**数组转树：一次遍历 + Map（O(n)）**

朴素写法对每个节点都去 `find` 父节点，复杂度 O(n²)。正确做法是**先建索引，再挂载**。

```js
function toTree(list, rootId = null) {
  const map = new Map();
  // 1. 建索引，同时拷贝一份，避免修改原数据
  for (const item of list) {
    map.set(item.id, { ...item, children: [] });
  }

  const roots = [];
  // 2. 一次遍历完成挂载
  for (const node of map.values()) {
    if (node.parentId === rootId || !map.has(node.parentId)) {
      roots.push(node); // 根节点，或父节点不在列表中的孤儿节点
    } else {
      map.get(node.parentId).children.push(node);
    }
  }

  // 3. 可选：叶子节点不保留空 children，便于渲染
  for (const node of map.values()) {
    if (node.children.length === 0) delete node.children;
  }

  return roots;
}
```

**树转数组：DFS**

```js
function flattenTree(tree, parentId = null, result = []) {
  for (const node of tree) {
    const { children, ...rest } = node;
    result.push({ ...rest, parentId });
    if (children?.length) flattenTree(children, node.id, result);
  }
  return result;
}
```

**递归 vs 迭代：**

| 方式 | 优点 | 风险 |
| --- | --- | --- |
| 递归 | 代码短、可读 | 树很深时爆栈（约 1 万层） |
| 显式栈 | 不怕深 | 需要手动维护父节点关系 |

迭代版：

```js
function flattenTreeIterative(tree) {
  const result = [];
  const stack = tree.map((node) => ({ node, parentId: null }));

  while (stack.length) {
    const { node, parentId } = stack.pop();
    const { children, ...rest } = node;
    result.push({ ...rest, parentId });
    if (children) {
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push({ node: children[i], parentId: node.id });
      }
    }
  }
  return result;
}
```

**易错点：**

- 用 `find` 找父节点，复杂度退化到 O(n²)。
- 直接修改原数组元素（`item.children = []`），造成副作用。
- 忘记处理「父节点不在列表中」的孤儿节点，导致整棵树丢失。
- 环形数据（A 的父是 B，B 的父是 A）会无限递归，需要 `visited` 集合。

---

## 2. 大数相加

**题目：** 实现 `addStrings(a, b)`，计算两个超大整数字符串之和。`Number.MAX_SAFE_INTEGER` 是 `9007199254740991`，超过就会丢精度。

**思路：** 模拟竖式加法，从末尾逐位相加，处理进位。

```js
function addStrings(a, b) {
  let i = a.length - 1;
  let j = b.length - 1;
  let carry = 0;
  const result = [];

  while (i >= 0 || j >= 0 || carry) {
    const x = i >= 0 ? Number(a[i--]) : 0;
    const y = j >= 0 ? Number(b[j--]) : 0;
    const sum = x + y + carry;

    result.push(sum % 10);
    carry = Math.floor(sum / 10);
  }

  return result.reverse().join('');
}
```

**验证：**

```js
addStrings('9007199254740991', '1'); // '9007199254740992'
addStrings('999', '1');              // '1000'
addStrings('0', '0');                // '0'
```

**复杂度：** 时间 O(max(m, n))，空间 O(max(m, n))。

**追问：**

| 追问 | 要点 |
| --- | --- |
| 支持负数？ | 先判符号，再转成「大数减小数」，最后补符号；需要 `compare` 与 `subtract` |
| 支持小数？ | 按小数点拆分整数与小数部分，小数部分右对齐补零，再从低位进位 |
| 相乘？ | 竖式乘法，`res[i+j+1] += x*y`，最后统一处理进位 |
| BigInt 能不能直接用？ | 可以，`BigInt(a) + BigInt(b)`，但面试通常要求不用 BigInt |

**易错点：**

- `Number(a) + Number(b)`：超过 `MAX_SAFE_INTEGER` 直接丢精度。
- 用 `parseInt` 逐位：前导零与超长字符串可能出问题，直接 `- '0'` 或 `Number()` 更稳。
- 忘记最后还有进位（`999 + 1`）。
- 结果用 `unshift` 插入，复杂度 O(n²)；应 `push` 后 `reverse`。

---

## 3. 简易 hash 路由

**题目：** 实现一个基于 `hash` 的前端路由，支持：

- `#/user/42` 这类静态与动态路径；
- 路由注册与参数提取；
- 监听 `hashchange`；
- 默认路由与 404。

**核心步骤：**

1. 解析 `location.hash`，去掉开头的 `#`；
2. 用路由表匹配路径，提取动态参数；
3. 监听 `hashchange`，触发渲染；
4. 页面首次加载也要触发一次。

```js
class HashRouter {
  constructor({ onRoute }) {
    this.routes = [];
    this.onRoute = onRoute;
    this.current = null;

    window.addEventListener('hashchange', () => this.handle());
    window.addEventListener('load', () => this.handle());
  }

  add(path, handler) {
    // /user/:id → 正则 + 参数名
    const keys = [];
    const pattern = path.replace(/:(\w+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    });
    this.routes.push({
      path,
      regex: new RegExp(`^${pattern}$`),
      keys,
      handler,
    });
    return this;
  }

  handle() {
    const path = location.hash.slice(1) || '/';
    for (const route of this.routes) {
      const matched = path.match(route.regex);
      if (!matched) continue;

      const params = {};
      route.keys.forEach((key, i) => {
        params[key] = decodeURIComponent(matched[i + 1]);
      });

      this.current = path;
      route.handler(params);
      return;
    }
    this.onRoute?.({ path, matched: false });
  }

  push(path) {
    location.hash = path;
  }
}
```

**使用：**

```js
const router = new HashRouter({
  onRoute: ({ path }) => console.warn('404:', path),
});

router.add('/', () => renderHome());
router.add('/user/:id', ({ id }) => renderUser(id));
```

**hash 与 history 两种模式的对比：**

| 维度 | hash | history |
| --- | --- | --- |
| URL | 带 `#`，不美观 | 干净 |
| 刷新 | 不会请求服务器 | 需要服务端配置 fallback 到 index.html |
| 兼容性 | 更好 | 需要 History API |
| 监听 | `hashchange` | `popstate`（pushState 不触发） |
| SEO | 较差 | 较好 |

**易错点：**

- `hash.slice(1)` 后没有处理空值，首次进入页面时路径是 `''`，匹配不到 `/`。
- 动态参数没有 `decodeURIComponent`，中文/空格参数出错。
- 正则没有转义静态路径中的 `.`、`?` 等特殊字符。
- `pushState` 不会触发 `popstate`，history 模式需要手动调用渲染。
- 路由顺序：`/user/:id` 会匹配 `/user/list`，需要把静态路由放在动态路由前面，或按具体度排序。

---

## 4. 虚拟 DOM 与 diff

**题目：** 用 `h()` 描述节点，实现 `render()` 与 `patch()`，完成同层 diff。

**VNode 结构：**

```js
const vnode = h('ul', { class: 'list' }, [
  h('li', { key: 'a' }, ['A']),
  h('li', { key: 'b' }, ['B']),
]);
// { type: 'ul', props: {...}, children: [...], key: undefined }
```

**关键概念：**

| 概念 | 说明 |
| --- | --- |
| 同层比较 | 只比较同一层级，跨层移动视为「删除 + 新建」，复杂度 O(n) |
| `key` | 列表复用节点的唯一标识，避免按索引复用导致状态错位 |
| patch 类型 | 替换、更新属性、更新文本、增删子节点 |

**简化实现（返回 patch 描述，便于在 Node 中验证）：**

```js
function h(type, props = {}, children = []) {
  return {
    type,
    props,
    children: Array.isArray(children) ? children : [children],
    key: props.key,
  };
}

function diff(oldNode, newNode) {
  // 1. 类型不同：整棵替换
  if (!oldNode || !newNode) return [{ type: 'REPLACE', node: newNode }];
  if (typeof oldNode !== 'object' || typeof newNode !== 'object') {
    return oldNode === newNode ? [] : [{ type: 'TEXT', value: newNode }];
  }
  if (oldNode.type !== newNode.type) {
    return [{ type: 'REPLACE', node: newNode }];
  }

  const patches = [];

  // 2. 属性 diff
  const props = {};
  for (const key of new Set([...Object.keys(oldNode.props), ...Object.keys(newNode.props)])) {
    if (oldNode.props[key] !== newNode.props[key]) {
      props[key] = newNode.props[key];
    }
  }
  if (Object.keys(props).length) patches.push({ type: 'PROPS', props });

  // 3. 子节点 diff（带 key）
  const oldChildren = oldNode.children || [];
  const newChildren = newNode.children || [];
  const oldKeyed = new Map();
  oldChildren.forEach((child, index) => {
    if (child?.key != null) oldKeyed.set(child.key, { child, index });
  });

  newChildren.forEach((child, index) => {
    const key = child?.key;
    if (key != null && oldKeyed.has(key)) {
      const { child: oldChild } = oldKeyed.get(key);
      patches.push(...diff(oldChild, child).map((p) => ({ ...p, index })));
    } else if (key == null && index < oldChildren.length) {
      // 无 key：按索引比较
      patches.push(...diff(oldChildren[index], child).map((p) => ({ ...p, index })));
    } else {
      patches.push({ type: 'INSERT', index, node: child });
    }
  });

  // 4. 删除旧节点中未复用的
  const newKeys = new Set(newChildren.map((c) => c?.key).filter((k) => k != null));
  oldChildren.forEach((child, index) => {
    if (child?.key != null && !newKeys.has(child.key)) {
      patches.push({ type: 'REMOVE', index });
    }
  });

  // 5. 新列表变短：删除尾部多余的无 key 子节点
  for (let i = newChildren.length; i < oldChildren.length; i++) {
    if (oldChildren[i]?.key == null) patches.push({ type: 'REMOVE', index: i });
  }

  return patches;
}
```

**真实 DOM 版 `patch` 的要点：**

```js
function createElement(vnode) {
  if (typeof vnode === 'string') return document.createTextNode(vnode);
  const el = document.createElement(vnode.type);
  for (const [key, value] of Object.entries(vnode.props)) {
    if (key === 'key') continue;
    if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
    else el.setAttribute(key, value);
  }
  vnode.children.forEach((child) => el.appendChild(createElement(child)));
  return el;
}
```

**为什么需要 key（面试必问）：**

```js
// 旧: [A, B, C]  新: [B, A, C]
// 无 key 按索引比较：A→B、B→A、C→C，两次「替换」，输入框状态丢失
// 有 key：B、A 复用并移动，状态保留
```

**易错点：**

- 用数组索引当 key，列表插入/排序后状态错位。
- 跨层移动直接复用，导致父节点关系错误。
- diff 时修改原 VNode，导致下次 patch 基准错误。
- 事件监听每次 patch 都重复 `addEventListener`，需要解绑或使用事件委托。
- 文本节点与元素节点混用，`typeof` 判断遗漏。

---

## 5. 模板引擎

**题目：** 实现一个支持 `{{ name }}`、`{{ user.name }}` 的模板渲染函数。

**基础实现（正则替换）：**

```js
function compile(template, data) {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const value = path.split('.').reduce((obj, key) => obj?.[key], data);
    return value == null ? '' : String(value);
  });
}
```

**进阶：支持表达式与条件**

```js
function compileWithExpression(template, data) {
  return template.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, expression) => {
    // 用 with 简化作用域；生产环境不推荐，这里仅演示原理
    const fn = new Function('data', `with (data) { return (${expression}); }`);
    try {
      const value = fn(data);
      return value == null ? '' : String(value);
    } catch {
      return '';
    }
  });
}
```

**`new Function` 的性能与安全：**

| 维度 | 说明 |
| --- | --- |
| 性能 | 模板只编译一次，可缓存编译后的函数，渲染很快 |
| 安全 | 表达式本身可能执行任意代码，模板必须来自可信来源；用户输入必须转义 |
| CSP | 开启 `script-src` 不允许 `unsafe-eval` 时，`new Function` 会被禁止 |

**转义（防 XSS）：**

```js
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

// 渲染用户内容时：{{ content | safe }} 之外一律转义
```

**编译缓存：**

```js
const cache = new Map();
function compileCached(template) {
  if (!cache.has(template)) {
    const render = new Function('data', `
      with (data) {
        return \`${template.replace(/\{\{\s*(.+?)\s*\}\}/g, '${$1}')}\`;
      }
    `);
    cache.set(template, render);
  }
  return cache.get(template);
}
```

模板字符串方案需要处理反引号与 `${}` 转义，真实项目应交给成熟引擎（Vue 编译器、Handlebars、EJS）。

**易错点：**

- 正则贪婪匹配 `\{\{(.+)\}\}`：一行多个插值时把中间内容全吃掉。
- 直接把用户输入拼进 HTML：XSS。
- 每次渲染都 `new Function`：模板量大时性能差，应缓存。
- `obj?.a?.b` 返回 `undefined` 时直接 `String` 变成 `"undefined"`，需要兜底空字符串。
- 嵌套对象路径含数组索引 `list[0].name`，简单 `split('.')` 解析不了。

---

## 6. 手写深比较 deepEqual

**题目：** 实现 `deepEqual(a, b)`，比较两个值是否深度相等。

**必须覆盖的类型：**

```js
deepEqual(1, 1)                         // true
deepEqual(NaN, NaN)                     // true（Object.is）
deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }) // true
deepEqual(new Date(0), new Date(0))     // true
deepEqual(/a/g, /a/g)                   // true
deepEqual(new Map([['a', 1]]), new Map([['a', 1]]))   // true
deepEqual(a, a.self)                    // 循环引用不能死循环
```

**实现：**

```js
function deepEqual(a, b, seen = new WeakMap()) {
  // 1. 原始值：Object.is 能正确处理 NaN 与 -0
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }

  // 2. 循环引用：记录已比较过的对象对
  if (seen.has(a)) return seen.get(a) === b;
  seen.set(a, b);

  // 3. 类型标签必须一致（区分 [] 与 {}、Date 与普通对象）
  if (Object.prototype.toString.call(a) !== Object.prototype.toString.call(b)) {
    return false;
  }

  // 4. 特殊对象
  if (a instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof RegExp) return a.source === b.source && a.flags === b.flags;
  if (a instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, value] of a) {
      if (!b.has(key) || !deepEqual(value, b.get(key), seen)) return false;
    }
    return true;
  }
  if (a instanceof Set) {
    if (a.size !== b.size) return false;
    for (const value of a) {
      if (!b.has(value)) return false; // 注意：对象元素需要逐个深度比较
    }
    return true;
  }

  // 5. 普通对象 / 数组：自身可枚举属性
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key], seen)) return false;
  }

  return true;
}
```

**为什么用 `Object.is` 而不是 `===`：**

```js
NaN === NaN        // false，但深比较应视为相等
Object.is(NaN, NaN) // true
0 === -0           // true，但语义不同
Object.is(0, -0)    // false
```

**循环引用为什么不会死循环：**

`seen` 记录「a 已经和 b 比较过」，再次遇到同一对直接返回缓存结果。Map/Set 中的对象元素也应传入同一个 `seen`。

**复杂度：** 时间 O(n)，空间 O(depth)（`seen` 大小与访问过的对象数相关）。

**面试追问：**

| 追问 | 回答 |
| --- | --- |
| 原型链要不要比较？ | 通常只比较自身可枚举属性；如需严格相等，加 `Object.getPrototypeOf` 判断 |
| 函数怎么比？ | 按引用比较（`Object.is`），除非比较源码字符串（不可靠） |
| 数组稀疏/顺序？ | 数组顺序必须一致；稀疏数组可用 `Object.keys` 长度判断 |
| `Map` 的 key 是对象怎么办？ | 需要按引用或深度比较，生产库（如 lodash）有专门处理 |

**易错点：**

- 只递归普通对象，遇到 `Date` 时两个不同实例永远不相等。
- `Object.keys` 忽略 Symbol 属性与不可枚举属性。
- 循环引用没有 `seen`，直接栈溢出。
- 两个 `{}` 与 `new Foo()` 被判定相等（未比较原型）。
- 比较 Map 时只比 size，不比 value。

---

[← 返回总览](README.md)
