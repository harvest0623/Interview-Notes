# 千分位处理（数字格式化）

> **题目：把 `35168461321.542345` 格式化为 `35,168,461,321.54`（整数部分每三位加一个逗号，保留两位小数）。**

考察点：字符串遍历、数组操作、正则表达式、国际化 API `Intl.NumberFormat`。

---

## 目录

1. [需求拆解](#1-需求拆解)
2. [解法一：字符串倒序遍历](#2-解法一字符串倒序遍历)
3. [解法二：数组 unshift](#3-解法二数组-unshift)
4. [解法三：转数组后 reverse](#4-解法三转数组后-reverse)
5. [解法四：正则前瞻](#5-解法四正则前瞻)
6. [解法五：Intl.NumberFormat](#6-解法五intlnumberformat)
7. [五种解法对比](#7-五种解法对比)
8. [易错点](#8-易错点)

---

## 1. 需求拆解

1. **保留两位小数**：用 `toFixed(2)`。
2. **分离整数与小数部分**：`split('.')`。
3. **整数部分每三位插入逗号**：这是核心。
4. **拼回小数部分**。

难点在第 3 步：**必须从右往左数**每三位插入一个逗号。

---

## 2. 解法一：字符串倒序遍历

```js
function toThousand(num) {
    const [int, decimal] = num.toFixed(2).split('.');
    let result = '';
    // 从右往左遍历整数部分
    for (let i = int.length - 1, count = 1; i >= 0; i--, count++) {
        result = int[i] + result;           // 当前数字拼到结果最前面
        if (count % 3 === 0 && i !== 0) {   // 每 3 位且不是最高位时插入逗号
          r esult = ',' + result;
        }
    }
    return result + '.' + decimal;
}
```

对应 [1.js](1.js)。

---

## 3. 解法二：数组 unshift

```js
function toThousand(num) {
    const [integer, decimal] = num.toFixed(2).split('.');
    const res = [];
    let len = 0;
    for (let i = integer.length - 1; i >= 0; i--) {
        res.unshift(integer[i]);            // 从头部插入，保持顺序
        len++;
        if (len % 3 === 0 && i !== 0) {
            res.unshift(',');
        }
    }
    return res.join('') + '.' + decimal;
}
```

对应 [2.js](2.js)。

---

## 4. 解法三：转数组后 reverse

先 `split('')` 拆成字符数组再 `reverse()`，从左往右每三位加逗号，最后再 `reverse()` 回来：

```js
function toThousand(num) {
    const [int, decimal] = num.toFixed(2).split('.');
    const reverseInt = int.split('').reverse();
    const result = [];
    reverseInt.forEach((char, index) => {
        result.push(char);
        if ((index + 1) % 3 === 0 && index !== reverseInt.length - 1) {
            result.push(',');
        }
    });
    return `${result.reverse().join('')}.${decimal}`;
}
```

对应 [3.js](3.js)。

---

## 5. 解法四：正则前瞻

一行搞定，利用「正向先行断言」匹配后面恰好跟着「若干组三位数字 + 小数点」的数字：

```js
// \d(?=(\d{3})+\.) ：匹配一个数字，其后面是 (3 的倍数个数字) 再加小数点
num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
```

对应 [4.js](4.js)。

> 原理：`(?=(\d{3})+\.)` 是**先行断言**，只做条件判断、不消费字符。对整数部分从右往左看，每个「后面还剩 3 的倍数个数字」的位置就是要加逗号的位置。

---

## 6. 解法五：Intl.NumberFormat

内容型题目里最省事、最不易出错的方式，直接交给国际化 API 处理：

```js
new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
}).format(num);
// '35,168,461,321.54'
```

对应 [5.js](5.js)。

---

## 7. 五种解法对比

| 解法 | 可读性 | 健壮性 | 说明 |
| --- | --- | --- | --- |
| 字符串倒序遍历 | 中 | 中 | 手动控制，面试常写 |
| 数组 unshift | 中 | 中 | `unshift` 有一定性能开销 |
| 转数组 reverse | 高 | 中 | 思路清晰，两次 reverse |
| 正则前瞻 | 高 | 中 | 一行代码，需理解断言 |
| Intl.NumberFormat | 最高 | 高 | **生产推荐**，自动处理负数/分组 |

> 面试建议：先能手写一种（体现基本功），再补充「实际项目优先用 `Intl.NumberFormat`」。

---

## 8. 易错点

- **必须从右往左数**每三位，从左往右分组会错位（例如 1234567 要分成 `1,234,567`）。
- **最高位前不要加逗号**：判断里都有 `i !== 0` / `index !== 最后一位` 这个条件，否则结果会变成 `,351...`。
- **负数没处理**：上述手写方案对 `-1234567` 会把负号一起参与分组。生产场景要么用 `Intl.NumberFormat`，要么先取出符号再分组。
- **精度问题**：`35168461321.542345` 作为 `number` 存储时本身就有精度损失，`toFixed(2)` 只是按规则取整显示；金额等高精度场景应使用字符串或 `BigInt`/专用库。
- **逗号是「显示格式」而非数据**：如果需要参与计算，务必存数字、只在展示时格式化。