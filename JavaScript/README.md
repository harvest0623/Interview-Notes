# JavaScript 常见面试题

> 本文件收录 JavaScript 相关的高频面试题及参考答案，按「数据类型 → 原型/对象 → 作用域/闭包 → 异步/事件循环 → ES6+ → 数组/常用方法 → 内存/原理 → 手写题」的顺序整理。

---

## 目录

1. [JavaScript 有哪些数据类型？](#1-javascript-有哪些数据类型)
2. [typeof 的返回值有哪些？](#2-typeof-的返回值有哪些)
3. [如何准确判断数据类型？](#3-如何准确判断数据类型)
4. [宽松相等与严格相等的区别？](#4-宽松相等与严格相等的区别)
5. [隐式类型转换规则](#5-隐式类型转换规则)
6. [值类型与引用类型的区别？](#6-值类型与引用类型的区别)
7. [深拷贝与浅拷贝](#7-深拷贝与浅拷贝)
8. [原型与原型链](#8-原型与原型链)
9. [new 操作符做了什么？](#9-new-操作符做了什么)
10. [JavaScript 的继承方式](#10-javascript-的继承方式)
11. [如何判断属性是自身还是原型上的？](#11-如何判断属性是自身还是原型上的)
12. [Object.create 的作用](#12-objectcreate-的作用)
13. [作用域与作用域链](#13-作用域与作用域链)
14. [变量提升与函数提升](#14-变量提升与函数提升)
15. [var、let、const 的区别](#15-var-let-const-的区别)
16. [暂时性死区（TDZ）](#16-暂时性死区tdz)
17. [闭包是什么？应用与问题](#17-闭包是什么应用与问题)
18. [this 的指向规则](#18-this-的指向规则)
19. [箭头函数的 this](#19-箭头函数的-this)
20. [call、apply、bind 的区别](#20-call-apply-bind-的区别)
21. [同步与异步](#21-同步与异步)
22. [浏览器事件循环 Event Loop](#22-浏览器事件循环-event-loop)
23. [宏任务与微任务](#23-宏任务与微任务)
24. [Promise 是什么？三种状态](#24-promise-是什么三种状态)
25. [Promise 的常用方法](#25-promise-的常用方法)
26. [async 与 await](#26-async-与-await)
27. [setTimeout 与 setInterval](#27-settimeout-与-setinterval)
28. [ES6 新增了哪些特性？](#28-es6-新增了哪些特性)
29. [箭头函数与普通函数的区别](#29-箭头函数与普通函数的区别)
30. [解构赋值](#30-解构赋值)
31. [Symbol 是什么？](#31-symbol-是什么)
32. [Map 与 Object 的区别](#32-map-与-object-的区别)
33. [Set、WeakSet、WeakMap](#33-set-weakset-weakmap)
34. [Proxy 与 Reflect](#34-proxy-与-reflect)
35. [迭代器与可迭代对象](#35-迭代器与可迭代对象)
36. [生成器 Generator](#36-生成器-generator)
37. [模块化：CommonJS 与 ES Module](#37-模块化commonjs-与-es-module)
38. [数组常用方法](#38-数组常用方法)
39. [forEach、map、filter、reduce 的区别](#39-foreach-map-filter-reduce-的区别)
40. [数组去重](#40-数组去重)
41. [数组扁平化](#41-数组扁平化)
42. [类数组与真数组](#42-类数组与真数组)
43. [for in 与 for of 的区别](#43-for-in-与-for-of-的区别)
44. [垃圾回收机制](#44-垃圾回收机制)
45. [内存泄漏的常见原因](#45-内存泄漏的常见原因)
46. [浮点数精度问题](#46-浮点数精度问题)
47. [严格模式](#47-严格模式)
48. [事件流与事件委托](#48-事件流与事件委托)
49. [手写防抖（debounce）](#49-手写防抖debounce)
50. [手写节流（throttle）](#50-手写节流throttle)
51. [手写深拷贝](#51-手写深拷贝)
52. [手写 call、apply、bind](#52-手写-call-apply-bind)
53. [手写 new](#53-手写-new)
54. [手写 instanceof](#54-手写-instanceof)
55. [手写 Promise（简版）](#55-手写-promise简版)
56. [函数柯里化](#56-函数柯里化)

---

## 1. JavaScript 有哪些数据类型？

JavaScript 的数据类型分为两大类，共 **8 种**：

**基本类型（原始类型，7 种）**

| 类型 | 说明 |
| --- | --- |
| `number` | 数字（含整数、浮点、`NaN`、`Infinity`） |
| `string` | 字符串 |
| `boolean` | 布尔值 |
| `undefined` | 未定义 |
| `null` | 空值 |
| `symbol` | 唯一且不可变的值（ES6） |
| `bigint` | 大整数（ES2020） |

**引用类型（1 种）**

- `object`：对象，包括普通对象、数组 `[]`、函数 `function`、日期 `Date`、正则 `RegExp` 等。

**关键区别：**

- 基本类型存于**栈内存**，按**值**访问，不可变（重新赋值是新建值）。
- 引用类型存于**堆内存**，变量保存的是**地址（引用）**，多个变量可能指向同一对象。

```js
let a = 10;
let b = a;
b = 20;
console.log(a); // 10，互不影响

const o1 = { x: 1 };
const o2 = o1;
o2.x = 99;
console.log(o1.x); // 99，指向同一对象
```

---

## 2. typeof 的返回值有哪些？

`typeof` 返回一个字符串，共 8 种可能：`number`、`string`、`boolean`、`undefined`、`object`、`function`、`symbol`、`bigint`。

| 表达式 | 结果 |
| --- | --- |
| `typeof 1` | `'number'` |
| `typeof 'a'` | `'string'` |
| `typeof true` | `'boolean'` |
| `typeof undefined` | `'undefined'` |
| `typeof Symbol()` | `'symbol'` |
| `typeof 10n` | `'bigint'` |
| `typeof function(){}` | `'function'` |
| `typeof {}` / `[]` / `null` | `'object'` |
| `typeof 未声明变量` | `'undefined'`（不会报错） |

**为什么 `typeof null === 'object'`？**

这是 JS 的历史遗留 bug。早期用**低位标签**表示类型，对象的标签是 `000`，而 `null` 被表示为全 `0` 的空指针，因此被误判为 `object`。由于修复会破坏大量既有代码，这个行为被一直保留。

**`typeof` 的局限：**

- 无法区分数组、对象、`null`（都是 `'object'`）。
- 无法区分 `new Number(1)` 这类包装对象。

```js
typeof null;        // 'object' —— 坑
typeof [];          // 'object' —— 坑
typeof new Date();  // 'object'
```

---

## 3. 如何准确判断数据类型？

**① `Object.prototype.toString.call()`（最推荐，可区分任意类型）**

```js
const type = (v) => Object.prototype.toString.call(v).slice(8, -1).toLowerCase();

type(1);          // 'number'
type(null);       // 'null'
type([]);         // 'array'
type({});         // 'object'
type(new Date()); // 'date'
type(undefined);  // 'undefined'
```

**② `instanceof`**：判断**原型链**上是否存在某构造函数（只对引用类型有效，无法判断基本类型）。

```js
[] instanceof Array;   // true
[] instanceof Object;  // true（原型链上溯）
1 instanceof Number;   // false（基本类型无效）
```

**③ `Array.isArray()`**：专门判断数组，比 `instanceof` 更可靠（可跨 iframe）。

**④ `constructor`**：`[].constructor === Array`，但可被修改、跨 iframe 不可靠。

**⑤ `Number.isNaN()` / `Object.is()`**：判断 `NaN`、处理 `+0/-0`、`NaN` 相等问题。

```js
NaN === NaN;             // false
Object.is(NaN, NaN);     // true
Object.is(+0, -0);       // false
```

**总结：** 日常用 `typeof` 快速判断，需要精确时用 `Object.prototype.toString.call()`。

---

## 4. 宽松相等与严格相等的区别？

| | `==`（宽松相等） | `===`（严格相等） |
| --- | --- | --- |
| 类型比较 | 先**隐式类型转换**再比较 | 类型不同直接返回 `false` |
| 性能 | 需转换，稍慢 | 无转换，更快 |
| 建议 | 除 `null` 判断外尽量避免 | **推荐使用** |

**`==` 的转换规则（简化）：**

1. `null == undefined` → `true`；`null`/`undefined` 与其他任何值比较都是 `false`。
2. `number` 与 `string` → 字符串转数字再比较。
3. `boolean` 与其他 → 布尔值先转数字（`true→1`，`false→0`）。
4. `object` 与基本类型 → 对象先转基本类型（`ToPrimitive`：先 `valueOf` 后 `toString`）。

```js
1 == '1';            // true
1 == true;           // true
null == undefined;   // true
null == 0;           // false（特殊）
NaN == NaN;          // false
[] == false;         // true（[] → '' → 0，false → 0）
[] == ![];           // true（![] → false → 0，[] → 0）
{} == {};            // false（不同引用）
'0' == false;        // true
```

> 结论：工作中统一使用 `===`，仅在 `x == null` 判断「`null` 或 `undefined`」时用 `==` 反而简洁。

---

## 5. 隐式类型转换规则

**ToPrimitive（对象转原始值）**：默认先调用 `valueOf()`，若返回仍不是原始值则调用 `toString()`；其中 `Date` 对象默认先 `toString()`。

**常见转换场景：**

**① 转字符串（`+` 拼接、模板字符串）**：任何值与字符串用 `+` 相连都变字符串。

```js
1 + '2';        // '12'
1 + 2 + '3';    // '33'（先算 1+2=3，再拼字符串）
'1' + 2 + 3;    // '123'（从左到右）
```

**② 转数字（`-`、`*`、`/`、比较、`Number()`）**

```js
'5' - 1;         // 4
'5' * '2';       // 10
Number('');      // 0
Number('  12 '); // 12
Number('12a');   // NaN
Number(null);    // 0
Number(undefined);// NaN
+true;           // 1
+[];             // 0（[] → '' → 0）
+[1];            // 1
+[1,2];          // NaN
```

**③ 转布尔（`Boolean()`、`if`、`!`）**：以下 **falsy 值**为 `false`，其余为 `true`。

```
false, 0, -0, 0n, '', null, undefined, NaN
```

```js
Boolean([]);      // true（空数组也是 true！）
Boolean({});      // true
Boolean('0');     // true
Boolean(' ');     // true（非空字符串）
```

> 易错点：`[]`、`{}` 都是 `truthy`；`'0'`、`'false'` 也是 `truthy`。

---

## 6. 值类型与引用类型的区别？

| | 基本类型（值类型） | 引用类型 |
| --- | --- | --- |
| 存储位置 | 栈内存 | 栈中存地址，实际内容在堆内存 |
| 赋值行为 | 复制**值**，互相独立 | 复制**引用（地址）**，指向同一对象 |
| 比较 | 比较值是否相等 | 比较引用是否相同 |
| 可变性 | 不可变 | 可修改内部属性 |
| `typeof` | 具体类型 | `object` / `function` |

```js
// 值类型：独立
let a = 1, b = a; b = 2;
console.log(a, b); // 1 2

// 引用类型：共享
const x = { n: 1 };
const y = x;
y.n = 100;
console.log(x.n); // 100

// 引用类型比较：比较地址
{} === {}; // false
[] === []; // false

// 函数参数传递：基本类型是值传递，引用类型传递的是地址的副本
function change(o) { o.n = 999; }
const obj = { n: 1 };
change(obj);
console.log(obj.n); // 999
```

---

## 7. 深拷贝与浅拷贝

**浅拷贝**：只复制第一层，嵌套的引用类型仍**共享同一地址**。

```js
// 常见浅拷贝方式
const copy1 = { ...obj };              // 展开运算符
const copy2 = Object.assign({}, obj);  // Object.assign
const copy3 = arr.slice();             // 数组
const copy4 = arr.concat();            // 数组
const copy5 = Array.from(arr);         // 数组
```

```js
const source = { a: 1, nested: { b: 2 } };
const shallow = { ...source };
shallow.nested.b = 100;
console.log(source.nested.b); // 100 —— 受影响！
```

**深拷贝**：递归复制所有层级，两份数据完全独立。

```js
// 方式一：JSON（简单但有缺陷）
const deep = JSON.parse(JSON.stringify(source));
```

`JSON` 方式的**坑**：

- 丢失 `undefined`、`symbol`、函数。
- `NaN`、`Infinity` 变成 `null`。
- `Date` 变字符串；`RegExp`、`Map`、`Set` 变 `{}`。
- 无法处理循环引用（会报错）。

```js
// 方式二：structuredClone（现代浏览器原生，支持循环引用）
const deep2 = structuredClone(source);

// 方式三：递归手写（面试重点，见第 51 题）
```

> 结论：简单数据用 `JSON`，现代环境优先 `structuredClone`，面试常考手写递归深拷贝。

---

## 8. 原型与原型链

**三个概念：**

- **`prototype`（原型对象）**：每个**函数**都有 `prototype` 属性，指向一个对象，供实例共享方法。
- **`__proto__`（隐式原型）**：每个**对象**都有 `__proto__`，指向创建它的构造函数的 `prototype`。
- **`constructor`**：原型对象的 `constructor` 指回构造函数。

```js
function Person(name) { this.name = name; }
Person.prototype.say = function () { console.log(this.name); };

const p = new Person('Tom');
p.__proto__ === Person.prototype;        // true
Person.prototype.constructor === Person; // true
p.say();                                 // 'Tom'
```

**原型链**：访问对象属性时，若自身没有，就沿 `__proto__` 逐级向上查找，直到 `Object.prototype`，再往上为 `null`，找不到返回 `undefined`。

```js
p.toString(); // 来自 Object.prototype
p.__proto__.__proto__ === Object.prototype; // true
Object.prototype.__proto__ === null;        // true
```

**原型链图示：**

```
p  →  Person.prototype  →  Object.prototype  →  null
```

**作用：** 实现属性/方法**继承与共享**，减少内存占用（方法定义在原型上，所有实例共用一份）。

---

## 9. new 操作符做了什么？

`new` 执行了四步：

1. 创建一个**新对象**。
2. 把新对象的 `__proto__` 指向构造函数的 `prototype`（建立原型链）。
3. 将构造函数内的 `this` 指向新对象并**执行构造函数**。
4. 若构造函数返回的是**引用类型**则返回它，否则返回新对象。

```js
function myNew(Ctor, ...args) {
    const obj = Object.create(Ctor.prototype); // 1 + 2
    const result = Ctor.apply(obj, args);      // 3
    return result instanceof Object ? result : obj; // 4
}
```

```js
function Foo(name) { this.name = name; }
Foo.prototype.hi = function () { return 'hi ' + this.name; };

const f = myNew(Foo, 'Tom');
console.log(f.name);  // 'Tom'
console.log(f.hi());  // 'hi Tom'
```

> 注意：构造函数返回 `return 基本类型` 会被忽略；返回 `对象` 会覆盖 `new` 创建的对象。

---

## 10. JavaScript 的继承方式

**① 原型链继承**：`Child.prototype = new Parent()`。缺点：引用类型被所有实例共享，无法传参。

**② 构造函数继承**：在子构造函数里 `Parent.call(this)`。缺点：无法继承原型上的方法。

**③ 组合继承（最常用）**：原型链 + 构造函数，兼顾两者。缺点：父构造函数被调用两次。

**④ 寄生组合继承（最优）**：

```js
function Parent(name) { this.name = name; }
Parent.prototype.say = function () { console.log(this.name); };

function Child(name, age) {
    Parent.call(this, name);  // 继承实例属性
    this.age = age;
}
// 继承原型方法（不重复调用父构造函数）
Child.prototype = Object.create(Parent.prototype);
Child.prototype.constructor = Child;

const c = new Child('Tom', 18);
c.say(); // 'Tom'
```

**⑤ ES6 `class extends`（语法糖，本质是寄生组合继承）**：

```js
class Parent {
    constructor(name) { this.name = name; }
    say() { console.log(this.name); }
}
class Child extends Parent {
    constructor(name, age) {
        super(name);   // 必须先调用 super
        this.age = age;
    }
}
```

> 面试建议：先答「组合继承」，再答「寄生组合继承」并说明 `class` 是其语法糖。

---

## 11. 如何判断属性是自身还是原型上的？

- **`hasOwnProperty()`**：判断属性是否为对象**自身**属性（不含原型链）。
- **`in`**：判断属性是否存在（**含原型链**）。

```js
function Person() {}
Person.prototype.legs = 2;

const p = new Person();
p.name = 'Tom';

p.hasOwnProperty('name');  // true
p.hasOwnProperty('legs');  // false（原型上）
'legs' in p;               // true（含原型链）
'name' in p;               // true

// 更安全：避免对象覆盖 hasOwnProperty 方法
Object.prototype.hasOwnProperty.call(p, 'name'); // true

// 获取自身可枚举属性
Object.keys(p);                       // ['name']
Object.getOwnPropertyNames(p);        // ['name']（含不可枚举）
```

---

## 12. Object.create 的作用

`Object.create(proto[, propertiesObject])` 创建一个**以指定对象为原型**的新对象。

```js
const proto = { greet() { return 'hello'; } };
const obj = Object.create(proto);
obj.greet();                        // 'hello'
Object.getPrototypeOf(obj) === proto; // true
```

**常见用途：**

1. **实现继承**（无构造函数开销）：

   ```js
   Child.prototype = Object.create(Parent.prototype);
   ```

2. **创建无原型的对象**（纯净字典，避免原型污染）：

   ```js
   const dict = Object.create(null);
   dict.toString; // undefined，没有继承任何方法
   ```

3. **定义属性描述符**：

   ```js
   const o = Object.create({}, {
     x: { value: 1, writable: false, enumerable: true },
   });
   ```

**对比 `{}`：** `{}` 会继承 `Object.prototype`，而 `Object.create(null)` 得到真正干净的对象。

---

## 13. 作用域与作用域链

**作用域**：变量和函数的可访问范围，决定了变量的查找规则。分为：

- **全局作用域**：最外层，任何地方可访问。
- **函数作用域**：函数内部，`var` 声明的变量属于函数作用域。
- **块级作用域**：`{}` 内部，`let`/`const` 生效（ES6）。

**作用域链**：当访问一个变量时，先在**当前作用域**查找，找不到就沿**外层作用域**逐级向上，直到全局作用域；仍找不到则报 `ReferenceError`（非严格模式下赋值会隐式创建全局变量）。

```js
const g = 'global';
function outer() {
    const o = 'outer';
    function inner() {
        const i = 'inner';
        console.log(i, o, g); // 都能访问，沿作用域链向外找
    }
    inner();
}
outer();
```

**关键：** 作用域在**函数定义时**就已确定（词法作用域/静态作用域），与调用位置无关。闭包正是基于词法作用域。

---

## 14. 变量提升与函数提升

**变量提升（Hoisting）**：`var` 声明和函数声明会被提升到当前作用域顶部。

```js
console.log(a); // undefined（声明提升，赋值未提升）
var a = 1;

foo();          // 'foo' —— 函数声明整体提升，可提前调用
function foo() { console.log('foo'); }

bar();          // 报错：bar is not a function
var bar = function () {}; // 函数表达式只提升变量名，不提升函数体
```

**函数声明 vs 函数表达式：**

| | 函数声明 | 函数表达式 |
| --- | --- | --- |
| 提升 | 整体提升，可提前调用 | 只提升变量名（值为 `undefined`） |
| 形式 | `function f() {}` | `var f = function () {}` |

**同名覆盖规则：** 函数声明提升优先于变量声明；后出现的函数声明会覆盖前面的。

```js
console.log(foo); // [Function: foo]
var foo = 1;
function foo() {}
```

> `let`/`const` 也有提升，但存在「暂时性死区」，提升后到声明前不可访问（见下题）。

---

## 15. var、let、const 的区别

| | `var` | `let` | `const` |
| --- | --- | --- | --- |
| 作用域 | 函数/全局 | **块级** | **块级** |
| 变量提升 | 提升为 `undefined` | 提升但有 TDZ | 提升但有 TDZ |
| 重复声明 | 允许 | 不允许 | 不允许 |
| 是否必须初始化 | 否 | 否 | **是** |
| 可否重新赋值 | 是 | 是 | 否（基本类型） |
| 挂到 `window` | 全局 `var` 会 | 不会 | 不会 |

```js
if (true) {
    var a = 1;
    let b = 2;
}
console.log(a); // 1
console.log(b); // ReferenceError

const obj = { n: 1 };
obj.n = 2;       // 允许：const 限制的是「绑定」不可变，不是内容不可变
obj = {};        // TypeError
```

> 使用建议：默认用 `const`，需要重新赋值时用 `let`，避免 `var`。

---

## 16. 暂时性死区（TDZ）

**暂时性死区（Temporal Dead Zone）**：`let`/`const` 声明的变量，从**作用域开始**到**声明语句执行**之间，该变量不可访问，访问会抛 `ReferenceError`。

```js
console.log(a); // ReferenceError: Cannot access 'a' before initialization
let a = 1;

// typeof 也会触发 TDZ（与未声明变量不同）
typeof b; // ReferenceError
let b = 2;

typeof c; // 'undefined'（c 从未声明，typeof 安全）
```

**用途：** 让变量必须先声明后使用，避免 `var` 提升带来的隐式 `undefined` 问题，更容易发现 bug。

---

## 17. 闭包是什么？应用与问题

**闭包**：函数与其**词法作用域**的组合。即使外层函数已执行完毕，内层函数仍能访问外层函数的变量。

```js
function createCounter() {
    let count = 0;          // 被闭包保留
    return function () {
        return ++count;
    };
}
const counter = createCounter();
counter(); // 1
counter(); // 2
counter(); // 3
```

**为什么能保留？** 内层函数引用了外层变量，外层作用域不会在函数返回后被销毁（被闭包引用），因此变量得以长期存活。

**应用场景：**

- **封装私有变量**（计数器、模块模式）。
- **防抖 / 节流**（用闭包保存定时器 ID）。
- **柯里化 / 函数工厂**。
- **循环中保存变量**（`for` + `let` 天然为每轮创建独立作用域）。

**常见问题：内存泄漏。** 被闭包引用的变量无法被回收；若闭包长期存在（如挂在全局或 DOM 事件上），可能导致内存占用升高。

```js
// 经典坑：var 声明的循环变量共享同一作用域
for (var i = 0; i < 3; i++) {
    setTimeout(() => console.log(i)); // 3 3 3
}
// 解决一：用 let（每轮独立块作用域）
for (let i = 0; i < 3; i++) {
    setTimeout(() => console.log(i)); // 0 1 2
}
// 解决二：IIFE 制造独立作用域
for (var j = 0; j < 3; j++) {
    (function (k) { setTimeout(() => console.log(k)); })(j);
}
```

---

## 18. this 的指向规则

`this` 指向**调用时**决定（除箭头函数），遵循以下优先级：

1. **`new` 绑定**：`new Foo()` 中 `this` 指向新创建的实例。
2. **显式绑定**：`call` / `apply` / `bind` 指定的对象。
3. **隐式绑定**：作为对象方法调用 `obj.fn()`，`this` 指向该对象。
4. **默认绑定**：普通函数调用，非严格模式指向 `window`（严格模式为 `undefined`）。

```js
function f() { return this; }

f();                  // window（非严格）/ undefined（严格）
({ m: f }).m();       // { m: f }
f.call({ a: 1 });     // { a: 1 }
new f();              // f 的实例

// 易错：方法被赋值给变量后，丢失隐式绑定
const obj = { name: 'Tom', hi() { return this.name; } };
const fn = obj.hi;
fn();                 // undefined（this 变为 window/undefined）
obj.hi();             // 'Tom'
```

**优先级：** `new` > 显式绑定 > 隐式绑定 > 默认绑定。

---

## 19. 箭头函数的 this

箭头函数**没有自己的 `this`**，它的 `this` 继承自定义时所在的**外层作用域**（词法作用域），且无法被 `call`/`apply`/`bind` 改变。

```js
const obj = {
    name: 'Tom',
    hi: () => this.name,   // 这里的 this 是外层（window/module）
    hi2() {
        const f = () => this.name; // 继承 hi2 的 this（obj）
        return f();
    },
};
obj.hi();  // undefined
obj.hi2(); // 'Tom'
```

**箭头函数与普通函数的其他区别：**

- 不能作为构造函数（不能用 `new`）。
- 没有 `arguments` 对象（可用剩余参数 `...args`）。
- 没有 `prototype` 属性。
- 不能用作生成器。

**适用场景：** 回调函数、需要保留外层 `this` 的地方（如 `setTimeout`、数组方法）。

---

## 20. call、apply、bind 的区别

三者都用于**改变函数的 `this` 指向**。

| | `call` | `apply` | `bind` |
| --- | --- | --- | --- |
| 参数 | 逐个传入 `fn.call(obj, a, b)` | 数组传入 `fn.apply(obj, [a, b])` | 同 `call`，逐个传入 |
| 是否立即执行 | 是 | 是 | **否**，返回绑定后的新函数 |
| 典型用途 | 借用方法、继承 | 参数为数组场景、`Math.max.apply` | 事件回调固定 `this`、偏函数 |

```js
function greet(greeting, punct) {
    return greeting + ' ' + this.name + punct;
}
const user = { name: 'Tom' };

greet.call(user, 'Hi', '!');       // 'Hi Tom!'
greet.apply(user, ['Hello', '~']); // 'Hello Tom~'

const bound = greet.bind(user, 'Hey');
bound('?');                        // 'Hey Tom?'
```

**注意：** `bind` 返回的函数作为构造函数 `new` 时，绑定的 `this` 会被忽略。

---

## 21. 同步与异步

- **同步**：代码按顺序执行，前一个任务完成才执行下一个，会**阻塞**后续代码。
- **异步**：发起任务后不等待结果，继续执行后续代码，结果通过**回调 / Promise / async-await** 处理。

**为什么需要异步？** JS 是**单线程**的，若耗时操作（网络请求、定时器、文件读取）同步执行会阻塞主线程，导致页面卡死。异步让这些操作在后台进行，完成后回到主线程处理结果。

```js
console.log('1');
setTimeout(() => console.log('2'), 0);
console.log('3');
// 输出：1 3 2
```

**异步的实现方式演进：**

1. **回调函数**：易产生「回调地狱」，错误处理困难。
2. **Promise**：链式调用，解决嵌套问题。
3. **async / await**：以同步写法处理异步，可读性最佳。

---

## 22. 浏览器事件循环 Event Loop

JS 是单线程的，通过**事件循环**协调「执行栈」与「任务队列」，实现非阻塞。

**组成：**

- **调用栈（Call Stack）**：执行同步代码，函数调用压栈、返回出栈。
- **任务队列**：分为**宏任务队列**与**微任务队列**。
- **Web API**：浏览器提供的定时器、网络请求等，完成后把回调放入相应队列。

**执行顺序：**

1. 执行同步代码（调用栈清空）。
2. **清空所有微任务队列**（队列为空才结束）。
3. 取出**一个宏任务**执行。
4. 该宏任务执行完后，再清空微任务队列。
5. 重复 3–4，直到所有任务完成。

```
同步代码 → 微任务（全部） → 宏任务（一个） → 微任务（全部） → 宏任务（一个） → ...
```

**关键：** 微任务优先级高于宏任务；每执行完一个宏任务，都会先清空所有微任务。

---

## 23. 宏任务与微任务

| | 宏任务（MacroTask） | 微任务（MicroTask） |
| --- | --- | --- |
| 常见来源 | `setTimeout`、`setInterval`、`setImmediate`(Node)、`I/O`、UI 渲染、`MessageChannel` | `Promise.then/catch/finally`、`queueMicrotask`、`MutationObserver`、`process.nextTick`(Node 优先) |
| 执行时机 | 每轮事件循环取一个 | 每个宏任务结束后立即全部清空 |
| 优先级 | 低 | 高 |

**经典面试题：**

```js
console.log('script start');

setTimeout(() => console.log('setTimeout'), 0);

Promise.resolve()
    .then(() => console.log('promise1'))
    .then(() => console.log('promise2'));

console.log('script end');

// 输出：
// script start
// script end
// promise1
// promise2
// setTimeout
```

**解析：** 先执行同步（`script start`、`script end`）→ 清空微任务（`promise1`、`promise2`，注意第二个 `.then` 是上一轮微任务产生的新微任务，仍在同一轮被清空）→ 执行宏任务（`setTimeout`）。

---

## 24. Promise 是什么？三种状态

**Promise** 是异步编程的解决方案，表示一个**尚未完成但预期会完成**的操作结果，可链式调用，避免回调地狱。

**三种状态（不可逆）：**

| 状态 | 说明 |
| --- | --- |
| `pending` | 进行中（初始状态） |
| `fulfilled` | 已成功（`resolve` 触发） |
| `rejected` | 已失败（`reject` 或抛错触发） |

```js
const p = new Promise((resolve, reject) => {
    setTimeout(() => resolve('done'), 1000);
});

p.then((res) => console.log(res))   // 'done'
    .catch((err) => console.error(err))
    .finally(() => console.log('结束'));
```

**特点：**

- 状态一旦改变就**凝固**，后续 `resolve`/`reject` 无效。
- `then` 返回**新的 Promise**，支持链式调用。
- 错误会沿链向后传递，直到被 `catch` 捕获。

**Promise 解决的问题：** 回调地狱（嵌套过深）、错误处理分散、无法组合多个异步。

---

## 25. Promise 的常用方法

**实例方法：** `then`、`catch`、`finally`。

**静态方法：**

| 方法 | 作用 |
| --- | --- |
| `Promise.resolve(v)` | 返回一个已成功的 Promise |
| `Promise.reject(e)` | 返回一个已失败的 Promise |
| `Promise.all(arr)` | 全部成功才成功；**任一失败即失败**（结果按数组顺序） |
| `Promise.allSettled(arr)` | 等待全部结束，返回每个的结果状态（不短路） |
| `Promise.race(arr)` | **第一个**完成（成功或失败）的结果 |
| `Promise.any(arr)` | **第一个成功**的结果；全部失败才失败 |

```js
Promise.all([p1, p2, p3]).then(([r1, r2, r3]) => console.log(r1, r2, r3));

Promise.allSettled([p1, p2]).then((results) => {
    results.forEach((r) => {
        if (r.status === 'fulfilled') console.log(r.value);
        else console.error(r.reason);
    });
});

Promise.race([p1, p2]).then((fastest) => console.log(fastest));
```

> 记忆：`all` 齐头并进（一损俱损），`race` 竞速（先到先得），`allSettled` 全部兜底，`any` 取首个成功。

---

## 26. async 与 await

`async`/`await` 是 Promise 的**语法糖**，用同步的写法处理异步。

- `async` 函数返回一个 Promise（返回值会被 `Promise.resolve` 包裹）。
- `await` 等待右侧 Promise 完成，返回其结果；若为 rejected，会抛出异常，可用 `try/catch` 捕获。

```js
async function fetchData() {
    try {
        const res = await fetch('/api/user');   // 等待网络请求
        const data = await res.json();          // 等待解析
        return data;
    } catch (err) {
        console.error('请求失败', err);
    } finally {
        console.log('结束');
    }
}
```

**要点：**

- `await` 会**暂停当前 async 函数的执行**（不阻塞主线程），把后续代码放入微任务。
- 多个互不依赖的请求应**并行**：

  ```js
  // 串行（慢）
  const a = await p1;
  const b = await p2;
  // 并行（快）
  const [a, b] = await Promise.all([p1, p2]);
  ```

- `await` 后的代码相当于 `.then` 回调，属微任务。
- 顶层 `await`（Top-Level Await）在 ESM 模块中可直接使用。

---

## 27. setTimeout 与 setInterval

- **`setTimeout(fn, delay)`**：延迟 `delay` 毫秒后执行**一次**。
- **`setInterval(fn, delay)`**：每 `delay` 毫秒执行一次，**直到被清除**。

```js
const timer = setTimeout(() => console.log('1s 后'), 1000);
clearTimeout(timer);   // 清除

const interval = setInterval(() => console.log('每秒'), 1000);
clearInterval(interval); // 清除
```

**注意点：**

1. **最小延迟**：嵌套超过 5 层时，`setTimeout` 最小间隔被限制为 4ms。
2. **不精确**：`delay` 是「至少等待」，实际还受事件循环、同步任务耗时影响。
3. **`setInterval` 累积问题**：若回调执行时间超过间隔，任务会排队累积；可用「`setTimeout` 递归」替代。

   ```js
   let i = 0;
   function loop() {
       i++;
       if (i < 5) setTimeout(loop, 1000); // 每次执行完再排下一次
   }
   loop();
   ```

4. **`this` 问题**：回调中 `this` 默认指向 `window`（非严格），需用箭头函数或 `bind` 固定。

---

## 28. ES6 新增了哪些特性？

1. **`let` / `const`**：块级作用域。
2. **箭头函数**：更简洁，词法 `this`。
3. **模板字符串**：反引号，支持插值与多行。
4. **解构赋值**：数组 / 对象解构。
5. **默认参数、剩余参数、展开运算符**。
6. **`class`**：类的语法糖，支持 `extends`/`super`。
7. **模块化**：`import` / `export`。
8. **Promise**：异步解决方案。
9. **新增数据结构**：`Map`、`Set`、`WeakMap`、`WeakSet`。
10. **`Symbol`**：唯一值。
11. **迭代器与生成器**：`Iterator`、`Generator`、`for...of`。
12. **新方法**：`Object.assign`、`Object.keys/values/entries`、`Array.from`、`Array.of`、`Array.prototype.includes`、`String.prototype.includes/padStart` 等。
13. **Proxy / Reflect**：元编程。

> 后续版本补充：ES2020 的 `BigInt`、可选链 `?.`、空值合并 `??`、`Promise.allSettled`；ES2021 的逻辑赋值 `??=`、`String.replaceAll`；ES2022 的类私有字段、顶层 `await`。

---

## 29. 箭头函数与普通函数的区别

| | 箭头函数 | 普通函数 |
| --- | --- | --- |
| `this` | 词法继承外层，不受调用方式影响 | 由调用方式决定 |
| `arguments` | 无（用 `...args`） | 有 |
| 构造函数 | 不能 `new` | 可以 |
| `prototype` | 无 | 有 |
| `yield` | 不能作为生成器 | 可以 |
| 提升 | 变量形式，无函数提升 | 函数声明可整体提升 |

```js
const obj = {
    name: 'Tom',
    regular() { return this.name; },
    arrow: () => (typeof this !== 'undefined' ? this.name : undefined),
};
obj.regular(); // 'Tom'
obj.arrow();   // undefined（this 来自外层，非 obj）
```

> 选择建议：需要动态 `this`（如对象方法、构造函数）用普通函数；回调、需要固定外层 `this` 时用箭头函数。

---

## 30. 解构赋值

**数组解构**（按位置）:

```js
const [a, b, ...rest] = [1, 2, 3, 4];
// a=1, b=2, rest=[3,4]

const [x = 10] = [];        // 默认值 x=10
const [, , third] = [1, 2, 3]; // 跳过前两个，third=3
let p = 1, q = 2;
[p, q] = [q, p];            // 交换变量
```

**对象解构**（按属性名）:

```js
const user = { name: 'Tom', age: 18, addr: { city: 'SH' } };
const { name, age: years = 0, addr: { city } } = user;
// name='Tom', years=18, city='SH'

// 重命名
const { name: userName } = user; // userName='Tom'

// 函数参数解构
function fn({ name, age = 0 }) { return `${name}-${age}`; }
fn(user); // 'Tom-18'
```

**要点：**

- 对象解构支持重命名（`原名: 新名`）与嵌套；数组按索引顺序。
- 默认值只在值为 `undefined` 时生效（`null` 不生效）。
- 解构 `null`/`undefined` 会报错，可写 `const { a } = obj || {}`。

---

## 31. Symbol 是什么？

`Symbol` 是 ES6 引入的**基本类型**，每个 `Symbol` 值都是**唯一且不可变**的，常用作**对象的唯一属性键**，避免命名冲突。

```js
const s1 = Symbol('id');
const s2 = Symbol('id');
s1 === s2; // false —— 即使描述相同也唯一

const obj = {
    [s1]: 'value1',
    name: 'Tom',
};
obj[s1];              // 'value1'
obj.s1;               // undefined（必须用变量访问）

// 常规遍历拿不到 Symbol 键
Object.keys(obj);                      // ['name']
Object.getOwnPropertySymbols(obj);     // [Symbol(id)]
Reflect.ownKeys(obj);                  // ['name', Symbol(id)]
```

**内置通用 Symbol（`Symbol.for`）**：`Symbol.for('key')` 会在全局注册表中查找，相同 key 返回同一 Symbol。

```js
Symbol.for('a') === Symbol.for('a'); // true
```

**知名 Symbol（Well-known Symbols）**：`Symbol.iterator`、`Symbol.asyncIterator`、`Symbol.toPrimitive`、`Symbol.toStringTag`，用于自定义对象的迭代、类型转换等行为。

**用途：** 定义私有/内部属性、实现迭代协议、避免属性名冲突、模拟枚举。

---

## 32. Map 与 Object 的区别

| | `Map` | `Object` |
| --- | --- | --- |
| 键类型 | **任意类型**（对象、函数、NaN 都可） | 只能是字符串 / Symbol |
| 键顺序 | 保持**插入顺序** | 整数键有序，其余按插入序 |
| 大小 | `map.size` 直接获取 | 需 `Object.keys(obj).length` |
| 遍历 | 天然可迭代（`for...of`） | 需 `Object.keys/entries` |
| 性能 | 频繁增删更优 | 简单存取、字面量更方便 |
| 原型 | 干净（无继承键） | 继承 `Object.prototype`（可能污染） |

```js
const map = new Map();
const key = { id: 1 };
map.set(key, 'value');
map.set('name', 'Tom');
map.get(key);   // 'value'
map.size;       // 2
map.has('name');// true
map.delete('name');

for (const [k, v] of map) console.log(k, v);
```

**选择建议：** 键为字符串、结构固定用 `Object`；键类型多样、需频繁增删或关心大小/顺序用 `Map`。

---

## 33. Set、WeakSet、WeakMap

**`Set`**：成员**唯一**的集合，常用于数组去重、求交集/并集。

```js
const set = new Set([1, 2, 2, 3]);
[...set];           // [1, 2, 3]
set.add(4);
set.has(2);         // true
set.delete(1);
set.size;           // 3
```

**`WeakSet`**：只能存**对象**，且对成员是**弱引用**（不影响垃圾回收），**不可迭代、无 `size`**。

**`WeakMap`**：键必须是**对象**，同样是弱引用，值可任意。常用于给对象附加数据而不阻止其回收。

| | `Set` / `Map` | `WeakSet` / `WeakMap` |
| --- | --- | --- |
| 键/成员类型 | 任意 | **仅对象** |
| 引用强度 | 强引用 | **弱引用**（可被 GC 回收） |
| 可迭代 | 是 | 否 |
| `size` | 有 | 无 |
| 用途 | 去重、映射 | 私有数据、缓存、DOM 关联数据 |

```js
const wm = new WeakMap();
let el = document.querySelector('#app');
wm.set(el, { clicks: 0 });
// el 被移除且无其他引用时，相关数据可被自动回收，避免内存泄漏
```

---

## 34. Proxy 与 Reflect

**`Proxy`**：创建对象的代理，拦截并自定义对象的基本操作（读取、赋值、删除、函数调用等），是实现响应式（如 Vue3）的核心。

```js
const target = { name: 'Tom', age: 18 };
const proxy = new Proxy(target, {
    get(t, key) {
        console.log(`读取 ${key}`);
        return Reflect.get(t, key);
    },
    set(t, key, value) {
        if (key === 'age' && typeof value !== 'number') {
            throw new TypeError('age 必须是数字');
        }
        return Reflect.set(t, key, value);
    },
    has(t, key) { return key in t; },
});

proxy.name;       // 打印「读取 name」，返回 'Tom'
proxy.age = 20;   // 正常
proxy.age = 'x';  // TypeError
```

**`Reflect`**：提供操作对象的**默认行为**的方法集合（`get`/`set`/`has`/`deleteProperty`/`ownKeys` 等），常与 `Proxy` 配合，保证默认行为不被破坏，且方法返回值更合理（如 `Object.defineProperty` 失败会抛错，`Reflect.defineProperty` 返回布尔值）。

**常见拦截器（trap）：** `get`、`set`、`has`、`deleteProperty`、`ownKeys`、`apply`、`construct`、`defineProperty`。

**对比 `Object.defineProperty`：**

| | `Proxy` | `Object.defineProperty` |
| --- | --- | --- |
| 监听范围 | 整个对象（含新增/删除属性） | 只能劫持已定义属性 |
| 数组 | 支持（可拦截索引与 length） | 需重写数组方法 |
| 能力 | 13 种拦截 | 仅 get/set |

---

## 35. 迭代器与可迭代对象

**迭代器（Iterator）**：实现了 `next()` 方法的对象，`next()` 返回 `{ value, done }`。

**可迭代对象（Iterable）**：实现了 `Symbol.iterator` 方法，返回一个迭代器。数组、字符串、`Map`、`Set`、`arguments`、`NodeList` 都是可迭代的。

```js
const arr = [1, 2, 3];
const it = arr[Symbol.iterator]();
it.next(); // { value: 1, done: false }
it.next(); // { value: 2, done: false }
it.next(); // { value: 3, done: false }
it.next(); // { value: undefined, done: true }

// 手动实现可迭代对象
const range = {
    from: 1,
    to: 3,
    [Symbol.iterator]() {
        let cur = this.from;
        const last = this.to;
        return {
            next() {
                return cur <= last ? { value: cur++, done: false } : { value: undefined, done: true };
            },
        };
    },
};
[...range]; // [1, 2, 3]
```

**作用：** 统一遍历协议，使 `for...of`、展开运算符 `...`、解构、`Array.from` 等能作用于不同数据结构。

---

## 36. 生成器 Generator

**生成器函数**用 `function*` 定义，调用后返回一个**迭代器**，通过 `yield` 暂停/恢复执行，`next()` 返回值并可传参。

```js
function* gen() {
  const a = yield 1;   // 暂停，返回 1；恢复时 a = 下次 next 的参数
  const b = yield a + 2;
  return a + b;
}

const g = gen();
g.next();        // { value: 1, done: false }
g.next(10);      // { value: 12, done: false }（a=10）
g.next(20);      // { value: 30, done: true }（b=20）
```

**特点：**

- 可**暂停与恢复**执行，适合处理异步流程（`async/await` 的前身）。
- 可作为可迭代对象，用 `for...of` 遍历 `yield` 的值。
- 支持 `yield*` 委托另一个生成器/可迭代对象。
- `.return()` 提前结束，`.throw()` 向内部抛错。

```js
function* nums() {
  yield* [1, 2];
  yield 3;
}
[...nums()]; // [1, 2, 3]
```

---

## 37. 模块化：CommonJS 与 ES Module

| | CommonJS（CJS） | ES Module（ESM） |
| --- | --- | --- |
| 语法 | `require` / `module.exports` | `import` / `export` |
| 运行环境 | Node.js 传统方案 | 浏览器原生 / 现代 Node |
| 加载时机 | **运行时**加载 | **编译时**静态分析 |
| 加载方式 | 同步 | 异步（浏览器） |
| 导出值 | 值的**拷贝**（基本类型） | 值的**引用**（实时绑定） |
| 动态导入 | 天然支持 | `import()` 动态导入返回 Promise |
| 提升 | 不提升 | `import` 会提升到顶部 |
| Tree-shaking | 不易 | 支持（静态结构便于摇树） |

**CommonJS：**

```js
// a.js
const name = 'Tom';
module.exports = { name };
// b.js
const { name } = require('./a.js');
```

**ES Module：**

```js
// a.js
export const name = 'Tom';
export default function hi() {}
// b.js
import hi, { name } from './a.js';
import('./a.js').then((m) => console.log(m.name)); // 动态导入
```

**注意：** ESM 中 `import` 是静态提升的，必须在顶层；`this` 为 `undefined`；CommonJS 与 ESM 可互操作但需注意默认导出的差异。Node 中使用 ESM 需 `.mjs` 扩展名或 `package.json` 的 `"type": "module"`。

---

## 38. 数组常用方法

**会改变原数组：**

| 方法 | 作用 |
| --- | --- |
| `push` / `pop` | 尾部增 / 删 |
| `unshift` / `shift` | 头部增 / 删 |
| `splice(start, n, ...items)` | 增删改（万能） |
| `sort(fn)` | 排序 |
| `reverse` | 反转 |
| `fill` | 填充 |
| `copyWithin` | 内部复制 |

**不改变原数组：**

| 方法 | 作用 |
| --- | --- |
| `slice(start, end)` | 截取（浅拷贝） |
| `concat` | 拼接 |
| `join(sep)` | 转字符串 |
| `indexOf` / `lastIndexOf` / `includes` | 查找 |
| `find` / `findIndex` / `findLast` | 按条件查找 |
| `map` / `filter` / `reduce` / `reduceRight` | 遍历转换 |
| `some` / `every` | 判断 |
| `flat` / `flatMap` | 扁平化 |
| `at(i)` | 支持负索引取值 |
| `toSorted` / `toReversed` / `toSpliced` | 非破坏性版本（ES2023） |

```js
const arr = [3, 1, 2];
arr.sort((a, b) => a - b); // [1, 2, 3]，数字排序必须传比较函数
arr.slice(1);              // [2, 3]
arr.at(-1);                // 3
[1, [2, [3]]].flat(2);     // [1, 2, 3]
```

---

## 39. forEach、map、filter、reduce 的区别

| | 返回值 | 是否改变原数组 | 用途 |
| --- | --- | --- | --- |
| `forEach` | `undefined` | 否（可手动改） | 单纯遍历 |
| `map` | **新数组**（长度不变） | 否 | 映射转换 |
| `filter` | **新数组**（长度可变） | 否 | 筛选 |
| `reduce` | **任意值** | 否 | 累积、求和、分组、扁平化 |

```js
const nums = [1, 2, 3, 4];

nums.forEach((n) => console.log(n));
nums.map((n) => n * 2);              // [2, 4, 6, 8]
nums.filter((n) => n % 2 === 0);     // [2, 4]
nums.reduce((sum, n) => sum + n, 0); // 10

// reduce 强大用法：统计词频
const words = ['a', 'b', 'a'];
const count = words.reduce((acc, w) => {
    acc[w] = (acc[w] || 0) + 1;
    return acc;
}, {}); // { a: 2, b: 1 }
```

**要点：**

- `forEach`/`map`/`filter` **无法中断**（`break` 无效），需要中断用 `for` 或 `some`/`every`。
- `map`/`filter`/`reduce` 都返回新数组或新值，符合函数式、不产生副作用。
- `reduce` 初始值建议显式传入，避免空数组报错。

---

## 40. 数组去重

```js
const arr = [1, 1, 2, 3, 3, '1'];

// ① Set（最简洁，注意 NaN 与类型）
[...new Set(arr)];                 // [1, 2, 3, '1']

// ② filter + indexOf
arr.filter((v, i) => arr.indexOf(v) === i);

// ③ reduce
arr.reduce((acc, cur) => (acc.includes(cur) ? acc : [...acc, cur]), []);

// ④ 对象/Map 记录（适合大量数据，性能好）
const seen = new Map();
arr.filter((v) => (seen.has(v) ? false : seen.set(v, true)));

// ⑤ 对象数组按某字段去重
const list = [{ id: 1 }, { id: 1 }, { id: 2 }];
const uniq = [...new Map(list.map((it) => [it.id, it])).values()];
```

**注意：**

- `Set` 认为 `NaN === NaN`（能去重），但 `indexOf(NaN)` 找不到 `NaN`。
- `Set` 认为 `{}` 各不相同（引用不同），对象数组需按字段去重。
- `'1'` 与 `1` 不会被 `Set` 去重（类型不同）。

---

## 41. 数组扁平化

```js
const arr = [1, [2, [3, [4]], 5]];

// ① flat（ES2019，最简洁）
arr.flat(Infinity);            // [1, 2, 3, 4, 5]

// ② reduce + 递归
const flatten = (a) => a.reduce(
    (acc, cur) => acc.concat(Array.isArray(cur) ? flatten(cur) : cur),
    []
);

// ③ 递归 + 展开
function flatten2(a) {
    return [].concat(...a.map((v) => (Array.isArray(v) ? flatten2(v) : v)));
}

// ④ 迭代 + 栈（避免递归深度问题）
function flatten3(a) {
    const stack = [...a], res = [];
    while (stack.length) {
        const v = stack.pop();
        if (Array.isArray(v)) stack.push(...v);
        else res.unshift(v);   // 用 pop 需反向插入
    }
    return res;
}

// ⑤ toString/split（仅适用于纯数字/字符串数组）
arr.toString().split(',').map(Number);
```

> 面试首选 `flat(Infinity)`，再手写 `reduce` 递归；递归版注意深度过大可能栈溢出。

---

## 42. 类数组与真数组

**类数组（Array-like）**：有 `length` 属性和数字索引，但没有数组的方法（`map`/`push` 等）。如 `arguments`、`NodeList`、`HTMLCollection`。

```js
function demo() {
    console.log(arguments.length);   // 有 length
    // arguments.map is not a function  —— 没有数组方法
}
```

**转为真数组：**

```js
// ① Array.from（推荐）
const arr = Array.from(arguments);

// ② 展开运算符（要求可迭代）
const arr2 = [...document.querySelectorAll('div')];

// ③ slice（经典）
const arr3 = Array.prototype.slice.call(arguments);

// ④ Array.prototype.concat.apply([], args)
```

**判断数组：**

```js
Array.isArray([]);            // true
Array.isArray({ length: 0 });// false（类数组不是数组）
```

> 用 `Object.prototype.toString.call(arguments)` 得到 `'[object Arguments]'`，可与真数组区分。

---

## 43. for in 与 for of 的区别

| | `for...in` | `for...of` |
| --- | --- | --- |
| 遍历内容 | **键名**（含原型链上的可枚举属性） | **值** |
| 适用对象 | 对象、数组 | 可迭代对象（数组、Map、Set、字符串） |
| 顺序 | 不保证（整数键较特殊） | 按迭代器顺序 |
| Symbol | 不遍历 | —— |
| 能否用于普通对象 | 可以 | **不可以**（非可迭代） |

```js
const obj = { a: 1, b: 2 };
for (const key in obj) console.log(key);  // 'a' 'b'

const arr = [10, 20];
for (const v of arr) console.log(v);      // 10 20

// 遍历对象：先用 Object.keys / entries
for (const [k, v] of Object.entries(obj)) console.log(k, v);
```

**要点：**

- `for...in` 会遍历到**继承的可枚举属性**，数组上还可能拿到自定义属性，遍历数组不推荐。
- 遍历数组用 `for...of` / `forEach`；遍历对象用 `Object.keys/entries` 或 `for...in`（配合 `hasOwnProperty`）。
- `for...in` 中 `key` 是字符串。

---

## 44. 垃圾回收机制

JS 引擎自动管理内存，通过**垃圾回收（GC）** 释放不再使用的内存。核心思想：**可达性**——从根对象（全局对象、调用栈）出发能访问到的对象是「存活」的。

**两种常见算法：**

1. **标记清除（Mark and Sweep）**：从根开始标记所有可达对象，未标记的即为垃圾，清除。**现代引擎主流**。
2. **引用计数（Reference Counting）**：记录引用次数，为 0 则回收。**缺点**：**循环引用**无法回收（现代引擎已不单独使用）。

**V8 的分代回收（补充）：**

- **新生代**：对象小、生命周期短，用 Scavenge（复制算法）快速回收。
- **老生代**：存活久的对象，用「标记-清除 + 标记-整理」。

**减少 GC 压力的建议：** 避免频繁创建大对象、及时解除不再使用的引用（如移除事件监听、置 `null`）。

---

## 45. 内存泄漏的常见原因

**内存泄漏**：不再使用的内存未被释放，持续占用，最终导致页面卡顿甚至崩溃。

**常见原因：**

1. **意外的全局变量**：未声明就赋值、`this` 指向全局。
   ```js
   function fn() { leak = 'x'; } // 未用 let/const，变成全局
   ```
2. **被遗忘的定时器 / 回调**：`setInterval` 未清除，回调引用的外部变量一直存活。
3. **未移除的事件监听**：DOM 已删除，但监听器仍引用它。
   ```js
   el.addEventListener('click', handler);
   // 移除元素前应：el.removeEventListener('click', handler);
   ```
4. **闭包滥用**：闭包长期持有大对象。
5. **DOM 引用残留**：JS 变量仍引用已从文档移除的 DOM。
6. **循环引用**（老式引用计数场景）。
7. **缓存无限增长**：Map/数组持续 push 未清理，可用 `WeakMap`。

```js
// 修复示例
let cached = document.getElementById('app');
cached = null; // 解除引用
```

**排查工具：** Chrome DevTools → Memory（堆快照、分配时间线）、Performance 监控。

---

## 46. 浮点数精度问题

**现象：**

```js
0.1 + 0.2;         // 0.30000000000000004
0.1 + 0.2 === 0.3; // false
```

**原因：** JS 遵循 IEEE 754 双精度浮点数标准，用 64 位二进制表示数字（1 位符号 + 11 位指数 + 52 位尾数）。十进制的 `0.1`、`0.2` 转成二进制是**无限循环小数**，尾数位不够时被截断，产生误差。

**解决方案：**

**① 转整数再运算（推荐）**

```js
(0.1 * 10 + 0.2 * 10) / 10; // 0.3
```

**② 使用 `toFixed` 保留位数（注意返回字符串）**

```js
(0.1 + 0.2).toFixed(2);  // '0.30'
parseFloat((0.1 + 0.2).toFixed(10)); // 0.3
```

**③ 使用 `Number.EPSILON` 判断近似相等**

```js
Math.abs(0.1 + 0.2 - 0.3) < Number.EPSILON; // true
```

**④ 使用第三方库**：`decimal.js`、`big.js`、`bignumber.js`（金融计算推荐）。

**⑤ 大整数场景**用 `BigInt`：

```js
9007199254740991 + 1 === 9007199254740992; // true（MAX_SAFE_INTEGER）
9007199254740991n + 1n;                    // 9007199254740992n
```

---

## 47. 严格模式

通过 `'use strict'` 开启（可作用于整个脚本或单个函数）。

```js
'use strict';
function f() { ... }
```

**主要变化：**

1. **变量必须声明**：未声明赋值报 `ReferenceError`（不再隐式创建全局变量）。
2. **`this` 不再默认指向全局**：普通函数调用中 `this` 为 `undefined`。
3. **禁止删除变量/函数**：`delete x` 报错。
4. **禁止参数重名**、**禁止八进制字面量** `0123`。
5. **禁止 `with` 语句**。
6. **静默错误变为抛错**：如给只读属性赋值、给 `NaN` 赋值。
7. **`eval` 有独立作用域**，不可在外部访问其变量。

**好处：** 更早暴露错误、消除不安全的静默行为、提升引擎优化能力。ES Module 和 `class` 内部**默认就是严格模式**。

---

## 48. 事件流与事件委托

**事件流三阶段：**

1. **捕获阶段**：从 `window` → 目标元素，逐级向下。
2. **目标阶段**：到达目标元素。
3. **冒泡阶段**：从目标元素 → `window`，逐级向上。

```js
// 第三个参数：true 捕获 / false（默认）冒泡
el.addEventListener('click', handler, false);
el.addEventListener('click', handler, true);

el.stopPropagation();  // 阻止继续传播（捕获/冒泡）
e.preventDefault();    // 阻止默认行为
```

**事件委托（事件代理）**：把子元素的事件监听**委托给父元素**，利用**事件冒泡**，在父元素统一处理。

```js
ul.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (li) console.log(li.dataset.id);
});
```

**优点：**

- **减少监听器数量**，降低内存占用、提升性能（尤其长列表）。
- **动态新增的元素自动生效**，无需重新绑定。
- 逻辑集中，便于维护。

**限制：** 不支持冒泡的事件（如 `focus`、`blur`，用 `focusin`/`focusout` 替代）无法委托；层级过深时 `e.target` 判断需谨慎。

---

## 49. 手写防抖（debounce）

**防抖**：事件触发后延迟 `delay` 执行；若在延迟内**再次触发**，则重新计时。适用于搜索联想、窗口 resize、表单校验。

```js
function debounce(fn, delay = 300) {
    let timer = null;
    return function (...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this, args);   // 保证 this 与参数正确
        }, delay);
    };
}
```

**立即执行版本**（首次立刻执行，后续防抖）：

```js
function debounce(fn, delay = 300, immediate = false) {
    let timer = null;
    return function (...args) {
        const callNow = immediate && !timer;
        clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            if (!immediate) fn.apply(this, args);
        }, delay);
        if (callNow) fn.apply(this, args);
    };
}
```

```js
const onSearch = debounce((kw) => console.log('搜索', kw), 500);
input.addEventListener('input', (e) => onSearch(e.target.value));
```

---

## 50. 手写节流（throttle）

**节流**：保证在 `interval` 时间内最多执行**一次**，适用于滚动加载、拖拽、高频点击。

**① 时间戳版（首次立即执行，尾部不执行）**

```js
function throttle(fn, interval = 300) {
    let last = 0;
    return function (...args) {
        const now = Date.now();
        if (now - last >= interval) {
            last = now;
            fn.apply(this, args);
        }
    };
}
```

**② 定时器版（首次延迟执行，尾部会执行）**

```js
function throttle(fn, interval = 300) {
    let timer = null;
    return function (...args) {
        if (timer) return;
        timer = setTimeout(() => {
            fn.apply(this, args);
            timer = null;
        }, interval);
    };
}
```

**③ 结合版（首尾都执行）**

```js
function throttle(fn, interval = 300) {
    let last = 0, timer = null;
    return function (...args) {
        const now = Date.now();
        const remaining = interval - (now - last);
        if (remaining <= 0) {
            if (timer) { clearTimeout(timer); timer = null; }
            last = now;
            fn.apply(this, args);
        } else if (!timer) {
            timer = setTimeout(() => {
                last = Date.now();
                timer = null;
                fn.apply(this, args);
            }, remaining);
        }
    };
}
```

```js
window.addEventListener('scroll', throttle(() => console.log('滚动'), 200));
```

> **区别记忆：** 防抖是「等你停下来再执行」，节流是「固定频率执行」。

---

## 51. 手写深拷贝

```js
function deepClone(target, map = new WeakMap()) {
    // 基本类型 / 函数 直接返回
    if (target === null || typeof target !== 'object') return target;

    // 处理循环引用（避免无限递归）
    if (map.has(target)) return map.get(target);

    // 特殊对象处理
    if (target instanceof Date) return new Date(target);
    if (target instanceof RegExp) return new RegExp(target);
    if (target instanceof Map) {
        const res = new Map();
        map.set(target, res);
        target.forEach((v, k) => res.set(deepClone(k, map), deepClone(v, map)));
        return res;
    }
    if (target instanceof Set) {
        const res = new Set();
        map.set(target, res);
        target.forEach((v) => res.add(deepClone(v, map)));
        return res;
    }

    // 数组或对象（保持原型）
    const res = Array.isArray(target) ? [] : Object.create(Object.getPrototypeOf(target));
    map.set(target, res);

    // 自身可枚举属性（含 Symbol 键）
    Reflect.ownKeys(target).forEach((key) => {
        if (Object.prototype.propertyIsEnumerable.call(target, key)) {
            res[key] = deepClone(target[key], map);
        }
    });
    return res;
}
```

```js
const a = { x: 1, nested: { y: [1, 2] }, d: new Date() };
a.self = a; // 循环引用
const b = deepClone(a);
b.nested.y.push(3);
console.log(a.nested.y); // [1, 2] —— 互不影响
console.log(b.self === b); // true —— 循环引用正确处理
```

**要点：** 用 `WeakMap` 记录已拷贝对象解决循环引用；区分数组/对象/`Date`/`RegExp`/`Map`/`Set`；`typeof` 为 `'object'` 才递归（函数一般直接返回）。

---

## 52. 手写 call、apply、bind

**手写 `call`**：把函数作为对象的方法调用，从而让 `this` 指向该对象。

```js
Function.prototype.myCall = function (context, ...args) {
    context = context == null ? globalThis : Object(context);
    const key = Symbol('fn');       // 用 Symbol 避免覆盖同名属性
    context[key] = this;
    const result = context[key](...args);
    delete context[key];            // 用完删除，避免污染
    return result;
};
```

**手写 `apply`**：与 `call` 相同，只是参数为数组。

```js
Function.prototype.myApply = function (context, args = []) {
    context = context == null ? globalThis : Object(context);
    const key = Symbol('fn');
    context[key] = this;
    const result = context[key](...args);
    delete context[key];
    return result;
};
```

**手写 `bind`**：返回一个新函数，并支持 `new` 调用。

```js
Function.prototype.myBind = function (context, ...bindArgs) {
    const fn = this;
    function bound(...callArgs) {
        // 作为构造函数 new 时，this 指向实例，忽略绑定的 context
        return fn.apply(this instanceof bound ? this : context, [...bindArgs, ...callArgs]);
    }
    // 关键：继承原函数的 prototype，保证 new 出来的实例原型链正确
    if (fn.prototype) bound.prototype = Object.create(fn.prototype);
    return bound;
};
```

```js
function sum(a, b) { return a + b + this.base; }
const obj = { base: 10 };
sum.myCall(obj, 1, 2);   // 13
sum.myApply(obj, [1, 2]); // 13
const bound = sum.myBind(obj, 1);
bound(2);                 // 13
```

---

## 53. 手写 new

```js
function myNew(Ctor, ...args) {
    // 1. 校验构造函数
    if (typeof Ctor !== 'function') {
        throw new TypeError('Ctor must be a function');
    }
    // 2. 创建新对象，原型指向 Ctor.prototype
    const obj = Object.create(Ctor.prototype);
    // 3. 执行构造函数，this 绑定到新对象
    const result = Ctor.apply(obj, args);
    // 4. 构造函数返回引用类型则用返回值，否则用新对象
    return result !== null && (typeof result === 'object' || typeof result === 'function')
        ? result
        : obj;
}
```

```js
function Person(name) {
    this.name = name;
    this.say = function () { return this.name; };
}
Person.prototype.hi = function () { return 'hi ' + this.name; };

const p = myNew(Person, 'Tom');
console.log(p.name);         // 'Tom'
console.log(p.hi());         // 'hi Tom'
console.log(p instanceof Person); // true
```

> 面试要点：能说清四步（创建对象 → 链接原型 → 绑定 this 执行 → 处理返回值）。

---

## 54. 手写 instanceof

`instanceof` 判断「构造函数的 `prototype` 是否存在于对象的原型链上」。

```js
function myInstanceof(left, right) {
    if (typeof right !== 'function') {
        throw new TypeError('Right-hand side of instanceof is not callable');
    }
    const proto = right.prototype;
    let obj = Object.getPrototypeOf(left);
    while (obj) {
        if (obj === proto) return true;
        obj = Object.getPrototypeOf(obj);
    }
    return false;
}
```

```js
myInstanceof([], Array);   // true
myInstanceof([], Object);  // true
myInstanceof(1, Number);   // false（基本类型不在原型链上）
myInstanceof(() => {}, Function); // true
```

**要点：** 不断沿 `__proto__`（`Object.getPrototypeOf`）向上查找，直到 `null`；用 `getPrototypeOf` 比 `__proto__` 更规范。

---

## 55. 手写 Promise（简版）

核心：**状态机 + 回调队列**，状态只能由 `pending` 变为 `fulfilled` 或 `rejected`。

```js
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

class MyPromise {
    constructor(executor) {
        this.state = PENDING;
        this.value = undefined;
        this.reason = undefined;
        this.onFulfilledCallbacks = [];
        this.onRejectedCallbacks = [];

        const resolve = (value) => {
            if (this.state !== PENDING) return;   // 状态不可逆
            this.state = FULFILLED;
            this.value = value;
            this.onFulfilledCallbacks.forEach((fn) => fn());
        };
        const reject = (reason) => {
            if (this.state !== PENDING) return;
            this.state = REJECTED;
            this.reason = reason;
            this.onRejectedCallbacks.forEach((fn) => fn());
        };

        try {
            executor(resolve, reject);
        } catch (err) {
            reject(err);
        }
    }

    then(onFulfilled, onRejected) {
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : (v) => v;
        onRejected = typeof onRejected === 'function' ? onRejected : (e) => { throw e; };

        return new MyPromise((resolve, reject) => {
            const handle = (callback, state) => {
                queueMicrotask(() => {           // 微任务，保证异步执行
                    try {
                        const result = callback(state === FULFILLED ? this.value : this.reason);
                        if (result instanceof MyPromise) {
                            result.then(resolve, reject); // 返回值是 Promise 则透传
                        } else {
                            resolve(result);
                        }
                    } catch (err) {
                        reject(err);
                    }
                });
            };

            if (this.state === FULFILLED) handle(onFulfilled, FULFILLED);
            else if (this.state === REJECTED) handle(onRejected, REJECTED);
            else {
                this.onFulfilledCallbacks.push(() => handle(onFulfilled, FULFILLED));
                this.onRejectedCallbacks.push(() => handle(onRejected, REJECTED));
            }
        });
    }

    catch(onRejected) {
        return this.then(null, onRejected);
    }

    finally(cb) {
        return this.then(
            (v) => MyPromise.resolve(cb()).then(() => v),
            (e) => MyPromise.resolve(cb()).then(() => { throw e; })
        );
    }

    static resolve(value) {
        return value instanceof MyPromise ? value : new MyPromise((res) => res(value));
    }
    static reject(reason) {
        return new MyPromise((_, rej) => rej(reason));
    }
    static all(promises) {
        return new MyPromise((resolve, reject) => {
            const result = [];
            let count = 0;
            promises.forEach((p, i) => {
                MyPromise.resolve(p).then((v) => {
                    result[i] = v;
                    if (++count === promises.length) resolve(result);
                }, reject);
            });
        });
    }
    static race(promises) {
        return new MyPromise((resolve, reject) => {
            promises.forEach((p) => MyPromise.resolve(p).then(resolve, reject));
        });
    }
}
```

```js
new MyPromise((resolve) => setTimeout(() => resolve(1), 100))
    .then((v) => v + 1)
    .then((v) => console.log(v)); // 2
```

**要点：** 状态不可逆、`then` 返回新 Promise、回调异步（微任务）执行、返回值为 Promise 时透传、`executor` 抛错自动 `reject`。

---

## 56. 函数柯里化

**柯里化（Currying）**：把接收多个参数的函数，转换为**一系列每次接收一个（或部分）参数**的函数，参数足够时才执行。

```js
// 通用柯里化
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
        return fn.apply(this, args);       // 参数够了，执行
    }
    return (...rest) => curried.apply(this, [...args, ...rest]); // 继续收集
  };
}

function add(a, b, c) { return a + b + c; }
const curriedAdd = curry(add);
curriedAdd(1)(2)(3);   // 6
curriedAdd(1, 2)(3);   // 6
curriedAdd(1)(2, 3);   // 6
curriedAdd(1, 2, 3);   // 6
```

**不定长参数柯里化（面试变体）**：要求能无限调用，并在取值时求和。

```js
function add(...args) {
    const sum = (...rest) => add(...args, ...rest);
    sum.toString = () => args.reduce((a, b) => a + b, 0);  // 输出时求值
    return sum;
}

+add(1)(2)(3);       // 6（隐式调用 toString）
console.log(add(1, 2)(3) + ''); // '6'
```

**作用：**

- **参数复用**：固定部分参数，生成更专用的函数。
- **延迟执行**：收集够参数再执行。
- **函数组合**：配合 `compose`/`pipe` 构建函数式管道。

> 面试要点：`fn.length` 表示函数形参个数，用作「参数是否收集完毕」的判据；注意剩余参数和默认参数会让 `length` 不准。