# 对象扁平化 / 数组扁平化

> **题目一：实现 `flattenObj`，把多层嵌套的对象（含数组）铺平成单层对象，key 用 `.` 连接对象、用 `[i]` 连接数组下标。**
>
> **题目二：实现数组扁平化，把多层嵌套数组铺平成一维数组。**

---

## 目录

1. [题目一：对象扁平化](#1-题目一对象扁平化)
2. [对象扁平化完整实现](#2-对象扁平化完整实现)
3. [题目二：数组扁平化](#3-题目二数组扁平化)
4. [数组扁平化四种解法](#4-数组扁平化四种解法)
5. [易错点](#5-易错点)
6. [目录文件说明](#6-目录文件说明)

---

## 1. 题目一：对象扁平化

**输入**

```js
const input = {
    a: 1,
    b: [1, 2, { c: true }, [3]],
    d: { e: 2, f: 3 },
    g: null,
};
```

**输出**

```js
{
    a: 1,
    'b[0]': 1,
    'b[1]': 2,
    'b[2].c': true,
    'b[3][0]': 3,
    'd.e': 2,
    'd.f': 3,
    g: null,
}
```

**规则**

- 只有**普通对象和数组**才继续向下展开；其他类型（数字、字符串、布尔、`null`）作为叶子节点直接输出。
- 拼接 key 时：父级是**数组**用 `[index]`，父级是**对象**用 `.key`。
- `null` 的 `typeof` 也是 `'object'`，必须单独判断，否则会报错或产生空对象。

---

## 2. 对象扁平化完整实现

**思路（DFS 深度优先）**：用一个 `dfs(target, oldKey)` 递归遍历，`oldKey` 是「父级拼好的路径前缀」，每进一层就把当前 key 拼到前缀上。

```js
function flattenObj(obj) {
    const res = {};

    /**
     * @param {object|Array} target 当前遍历的对象/数组
     * @param {string} oldKey 父级已拼好的路径前缀
     */
    function dfs(target, oldKey) {
        for (const key in target) {
            let newKey;
            if (oldKey) {
                // 父级是数组 → b[0]；父级是对象 → d.e
                newKey = Array.isArray(target) ? `${oldKey}[${key}]` : `${oldKey}.${key}`;
            } else {
                newKey = key; // 顶层直接使用自身 key
            }

            const value = target[key];
            // 只有对象/数组才继续展开（null 的 typeof 也是 'object'，需排除）
            if (typeof value === 'object' && value !== null) {
                dfs(value, newKey);
            } else {
                res[newKey] = value;
            }
        }
    }

    dfs(obj, '');
    return res;
}

console.log(flattenObj(input));
```

**可选的健壮性增强**（面试加分项）：只展开「普通对象」和数组，避免把 `Date`、`RegExp` 等也拆开。

```js
// 是否是「普通对象」（排除 null / 数组 / Date / RegExp 等）
const isPlainObject = (v) =>
    Object.prototype.toString.call(v) === '[object Object]';

const shouldFlatten = (v) => Array.isArray(v) || isPlainObject(v);
```

把上面 `if (typeof value === 'object' && value !== null)` 换成 `if (shouldFlatten(value))` 即可。

---

## 3. 题目二：数组扁平化

**输入**：`[1, [2, [3]]]` → **输出**：`[1, 2, 3]`

---

## 4. 数组扁平化四种解法

**① 原生 API（最省事）**

```js
[1, [2, [3]]].flat(Infinity); // [1, 2, 3]
```

`flat(depth)` 指定展开层数，`Infinity` 表示无限展开。

**② 递归 + 循环**

```js
function flattenArr(target) {
    const res = [];
    for (const item of target) {
        if (Array.isArray(item)) {
            res.push(...flattenArr(item));
        } else {
            res.push(item);
        }
    }
    return res;
}
```

**③ 递归 + reduce（函数式）**

```js
function flattenArr(target) {
    return target.reduce(
        (pre, item) => pre.concat(Array.isArray(item) ? flattenArr(item) : item),
        []
    );
}
```

**④ while + concat（迭代式，逐层拍扁）**

```js
function flattenArr(target) {
  while (target.some((item) => Array.isArray(item))) {
    target = [].concat(...target); // 展开一层
  }
  return target;
}
```

> 四种解法对应目录中的 `arr2.js`(②)、`arr4.js`(③)、`arr3.js`(④)，`arr.js` 同为递归思路，`1.js` 为原生 `flat` 演示。

---

## 5. 易错点

- **`null` 陷阱**：`typeof null === 'object'`，展开前必须显式排除 `null`。
- **数组的 key 是字符串**：`for...in` 遍历数组得到的下标是字符串（`'0'`、`'1'`），拼 key 时无需转换。
- **`for...in` 会遍历到原型链上的可枚举属性**，处理纯数据对象一般没问题；严谨场景应使用 `Object.keys()`。
- **区分「叶子值」与「空对象/空数组」**：空对象 `{}` 会被当作需要展开的对象，最终不会产生任何 key，这与预期是否一致需提前想清楚。
- **数组扁平化只用 `concat` 会丢失引用**：`concat` 返回新数组，不会修改原数组，可放心使用。

---

## 6. 目录文件说明

| 文件 | 说明 |
| --- | --- |
| [index.js](index.js) | 对象扁平化主实现 |
| [arr.js](arr.js) | 数组扁平化：递归 + 循环 |
| [arr2.js](arr2.js) | 数组扁平化：递归 + reduce |
| [arr3.js](arr3.js) | 数组扁平化：while + concat |
| [arr4.js](arr4.js) | 数组扁平化：递归 + concat |
| [1.js](1.js) | 原生 `Array.prototype.flat` 演示 |
| [2.js](2.js) | `for...in` 遍历数组的下标演示 |