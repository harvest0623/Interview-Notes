# TypeScript 常见面试题

> 本文件收录 TypeScript 相关的高频面试题及参考答案，按「基础概念 → 类型系统 → 泛型 → 函数/面向对象 → 进阶特性 → 工程化」的顺序整理。

---

## 目录

1. [TypeScript 是什么？与 JavaScript 的关系？](#1-typescript-是什么与-javascript-的关系)
2. [TypeScript 的类型检查何时发生？编译流程是怎样的？](#2-typescript-的类型检查何时发生编译流程是怎样的)
3. [TypeScript 有哪些基础类型？](#3-typescript-有哪些基础类型)
4. [any、unknown、never、void 的区别？](#4-anyunknownnevervoid-的区别)
5. [类型断言、非空断言与 as const](#5-类型断言非空断言与-as-const)
6. [什么是类型推导（类型推断）？](#6-什么是类型推导类型推断)
7. [什么是类型收窄（Narrowing）？](#7-什么是类型收窄narrowing)
8. [interface 与 type 的区别？](#8-interface-与-type-的区别)
9. [联合类型与交叉类型](#9-联合类型与交叉类型)
10. [字面量类型](#10-字面量类型)
11. [类型守卫的四种实现方式](#11-类型守卫的四种实现方式)
12. [类型兼容性（结构化类型）](#12-类型兼容性结构化类型)
13. [协变、逆变与双变](#13-协变逆变与双变)
14. [顶层类型与底层类型](#14-顶层类型与底层类型)
15. [泛型基础：约束与默认值](#15-泛型基础约束与默认值)
16. [内置工具类型（Utility Types）](#16-内置工具类型utility-types)
17. [keyof、typeof 与索引访问类型](#17-keyoftypeof-与索引访问类型)
18. [条件类型与 infer](#18-条件类型与-infer)
19. [映射类型（Mapped Types）](#19-映射类型mapped-types)
20. [模板字面量类型（Template Literal Types）](#20-模板字面量类型template-literal-types)
21. [satisfies 操作符](#21-satisfies-操作符)
22. [类型空间与值空间](#22-类型空间与值空间)
23. [函数重载](#23-函数重载)
24. [可选链与空值合并](#24-可选链与空值合并)
25. [类与访问修饰符](#25-类与访问修饰符)
26. [readonly 与不可变类型](#26-readonly-与不可变类型)
27. [抽象类与接口的区别](#27-抽象类与接口的区别)
28. [接口的继承与实现](#28-接口的继承与实现)
29. [枚举 enum](#29-枚举-enum)
30. [装饰器（Decorator）](#30-装饰器decorator)
31. [Mixin 混入](#31-mixin-混入)
32. [元组 Tuple 与可变元组](#32-元组-tuple-与可变元组)
33. [索引签名与 Record](#33-索引签名与-record)
34. [类型体操：实现内置工具类型](#34-类型体操实现内置工具类型)
35. [类型体操：递归类型](#35-类型体操递归类型)
36. [命名空间 namespace 与模块](#36-命名空间-namespace-与模块)
37. [声明文件 .d.ts 与 declare](#37-声明文件-dts-与-declare)
38. [import type 与类型导入导出](#38-import-type-与类型导入导出)
39. [严格模式 strict 包含哪些选项？](#39-严格模式-strict-包含哪些选项)
40. [tsconfig.json 常用配置](#40-tsconfigjson-常用配置)
41. [TypeScript 编译性能优化](#41-typescript-编译性能优化)
42. [TypeScript 与 React 结合常见类型](#42-typescript-与-react-结合常见类型)
43. [类型断言的最佳实践与常见坑](#43-类型断言的最佳实践与常见坑)
44. [TypeScript 相比 JavaScript 的优势与局限](#44-typescript-相比-javascript-的优势与局限)
45. [常见类型输出题](#45-常见类型输出题)

---

## 1. TypeScript 是什么？与 JavaScript 的关系？

**TypeScript（TS）** 是微软开发的 **JavaScript 的超集（Superset）**：任何合法的 JS 代码都是合法的 TS（在未开启严格检查时），TS 在此基础上增加了**静态类型系统**和面向对象的语法特性。

**核心关系：**

```
TypeScript = JavaScript + 静态类型 + 类型注解 + 现代语法（编译为目标版本 JS）
```

**关键结论：**

- **TS 不能直接在浏览器/Node 中运行**，必须先**编译（转译）** 成 JS。
- 类型只存在于**编译期**，编译后**类型信息被完全擦除**，运行时不存在类型（`类型擦除`）。
- TS 的类型是**结构化**的（看形状，不看名字），而非名义类型。

```ts
// 编写 TS
function greet(name: string): string {
  return `Hello, ${name}`;
}

// 编译后（类型被擦除）
function greet(name) {
  return `Hello, ${name}`;
}
```

**TS 带来的价值：**

- **提前发现错误**：类型不匹配在编写/编译阶段就报错，而非运行时崩溃。
- **更好的 IDE 支持**：自动补全、跳转定义、重构、参数提示。
- **代码即文档**：类型签名即接口契约，提升可读性与可维护性。
- **重构更安全**：改动类型后，编译器会指出所有受影响的位置。

**局限：** 增加编写成本、编译开销；类型系统存在「逃生舱」（`any`），滥用会失去保护；对象动态增删属性时类型描述会比较繁琐。

> 一句话：**TS 是带类型的 JS，类型只在编译期起作用，最终运行的仍是 JS。**

---

## 2. TypeScript 的类型检查何时发生？编译流程是怎样的？

**类型检查完全发生在编译期（静态检查），运行时不做任何类型校验。**

**编译流程：**

1. **扫描/解析**：`tsc` 读取 `.ts` 文件，生成 **AST**（抽象语法树）。
2. **类型检查**：基于 AST 做类型推断与检查，不通过则报错（是否中断编译取决于 `noEmitOnError`）。
3. **输出**：擦除类型注解，按 `target` 降级语法，生成 `.js`（可选生成 `.d.ts` 声明文件与 source map）。

```
.ts 源码 → AST → 类型检查 → 类型擦除 + 语法降级 → .js / .d.ts / .map
```

**关键点：**

- TS 的报错**不影响 JS 的产出**（默认仍会生成 JS），除非设置 `noEmitOnError: true`。
- 运行时无法获取类型，若需要运行时校验必须依靠**手写判断**或库（如 `zod`、`io-ts`）。
- `tsc` 只做类型检查与转译；模块打包、压缩等交给 Vite / webpack / Rollup。
- 现代工具链中：**类型检查用 `tsc --noEmit`，转译用 esbuild/swc**（快得多），二者分离。

```json
// package.json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "vite build"
  }
}
```

---

## 3. TypeScript 有哪些基础类型？

| 类型 | 说明 | 示例 |
| --- | --- | --- |
| `number` | 数字（整数、浮点） | `let n: number = 1` |
| `string` | 字符串 | `let s: string = 'a'` |
| `boolean` | 布尔值 | `let b: boolean = true` |
| `null` / `undefined` | 空值（`strictNullChecks` 下是独立类型） | `let u: undefined = undefined` |
| `symbol` | 唯一值 | `let sy: symbol = Symbol()` |
| `bigint` | 大整数 | `let bi: bigint = 10n` |
| `object` | 非原始类型（`object` 表示非基元） | `let o: object = {}` |
| `any` | 任意类型，关闭检查 | `let a: any = 1` |
| `unknown` | 未知类型，安全版 `any` | `let u: unknown = 1` |
| `never` | 永不存在的值 | `function f(): never { throw 1 }` |
| `void` | 无返回值 | `function f(): void {}` |
| `array` | 数组，`T[]` 或 `Array<T>` | `let list: number[] = [1]` |
| `tuple` | 元组，定长定类型数组 | `let t: [string, number] = ['a', 1]` |
| `enum` | 枚举 | `enum Color { Red, Green }` |

**易错点：**

- **不要用包装类型**：`String`、`Number`、`Boolean` 是对象类型，与 `string`、`number`、`boolean` 不同，**几乎不要使用**。

  ```ts
  let a: string = 'x';
  let b: String = 'x';   // 合法但应避免
  a = b;                 // 可以（String 兼容 string）
  b = a;                 // 可以
  let c: string = new String('x'); // 报错：String 不能赋给 string
  ```

- `null` 与 `undefined`：`strictNullChecks` 开启（`strict` 含）后，二者只能赋给自身或 `any`/`unknown`，避免空值 bug。

- **类型注解可选**：TS 会**类型推导**，能推导出类型时无需手写。

  ```ts
  let n = 1;          // 推导为 number
  const s = 'hello';  // 推导为字面量 'hello'
  ```

---

## 4. any、unknown、never、void 的区别？

| | `any` | `unknown` | `never` | `void` |
| --- | --- | --- | --- | --- |
| 含义 | 任意类型，放弃检查 | 未知类型，安全版 any | 永不存在的值 | 无返回值 |
| 可赋值给别的类型 | 可以（任意） | **不可以**（需先收窄） | 可以赋给**任何**类型 | 否 |
| 别的类型可赋给它 | 可以 | 可以 | **不可以** | 否 |
| 可访问属性/调用 | 可以（不检查） | **不可以** | —— | —— |
| 典型场景 | 迁移老代码、逃生舱 | 外部输入（`catch`、API） | 抛错函数、穷尽检查 | 无返回值的函数 |

```ts
// any：完全放弃类型检查，危险
let a: any = 1;
a.toFixed();     // 不报错
a.nothing.here;  // 不报错（运行时才崩）

// unknown：必须收窄后才能使用
let u: unknown = 'hello';
// u.toUpperCase();          // 报错
if (typeof u === 'string') u.toUpperCase(); // 收窄后可用

// never：永远不会有返回值 / 不可能的分支
function fail(msg: string): never {
  throw new Error(msg);
}
// 穷尽检查：所有分支处理完后剩下的是 never
type Shape = { kind: 'circle' } | { kind: 'square' };
function area(s: Shape) {
  switch (s.kind) {
    case 'circle': return 1;
    case 'square': return 2;
    default:
      const _exhaustive: never = s; // 若新增分支未处理，这里会报错
      return _exhaustive;
  }
}

// void：无返回值
function log(msg: string): void {
  console.log(msg);
}
```

**要点：**

- 能用 `unknown` 就不要用 `any`；`unknown` 是类型安全的「顶层类型」。
- `never` 是「底层类型」，可赋给任何类型，任何类型都不能赋给它。
- `void` 函数可被赋值给返回任意类型的函数签名（TS 特性）：

  ```ts
  type Fn = () => void;
  const f: Fn = () => 123; // 允许，返回值被忽略
  ```

> 记忆：`unknown` 是「进得去、出不来」，`never` 是「进不来、出得去（可赋给任何）」。

---

## 5. 类型断言、非空断言与 as const

**① 类型断言（Type Assertion）**：告诉编译器「我知道这个值的类型」，**不做运行时转换**，仅影响类型判断。

```ts
// 两种写法（推荐 as）
const el = document.getElementById('app') as HTMLDivElement;
const el2 = <HTMLDivElement>document.getElementById('app'); // 与 JSX 冲突，React 中禁用

// 双重断言（先转 unknown 再转，风险自负）
const x = ('hello' as unknown) as number;
```

**注意：** 断言只是「欺骗编译器」，若判断错误，运行时依然会出错；能通过类型守卫收窄就不要用断言。

**② 非空断言 `!`**：断言值不为 `null`/`undefined`。

```ts
function getEl(sel: string) {
  const el = document.querySelector(sel)!; // 断言非空
  return el.innerHTML; // 不再提示可能为 null
}
```

> 非空断言是「关掉编译器提醒」，若实际为空仍会运行时报错；更安全的做法是加 `if` 判断。

**③ `as const`（常量断言）**：把值断言为**最窄的字面量类型**，并让对象/数组变为**只读**。

```ts
const arr = [1, 2];              // number[]
const arrC = [1, 2] as const;    // readonly [1, 2]

const obj = { type: 'success' }; // { type: string }
const objC = { type: 'success' } as const; // { readonly type: 'success' }

// 常见用途：让配置对象的值保持字面量类型
const config = {
  url: '/api',
  method: 'GET',
} as const;
type Method = typeof config.method; // 'GET'
```

**`as const` 与 `const` 的区别：**

- `const` 只保证**变量绑定不可变**，对象内部属性仍可变。
- `as const` 保证**深层只读 + 字面量类型**，即 `deeply readonly`。

---

## 6. 什么是类型推导（类型推断）？

**类型推导**：TS 在没有显式注解时，根据上下文**自动推断**出类型。

**常见推导场景：**

```ts
let n = 1;                    // number
const s = 'hello';            // 'hello'（const 推导为字面量）
let arr = [1, 'a'];           // (string | number)[]
let fn = (x: number) => x * 2;// (x: number) => number

// 上下文推导：根据期望类型反推
const names = ['Tom', 'Jerry'];
names.forEach((name) => name.toUpperCase()); // name 推导为 string

// 最佳公共类型（Best Common Type）
let mixed = [0, 1, null];     // (number | null)[]
```

**类型推导的位置：**

- **变量声明**：无注解则推导。
- **函数返回值**：可由 `return` 推导（推荐显式标注公共 API 的返回值）。
- **上下文类型（Contextual Typing）**：由使用位置反推参数类型。

**推导优先级：**

```
显式注解 > 上下文推导 > 字面量拓宽（widening）后的通用类型
```

```ts
// 字面量拓宽：let 会拓宽，const / as const 不会
let a = 'x';          // string（拓宽）
const b = 'x';        // 'x'（不拓宽）
let c = 'x' as const; // 'x'
```

**为什么要显式注解？**

- 函数参数**不会**自动推导（除上下文），必须标注。
- 公共 API 的返回值显式标注，可避免实现改动导致类型意外变化。

---

## 7. 什么是类型收窄（Narrowing）？

**类型收窄**：把**联合类型**或宽泛类型，通过条件判断缩小为更具体的类型，让编译器在该分支内按窄类型处理。

**常见收窄手段：**

```ts
type Value = string | number | null;

function handle(v: Value) {
  // ① typeof
  if (typeof v === 'string') {
    v.toUpperCase();          // string
  } else if (typeof v === 'number') {
    v.toFixed(2);             // number
  } else {
    v;                        // null
  }
}
```

```ts
// ② 真值收窄
function print(v?: string) {
  if (v) {
    v.length; // string（排除 undefined / ''）
  }
}
```

```ts
// ③ in 操作符
type A = { a: number };
type B = { b: string };
function f(x: A | B) {
  if ('a' in x) x.a;   // A
  else x.b;            // B
}
```

```ts
// ④ instanceof
function g(e: Error | Date) {
  if (e instanceof Error) e.message;
  else e.getTime();
}
```

```ts
// ⑤ 判别联合（Discriminated Union，最常用）
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number };

function area(s: Shape) {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2;
    case 'square': return s.side ** 2;
  }
}
```

```ts
// ⑥ 自定义类型谓词（x is T）
function isString(v: unknown): v is string {
  return typeof v === 'string';
}
```

**要点：**

- 收窄发生在**控制流**中，`if`/`switch`/`return` 早退都会影响后续分支的类型。
- **判别联合**（用一个公共字面量字段区分）是工程中最推荐的设计。

---

## 8. interface 与 type 的区别？

| | `interface` | `type` |
| --- | --- | --- |
| 定义对象类型 | 可以 | 可以 |
| 定义联合/交叉/元组 | 不可以 | **可以** |
| 定义基础类型别名 | 不可以 | 可以（`type ID = string`） |
| 声明合并（同名自动合并） | **支持** | 不支持（同名报错） |
| `extends` / `implements` | 支持 | `extends` 可以（交叉），不能 `implements` 自身 |
| 映射类型 | 不支持 | 支持 |
| 条件类型 | 不支持 | 支持 |
| 性能 | 略优（可缓存、惰性） | 复杂类型体操时较慢 |
| 报错信息 | 更清晰 | 复杂时可能难读 |

```ts
// interface：可声明合并（适合库的类型扩展）
interface User { name: string }
interface User { age: number }   // 自动合并为 { name: string; age: number }

// type：可定义联合与交叉
type Status = 'idle' | 'loading' | 'done';
type ID = string | number;
type Person = { name: string } & { age: number };
```

```ts
// interface extends
interface Animal { name: string }
interface Dog extends Animal { bark(): void }

// type 交叉实现类似继承
type Animal2 = { name: string };
type Dog2 = Animal2 & { bark(): void };
```

**选择建议：**

- **对象结构、可扩展的公共 API**：优先 `interface`（支持声明合并、报错更友好）。
- **联合类型、元组、工具类型、映射/条件类型**：只能用 `type`。
- 团队内保持一致即可，二者在绝大多数场景可互换。

---

## 9. 联合类型与交叉类型

**联合类型 `|`（Union）**：满足**其中之一**即可，取值是「或」的关系。

```ts
type ID = string | number;
function printId(id: ID) {
  if (typeof id === 'string') id.toUpperCase();
  else id.toFixed(0);
}
```

**交叉类型 `&`（Intersection）**：需要**同时满足**所有类型，取值是「且」的关系，常用于对象合并。

```ts
type Named = { name: string };
type Aged = { age: number };
type Person = Named & Aged;   // { name: string; age: number }

const p: Person = { name: 'Tom', age: 18 };
```

**常见用途：**

```ts
// 扩展第三方类型
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant: 'primary' | 'ghost';
};

// 交叉同类基本类型会变成 never
type Impossible = string & number; // never

// 联合中的交叉：分配给不同成员
type Result = ({ type: 'a' } & { a: number }) | ({ type: 'b' } & { b: string });
```

**易错点：**

- 联合类型只能访问**所有成员共有**的属性；要访问特有属性必须先收窄。
- 交叉类型若存在**同名但类型不同**的属性，会变成 `never`。
- `A | never` = `A`；`A & never` = `never`。

---

## 10. 字面量类型

**字面量类型**：把类型限制为**具体的值**，包括字符串、数字、布尔、以及模板字面量。

```ts
let s: 'hello' = 'hello';
// s = 'world';  // 报错

type Direction = 'up' | 'down' | 'left' | 'right';
type Dice = 1 | 2 | 3 | 4 | 5 | 6;
type Flag = true;
```

**常见应用：**

```ts
// ① 配置项的合法取值
type Size = 'small' | 'medium' | 'large';
interface ButtonProps { size?: Size }

// ② 模拟枚举
const HTTP_METHODS = ['GET', 'POST', 'PUT'] as const;
type HttpMethod = typeof HTTP_METHODS[number]; // 'GET' | 'POST' | 'PUT'
```

**字面量拓宽（Widening）：**

- `let` 声明会**拓宽**为通用类型；`const` 保留字面量。

```ts
let a = 'x';             // string（拓宽）
const b = 'x';           // 'x'
const c = { k: 'x' };    // { k: string }（对象属性仍会拓宽）
const d = { k: 'x' } as const; // { readonly k: 'x' }
```

**要点：**

- 字面量类型是**联合类型**与**类型体操**的基础。
- `as const` 是保留字面量类型的关键手段。
- 联合字面量常用作**判别字段**（discriminant），实现类型收窄。

---

## 11. 类型守卫的四种实现方式

**类型守卫（Type Guard）**：在运行时判断类型，并让编译器在对应分支**收窄类型**。

**① `typeof`**：适用于基本类型判断。

```ts
function f(v: string | number) {
  if (typeof v === 'string') return v.length;
  return v.toFixed(2);
}
```

**② `instanceof`**：适用于类实例。

```ts
function f(err: Error | TypeError) {
  if (err instanceof TypeError) return err.message;
  return (err as Error).message;
}
```

**③ `in`**：判断属性是否存在，适用于对象联合。

```ts
type A = { a: number };
type B = { b: string };
function f(x: A | B) {
  if ('a' in x) return x.a;
  return x.b;
}
```

**④ 自定义类型谓词 `value is Type`**：最灵活，适合复杂判断。

```ts
interface Cat { meow(): void }
interface Dog { bark(): void }

function isCat(pet: Cat | Dog): pet is Cat {
  return (pet as Cat).meow !== undefined;
}

function speak(pet: Cat | Dog) {
  if (isCat(pet)) pet.meow();   // 收窄为 Cat
  else pet.bark();              // 收窄为 Dog
}
```

**⑤ 断言函数 `asserts value is Type`**（TS 3.7+）：

```ts
function assertIsString(v: unknown): asserts v is string {
  if (typeof v !== 'string') throw new Error('Not a string');
}

function f(x: unknown) {
  assertIsString(x);
  x.toUpperCase(); // 断言后收窄为 string
}
```

> 优先使用**判别联合**（用字面量字段区分），比运行时判断更安全、性能更好。

---

## 12. 类型兼容性（结构化类型）

TypeScript 采用**结构化类型系统（Structural Typing）**，也叫**鸭子类型**：只要**结构（形状）兼容**，类型就兼容，**与类型名字无关**。

```ts
interface Point { x: number; y: number }
interface Point2 { x: number; y: number }

const p1: Point = { x: 1, y: 2 };
const p2: Point2 = p1;   // 兼容（结构相同）

// 多出属性可以赋值给「属性少」的类型（子类型关系）
interface Point3 { x: number; y: number; z: number }
const p3: Point3 = { x: 1, y: 2, z: 3 };
const p: Point = p3;     // 兼容：Point3 是 Point 的子类型
```

**但对象字面量有「多余属性检查」（Excess Property Check）：**

```ts
const p: Point = { x: 1, y: 2, z: 3 };
// 报错：对象字面量只能指定已知属性，z 不在 Point 中

const p3: Point3 = { x: 1, y: 2, z: 3 };
const p4: Point = p3;    // 通过中间变量可以绕过（因为不是字面量）
```

**函数兼容性（参数逆变、返回值协变）：**

```ts
type Handler = (x: number) => void;

const h1: Handler = (x: number) => {};          // OK
const h2: Handler = (x: number | string) => {}; // OK：参数更宽（逆变）
// const h3: Handler = (x: 'a') => {};          // 报错：参数更窄

type GetNum = () => number;
const g: GetNum = () => 1;                       // OK
// const g2: GetNum = () => 'a';                 // 报错：返回值不兼容
```

**与其他语言对比：**

| | 结构化类型（TS） | 名义类型（Java/C#） |
| --- | --- | --- |
| 兼容依据 | **结构（形状）** | **类型名称 / 继承关系** |
| 好处 | 灵活、易组合、无侵入 | 明确、避免意外兼容 |
| 风险 | 可能「意外兼容」 | 需要显式实现接口 |

> TS 中可用**品牌类型（Branded Type）** 模拟名义类型，防止结构相同的类型被混用。

```ts
type UserId = string & { readonly __brand: 'UserId' };
type OrderId = string & { readonly __brand: 'OrderId' };
```

---

## 13. 协变、逆变与双变

**变型（Variance）** 描述类型参数在子类型关系下的传播方向。

| | 定义 | 例子 |
| --- | --- | --- |
| **协变（Covariant）** | 子类型关系**同向**保持 | `Array<Dog>` 可赋给 `Array<Animal>` |
| **逆变（Contravariant）** | 子类型关系**反向** | 函数参数：`(a: Animal) => void` 可赋给 `(a: Dog) => void` |
| **双变（Bivariant）** | 双向都可 | 方法的参数（`strictFunctionTypes` 下仍双变） |
| **不变（Invariant）** | 双向都不可 | 可变数组在严格场景下应不变 |

```ts
interface Animal { name: string }
interface Dog extends Animal { bark(): void }

// 返回值协变：Dog 可赋给 Animal
let getAnimal: () => Animal = (): Dog => ({ name: 'x', bark() {} });

// 参数逆变：接受 Animal 的函数，可赋给接受 Dog 的函数类型
let handler: (d: Dog) => void = (a: Animal) => console.log(a.name);
```

**`strictFunctionTypes` 的作用：**

- 开启后，**函数类型**的参数按**逆变**检查（更严格、更安全）。
- **方法（method）的参数仍为双变**，这是 TS 的刻意设计（兼容既有代码）。

```ts
interface Comparer {
  compare(a: Animal, b: Animal): number; // 方法：双变，允许放宽
}
type CompareFn = (a: Animal, b: Animal) => number; // 函数属性：逆变，严格
```

**为什么函数参数是逆变？**

若允许「接受 `Animal` 的函数」当作「接受 `Dog` 的函数」使用，调用方传 `Dog` 没问题；反之（接受 `Dog` 当作接受 `Animal`）在传入非 `Dog` 的 `Animal` 时会出问题，故参数方向必须反向。

> 面试只需讲清：**返回值协变、参数逆变、方法双变**，并能说明 `strictFunctionTypes` 的影响。

---

## 14. 顶层类型与底层类型

**顶层类型（Top Type）**：可以接受**任何值**的类型——`any` 与 `unknown`。

**底层类型（Bottom Type）**：不包含**任何值**的类型——`never`。

| 类型 | 能否接收任意值 | 能否赋给任意类型 | 说明 |
| --- | --- | --- | --- |
| `any` | 是 | 是 | 放弃检查，双向自由 |
| `unknown` | 是 | 否（需收窄） | 安全的顶层类型 |
| `never` | 否 | 是 | 空的联合，逻辑上的「无」 |

**`never` 的典型用途：**

```ts
// ① 穷尽性检查（exhaustiveness check）
type Action = { type: 'add' } | { type: 'remove' };

function reduce(action: Action) {
  switch (action.type) {
    case 'add': return 1;
    case 'remove': return 2;
    default: {
      const _exhaustive: never = action; // 若遗漏分支，这里报错
      return _exhaustive;
    }
  }
}
```

```ts
// ② 收窄掉不可能的分支
function f(x: string | number) {
  if (typeof x === 'string') return x;
  if (typeof x === 'number') return x;
  return x; // 此处 x 被收窄为 never
}
```

```ts
// ③ 排除联合中的成员
type Exclude<T, U> = T extends U ? never : T;
type T = Exclude<'a' | 'b' | 'c', 'a'>; // 'b' | 'c'
```

**要点：**

- `never` 可赋给任何类型，任何类型（除 `never`）都不能赋给它。
- `A | never` 化简为 `A`；`A & never` 化简为 `never`。
- 用 `never` 做穷尽检查是工程中非常实用的技巧。

---

## 15. 泛型基础：约束与默认值

**泛型（Generics）**：让类型作为**参数**，在调用时确定，实现「一次编写、多类型复用」，同时保留类型信息。

```ts
// 无泛型：只能固定类型，或退化为 any
function identityAny(arg: any): any { return arg; }

// 泛型：保留入参类型
function identity<T>(arg: T): T { return arg; }
const a = identity('hello'); // 'hello'
const b = identity(123);     // 123
```

**泛型约束 `extends`**：

```ts
// 约束必须有 length 属性
function getLength<T extends { length: number }>(arg: T): number {
  return arg.length;
}
getLength('abc');   // 3
getLength([1, 2]);  // 2
// getLength(123);  // 报错

// keyof 约束：限制 K 必须是 T 的键
function getValue<T extends object, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
const user = { name: 'Tom', age: 18 };
getValue(user, 'name'); // string
// getValue(user, 'sex'); // 报错
```

**泛型默认值**：

```ts
interface Pagination<T = string> {
  list: T[];
  total: number;
}
const p1: Pagination = { list: ['a'], total: 1 };      // T 为 string
const p2: Pagination<number> = { list: [1], total: 1 };
```

**泛型在接口/类/别名中：**

```ts
interface ApiResponse<T> { code: number; data: T }

class Stack<T> {
  private items: T[] = [];
  push(item: T): void { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
}
```

**常见约束组合：**

```ts
// 多个泛型参数互相约束
function merge<T extends object, U extends object>(a: T, b: U): T & U {
  return { ...a, ...b };
}
```

> 要点：泛型让类型在**使用处**确定，避免 `any` 丢失信息，同时通过 `extends` 保证可用性。

---

## 16. 内置工具类型（Utility Types）

TS 内置了一批常用工具类型，本质都建立在**条件类型、映射类型、`infer`** 之上。

| 工具类型 | 作用 | 简要实现 |
| --- | --- | --- |
| `Partial<T>` | 所有属性变可选 | `{ [K in keyof T]?: T[K] }` |
| `Required<T>` | 所有属性变必选 | `{ [K in keyof T]-?: T[K] }` |
| `Readonly<T>` | 所有属性变只读 | `{ readonly [K in keyof T]: T[K] }` |
| `Pick<T, K>` | 选取若干属性 | `{ [P in K]: T[P] }` |
| `Omit<T, K>` | 排除若干属性 | `Pick<T, Exclude<keyof T, K>>` |
| `Record<K, T>` | 构造键值映射 | `{ [P in K]: T }` |
| `Exclude<T, U>` | 从联合中排除 | `T extends U ? never : T` |
| `Extract<T, U>` | 从联合中提取 | `T extends U ? T : never` |
| `NonNullable<T>` | 去除 null/undefined | `Exclude<T, null \| undefined>` |
| `ReturnType<T>` | 函数返回值类型 | 条件类型 + `infer R` |
| `Parameters<T>` | 函数参数元组类型 | 条件类型 + `infer P` |
| `ConstructorParameters<T>` | 构造函数参数元组 | 同上 |
| `InstanceType<T>` | 构造函数实例类型 | `infer R` |
| `Awaited<T>` | 解开 Promise 嵌套 | 递归条件类型 |
| `Uppercase` / `Lowercase` / `Capitalize` / `Uncapitalize` | 字符串大小写转换 | 编译器内置 |
| `ThisType<T>` | 指定方法中 `this` 类型 | 上下文标记 |

```ts
interface User {
  id: number;
  name: string;
  email: string;
  age?: number;
}

type PartialUser = Partial<User>;         // 全部可选
type RequiredUser = Required<User>;       // 全部必填
type UserPreview = Pick<User, 'id' | 'name'>;  // { id; name }
type UserWithoutEmail = Omit<User, 'email'>;   // 去掉 email
type UserMap = Record<string, User>;      // { [k: string]: User }

type T1 = Exclude<'a' | 'b' | 'c', 'a'>;  // 'b' | 'c'
type T2 = Extract<'a' | 'b' | 'c', 'a' | 'b'>; // 'a' | 'b'
type T3 = NonNullable<string | null | undefined>; // string

type Fn = (a: number, b: string) => boolean;
type R = ReturnType<Fn>;   // boolean
type P = Parameters<Fn>;   // [a: number, b: string]
```

**组合使用示例：**

```ts
// 表单：把某几个字段变可选
type FormState = Omit<User, 'id'> & Partial<Pick<User, 'age'>>;

// 深度只读（内置 Readonly 只作用于第一层）
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};
```

---

## 17. keyof、typeof 与索引访问类型

**① `keyof T`**：获取对象类型的**键的联合**。

```ts
interface User { id: number; name: string }
type UserKeys = keyof User;         // 'id' | 'name'

function get<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
```

**② `typeof value`**：获取**值的类型**（把值当类型用）。

```ts
const config = { url: '/api', method: 'GET' };
type Config = typeof config;        // { url: string; method: string }

const arr = [1, 2] as const;
type ArrItem = typeof arr[number];  // 1 | 2

// 从函数取类型
function createUser() { return { id: 1, name: 'Tom' }; }
type User = ReturnType<typeof createUser>;
```

**③ 索引访问类型 `T[K]`**：获取某个属性/元素类型。

```ts
interface User { id: number; name: string; tags: string[] }
type IdType = User['id'];              // number
type TagType = User['tags'][number];   // string
type Union = User['id' | 'name'];      // string | number
type All = User[keyof User];           // string | number | string[]
```

**三者组合（非常常用）：**

```ts
const ROUTES = {
  home: '/',
  user: '/user/:id',
} as const;

type RouteKey = keyof typeof ROUTES;             // 'home' | 'user'
type RoutePath = typeof ROUTES[RouteKey];        // '/' | '/user/:id'
```

> 记忆：`keyof` 取键、`typeof` 取值类型、`T[K]` 取属性类型；`typeof obj[keyof typeof obj]` 是「取对象所有值的联合」的经典写法。

---

## 18. 条件类型与 infer

**条件类型**：`T extends U ? X : Y`，类似类型层面的三元表达式。

```ts
type IsString<T> = T extends string ? true : false;
type A = IsString<'a'>;  // true
type B = IsString<1>;    // false
```

**分布式条件类型（Distributive Conditional Types）**：当 `T` 是**裸类型参数**且传入**联合类型**时，会**分配到每个成员**分别计算。

```ts
type ToArray<T> = T extends any ? T[] : never;
type R = ToArray<string | number>; // string[] | number[]（而非 (string|number)[]）

// 阻止分发：用元组包裹
type ToArrayNoDist<T> = [T] extends [any] ? T[] : never;
type R2 = ToArrayNoDist<string | number>; // (string | number)[]
```

**`infer`**：在条件类型中**声明并推断**一个类型变量。

```ts
// 提取函数返回值
type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// 提取第一个参数
type FirstParam<T> = T extends (first: infer F, ...rest: any[]) => any ? F : never;

// 提取数组元素类型
type ElementOf<T> = T extends (infer E)[] ? E : never;
type E = ElementOf<number[]>; // number

// 提取 Promise 结果
type Unwrap<T> = T extends Promise<infer U> ? U : T;
type U = Unwrap<Promise<string>>; // string

// 提取对象的某个属性类型
type PropType<T, K extends keyof T> = T[K];
```

**`infer` 配合位置约束（TS 4.7+）：**

```ts
type FirstNumber<T> = T extends (infer U extends number)[] ? U : never;
```

**递归 + infer 实现 `Awaited`：**

```ts
type MyAwaited<T> = T extends Promise<infer U> ? MyAwaited<U> : T;
type R = MyAwaited<Promise<Promise<number>>>; // number
```

> 要点：条件类型 + `infer` 是**类型体操**的核心工具，`Exclude`/`ReturnType`/`Parameters` 等内置类型都由它实现。

---

## 19. 映射类型（Mapped Types）

**映射类型**：基于已有类型**逐属性改造**生成新类型，语法为 `{ [K in keyof T]: ... }`。

```ts
type MyPartial<T> = { [K in keyof T]?: T[K] };
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
```

**修饰符 `+` / `-`：**

```ts
// 去掉可选
type Required2<T> = { [K in keyof T]-?: T[K] };
// 去掉只读
type Mutable<T> = { -readonly [K in keyof T]: T[K] };
// 加上只读 + 可选
type Frozen<T> = { +readonly [K in keyof T]+?: T[K] };
```

**通过 `as` 重映射键名（Key Remapping，TS 4.1+）：**

```ts
// 加 getter 前缀
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface User { name: string; age: number }
type UserGetters = Getters<User>;
// { getName: () => string; getAge: () => number }

// 过滤属性（键重映射为 never 的会被丢弃）
type OmitByType<T, U> = {
  [K in keyof T as T[K] extends U ? never : K]: T[K];
};
```

**遍历联合类型：**

```ts
type EventMap = 'click' | 'focus';
type Handlers = { [K in EventMap]: (e: Event) => void };
// { click: ...; focus: ... }
```

**结合条件类型与 `keyof` 的实用例子：**

```ts
// 只保留值为函数的属性
type FunctionKeys<T> = {
  [K in keyof T as T[K] extends Function ? K : never]: T[K];
};
```

> 要点：映射类型是 `Partial`/`Pick`/`Omit`/`Record` 的实现基础，配合 `as`、`+/-` 修饰符与条件类型可实现强大的类型转换。

---

## 20. 模板字面量类型（Template Literal Types）

TS 4.1 引入，用**模板字符串语法**在类型层面拼接字符串，常用于生成事件名、路由、样式类名等。

```ts
type World = 'world';
type Greeting = `hello ${World}`;  // 'hello world'

// 结合联合类型展开（笛卡尔积）
type Size = 'small' | 'large';
type Color = 'red' | 'blue';
type ClassName = `${Size}-${Color}`;
// 'small-red' | 'small-blue' | 'large-red' | 'large-blue'
```

**内置字符串工具类型：**

```ts
type A = Uppercase<'abc'>;    // 'ABC'
type B = Lowercase<'ABC'>;    // 'abc'
type C = Capitalize<'abc'>;   // 'Abc'
type D = Uncapitalize<'Abc'>; // 'abc'
```

**实用场景：**

```ts
// ① 事件名映射
type EventName<T extends string> = `on${Capitalize<T>}`;
type ClickEvent = EventName<'click'>; // 'onClick'

// ② 生成 CSS 单位
type Unit = 'px' | 'rem' | 'em';
type Size = `${number}${Unit}`;
const s1: Size = '10px';  // OK
// const s2: Size = '10'; // 报错

// ③ 路径参数提取（配合 infer）
type ExtractParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<`/${Rest}`>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

type P = ExtractParams<'/user/:id/post/:postId'>; // 'id' | 'postId'
```

**注意：** 模板字面量类型的组合会**指数膨胀**，过度使用会显著拖慢编译。

---

## 21. satisfies 操作符

`satisfies`（TS 4.9）**校验值是否满足某类型，但保留值本身的更精确类型**。

**问题背景：** 用类型注解会**拓宽**类型，用 `as` 又不够安全。

```ts
type Colors = Record<string, string | [number, number, number]>;

// 用注解：类型被拓宽为 Colors，丢失字面量信息
const palette1: Colors = {
  red: '#f00',
  green: [0, 255, 0],
};
palette1.red.toUpperCase();  // 报错：可能是数组
// palette1.green.map(...)   // 报错：可能是字符串

// 用 satisfies：既校验，又保留精确类型
const palette2 = {
  red: '#f00',
  green: [0, 255, 0],
} satisfies Colors;

palette2.red.toUpperCase();   // OK：推导为 string
palette2.green.map((v) => v); // OK：推导为 [number, number, number]

// palette2.blue = '#00f';    // 报错：不存在该键
```

**与 `as const` 结合：**

```ts
const routes = {
  home: '/',
  user: '/user/:id',
} as const satisfies Record<string, string>;
// 既保证值是字符串，又保留字面量类型
```

**与 `as` / 类型注解对比：**

| | 类型注解 `: T` | `as T` | `satisfies T` |
| --- | --- | --- | --- |
| 校验 | 是 | 宽松（可强行断言） | 是 |
| 是否保留精确类型 | 否（拓宽为 T） | 否 | **是** |
| 安全 | 高 | 低 | 高 |

> 一句话：`satisfies` = 「检查但不改变类型」，是配置对象场景的最佳实践。

---

## 22. 类型空间与值空间

TypeScript 中存在两个**相互独立**的空间：

| | 类型空间（Type Space） | 值空间（Value Space） |
| --- | --- | --- |
| 内容 | 类型、接口、类型别名、泛型 | 变量、函数、类、枚举、常量 |
| 编译后 | **完全擦除** | 保留为 JS 代码 |
| 可作类型 | 是 | 部分（`typeof`、类、枚举） |
| 可作值 | 否 | 是 |

```ts
interface User { name: string }  // 仅类型空间
const user = { name: 'Tom' };    // 仅值空间
class Person {}                  // 两个空间都有（既能当类型又能当值）
enum Color { Red }               // 两个空间都有
```

**常见「类型/值」区分场景：**

```ts
// 报错：接口只在类型空间，不能当值用
// const u = User;

// 用 typeof 从值空间取类型
type UserType = typeof user;      // { name: string }

// 同名可共存（一个在类型空间，一个在值空间）
interface Foo { a: number }
const Foo = 1;                    // 不冲突
```

```ts
// import type：只导入类型，编译后不产生 import 语句
import type { User } from './types';

// 错误用法：把类型当值用
// const u = new User();
```

**为什么重要？**

- 解释「为什么接口不能 `new`」「为什么类型不能作为函数参数传递」。
- `import type` 可避免**循环依赖**与**运行时多余导入**，也是 `isolatedModules` 下的必要做法。
- 类的 `implements` 用的是**类型空间**，`extends` 用的是**值空间**。

---

## 23. 函数重载

**函数重载（Overload）**：为同一函数提供**多个类型签名**，调用时按签名匹配；实现签名对外不可见。

```ts
// 重载签名（对调用者可见）
function fn(x: string): string;
function fn(x: number): number;
function fn(x: boolean): boolean;
// 实现签名（对外不可见，必须兼容所有重载）
function fn(x: string | number | boolean): string | number | boolean {
  return x;
}

fn('a');   // string
fn(1);     // number
fn(true);  // boolean
// fn([]); // 报错
```

**要点：**

- **实现签名必须兼容所有重载签名**（参数更宽、返回值更广）。
- 重载签名**从上到下匹配**，把更具体的放在前面。
- 函数实现体只写一次。
- 参数个数不同的重载：

```ts
function createElement(tag: 'img'): HTMLImageElement;
function createElement(tag: 'a'): HTMLAnchorElement;
function createElement(tag: string): HTMLElement {
  return document.createElement(tag);
}
```

**用「联合类型 + 条件类型」替代重载**（现代写法，更简洁）：

```ts
// 重载写法
function len(s: string): number;
function len(arr: any[]): number;

// 联合写法（若逻辑一致）
function len(x: string | any[]): number {
  return x.length;
}
```

**方法重载与类中重载同理：**

```ts
class Calculator {
  add(a: number, b: number): number;
  add(a: string, b: string): string;
  add(a: any, b: any): any {
    return a + b;
  }
}
```

> 优先考虑**联合类型/泛型**，只有当「不同入参对应不同返回类型」时才用重载。

---

## 24. 可选链与空值合并

**可选链 `?.`**：左侧为 `null`/`undefined` 时**短路返回 `undefined`**，避免报错。

```ts
interface User {
  name: string;
  address?: { city?: string; geo?: { lat: number } };
}

const user: User = { name: 'Tom' };

user.address?.city;                 // string | undefined
user.address?.geo?.lat;             // number | undefined
user.address?.city?.toUpperCase();  // 方法调用
user.friends?.[0];                  // 数组/索引访问
user.getName?.();                    // 可选调用
```

**非空断言 `!`** 对比：

```ts
user.address!.city;   // 断言 address 一定存在（不安全）
user.address?.city;   // 安全，可能返回 undefined
```

**空值合并 `??`**：左侧为 `null`/`undefined` 时才取右侧。

```ts
const a = 0 ?? 'default';      // 0（区别于 ||，|| 会把 0 当假值）
const b = '' ?? 'default';     // ''
const c = null ?? 'default';   // 'default'
const d = undefined ?? 'default'; // 'default'

// 与 || 的区别
0 || 'default';    // 'default'（0 是假值）
0 ?? 'default';    // 0（0 不是 null/undefined）
```

**逻辑赋值（ES2021）：**

```ts
a ??= 'default';   // a 为 null/undefined 时赋值
a ||= 'default';   // a 为假值时赋值
a &&= 'value';     // a 为真值时赋值
```

**注意：**

- `?.` 与 `??` **不能与 `&&`/`||` 混用**而不加括号（会语法错误）。

  ```ts
  // a ?? b || c      // 报错，需加括号
  (a ?? b) || c;      // OK
  ```

- 可选链**只短路，不报错**，但滥用会掩盖真实的数据缺失问题。
- `?.` 编译后会有运行时代码（非纯类型），因此会保留在 JS 产物中。

---

## 25. 类与访问修饰符

**访问修饰符：**

| 修饰符 | 可访问范围 | 说明 |
| --- | --- | --- |
| `public`（默认） | 任意位置 | 默认修饰符 |
| `private` | **仅本类内部** | 编译期检查，运行时仍是普通属性 |
| `protected` | 本类及**子类** | 不可外部访问 |
| `readonly` | 只读 | 只能在声明处或构造函数中赋值 |
| `static` | 类本身 | 属于类，不属于实例 |
| `#field` | 真正私有 | ES 原生私有字段，**运行时**也私有 |

```ts
class Person {
  public name: string;              // 默认 public
  private age: number;              // 仅内部可访问
  protected id: number;             // 子类可访问
  readonly createdAt: Date;         // 只读
  static count = 0;                 // 静态属性
  #secret = 'hidden';               // 原生私有字段

  constructor(name: string, age: number) {
    this.name = name;
    this.age = age;
    this.id = 1;
    this.createdAt = new Date();
    Person.count++;                 // 通过类名访问静态成员
  }

  static create(name: string, age: number) {
    return new Person(name, age);
  }
}

const p = new Person('Tom', 18);
p.name;        // OK
// p.age;      // 报错：private
// p.#secret;  // 报错：私有字段
Person.count;  // OK
```

**参数属性（简写）：** 构造函数参数前加修饰符，可自动声明并赋值。

```ts
class User {
  constructor(
    public name: string,
    private age: number,
    readonly id: number = 1
  ) {}
  // 等价于声明了 name/age/id 三个属性并在构造函数中赋值
}
```

**`private` 与 `#` 的区别：**

| | `private` | `#field` |
| --- | --- | --- |
| 检查时机 | 仅编译期 | 编译期 + 运行时 |
| 能否绕过 | 可以（`as any`） | **不能** |
| 标准 | TS 特有 | ECMAScript 原生 |

**抽象成员与 `override`：**

```ts
abstract class Shape {
  abstract area(): number;    // 抽象方法，子类必须实现
}

class Circle extends Shape {
  override area(): number {   // override 显式声明（noImplicitOverride）
    return 1;
  }
}
```

---

## 26. readonly 与不可变类型

**`readonly`** 用于属性，`ReadonlyArray<T>` / `readonly T[]` 用于数组。

```ts
interface Config {
  readonly url: string;
  readonly headers?: Readonly<Record<string, string>>;
}

const config: Config = { url: '/api' };
// config.url = '/other';  // 报错：只读

// 只读数组
const nums: readonly number[] = [1, 2, 3];
// nums.push(4);   // 报错
// nums[0] = 9;    // 报错
const nums2: ReadonlyArray<number> = [1, 2];

// 普通数组可赋给只读数组（单方向兼容）
const mutable: number[] = [1];
const ro: readonly number[] = mutable;  // OK
// mutable = ro;                         // 报错

// 读取方法仍然可用
nums.map((n) => n * 2);   // OK
```

**`readonly` 是浅层的：**

```ts
const obj: Readonly<{ nested: { a: number } }> = { nested: { a: 1 } };
// obj.nested = {};  // 报错
obj.nested.a = 2;     // 允许！只读只作用于第一层
```

**深度只读：**

```ts
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};
```

**`readonly` 与 `const` 的区别：**

| | `const` | `readonly` |
| --- | --- | --- |
| 作用对象 | 变量 | 类的属性 / 接口属性 |
| 层级 | 变量绑定 | 属性本身 |
| 数组 | `const arr` 内容仍可改 | `readonly T[]` 内容不可改 |

**`as const` 的效果：** 深层只读 + 字面量类型。

```ts
const arr = [1, 2, 3] as const;   // readonly [1, 2, 3]
const obj = { a: 1 } as const;    // { readonly a: 1 }
```

> `readonly` 只在编译期约束，运行时仍是普通属性（可被 `as any` 绕过）。

---

## 27. 抽象类与接口的区别

| | 抽象类 `abstract class` | 接口 `interface` |
| --- | --- | --- |
| 能否包含实现 | **可以**（含具体方法/属性） | 不能（只描述结构） |
| 能否实例化 | 不能 | 不能（本来就是类型） |
| 成员修饰符 | 支持 `public/private/protected` | 不支持 |
| 构造器 | 可以有 | 无 |
| 多实现 | 单继承（`extends` 只能一个） | 可 `implements` 多个 |
| 编译后产物 | **生成 JS 代码** | 完全擦除 |
| 用途 | 代码复用 + 强制子类实现 | 描述契约/形状 |

```ts
// 抽象类：既提供公共实现，又强制子类实现抽象成员
abstract class Animal {
  constructor(public name: string) {}   // 公共实现
  abstract makeSound(): void;           // 必须由子类实现

  move() {                              // 已有实现，子类可直接继承
    console.log(`${this.name} is moving`);
  }
}

class Dog extends Animal {
  makeSound() { console.log('Woof'); }
}

const dog = new Dog('Rex');
dog.move();      // 'Rex is moving'
dog.makeSound(); // 'Woof'
// const a = new Animal('x');  // 报错：抽象类不能实例化
```

```ts
// 接口：只描述契约，可多实现
interface Flyable { fly(): void }
interface Swimmable { swim(): void }

class Duck implements Flyable, Swimmable {
  fly() {}
  swim() {}
}
```

**选择建议：**

- 需要**共享实现代码**、有继承层级 → 抽象类。
- 只需**约束形状**、需要多实现、无运行时代码 → 接口。
- 二者可组合：接口描述契约，抽象类提供部分实现。

---

## 28. 接口的继承与实现

**接口继承（`extends`）**：接口可以继承一个或多个接口。

```ts
interface A { a: number }
interface B { b: string }
interface C extends A, B { c: boolean }  // 多继承

const c: C = { a: 1, b: 'x', c: true };
```

**接口实现（`implements`）**：类实现接口，必须包含接口声明的所有成员。

```ts
interface Serializable {
  serialize(): string;
  readonly id: number;
}

class Model implements Serializable {
  constructor(public readonly id: number) {}
  serialize(): string {
    return JSON.stringify({ id: this.id });
  }
}
```

**要点：**

- `implements` 只做**编译期检查**，不产生任何运行时代码。
- 类可以**同时继承父类并实现多个接口**：`class C extends Base implements A, B`。
- 类实现接口时，成员可以是 `private`/`protected`，但**不能降低可见性**导致不满足接口。
- 接口继承带来**结构合并**，若两个接口有同名但类型不同的成员，会冲突报错。

```ts
interface User { id: number }
interface Admin extends User {
  role: 'admin';
}

// 用于约束函数参数
function show(u: User) { return u.id; }
const admin: Admin = { id: 1, role: 'admin' };
show(admin); // OK（Admin 是 User 的子类型）
```

**接口的声明合并（Declaration Merging）：**

```ts
interface Window {
  myGlobal: string;
}
// 与已有 Window 接口合并，扩展全局类型（常用于给第三方库打补丁）
```

---

## 29. 枚举 enum

**枚举**为一组具名常量提供类型安全的名字。

**① 数字枚举**（默认自增）：

```ts
enum Direction {
  Up,      // 0
  Down,    // 1
  Left,    // 2
  Right,   // 3
}

let d: Direction = Direction.Up;
d = 0;              // 数字枚举可反向赋值（不推荐）
Direction[0];       // 'Up'（反向映射）
```

**② 字符串枚举**（无反向映射，推荐）：

```ts
enum Status {
  Pending = 'pending',
  Success = 'success',
  Failed = 'failed',
}
Status.Success;   // 'success'（语义清晰、便于调试）
```

**③ 常量枚举 `const enum`**：编译期**内联**，不生成 JS 对象，体积更小。

```ts
const enum Color { Red, Green }
const c = Color.Red;   // 编译为：const c = 0 /* Red */

// 注意：const enum 在 isolatedModules / Babel 下不可用（无法跨文件内联）
```

**④ 异构枚举**（数字与字符串混合，**不推荐**）：

```ts
enum Mixed { No = 0, Yes = 'YES' }
```

**枚举 vs 联合字面量：**

```ts
// 枚举
enum Role { Admin = 'admin', User = 'user' }

// 联合字面量（更轻量，推荐用于纯类型场景）
const ROLE = { Admin: 'admin', User: 'user' } as const;
type Role2 = typeof ROLE[keyof typeof ROLE]; // 'admin' | 'user'
```

| | `enum` | 联合字面量 + `as const` |
| --- | --- | --- |
| 运行时代码 | 生成对象（`const enum` 除外） | 生成对象 |
| 反向映射 | 数字枚举有 | 无 |
| Tree-shaking | 较差 | 较好 |
| 跨文件内联 | `const enum` 有坑 | 无 |
| 推荐度 | 一般 | **现代项目更推荐** |

**要点：**

- 数字枚举会带来反向映射，且可接受任意数字，类型安全性一般。
- 优先使用**字符串枚举**或**联合字面量**。
- `const enum` 在 Babel / `isolatedModules` 环境下不可用（`preserveConstEnums` 可缓解）。

---

## 30. 装饰器（Decorator）

**装饰器**是一种特殊声明，可以附加到**类、方法、属性、访问器、参数**上，用于修改或增强其行为，常用于依赖注入、日志、校验（NestJS、Angular 大量使用）。

**启用配置：**

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

**① 类装饰器**

```ts
function sealed<T extends { new (...args: any[]): {} }>(constructor: T) {
  Object.seal(constructor);
  Object.seal(constructor.prototype);
  return constructor;
}

@sealed
class Greeter {
  greeting = 'hello';
}
```

**② 方法装饰器**

```ts
function log(target: any, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  descriptor.value = function (...args: any[]) {
    console.log(`调用 ${key}，参数：`, args);
    return original.apply(this, args);
  };
  return descriptor;
}

class Calculator {
  @log
  add(a: number, b: number) {
    return a + b;
  }
}
new Calculator().add(1, 2);  // 打印「调用 add，参数：[1, 2]」
```

**③ 属性装饰器**

```ts
function readonly2(target: any, key: string) {
  Object.defineProperty(target, key, { writable: false });
}

class User {
  @readonly2
  name = 'Tom';
}
```

**④ 参数装饰器**

```ts
function inject(target: any, key: string, index: number) {
  console.log(`参数索引 ${index} 于 ${key}`);
}

class Service {
  constructor(@inject private repo: any) {}
}
```

**装饰器执行顺序：**

```
属性/方法装饰器 → 参数装饰器 → 类装饰器
同类装饰器：从下往上（由近到远）执行
不同类：属性 → 方法 → 访问器 → 参数 → 类
```

**要点：**

- 装饰器本质是**函数**，在**类定义时**执行（不是实例化时）。
- **旧版装饰器**（`experimentalDecorators`）与 **TC39 标准装饰器**（TS 5.0+）语法相近但语义不同，注意区分。
- 类装饰器可用于**依赖注入**：通过 `emitDecoratorMetadata` 拿到参数类型，实现自动注入。

---

## 31. Mixin 混入

**Mixin**：把多个类的功能组合到一个类中，解决**单继承**的限制。

**① 用 `implements` + 接口合并声明类型：**

```ts
class Sprite { name = ''; }

interface Jumpable { jump(): void }
interface Runnable { run(): void }

// 辅助类型：用构造函数类型表示
type Constructor<T = {}> = new (...args: any[]) => T;

// 混入函数
function Jumpable<TBase extends Constructor>(Base: TBase) {
  return class extends Base implements Jumpable {
    jump() { console.log('jump'); }
  };
}

function Runnable<TBase extends Constructor>(Base: TBase) {
  return class extends Base implements Runnable {
    run() { console.log('run'); }
  };
}

// 组合多个 Mixin
class Player extends Runnable(Jumpable(Sprite)) {
  play() { this.jump(); this.run(); }
}

const p = new Player();
p.play();   // jump run
```

**② 用 `Object.assign` 拷贝原型（更简单，但类型支持弱）：**

```ts
function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      if (name !== 'constructor') {
        derivedCtor.prototype[name] = baseCtor.prototype[name];
      }
    });
  });
}
```

**用途：** 组合横切能力（日志、事件、序列化），避免深层继承链。

**注意：** Mixin 会引入 `TBase extends Constructor` 这类泛型约束，类型体操较多，需注意 `this` 类型与构造函数参数传递（可用 `ConstructorParameters<TBase>`）。

---

## 32. 元组 Tuple 与可变元组

**元组**是**定长、定类型、按位置约束**的数组。

```ts
let point: [number, number] = [1, 2];
let mixed: [string, number, boolean] = ['a', 1, true];

// point = [1];         // 报错：长度不符
// point = [1, 2, 3];   // 报错
// mixed = [1, 'a', true]; // 报错：位置类型不符
```

**可选元素与剩余元素：**

```ts
type Optional = [string, number?];          // 第二个可选
type Rest = [string, ...number[]];          // 剩余元素
type Mixed = [boolean, ...string[], number];// 中间剩余（TS 4.0+）

let r: Rest = ['a', 1, 2, 3];
```

**具名元组（提升可读性）：**

```ts
type Range = [start: number, end: number];
type Param = [name: string, age?: number];
```

**只读元组：**

```ts
const tuple = [1, 2] as const;   // readonly [1, 2]
// tuple[0] = 9;  // 报错
```

**常见用途：**

```ts
// ① 函数返回多个值
function minMax(arr: number[]): [number, number] {
  return [Math.min(...arr), Math.max(...arr)];
}
const [min, max] = minMax([3, 1, 2]);

// ② 与 Parameters / ReturnType 配合
function fn(a: string, b: number): boolean { return true; }
type P = Parameters<typeof fn>;  // [a: string, b: number]

// ③ 可变元组（Variadic Tuple）：支持泛型展开
type Concat<T extends any[], U extends any[]> = [...T, ...U];
type R = Concat<[1, 2], ['a']>;  // [1, 2, 'a']

// ④ 导出为常量数组保持类型
export const POSITIONS = ['top', 'bottom'] as const;
type Position = typeof POSITIONS[number]; // 'top' | 'bottom'
```

**与数组的区别：**

| | 元组 `[number, string]` | 数组 `(number \| string)[]` |
| --- | --- | --- |
| 长度 | 固定 | 任意 |
| 每项类型 | 可不同、按位置 | 统一类型 |
| 适用 | 定长结构、参数列表 | 不定长同类型集合 |

---

## 33. 索引签名与 Record

**索引签名**：描述「任意键」的类型，用于键名未知但值类型已知的对象。

```ts
interface StringMap {
  [key: string]: string;      // 任意字符串键，值为 string
}

const m: StringMap = { a: '1', b: '2' };
m.c = '3';   // OK

interface NumberArray {
  [index: number]: string;    // 数组式索引
}

// 同时使用固定属性 + 索引签名（固定属性类型必须兼容索引签名）
interface User {
  name: string;               // 必须与索引签名兼容
  [key: string]: string;
}

interface AnyMap {
  [key: string]: any;
}
```

**`Record<K, T>`**：内置工具类型，等价于映射类型构造的索引签名。

```ts
type StringMap2 = Record<string, string>;
type PageMap = Record<'home' | 'about', string>;
// { home: string; about: string }

const pages: PageMap = { home: '/', about: '/about' };
```

**索引签名 vs Record：**

| | 索引签名 | `Record` |
| --- | --- | --- |
| 键范围 | 只能是 `string`/`number`/`symbol` 全量 | 可以是**字面量联合**做精确键 |
| 表达力 | 弱（无法限定具体键） | 强（可枚举键） |
| 写法 | `interface` 中 | `type` 别名 |

**注意点：**

1. 索引签名会**吞并**所有键，导致无法对具体键做精确约束（此时应用 `Record` + 联合字面量）。
2. 索引签名的值类型必须兼容所有显式声明的属性类型。
3. `noUncheckedIndexedAccess` 开启后，索引访问结果会自动带上 `undefined`，更安全但更繁琐。

```ts
// 更安全的替代方案：明确键
type FormFields = 'name' | 'email' | 'age';
type Form = Record<FormFields, string | number>;

// 或使用 Map（键类型任意，运行时更灵活）
const map = new Map<string, number>();
```

---

## 34. 类型体操：实现内置工具类型

理解内置工具类型的实现，是「类型体操」的基本功。

**① `MyPartial` / `MyRequired` / `MyReadonly`**

```ts
type MyPartial<T> = { [K in keyof T]?: T[K] };
type MyRequired<T> = { [K in keyof T]-?: T[K] };
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };
```

**② `MyPick` / `MyOmit`**

```ts
type MyPick<T, K extends keyof T> = { [P in K]: T[P] };

type MyOmit<T, K extends keyof any> = MyPick<T, Exclude<keyof T, K>>;
```

**③ `MyExclude` / `MyExtract` / `MyNonNullable`**

```ts
type MyExclude<T, U> = T extends U ? never : T;
type MyExtract<T, U> = T extends U ? T : never;
type MyNonNullable<T> = T extends null | undefined ? never : T;
```

**④ `MyRecord`**

```ts
type MyRecord<K extends keyof any, T> = { [P in K]: T };
```

**⑤ `MyReturnType` / `MyParameters`**

```ts
type MyReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : any;

type MyParameters<T extends (...args: any) => any> =
  T extends (...args: infer P) => any ? P : never;
```

**⑥ `MyAwaited`（递归解包 Promise）**

```ts
type MyAwaited<T> = T extends Promise<infer U> ? MyAwaited<U> : T;
```

**⑦ `MyReadonly2`（深度只读）**

```ts
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends Function
    ? T[K]
    : T[K] extends object
      ? DeepReadonly<T[K]>
      : T[K];
};
```

**⑧ `Flatten`（数组元素类型提取）**

```ts
type Flatten<T> = T extends Array<infer E> ? E : T;
type F = Flatten<string[]>;  // string
```

> 面试高频：`Exclude`、`Pick`、`Omit`、`ReturnType` 的实现必须能默写，因为它们体现了「映射类型 + 条件类型 + `keyof` + `infer`」的组合用法。

---

## 35. 类型体操：递归类型

**① 递归展平数组（`FlattenArray`）**

```ts
type FlattenArray<T> = T extends Array<infer E> ? FlattenArray<E> : T;

type R1 = FlattenArray<number[][][]>; // number
```

**② 反转元组**

```ts
type Reverse<T extends any[]> =
  T extends [infer First, ...infer Rest] ? [...Reverse<Rest>, First] : [];

type R2 = Reverse<[1, 2, 3]>; // [3, 2, 1]
```

**③ 深层 Partial**

```ts
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
```

**④ 字符串长度（元组累加 + 递归）**

```ts
type StringToArray<S extends string> =
  S extends `${infer First}${infer Rest}` ? [First, ...StringToArray<Rest>] : [];

type Length<S extends string> = StringToArray<S>['length'];

type R3 = Length<'hello'>; // 5
```

**⑤ 路径参数提取**

```ts
type ExtractRouteParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractRouteParams<`/${Rest}`>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

type Params = ExtractRouteParams<'/user/:id/post/:postId'>; // 'id' | 'postId'
```

**⑥ 联合类型转交叉类型**

```ts
type UnionToIntersection<U> =
  (U extends any ? (arg: U) => void : never) extends (arg: infer I) => void
    ? I
    : never;

type R4 = UnionToIntersection<{ a: 1 } | { b: 2 }>; // { a: 1 } & { b: 2 }
```

**注意：**

- 递归类型缺少终止条件会导致 `Type instantiation is excessively deep` 报错。
- 深度递归会**显著拖慢编译**，实际项目中应适度。
- TS 对递归深度有限制（约 50 层，视版本而定）。

---

## 36. 命名空间 namespace 与模块

**命名空间 `namespace`**：TS 早期的组织代码方式，通过 `namespace` 包裹避免全局污染。

```ts
namespace Validation {
  export interface StringValidator {
    isValid(s: string): boolean;
  }

  export const lettersRegexp = /^[A-Za-z]+$/;

  export class LettersOnlyValidator implements StringValidator {
    isValid(s: string) {
      return lettersRegexp.test(s);
    }
  }
}

const v = new Validation.LettersOnlyValidator();
v.isValid('abc');
```

**模块（Module）**：现代标准，任何含顶层 `import`/`export` 的文件即为模块。

```ts
// math.ts
export function add(a: number, b: number) { return a + b; }
export default class Calculator {}

// main.ts
import Calculator, { add } from './math';
```

| | `namespace` | 模块（ESM） |
| --- | --- | --- |
| 标准 | TS 特有 | ECMAScript 标准 |
| 加载方式 | 全局/`<script>` | `import`/`export` |
| Tree-shaking | 差 | 好 |
| 推荐度 | 不推荐（除给全局脚本打补丁） | **推荐** |

**要点：**

- **现代项目一律使用 ES 模块**，`namespace` 仅用于：
  - 为无模块的老式全局脚本提供类型声明（如 `declare namespace`）。
  - `declare global` 扩展全局类型。
- `namespace` 支持嵌套与合并，但会生成额外的包装对象，不利 tree-shaking。
- 在 `.d.ts` 中描述第三方库的全局 API 时，`declare namespace` 依然常见。

```ts
// 扩展全局类型
declare global {
  interface Window {
    __APP_CONFIG__: Record<string, string>;
  }
}
```

---

## 37. 声明文件 .d.ts 与 declare

**声明文件（`.d.ts`）**：只包含**类型声明**、不含实现，用于描述已有 JS 代码的类型，供 TS 使用。

```ts
// types/global.d.ts
declare const VERSION: string;

declare function greet(name: string): void;

declare class MyClass {
  constructor(name: string);
  say(): void;
}

declare module 'some-lib' {
  export function doSomething(x: number): string;
  export default function main(): void;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.css' {
  const classes: Record<string, string>;
  export default classes;
}
```

**`declare` 关键字**：告诉 TS「这个东西在运行时已存在，无需实现，只描述类型」。

```ts
declare const DEBUG: boolean;
declare function fetchData(url: string): Promise<unknown>;
```

**来源与查找：**

- **自带**：库自身提供 `types`/`typings` 字段或包内含 `.d.ts`。
- **`@types/*`**：社区维护的类型包（DefinitelyTyped），如 `@types/node`、`@types/react`。
- **手写**：为无类型的库补充声明。

```json
// tsconfig.json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./types"],
    "types": ["node"]
  },
  "include": ["src", "types"]
}
```

**要点：**

- `.d.ts` **只做声明**，不能有实现代码（可以写 `declare` 与类型）。
- 用 `/// <reference types="node" />` 引入特定类型（较少用，`types` 配置更常见）。
- 若库无类型：先找 `@types/xxx`，再考虑手写声明，最后才用 `declare module 'xxx'` 兜底。

---

## 38. import type 与类型导入导出

**`import type`**：明确只导入**类型**，编译后**不产生任何 import 语句**。

```ts
import type { User, UserRole } from './types';
// 编译后：该行被完全删除

// 混合导入（值 + 类型）
import { createUser, type User } from './user';

// 内联类型修饰符（TS 4.5+）
import { type Foo, bar } from './mod';

export type { User };                       // 只导出类型
export { type User, createUser };           // 混合导出
```

**为什么需要 `import type`？**

1. **避免循环依赖**：类型导入在编译后消失，不会产生运行时的循环引用。
2. **配合 `isolatedModules` / `verbatimModuleSyntax`**：单文件转译（esbuild/swc/Babel）无法判断导入是类型还是值，必须显式标记，否则可能保留无效导入或误删必要导入。
3. **减小产物体积**：类型导入不会打进 bundle。

**`verbatimModuleSyntax`（TS 5.0）**：

- 开启后，**只有 `import type` 才会被擦除**；普通 `import` 一律保留。
- 强制开发者区分类型与值导入，使转译结果可预测。

```ts
// verbatimModuleSyntax: true 时
import { Foo } from './foo';        // 保留（可能报未使用）
import type { Bar } from './bar';   // 擦除
```

**类型再导出：**

```ts
// index.ts 统一出口
export type { User } from './user';
export { createUser } from './user';
```

**常见坑：**

- `export type` 与 `export` 混用时，若被 `isolatedModules` 拦下，需改用 `export type`。
- `import type` 导入的**不能当值使用**（如不能 `new`、不能当枚举值）。

---

## 39. 严格模式 strict 包含哪些选项？

`"strict": true` 是一组严格检查的**总开关**，等价于同时开启以下选项：

| 选项 | 作用 |
| --- | --- |
| `noImplicitAny` | 禁止隐式 `any`（未标注且无法推导时） |
| `strictNullChecks` | `null`/`undefined` 独立类型，不能随意赋值 |
| `strictFunctionTypes` | 函数参数按**逆变**检查 |
| `strictBindCallApply` | `bind`/`call`/`apply` 参数类型严格检查 |
| `strictPropertyInitialization` | 类属性必须在声明或构造函数中初始化 |
| `noImplicitThis` | 禁止 `this` 隐式为 `any` |
| `alwaysStrict` | 始终以严格模式（`'use strict'`）解析 |
| `useUnknownInCatchVariables` | `catch (e)` 中 `e` 为 `unknown`（TS 4.4+） |

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**几个关键选项说明：**

```ts
// strictNullChecks
let s: string = null;        // 报错（关闭时不报错）

// strictPropertyInitialization
class User {
  name: string;              // 报错：未初始化
  // 解决：在构造函数赋值 / 用 ! 断言 / 给默认值
  age!: number;              // 确定赋值断言
}

// noUncheckedIndexedAccess
const arr = [1, 2, 3];
const v = arr[10];           // number | undefined（更安全）

// noImplicitOverride
class B extends A {
  override foo() {}          // 必须显式写 override
}
```

**建议：** 新项目一律开启 `strict`；老项目可逐步开启各子选项以平滑迁移。

---

## 40. tsconfig.json 常用配置

```jsonc
{
  "compilerOptions": {
    // ===== 语言与目标 =====
    "target": "ES2020",              // 编译目标 JS 版本
    "lib": ["ES2020", "DOM"],        // 可用的内置类型库
    "module": "ESNext",              // 模块规范
    "moduleResolution": "bundler",   // 模块解析策略（TS5 推荐 bundler/NodeNext）
    "jsx": "react-jsx",              // JSX 支持

    // ===== 类型检查 =====
    "strict": true,                  // 严格模式总开关
    "noUnusedLocals": true,          // 未使用变量报错
    "noUnusedParameters": true,      // 未使用参数报错
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,

    // ===== 模块互操作 =====
    "esModuleInterop": true,         // 允许默认导入 CommonJS
    "allowSyntheticDefaultImports": true,
    "isolatedModules": true,         // 保证可被单文件转译
    "verbatimModuleSyntax": true,    // 严格区分类型/值导入
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,       // 允许导入 json

    // ===== 产物 =====
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,             // 生成 .d.ts
    "declarationMap": true,
    "sourceMap": true,
    "noEmit": true,                  // 只做类型检查（打包交给 Vite）
    "removeComments": true,
    "importHelpers": true,           // 复用 tslib 辅助函数

    // ===== 路径别名 =====
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },

    // ===== 其他 =====
    "skipLibCheck": true,            // 跳过 node_modules 类型检查（提速）
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**高频配置说明：**

| 配置 | 作用 | 建议 |
| --- | --- | --- |
| `skipLibCheck` | 跳过 `.d.ts` 检查 | **开启**（大幅提速） |
| `isolatedModules` | 单文件转译安全 | 开启（配合 Vite/esbuild） |
| `esModuleInterop` | CommonJS 互操作 | 开启 |
| `noEmit` | 不输出 JS | 用 Vite 打包时开启 |
| `paths` | 路径别名 | 与打包工具别名保持一致 |
| `strict` | 严格模式 | 新项目必开 |

**多配置继承：**

```jsonc
// tsconfig.json
{ "extends": "./tsconfig.base.json", "compilerOptions": { "noEmit": false } }
```

**要点：** `paths` 别名只对 TS 类型检查有效，运行时需打包工具（Vite `resolve.alias`）同步配置。

---

## 41. TypeScript 编译性能优化

**① 分离类型检查与转译**

- 用 `tsc --noEmit` 只做类型检查；用 **esbuild / swc / Vite** 做转译（快 10~100 倍）。
- 类型检查放入 CI 或编辑器，开发时用编辑器增量诊断。

**② 开启/关闭耗时项**

```jsonc
{
  "compilerOptions": {
    "skipLibCheck": true,          // 跳过依赖类型检查（收益最大）
    "incremental": true,           // 增量编译，缓存到 .tsbuildinfo
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

- `skipLibCheck: true`：跳过 `node_modules/**/*.d.ts` 的类型检查。
- `incremental` / `composite`：项目引用（Project References）分片编译。

**③ 减少类型复杂度**

- 避免**过度复杂的条件类型/递归类型**（类型体操会指数级放大计算量）。
- 避免超深泛型嵌套与巨型联合类型。
- 用 `interface` 替代复杂 `type`（`interface` 可缓存、报错更清晰）。
- 显式标注函数返回值，减少推导成本。
- 避免在同一项目做「类型体操」式的极端推导。

**④ 项目结构与引用**

```jsonc
// 使用 Project References 拆分大型项目
{
  "references": [{ "path": "./packages/ui" }, { "path": "./packages/utils" }]
}
```

- 用 `composite: true` 让子项目独立编译并缓存。
- 限制 `include` 范围（不要扫描 `node_modules` 与产物目录）。

**⑤ 工具层面**

```bash
# 找出最耗时的类型
tsc --noEmit --extendedDiagnostics
tsc --generateTrace trace   # 生成性能火焰图分析
```

**⑥ 常见拖慢原因**

- 巨型 `.d.ts`（如某些库的类型定义特别复杂）。
- 隐式 `any` 大量推断失败。
- 在 `.d.ts` 中使用复杂类型体操。
- 重复的依赖版本导致类型冲突。

---

## 42. TypeScript 与 React 结合常见类型

**① 组件 Props**

```tsx
interface ButtonProps {
  label: string;
  variant?: 'primary' | 'ghost';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
}

function Button({ label, variant = 'primary', onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}
```

**② 基础 HTML 属性扩展**

```tsx
type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

function Input({ label, ...rest }: InputProps) {
  return <input {...rest} />;
}
```

**③ 事件类型**

```tsx
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  console.log(e.target.value);
};
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {};
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
};
```

**④ `useState` / `useRef` / `useReducer`**

```tsx
const [count, setCount] = useState<number>(0);
const [user, setUser] = useState<User | null>(null);

const inputRef = useRef<HTMLInputElement>(null);      // 可空
const timerRef = useRef<number | null>(null);
const initedRef = useRef(false);                      // MutableRefObject

// 自定义 Hook 泛型
function useFetch<T>(url: string): { data: T | null; loading: boolean } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  return { data, loading };
}
```

**⑤ 泛型组件**

```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
}

function List<T>({ items, renderItem }: ListProps<T>) {
  return <ul>{items.map(renderItem)}</ul>;
}

<List items={[1, 2]} renderItem={(n) => <li>{n}</li>} />;
```

**⑥ 常用内置类型**

| 类型 | 说明 |
| --- | --- |
| `React.ReactNode` | 所有可渲染内容（含字符串、数字、元素、null） |
| `React.ReactElement` | JSX 元素 |
| `React.FC<P>` | 函数组件类型（**现代推荐直接写函数**） |
| `React.CSSProperties` | 内联样式对象 |
| `React.PropsWithChildren<P>` | 自动加上 `children` |
| `React.ComponentProps<typeof X>` | 取组件的 Props 类型 |

**⑦ `forwardRef`**

```tsx
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, ...rest }, ref) => <input ref={ref} {...rest} />
);
```

**要点：**

- 现在更推荐**直接写函数组件 + 显式 Props 接口**，而不是 `React.FC`（`React.FC` 隐含 `children`，语义不清）。
- 事件类型优先用 `React.ChangeEvent` 等泛型，而不是 `any`。

---

## 43. 类型断言的最佳实践与常见坑

**① 能用类型守卫就不要用断言**

```ts
// 差：断言掩盖问题
function getLength(v: string | number) {
  return (v as string).length;  // v 为 number 时运行时得到 undefined
}

// 好：收窄
function getLength2(v: string | number) {
  return typeof v === 'string' ? v.length : String(v).length;
}
```

**② 断言不能「无中生有」**

```ts
const s = 'hello';
// const n = s as number;          // 报错：类型没有充分重叠
const n = s as unknown as number;  // 需要双重断言（危险）
```

**③ 非空断言 `!` 要谨慎**

```ts
// 差：可能为 null，运行时崩
const el = document.querySelector('.x')!;
el.innerHTML = '';

// 好：显式处理
const el2 = document.querySelector('.x');
if (el2) el2.innerHTML = '';
```

**④ `as const` 的常见误用**

```ts
const arr = [1, 2, 3] as const;
// arr.push(4);  // 报错：readonly

// 想保留字面量又不想只读？用 satisfies 或显式类型
const tuple: [1, 2, 3] = [1, 2, 3];
```

**⑤ 避免 `any` 与断言滥用**

```ts
// 差
const data = res as any;
data.whatever();

// 好：定义接口 + 校验
interface ApiRes { code: number; data: User }
const data2 = res as ApiRes;
```

**⑥ 常见坑汇总**

| 坑 | 说明 |
| --- | --- |
| `as any` 静默所有错误 | 类型系统失效，重构不再安全 |
| 双重断言 `as unknown as T` | 绕过检查，运行时风险高 |
| 断言 DOM 元素类型错误 | `as HTMLInputElement` 但实际是 `div` |
| 断言绕过 `null` 检查 | 建议用可选链或 `if` |
| 数组断言为元组 | 长度不匹配时运行时报错 |
| 忽略 `!` 的运行时风险 | 只影响编译，不改运行时行为 |

> 原则：**断言是最后手段**，优先通过类型守卫、泛型、类型推导来让编译器自己理解类型。

---

## 44. TypeScript 相比 JavaScript 的优势与局限

**优势：**

| 方面 | 说明 |
| --- | --- |
| 静态类型检查 | 编译期发现类型错误、拼写错误、空值问题 |
| 更好的 IDE 体验 | 智能补全、跳转、重构、参数提示 |
| 自文档化 | 类型签名即接口契约，降低沟通成本 |
| 重构安全 | 改动类型后编译器指出所有受影响处 |
| 代码质量 | 强制处理 `null`/`undefined`，减少运行时崩溃 |
| 生态支持 | 主流库均有类型定义，React/Vue 一等公民 |

**局限与代价：**

| 方面 | 说明 |
| --- | --- |
| 学习成本 | 类型体操、泛型、条件类型有门槛 |
| 编写成本 | 需要写类型注解，短期开发速度变慢 |
| 编译开销 | 大项目类型检查慢（可用 `skipLibCheck`、增量编译缓解） |
| 类型不等于运行时安全 | 外部数据（API 响应）仍需运行时校验，可配合 `zod` |
| `any` 逃逸 | 滥用会失去类型保护 |
| 类型体操可读性 | 过度抽象的类型难以理解与维护 |

**何时用 TS：**

- 中大型项目、多人协作、长期维护 —— **强烈推荐**。
- 需要与前端框架（React/Vue/Angular）配合 —— **推荐**。
- 一次性小脚本、原型验证 —— 可用纯 JS。

> 一句话总结：**TS 用编译期成本换取运行时稳定与可维护性**，在工程化项目中收益远大于成本。

---

## 45. 常见类型输出题

**① 类型推导与字面量拓宽**

```ts
let a = 'hello';           // string
const b = 'hello';         // 'hello'
let c = [1, 2];            // number[]
const d = [1, 2];          // number[]
const e = [1, 2] as const; // readonly [1, 2]
```

**② `keyof` / `typeof` / 索引访问**

```ts
const obj = { name: 'Tom', age: 18 } as const;

type K = keyof typeof obj;            // 'name' | 'age'
type V = typeof obj[keyof typeof obj]; // 'Tom' | 18
type A = typeof obj['age'];           // 18
```

**③ 联合类型运算**

```ts
type T1 = 'a' | 'b' | 'c';
type T2 = Exclude<T1, 'a'>;                       // 'b' | 'c'
type T3 = Extract<T1, 'a' | 'b'>;                 // 'a' | 'b'
type T4 = NonNullable<string | null | undefined>; // string
```

**④ 条件类型分发**

```ts
type ToArray<T> = T extends any ? T[] : never;
type R1 = ToArray<string | number>;   // string[] | number[]

type ToArray2<T> = [T] extends [any] ? T[] : never;
type R2 = ToArray2<string | number>;  // (string | number)[]
```

**⑤ `infer` 提取**

```ts
type Fn = (a: string, b: number) => boolean;
type R = ReturnType<Fn>;   // boolean
type P = Parameters<Fn>;   // [a: string, b: number]

type Unwrap<T> = T extends Promise<infer U> ? U : never;
type U = Unwrap<Promise<number[]>>; // number[]
```

**⑥ 映射类型与键重映射**

```ts
interface User { name: string; age: number }

type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
type G = Getters<User>;
// { getName: () => string; getAge: () => number }
```

**⑦ 模板字面量类型**

```ts
type Size = 'sm' | 'lg';
type Color = 'red' | 'blue';
type Class = `${Size}-${Color}`;
// 'sm-red' | 'sm-blue' | 'lg-red' | 'lg-blue'

type EventName<T extends string> = `on${Capitalize<T>}`;
type E = EventName<'click'>;  // 'onClick'
```

**⑧ 递归类型**

```ts
type Reverse<T extends any[]> =
  T extends [infer F, ...infer R] ? [...Reverse<R>, F] : [];
type RV = Reverse<[1, 2, 3]>;  // [3, 2, 1]

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
type DP = DeepPartial<{ a: { b: number } }>; // { a?: { b?: number } }
```

**⑨ 交叉与联合**

```ts
type A = { a: number } & { b: string };  // { a: number; b: string }
type B = string & number;                // never
type C = 'a' | never;                    // 'a'
type D = 'a' & never;                    // never
```

**⑩ 常见易错点**

```ts
// 对象字面量的多余属性检查
interface Point { x: number; y: number }
// const p: Point = { x: 1, y: 2, z: 3 };  // 报错（字面量）
const tmp = { x: 1, y: 2, z: 3 };
const p2: Point = tmp;                     // 通过（非字面量）

// 只读数组兼容
const ro: readonly number[] = [1, 2];
// const mu: number[] = ro;                // 报错：readonly 不能赋给可变

// any 污染
function f(x: any) { return x; }
const r = f(1);   // r 为 any，后续失去检查
```

> 面试技巧：类型输出题先判断**是否分发**（裸类型参数 + 联合）、再判断**字面量是否拓宽**（`let` / `const` / `as const`），最后套用**条件类型 + `infer`** 规则逐步推导。