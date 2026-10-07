# CSS 常见面试题

> 本文件收录 CSS 相关的高频面试题及参考答案，按「渲染原理 → 盒模型 → 布局 → 定位/层叠 → 样式细节 → 动画 → 工程化」的顺序整理。

---

## 目录

1. [什么是重绘和回流？如何减少回流？](#1-什么是重绘和回流如何减少回流)
2. [什么操作会触发回流/重绘？](#2-什么操作会触发回流重绘)
3. [BFC 是什么？怎么触发？Margin 塌陷如何解决？](#3-bfc-是什么怎么触发margin-塌陷如何解决)
4. [如何隐藏一个元素？各方式有什么区别？](#4-如何隐藏一个元素各方式有什么区别)
5. [overflow 不同值的区别](#5-overflow-不同值的区别)
6. [三栏布局（圣杯 / 双飞翼）的实现方式](#6-三栏布局圣杯--双飞翼的实现方式)
7. [calc() 方法](#7-calc-方法)
8. [如何实现元素垂直水平居中？](#8-如何实现元素垂直水平居中)
9. [渐进增强和优雅降级](#9-渐进增强和优雅降级)
10. [CSS 盒子模型](#10-css-盒子模型)
11. [CSS3 有哪些新特性？](#11-css3-有哪些新特性)
12. [CSS 选择器优先级与权重计算](#12-css-选择器优先级与权重计算)
13. [CSS 属性的继承性](#13-css-属性的继承性)
14. [如何画一条 0.5px 的线？](#14-如何画一条-05px-的线)
15. [position 的值及区别](#15-position-的值及区别)
16. [什么是浮动？浮动会引起什么问题？如何清除浮动？](#16-什么是浮动浮动会引起什么问题如何清除浮动)
17. [line-height 和 height 的区别](#17-line-height-和-height-的区别)
18. [设置背景颜色会填充哪些区域？](#18-设置背景颜色会填充哪些区域)
19. [inline、block、inline-block 的区别](#19-inlineblockinline-block-的区别)
20. [box-sizing 的作用](#20-box-sizing-的作用)
21. [CSS 实现动画有哪些方式？](#21-css-实现动画有哪些方式)
22. [transition 和 animation 的区别](#22-transition-和-animation-的区别)
23. [如何改变 DOM 元素的字体颜色？](#23-如何改变-dom-元素的字体颜色)
24. [relative 和 absolute 的区别](#24-relative-和-absolute-的区别)
25. [flex 弹性盒子布局](#25-flex-弹性盒子布局)
26. [Less 和 SCSS 的区别](#26-less-和-scss-的区别)
27. [伪类和伪元素](#27-伪类和伪元素)
28. [::before 和 :before 单冒号双冒号的区别](#28-before-和-before-单冒号双冒号的区别)
29. [响应式布局的实现方案](#29-响应式布局的实现方案)
30. [单行 / 多行文本溢出显示省略号](#30-单行--多行文本溢出显示省略号)
31. [px、rpx、vw、vh、rem、em 的区别](#31-pxrpxvwvhremem-的区别)
32. [移动端 1px 边框问题](#32-移动端-1px-边框问题)
33. [z-index 和层叠上下文](#33-z-index-和层叠上下文)
34. [CSS 自定义属性（CSS 变量）](#34-css-自定义属性css-变量)
35. [width:auto 和 width:100% 的区别](#35-widthauto-和-width100-的区别)
36. [CSS 实现三角形](#36-css-实现三角形)
37. [CSS 实现两栏布局](#37-css-实现两栏布局)
38. [什么是物理像素、逻辑像素、DPR？](#38-什么是物理像素逻辑像素dpr)
39. [CSS 雪碧图（Sprite）与图标方案](#39-css-雪碧图sprite与图标方案)
40. [reset.css 和 normalize.css 的区别](#40-resetcss-和-normalizecss-的区别)
41. [object-fit 和 object-position](#41-object-fit-和-object-position)
42. [隐藏 / 自定义滚动条](#42-隐藏--自定义滚动条)
43. [CSS 实现等比例正方形 / 宽高比](#43-css-实现等比例正方形--宽高比)
44. [display 常用值汇总](#44-display-常用值汇总)
45. [多列等高布局](#45-多列等高布局)
46. [什么是 PostCSS？](#46-什么是-postcss)
47. [CSS 工程化方案：BEM / CSS Modules / CSS-in-JS / 原子化 CSS](#47-css-工程化方案bem--css-modules--css-in-js--原子化-css)
48. [CSS 选择器的匹配原理与性能优化](#48-css-选择器的匹配原理与性能优化)
49. [毛玻璃效果 backdrop-filter](#49-毛玻璃效果-backdrop-filter)
50. [CSS 性能优化有哪些手段？](#50-css-性能优化有哪些手段)

---

## 1. 什么是重绘和回流？如何减少回流？

浏览器渲染流程大致为：解析 HTML → 构建 DOM → 构建 CSSOM → 合成渲染树（Render Tree）→ 布局（Layout/Reflow）→ 绘制（Paint/Repaint）→ 合成（Composite）。

- **回流（Reflow / Layout）**：当元素的**几何属性**（尺寸、位置、结构）发生变化时，浏览器需要重新计算元素的位置和大小，重新构建渲染树。回流一定会引起重绘。
- **重绘（Repaint）**：当元素的**外观样式**变化但不影响布局时（如颜色、背景、可见性），浏览器只重新绘制，不改变几何结构。

**回流代价远大于重绘**，因为回流范围往往是全局或整棵子树。

**如何减少回流：**

1. **批量修改样式**：不要逐条操作 `style`，改用 `class` 一次性切换：
   ```js
   // 差
   el.style.width = '100px';
   el.style.height = '100px';
   // 好
   el.classList.add('box');
   ```
2. **离线操作 DOM**：先用 `display: none` 隐藏，操作完再显示；或使用 `DocumentFragment`、克隆节点后整体替换。
3. **避免强制同步布局**：不要在读取布局属性（`offsetWidth`、`scrollTop`、`getComputedStyle`）后立即写样式，读写要分离。
   ```js
   // 差：读-写-读-写 反复触发布局
   for (const el of list) {
     el.style.width = (el.offsetWidth + 10) + 'px';
   }
   // 好：先读后写
   const widths = list.map(el => el.offsetWidth);
   list.forEach((el, i) => (el.style.width = widths[i] + 10 + 'px'));
   ```
4. **使用 `transform` / `opacity` 做动画**：它们可以触发 GPU 合成，只走 Composite，不回流、不重绘。
5. **启用 GPU 加速**：`transform: translateZ(0)`、`will-change: transform`（不要滥用）。
6. **避免使用 `table` 布局**：表格中一个小改动可能引发整表重排。
7. **动画元素脱离文档流**：`position: absolute/fixed`，缩小回流范围。

---

## 2. 什么操作会触发回流/重绘？

**会触发回流（含重绘）的常见操作：**

- 添加/删除可见 DOM 元素
- 元素位置、尺寸变化（`width`、`height`、`padding`、`margin`、`border`）
- 内容变化（文字、图片尺寸）
- 字体大小变化、`font-family` 变化
- 浏览器窗口尺寸变化（`resize`）
- 读取布局属性（强制同步布局）：`offsetTop/Left/Width/Height`、`scrollTop/Left/Width/Height`、`clientTop/Left/Width/Height`、`getComputedStyle()`、`getBoundingClientRect()`
- 激活伪类（如 `:hover` 改变尺寸）
- 改变 `display`

**只触发重绘的操作：**

- 颜色、背景色、背景图
- `visibility`（保持占位）
- `outline`、`border-radius`、`box-shadow`（在尺寸不变时）

**示例：以下代码触发了多少次回流？**

```js
const el = document.querySelector('.box');
el.style.width = '100px';   // 若浏览器尚未刷新，会累积为一次
el.style.height = '200px';
el.style.background = 'red';

// 强制回流：读取布局属性会立刻刷新队列
console.log(el.offsetHeight);
```

- 前三条样式的写入如果发生在同一次 JS 执行中且中间没有读取布局，浏览器会合并为**一次回流**。
- 但 `console.log(el.offsetHeight)` 会**强制同步布局**，使前面累积的改动立即生效（第 1 次回流）。之后再写样式又会开启新一轮。
- 所以结论：**连续写样式的条数不等于回流次数**，关键看中间有没有「读操作」打断。若把写和读分开，就只需 1 次回流。

---

## 3. BFC 是什么？怎么触发？Margin 塌陷如何解决？

**BFC（Block Formatting Context，块级格式化上下文）** 是一块独立的渲染区域，内部元素的布局**不影响外部**，外部也不会影响内部。

**触发 BFC 的方式：**

- 根元素 `<html>`
- `float` 不为 `none`
- `position` 为 `absolute` / `fixed`
- `display` 为 `inline-block` / `table-cell` / `table-caption` / `flow-root` / `flex` / `grid`
- `overflow` 不为 `visible`（`hidden` / `auto` / `scroll`）
- `contain: layout` / `content` / `paint`

**BFC 的作用（常见应用）：**

1. **清除浮动（父元素高度塌陷）**：父元素触发 BFC 后可以包裹住内部浮动元素。
2. **避免 margin 塌陷**：处于不同 BFC 的元素 margin 不会合并。
3. **阻止元素被浮动元素覆盖**：让右侧内容触发 BFC 即可形成独立区域（如两栏自适应布局）。

**Margin 塌陷（外边距合并）是什么？**

相邻块级元素的**垂直 margin 会合并**，取较大值，而不是相加。

```html
<div class="a">上</div>
<div class="b">下</div>
```
```css
.a { margin-bottom: 30px; }
.b { margin-top: 20px; }  /* 实际间距是 30px，不是 50px */
```

**产生塌陷的三种情况：**

- 相邻的兄弟元素
- 父子元素（父元素没有 border/padding/内容，子元素 margin-top 会「传递」给父元素）
- 空的块级元素自身的 margin-top 与 margin-bottom 合并

**解决办法：**

1. **父子塌陷**：给父元素加 `padding-top` 或 `border-top`；父元素触发 BFC（`overflow: hidden`、`display: flow-root`）；子元素改用 `padding`。
2. **兄弟塌陷**：只给一个方向设置 margin（统一用 `margin-bottom` 或 `margin-top`）；给其中一个元素包裹一层 BFC。
3. **现代方案**：布局尽量用 `flex` / `grid`，因为它们的 margin 不会塌陷。

---

## 4. 如何隐藏一个元素？各方式有什么区别？

| 方式 | 是否占位 | 是否响应事件 | 是否引起回流 | 是否可动画 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `display: none` | 否 | 否 | 是（回流） | 否 | 从渲染树移除，彻底隐藏 |
| `visibility: hidden` | **是** | 否 | 否（重绘） | 是 | 保留空间，子元素设 `visible` 可显示 |
| `opacity: 0` | 是 | **是** | 否 | 是 | 透明但仍可点击，可触发动画 |
| `position: absolute` + 移出可视区 | 是（脱离文档流） | 是 | 是 | 是 | 常用于屏幕外隐藏 |
| `width/height: 0` + `overflow: hidden` | 否 | 否 | 是 | 是 | 可用于过渡动画 |
| `clip-path: circle(0)` | 是 | 否 | 否 | 是 | 现代裁剪方式 |
| `transform: scale(0)` | 是 | 否 | 否 | 是 | 缩放为 0 |
| HTML `hidden` 属性 | 否 | 否 | 是 | 否 | 等价于 `display: none` |

**选择建议：**

- 彻底移除、不占位：`display: none`。
- 保留占位、防止布局跳动：`visibility: hidden`。
- 需要过渡动画、淡入淡出：`opacity: 0`（配合 `pointer-events: none` 禁止点击）。

---

## 5. overflow 不同值的区别

`overflow` 控制内容超出容器时的处理方式，可分别设置 `overflow-x` / `overflow-y`。

| 值 | 说明 |
| --- | --- |
| `visible` | 默认，超出部分直接显示在容器外 |
| `hidden` | 超出部分被裁剪，不可见，**不可滚动** |
| `scroll` | 超出部分被裁剪，**始终显示滚动条**（即使内容不溢出） |
| `auto` | 按需显示滚动条：内容溢出才出现 |
| `clip` | 类似 hidden，但**不允许程序滚动**（无法用 JS 滚动） |
| `overlay` | 已废弃，行为类似 auto 但滚动条浮在内容上 |

**注意：**

- `overflow: hidden` 会触发 BFC，常用来清除浮动、防止 margin 塌陷。
- 当 `overflow-x` 和 `overflow-y` 一个为 `visible` 另一个不是时，`visible` 会被自动计算为 `auto`。
- 单方向设置时，另一个方向若为 `visible` 会自动变成 `auto`。

---

## 6. 三栏布局（圣杯 / 双飞翼）的实现方式

要求：左右两栏固定宽度，中间自适应，且**中间内容优先渲染**（DOM 中放最前）。

**方式一：Flex（推荐，最简单）**

```html
<div class="layout">
  <div class="center">中间自适应</div>
  <div class="left">左</div>
  <div class="right">右</div>
</div>
```
```css
.layout { display: flex; }
.center { flex: 1; }         /* 自适应 */
.left   { width: 200px; order: -1; }  /* 用 order 放到最左 */
.right  { width: 200px; }
```

**方式二：Grid（最简洁）**

```css
.layout {
  display: grid;
  grid-template-columns: 200px 1fr 200px;
  height: 100vh;
}
```

**方式三：绝对定位**

```css
.layout { position: relative; }
.left  { position: absolute; left: 0;  top: 0; width: 200px; }
.right { position: absolute; right: 0; top: 0; width: 200px; }
.center { margin: 0 200px; }
```

**方式四：圣杯布局（float + 负 margin）**

```css
.container { padding: 0 200px; }      /* 给左右留出空间 */
.center { float: left; width: 100%; }
.left   { float: left; width: 200px; margin-left: -100%; position: relative; left: -200px; }
.right  { float: left; width: 200px; margin-left: -200px; position: relative; right: -200px; }
```

**方式五：双飞翼布局（float + 中间套一层）**

```css
.center-wrap { float: left; width: 100%; }
.center { margin: 0 200px; }          /* 中间内容用 margin 让位 */
.left  { float: left; width: 200px; margin-left: -100%; }
.right { float: left; width: 200px; margin-left: -200px; }
```

> 面试建议：优先答 Flex/Grid，再补充圣杯/双飞翼的实现思路（核心是负 margin 让浮动元素上移 + padding/margin 让位）。

---

## 7. calc() 方法

`calc()` 允许在 CSS 中进行**四则运算**，实现动态计算。

```css
.box {
  width: calc(100% - 40px);        /* 减法，注意运算符两侧必须有空格 */
  height: calc(100vh - 60px);
  margin-top: calc(2rem + 10px);
  padding: calc(10px * 2);
}
```

**注意事项：**

- `+`、`-` 两侧**必须有空格**，`*`、`/` 可不加。
- 可以混合不同单位（% 与 px、rem 与 vh）。
- 表达式不要嵌套过深，可读性差。
- 常用于「侧边栏固定 + 主内容自适应」的场景。

---

## 8. 如何实现元素垂直水平居中？

**1）Flex（推荐）**

```css
.container {
  display: flex;
  justify-content: center;  /* 水平 */
  align-items: center;      /* 垂直 */
  height: 100vh;
}
```

**2）Grid**

```css
.container {
  display: grid;
  place-items: center;   /* 等价于 align-items + justify-items */
  height: 100vh;
}
```

**3）绝对定位 + transform（万能，不需知道子元素尺寸）**

```css
.container { position: relative; height: 100vh; }
.centered {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
```

**4）绝对定位 + margin（需知道子元素尺寸）**

```css
.centered {
  position: absolute;
  top: 0; right: 0; bottom: 0; left: 0;
  margin: auto;
  width: 200px;
  height: 100px;
}
```

**5）table-cell**

```css
.container {
  display: table-cell;
  vertical-align: middle;
  text-align: center;
}
```

> 面试首选 Flex / Grid，其次绝对定位 + transform。

---

## 9. 渐进增强和优雅降级

两者都是处理**浏览器兼容性**的策略，方向相反。

- **渐进增强（Progressive Enhancement）**
  先保证最基础的功能/内容在所有浏览器可用，再针对支持新特性的浏览器增加高级效果。
  > 例：先用原生 `<input type="text">` 实现输入，再对新浏览器使用 `type="date"` 日期选择器。

- **优雅降级（Graceful Degradation）**
  一开始就针对现代浏览器开发完整体验，再为老旧浏览器提供可用的降级方案。
  > 例：直接用 `flex`/`grid` 布局，再用 `@supports` 或降级样式兜底。

| | 渐进增强 | 优雅降级 |
| --- | --- | --- |
| 出发点 | 从基础到高级 | 从高级到基础 |
| 关注点 | 内容与核心功能 | 完整体验 |
| 成本 | 前期投入高 | 后期维护成本高 |

---

## 10. CSS 盒子模型

每个元素都表现为一个矩形盒子，由内到外分为四层：

- **content**：内容区（宽高由 `width`/`height` 决定）
- **padding**：内边距
- **border**：边框
- **margin**：外边距

**两种盒模型：**

| | 标准盒模型（content-box） | IE 盒模型（border-box） |
| --- | --- | --- |
| `width` 含义 | 仅 content 宽度 | content + padding + border |
| 元素实际宽度 | width + padding + border | width |
| 默认 | 浏览器默认 | IE 怪异模式 |

```css
.box {
  width: 100px;
  padding: 10px;
  border: 5px solid #000;
}
/* content-box：实际宽度 = 100 + 20 + 10 = 130px */
/* border-box：实际宽度 = 100px，内容区 = 100 - 20 - 10 = 70px */
```

**计算实际宽度的公式（content-box）：**

```
元素宽度 = width + padding-left + padding-right + border-left + border-right
元素占位宽度 = 上式 + margin-left + margin-right
```

---

## 11. CSS3 有哪些新特性？

1. **选择器**：属性选择器、伪类（`:nth-child`、`:not`、`:first-of-type`）、伪元素。
2. **边框**：`border-radius`、`box-shadow`、`border-image`。
3. **背景**：`background-size`、`background-origin`、`background-clip`、多重背景。
4. **渐变**：`linear-gradient`、`radial-gradient`、`conic-gradient`。
5. **文本**：`text-shadow`、`text-overflow`、`word-wrap`、`word-break`、自定义字体 `@font-face`。
6. **转换**：`transform`（`translate`/`rotate`/`scale`/`skew`）、3D 转换。
7. **过渡**：`transition`。
8. **动画**：`@keyframes` + `animation`。
9. **布局**：`flex`、`grid`、多列布局 `column`。
10. **媒体查询**：`@media`，实现响应式。
11. **颜色**：`rgba`、`hsl`、`hsla`、`currentColor`。
12. **自定义属性**：`--var` + `var()`。
13. **滤镜**：`filter`、`backdrop-filter`。
14. **新单位**：`rem`、`vw`、`vh`、`vmin`、`vmax`、`ch`、`fr`。
15. **其他**：`@supports`、`object-fit`、`aspect-ratio`、`clip-path`。

---

## 12. CSS 选择器优先级与权重计算

**权重（Specificity）用四元组表示 `(a, b, c, d)`：**

| 类型 | 权重贡献 | 示例 |
| --- | --- | --- |
| 行内样式 | a = 1 | `style="..."` |
| ID 选择器 | b | `#app` |
| 类、属性、伪类 | c | `.box`、`[type="text"]`、`:hover` |
| 元素、伪元素 | d | `div`、`::before` |

**比较规则：** 从左到右逐位比较，左边相同才比较下一位。

```css
#nav .list li a       /* 0,1,1,2 */
.list li a:hover      /* 0,0,2,2 */
a                     /* 0,0,0,1 */
```

**特殊情况：**

- `!important` 优先级最高，会覆盖普通声明的权重（但低于「更靠后的 `!important`」）。**尽量避免使用**。
- 通配符 `*`、组合符（`>`、`+`、`~`）权重为 0。
- `:not()`、`:is()`、`:has()` 的权重取括号内选择器的最高权重。
- `:where()` 权重恒为 0。

**同权重时：** 后定义的样式覆盖先定义的（就近原则/层叠顺序）。

**优先级从高到低：**

```
!important > 行内样式 > ID > 类/属性/伪类 > 元素/伪元素 > 通配符/继承
```

---

## 13. CSS 属性的继承性

**可继承属性**（多为文本、字体相关）：`color`、`font` 系列、`line-height`、`text-align`、`text-indent`、`letter-spacing`、`word-spacing`、`visibility`、`cursor`、`list-style`、`white-space`。

**不可继承属性**（多为盒模型、布局相关）：`width`、`height`、`margin`、`padding`、`border`、`display`、`position`、`background`、`float`、`overflow`、`z-index`。

**强制继承/不继承：**

```css
.child {
  color: inherit;   /* 强制继承父元素的值 */
  border: initial;  /* 恢复为初始值（不可继承属性恢复默认）*/
  width: unset;     /* 可继承属性则继承，否则用初始值 */
}
```

> 常见应用：给 `body` 设置 `font-family` 和 `color`，全局元素自动继承，减少重复代码。

---

## 14. 如何画一条 0.5px 的线？

由于多数屏幕（DPR=2）无法渲染真正的 0.5px，需要借助技巧。

**方式一：`transform: scaleY(0.5)`（推荐）**

```css
.line {
  height: 1px;
  background: #000;
  transform: scaleY(0.5);
  transform-origin: 0 0;
}
```

**方式二：伪元素 + 缩放**

```css
.line { position: relative; }
.line::after {
  content: '';
  position: absolute;
  left: 0; bottom: 0;
  width: 100%;
  height: 1px;
  background: #000;
  transform: scaleY(0.5);
  transform-origin: 0 0;
}
```

**方式三：渐变背景**

```css
.line {
  background: linear-gradient(
    to bottom,
    transparent 50%,
    #000 50%
  );
  background-size: 100% 1px;
  background-repeat: no-repeat;
}
```

**方式四：`box-shadow`**

```css
.line {
  box-shadow: 0 0.5px 0 #000;  /* 部分设备支持 */
}
```

**方式五：SVG / 直接使用 0.5px**（在 DPR=2 的设备上 `border: 0.5px` 可行）

---

## 15. position 的值及区别

| 值 | 说明 | 是否脱离文档流 | 定位基准 |
| --- | --- | --- | --- |
| `static` | 默认，正常文档流 | 否 | 无 |
| `relative` | 相对自身原位置偏移 | **否**（保留原占位） | 自身原位置 |
| `absolute` | 绝对定位 | 是 | 最近的**已定位**祖先（relative/absolute/fixed/sticky） |
| `fixed` | 固定定位 | 是 | 视口（viewport） |
| `sticky` | 粘性定位 | 否（达到阈值前） | 最近的滚动祖先 + 阈值 |

**重点：**

- `relative` 常用作 `absolute` 的**定位参照物**（子绝父相）。
- `absolute` 若无已定位祖先，则相对初始包含块（`<html>`）定位。
- `fixed` 在移动端有兼容问题（软键盘、transform 祖先会导致其相对该祖先定位）。
- `sticky` 需指定 `top`/`bottom`/`left`/`right` 之一，且父元素不能有 `overflow: hidden`（否则失效）。

```css
.parent { position: relative; }
.child  { position: absolute; top: 0; right: 0; }
```

---

## 16. 什么是浮动？浮动会引起什么问题？如何清除浮动？

**浮动**：`float` 让元素脱离普通文档流、向左或向右靠拢，直到碰到父元素边界或另一个浮动元素。

```css
.box { float: left; }
```

**引起的问题：**

1. **父元素高度塌陷**：浮动元素脱离文档流，父元素无法被撑开。
2. **相邻元素被覆盖/环绕**：浮动元素会覆盖后面的块级元素（文字会环绕）。
3. 影响后续布局，导致错位。

**清除浮动（clearfix）的方法：**

**① 父元素触发 BFC**

```css
.parent { overflow: hidden; }   /* 或 display: flow-root */
```

**② 额外标签 + clear（不推荐，增加无意义标签）**

```html
<div style="clear: both;"></div>
```

**③ 伪元素清除（推荐）**

```css
.clearfix::after {
  content: '';
  display: block;
  clear: both;
  height: 0;
  visibility: hidden;
}
.clearfix { zoom: 1; }   /* 兼容 IE6/7 */
```

**④ 现代方案**：直接改用 `flex` / `grid` 布局，从根本上避免浮动问题。

---

## 17. line-height 和 height 的区别

- **`height`**：设置元素的**高度**（盒子高度）。
- **`line-height`**：设置**行高**，即文本行基线之间的距离（控制的是文本行占用的垂直空间）。

**关键区别：**

- `line-height` 可以小于、等于或大于 `height`。
- 当 `line-height == height` 且为单行文本时，文本会**垂直居中**（经典技巧）。
- `height` 作用于盒子，`line-height` 作用于行盒/文本。

```css
.box {
  height: 50px;
  line-height: 50px;   /* 单行文字垂直居中 */
}
```

**line-height 取值：**

- 数字（如 `1.5`）：最推荐，**子元素按自身 font-size 计算**，不会层层累积。
- 百分比 / em：按父元素 font-size 计算后继承固定值，可能出现累积问题。
- 长度（`20px`）：固定行高。

---

## 18. 设置背景颜色会填充哪些区域？

默认情况下，`background-color` 填充范围是 **content + padding + border** 区域（`background-clip: border-box`）。

**相关属性：**

| 属性 | 作用 |
| --- | --- |
| `background-clip` | 决定背景的**绘制范围**（`border-box` / `padding-box` / `content-box` / `text`） |
| `background-origin` | 决定背景**定位的起点**（`border-box` / `padding-box` / `content-box`） |
| `background-size` | 背景图尺寸 |
| `background-attachment` | 背景是否随滚动（`scroll` / `fixed` / `local`） |

```css
.box {
  background-color: red;
  background-clip: content-box;   /* 只在内容区显示 */
}

/* 文字渐变填充 */
.text {
  background: linear-gradient(to right, #f00, #00f);
  -webkit-background-clip: text;
  color: transparent;
}
```

**注意：**

- 背景色默认**延伸到边框下面**，如果边框是半透明或虚线，能看到背景色。
- `background-clip: text` 配合透明文字可做渐变文字。

---

## 19. inline、block、inline-block 的区别

| | inline | block | inline-block |
| --- | --- | --- | --- |
| 换行 | 不换行，与其他行内元素并排 | 独占一行 | 不换行，可并排 |
| 宽高 | 不可设置（由内容撑开） | 可设置，默认 100% | 可设置 |
| padding/margin | 水平有效，垂直不撑开父元素 | 四方向都有效 | 四方向都有效 |
| 默认宽 | 内容宽度 | 撑满父容器 | 内容宽度 |
| 转换 | —— | `display: block` | `display: inline-block` |

**inline-block 的空白间隙问题：**

HTML 中标签之间的换行/空格会被解析为一个空格（约 4px），导致并排的 `inline-block` 间有间隙。解决：

1. 父元素 `font-size: 0`，子元素单独设置字号。
2. 把标签写在同一行（可读性差）。
3. 用 `float` 或 `flex` 布局。

---

## 20. box-sizing 的作用

`box-sizing` 决定 `width`/`height` 的计算方式。

| 值 | 含义 |
| --- | --- |
| `content-box`（默认） | `width` 只包含内容区，实际占位 = width + padding + border |
| `border-box` | `width` 包含 content + padding + border，内容区会被压缩 |

```css
* { box-sizing: border-box; }   /* 常见全局重置 */
```

**为什么推荐 `border-box`：**

- 设置宽度后加 padding/border 不会撑大元素，布局更直观。
- 常用于栅格系统、百分比布局，避免宽度溢出。

> 注意：`box-sizing` 不包含 `margin`，`margin` 永远在盒子外部。

---

## 21. CSS 实现动画有哪些方式？

1. **`transition` 过渡**：用于属性值的**平滑变化**，需要触发条件（如 `:hover`、类名切换）。
   ```css
   .btn { transition: all 0.3s ease; }
   .btn:hover { background: #6f42c1; }
   ```

2. **`@keyframes` + `animation`**：可定义多阶段、循环、自动播放的动画。
   ```css
   @keyframes move {
     from { transform: translateX(0); }
     to   { transform: translateX(200px); }
   }
   .ball { animation: move 1s infinite alternate ease-in-out; }
   ```

3. **`transform`**：位移、旋转、缩放、倾斜，配合过渡实现动画效果。

4. **JS 驱动**：
   - `requestAnimationFrame`（推荐，与帧同步）
   - `setTimeout` / `setInterval`（不精准）
   - Web Animations API（`element.animate()`）
   - 第三方库：GSAP、anime.js

5. **SVG 动画**：`<animate>`、`<animateTransform>`、SMIL 或 CSS 控制 SVG 属性。

**性能建议：** 优先动画 `transform` 和 `opacity`（走合成层，不触发回流/重绘）。

---

## 22. transition 和 animation 的区别

| | transition | animation |
| --- | --- | --- |
| 触发 | 需要**触发条件**（hover、class 变化等） | **自动播放**，无需触发 |
| 关键帧 | 只有首尾两态 | 可用 `@keyframes` 定义**多个关键帧** |
| 循环 | 不能循环 | 可 `infinite` 无限循环 |
| 控制 | 简单（时长/缓动/延迟） | 丰富（方向、次数、填充模式、暂停） |
| 适用 | 交互反馈、状态切换 | 复杂、持续、循环动画 |
| 属性 | `transition-property/duration/timing-function/delay` | `animation-name/duration/timing-function/delay/iteration-count/direction/fill-mode/play-state` |

```css
/* transition：hover 触发 */
.a { transition: all .3s; }
.a:hover { transform: scale(1.1); }

/* animation：自动循环 */
@keyframes spin { to { transform: rotate(360deg); } }
.b { animation: spin 2s linear infinite; }
```

---

## 23. 如何改变 DOM 元素的字体颜色？

**方式一：CSS**

```css
.text { color: #6f42c1; }
```

**方式二：内联样式**

```js
el.style.color = 'red';
```

**方式三：切换类名（推荐，便于集中管理）**

```js
el.classList.add('text-primary');
```

**方式四：CSS 变量**

```css
:root { --primary: #6f42c1; }
.text { color: var(--primary); }
```

```js
document.documentElement.style.setProperty('--primary', '#f00');
```

**注意：** `color` 是可继承属性，修改父元素颜色会影响未单独设置颜色的子元素。

---

## 24. relative 和 absolute 的区别

| | `position: relative` | `position: absolute` |
| --- | --- | --- |
| 脱离文档流 | 否，**保留原占位** | 是，完全脱离，不占位 |
| 定位基准 | 自身原来的位置 | 最近的非 static 祖先 |
| 后续元素 | 不受影响 | 会上移填充空位 |
| 常用场景 | 微调位置、作为 absolute 的参照 | 弹窗、下拉菜单、角标、覆盖层 |

**经典组合「子绝父相」：**

```css
.parent { position: relative; }
.child  { position: absolute; top: 0; right: 0; }
```

**补充：**

- `relative` 的 `z-index` 会创建层叠上下文。
- `absolute` 若无定位祖先，相对 `html` 定位。
- 两者都可通过 `top/right/bottom/left` 定位。

---

## 25. flex 弹性盒子布局

`display: flex` 让容器成为弹性容器，子元素成为弹性项目（flex item）。

**容器属性：**

| 属性 | 作用 |
| --- | --- |
| `flex-direction` | 主轴方向：`row` / `row-reverse` / `column` / `column-reverse` |
| `flex-wrap` | 是否换行：`nowrap` / `wrap` / `wrap-reverse` |
| `justify-content` | 主轴对齐：`flex-start` / `center` / `flex-end` / `space-between` / `space-around` / `space-evenly` |
| `align-items` | 交叉轴对齐（单行）：`stretch` / `flex-start` / `center` / `flex-end` / `baseline` |
| `align-content` | 多行整体对齐 |
| `gap` | 项目间距 |

**项目属性：**

| 属性 | 作用 |
| --- | --- |
| `flex-grow` | 放大比例（剩余空间分配） |
| `flex-shrink` | 缩小比例 |
| `flex-basis` | 基准尺寸 |
| `flex` | `grow shrink basis` 简写，常用 `flex: 1` |
| `order` | 排列顺序 |
| `align-self` | 单独覆盖 `align-items` |

```css
.container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.item { flex: 1; }   /* 平分空间 */
```

**`flex: 1` 等价于 `flex: 1 1 0%`**，即项目可放大、可缩小、基准为 0。

---

## 26. Less 和 SCSS 的区别

两者都是 **CSS 预处理器**，都提供变量、嵌套、Mixin、运算、函数等能力。

| | Less | SCSS |
| --- | --- | --- |
| 语法 | 更接近原生 CSS | 完全兼容 CSS，扩展了 SCSS 语法 |
| 变量符号 | `@color` | `$color` |
| 嵌套 | 支持 | 支持，且提供 `&` 父选择器 |
| 条件/循环 | 有（`when`、`loop`） | 更强大（`@if`、`@for`、`@each`、`@while`） |
| Mixin | `.mixin()` | `@mixin` + `@include` |
| 社区/生态 | 较弱 | 更强（Bootstrap 4 用 SCSS） |
| 编译 | 基于 JS（Node） | 早期基于 Ruby，现多用 Dart Sass / node-sass |
| 函数 | 内置较少 | 内置丰富（颜色、数学、字符串函数） |

**Less 示例：**

```less
@primary: #6f42c1;

.button {
  color: @primary;
  &:hover { color: darken(@primary, 10%); }
}
```

**SCSS 示例：**

```scss
$primary: #6f42c1;

@mixin center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.button {
  color: $primary;
  @include center;
  &:hover { color: darken($primary, 10%); }
}
```

---

## 27. 伪类和伪元素

- **伪类（Pseudo-class）**：用单冒号 `:`，描述元素的**状态**或**位置关系**，选中已存在的元素。
- **伪元素（Pseudo-element）**：用双冒号 `::`，创建**原本不存在**的元素/内容。

**常见伪类：**

- 状态：`:hover`、`:active`、`:focus`、`:visited`、`:checked`、`:disabled`
- 结构：`:first-child`、`:last-child`、`:nth-child(n)`、`:nth-of-type`、`:only-child`、`:not()`、`:is()`、`:has()`

**常见伪元素：**

- `::before`、`::after`（需配合 `content` 使用）
- `::first-line`、`::first-letter`
- `::selection`（选中文本样式）
- `::placeholder`

```css
/* 伪类：列表奇数行背景 */
li:nth-child(odd) { background: #f5f5f5; }

/* 伪元素：自定义复选框 */
.box::after {
  content: '';
  display: block;
  width: 8px;
  height: 8px;
  background: #6f42c1;
}
```

---

## 28. ::before 和 :before 单冒号双冒号的区别

- 单冒号 `:before` 是 **CSS2** 的写法；双冒号 `::before` 是 **CSS3** 的写法，用来区分伪类（单冒号）和伪元素（双冒号）。
- 功能上两者**完全等价**，现代浏览器都支持。
- **推荐使用双冒号 `::before`**，语义更清晰。
- 兼容性：`::before` 在 IE8 及以下不支持，`:` 在 IE8 支持（IE8 只支持单冒号）。

```css
/* 推荐 */
.a::before { content: '★'; }

/* 兼容老 IE，可写单冒号 */
.a:before { content: '★'; }
```

> 注意：`::before` / `::after` 必须设置 `content` 属性（可以是空字符串 `''`）才会生效；它们默认是行内元素，且**不能用于置换元素**（如 `img`、`input`）。

---

## 29. 响应式布局的实现方案

**核心思路：** 同一套代码适配不同屏幕尺寸和设备。

1. **媒体查询 `@media`**
   ```css
   /* 移动优先：从小到大写 */
   .box { width: 100%; }

   @media (min-width: 768px) {
     .box { width: 50%; }
   }
   @media (min-width: 1200px) {
     .box { width: 33.33%; }
   }
   ```

2. **相对单位**：`%`、`rem`、`em`、`vw`、`vh`、`vmin`、`ch`，让尺寸随视口变化。

3. **视口设置**（移动端必需）
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   ```

4. **Flex / Grid 弹性布局**：天然自适应，减少对媒体查询的依赖。

5. **图片响应式**：`max-width: 100%`、`srcset`、`<picture>`。

6. **响应式框架**：Bootstrap、Tailwind CSS 的栅格系统。

7. **容器查询 `@container`**（新特性）：根据父容器尺寸而非视口做响应式。

**rem 适配方案：** 通过 JS 或 `vw` 动态设置根字号，配合 `rem` 实现整体等比缩放（如设计稿 750px）：

```css
html { font-size: calc(100vw / 7.5); }  /* 1rem = 100px @750 设计稿 */
```

---

## 30. 单行 / 多行文本溢出显示省略号

**单行：**

```css
.ellipsis {
  overflow: hidden;
  white-space: nowrap;         /* 不换行 */
  text-overflow: ellipsis;     /* 溢出显示省略号 */
}
```

**多行（`-webkit-line-clamp`）：**

```css
.ellipsis-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;       /* 显示 2 行 */
  overflow: hidden;
  text-overflow: ellipsis;     /* 部分浏览器需要 */
}
```

**注意：**

- `-webkit-line-clamp` 是非标准属性，但在主流浏览器（含移动端）表现良好。
- 若需要兼容性更强，可用 JS 计算截断或用「伪元素 + 渐变遮罩」方案。
- 多行方案要求 `display: -webkit-box` 且 `overflow: hidden`。

---

## 31. px、rpx、vw、vh、rem、em 的区别

| 单位 | 类型 | 参照基准 | 说明 |
| --- | --- | --- | --- |
| `px` | 绝对单位 | 无（逻辑像素） | 屏幕基本单位，不随屏幕自动缩放 |
| `rpx` | 相对单位 | 屏幕宽度（微信小程序） | 规定屏幕宽 750rpx，按比例自适应 |
| `vw` | 相对单位 | 视口宽度的 1% | `100vw` = 视口宽度 |
| `vh` | 相对单位 | 视口高度的 1% | `100vh` = 视口高度，移动端注意地址栏高度问题 |
| `vmin` / `vmax` | 相对单位 | 视口较小/较大边 | 适合正方形/等比元素 |
| `rem` | 相对单位 | **根元素（html）font-size** | 全局统一，适合整体缩放 |
| `em` | 相对单位 | **父元素 font-size**（自身用于 font-size 时参照父级） | 会层层累积，易失控 |
| `%` | 相对单位 | 父元素的对应属性 | 宽度相对父宽，高度相对父高（父高需确定） |
| `ch` | 相对单位 | 数字 `0` 的宽度 | 适合限制文本宽度 |
| `fr` | 相对单位 | Grid 剩余空间 | 仅用于 Grid |

**em 的累积问题：**

```html
<div style="font-size: 16px;">
  <p style="font-size: 1.5em;">  <!-- 24px -->
    <span style="font-size: 1.5em;">  <!-- 36px，而非 24px -->
    </span>
  </p>
</div>
```

**选择建议：**

- 字体、间距、圆角：优先 `rem` 或 `px`。
- 整体等比缩放（移动端）：`rem` + 动态根字号，或 `vw`。
- 需要避免层层累积：优先用 `rem` 而非 `em`。

---

## 32. 移动端 1px 边框问题

**原因：** 在 DPR（设备像素比）为 2 或 3 的屏幕上，CSS 的 1px 对应物理 2px 或 3px，视觉上比设计稿粗。

**解决方案：**

**① 伪元素 + transform 缩放（推荐）**

```css
.border-1px {
  position: relative;
}
.border-1px::after {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 200%;             /* DPR=2 时放大 2 倍 */
  height: 200%;
  border: 1px solid #000;
  transform: scale(0.5);   /* 再缩小一半 */
  transform-origin: 0 0;
  box-sizing: border-box;
  pointer-events: none;
}
```

**② `border-image` + 渐变**

```css
.border-1px {
  border-bottom: 1px solid transparent;
  border-image: linear-gradient(to bottom, transparent 50%, #000 50%) 0 0 100% 0;
}
```

**③ `box-shadow` 模拟**

```css
.border-1px {
  box-shadow: 0 0 0 0.5px #000 inset;
}
```

**④ `viewport` 缩放（rem 方案下）**：通过 `initial-scale` 动态调整，全局 1px = 物理 1px。

**⑤ 直接写 `0.5px`**（DPR≥2 设备支持，但兼容性欠佳）。

---

## 33. z-index 和层叠上下文

**`z-index`** 控制元素的**层叠顺序**（谁盖在谁上面），仅对**已定位元素**（`position` 非 static）或 flex/grid 子项、以及创建了层叠上下文的元素生效。

**层叠上下文（Stacking Context）** 是一个独立的层叠环境，内部元素的 `z-index` 只在**同一层叠上下文内比较**。父级创建了层叠上下文后，子级再大的 `z-index` 也无法盖过父级之外的更高层。

**创建层叠上下文的方式：**

- 根元素 `<html>`
- `position: relative/absolute` + `z-index` 不为 `auto`
- `position: fixed` / `sticky`
- `opacity` < 1
- `transform`、`filter`、`perspective` 不为 `none`
- `will-change` 指定了会创建层叠上下文的属性
- `isolation: isolate`
- flex/grid 子项且 `z-index` 不为 `auto`

**同一层叠上下文内的层叠顺序（从低到高）：**

```
背景/边框 → 负 z-index → 块级盒子 → 浮动盒子 → 行内盒子 → z-index:0/auto → 正 z-index
```

**常见坑：** 父元素设置了 `transform` 或 `opacity`，导致子元素的 `z-index` 被「困住」，无法盖过兄弟元素的子元素。

---

## 34. CSS 自定义属性（CSS 变量）

CSS 变量以 `--` 开头，通过 `var()` 使用，具有**继承性**和**动态性**。

```css
:root {
  --primary: #6f42c1;
  --radius: 8px;
}

.button {
  color: var(--primary);
  border-radius: var(--radius);
  /* 提供回退值 */
  background: var(--bg, #fff);
}
```

**特点：**

- **可继承**：子元素能访问父级定义的变量。
- **可动态修改**：JS 通过 `setProperty` 实时改变，实现主题切换。
- **作用域**：定义在哪个选择器上，就作用于该元素及其后代。

```js
// 切换主题
document.documentElement.style.setProperty('--primary', '#f5222d');
```

```css
/* 媒体查询中重定义，实现响应式 */
@media (max-width: 768px) {
  :root { --radius: 4px; }
}
```

**与预处理器变量的区别：** 预处理器变量在**编译时**替换为固定值；CSS 变量在**运行时**生效，可被 JS 动态修改。

---

## 35. width:auto 和 width:100% 的区别

| | `width: auto`（默认） | `width: 100%` |
| --- | --- | --- |
| 计算方式 | 由浏览器按规则计算（块级元素自动撑满可用空间，减去 margin/padding/border） | 明确等于**父元素内容区宽度** |
| 是否含 padding/border | `auto` 会自动扣减，不会溢出 | content-box 下会超出父元素 |
| 溢出 | 不会溢出 | 可能溢出（100% + padding/border） |
| 适用 | 自适应撑满 | 明确占满父容器宽度 |

```css
/* 父宽 300px */
.box1 { width: auto; padding: 20px; }   /* 内容区 = 300 - 40 = 260px，总宽 300px */
.box2 { width: 100%; padding: 20px; }   /* 内容区 = 300px，总宽 = 340px，溢出 */
```

> 若用 `box-sizing: border-box`，`width: 100%` 会包含 padding/border，就不会溢出。

**总结：** 需要「撑满且不溢出」用 `auto`；需要「严格等于父宽」用 `100%`（注意盒模型）。

---

## 36. CSS 实现三角形

利用**边框**的技巧：当元素宽高为 0 时，四个方向的边框会交于一点，形成三角形。

```css
.triangle {
  width: 0;
  height: 0;
  border-width: 50px;            /* 四个方向等宽 */
  border-style: solid;
  border-color: transparent transparent #6f42c1 transparent;  /* 只要向下的边框有色 */
}
```

**方向由有颜色的边框决定：**

- 向下三角：`border-top` 有色
- 向上三角：`border-bottom` 有色
- 向左/右：对应方向有色

```css
/* 直角三角形（尖角朝左上） */
.triangle-right {
  width: 0; height: 0;
  border-top: 50px solid #6f42c1;   /* 直角边 */
  border-right: 50px solid transparent;
}
```

**其他方式：** `clip-path: polygon(50% 0, 0 100%, 100% 100%)`、SVG、`conic-gradient`。

---

## 37. CSS 实现两栏布局

**方式一：Flex（推荐）**

```css
.layout { display: flex; height: 100vh; }
.side   { width: 200px; }
.main   { flex: 1; }       /* 自适应剩余空间 */
```

**方式二：Grid**

```css
.layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  height: 100vh;
}
```

**方式三：float + 触发 BFC（左固定右自适应）**

```css
.side  { float: left; width: 200px; }
.main  { overflow: hidden; }   /* 触发 BFC，避免被浮动覆盖 */
```

**方式四：绝对定位**

```css
.layout { position: relative; }
.side { position: absolute; width: 200px; top: 0; bottom: 0; }
.main { margin-left: 200px; }
```

**方式五：calc()**

```css
.side { float: left; width: 200px; }
.main { float: left; width: calc(100% - 200px); }
```

> 面试首选 Flex / Grid，再补充 float + BFC 与绝对定位的思路。

---

## 38. 什么是物理像素、逻辑像素、DPR？

| 概念 | 含义 |
| --- | --- |
| 物理像素（设备像素） | 屏幕真实发光的最小单元，出厂即固定 |
| 逻辑像素（CSS 像素） | CSS 中使用的 `px`，浏览器抽象出的单位 |
| **DPR（设备像素比）** | `DPR = 物理像素 / 逻辑像素` |
| PPI | 每英寸包含的物理像素数，衡量屏幕精细度 |

**举例：** iPhone 6 的逻辑分辨率是 375 × 667，DPR = 2，故物理分辨率为 750 × 1334。

**由此衍生的问题：**

- **1px 边框变粗**：CSS 1px 在 DPR=2 屏幕上占 2 个物理像素。
- **高清图（2x 图）**：位图在 DPR≥2 屏幕上放大后会模糊，需要按 DPR 提供多倍图。

```css
/* 按 DPR 加载不同倍图 */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .logo {
    background-image: url('logo@2x.png');
    background-size: 100px 40px;   /* 显式指定 CSS 尺寸，避免显示过大 */
  }
}
```

```js
// JS 获取当前 DPR
console.log(window.devicePixelRatio);   // 常见 1 / 2 / 3
```

---

## 39. CSS 雪碧图（Sprite）与图标方案

**雪碧图（CSS Sprite）**：把多个小图标合并到一张大图，用 `background-position` 显示其中某一块。

```css
.icon {
  background-image: url('sprite.png');
  background-repeat: no-repeat;
  width: 24px;
  height: 24px;
}
.icon-home { background-position: 0 0; }
.icon-user { background-position: -24px 0; }
```

**优点：** 减少 HTTP 请求数，提升加载速度。

**缺点：** 维护成本高（改一个图标要重新生成整图）、无法单独缓存、需要预先规划尺寸和位置。

**现代替代方案：**

- **iconfont（字体图标）**：矢量、可改色，但存在加载闪烁、multicolor 支持差。
- **SVG Sprite / 内联 SVG**：矢量清晰、可控制颜色，推荐。
- **组件库图标**（如按需引入的 SVG 组件）。

---

## 40. reset.css 和 normalize.css 的区别

| | `reset.css` | `normalize.css` |
| --- | --- | --- |
| 目标 | **清除**所有默认样式 | **保留**有用的默认样式，只统一浏览器差异 |
| 做法 | 一刀切，如 `* { margin: 0; padding: 0; }` | 针对各浏览器逐条修正 |
| 影响面 | 大，`ul`、`h1`、表单等都需重新定义 | 小，更温和 |
| 适用 | 需要完全自定义、从零开始 | 希望快速对齐跨浏览器表现 |

**现代常见做法：** 不再引入完整 reset，而是做少量重置：

```css
*, *::before, *::after { box-sizing: border-box; }
body, h1, h2, h3, h4, p, ul, ol, figure { margin: 0; }
ul, ol { padding: 0; list-style: none; }
img, picture, video { display: block; max-width: 100%; }
input, button { font: inherit; }
```

---

## 41. object-fit 和 object-position

控制**替换元素**（`img`、`video`）的内容如何适应其盒子，类似 `background-size` / `background-position`。

| `object-fit` 值 | 说明 |
| --- | --- |
| `fill` | 拉伸填满盒子（默认，会变形） |
| `contain` | 保持比例完整显示，可能有留白 |
| `cover` | 保持比例铺满盒子，超出部分被裁切 |
| `none` | 保持原始尺寸，可能溢出或留白 |
| `scale-down` | 取 `none` 与 `contain` 中较小的效果 |

```css
.avatar {
  width: 100px;
  height: 100px;
  object-fit: cover;              /* 常见：头像等比裁切 */
  object-position: center top;    /* 控制裁切时保留哪部分 */
}
```

> 对比：`background-size: cover` 作用于背景图；`object-fit` 作用于 `img`/`video` 的**内容**，且图片仍在文档流中、可被右键保存、利于 SEO。

---

## 42. 隐藏 / 自定义滚动条

**隐藏滚动条但保留滚动能力：**

```css
.box {
  overflow: auto;
  scrollbar-width: none;        /* Firefox */
  -ms-overflow-style: none;     /* IE / Edge */
}
.box::-webkit-scrollbar {
  display: none;                /* Chrome / Safari / Edge */
}
```

**自定义滚动条（WebKit 内核）：**

```css
.box::-webkit-scrollbar { width: 8px; height: 8px; }
.box::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}
.box::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.5); }
.box::-webkit-scrollbar-track { background: #f1f1f1; }
```

**标准属性（兼容性有限）：** `scrollbar-width: thin | auto | none`、`scrollbar-color: thumb track`。

---

## 43. CSS 实现等比例正方形 / 宽高比

**方式一：`aspect-ratio`（现代推荐）**

```css
.box {
  width: 200px;
  aspect-ratio: 1;        /* 1:1 正方形 */
}
/* 16:9 视频容器 */
.video { width: 100%; aspect-ratio: 16 / 9; }
```

**方式二：`padding-top` 百分比技巧（兼容旧浏览器）**

`padding` 的**百分比基于父元素的宽度**计算，可用来撑出等比高度。

```css
.box {
  position: relative;
  width: 50%;
  padding-top: 50%;        /* 高度 = 宽度的 50% → 宽高比 2:1 */
}
.box .inner {
  position: absolute;
  inset: 0;                /* 内容绝对定位铺满 */
}
```

**方式三：`height: 0` + `padding-bottom`**，原理同上。

---

## 44. display 常用值汇总

| 值 | 说明 |
| --- | --- |
| `block` | 块级元素，独占一行 |
| `inline` | 行内元素，宽高不可设 |
| `inline-block` | 行内块，可设宽高且并排 |
| `none` | 不生成盒子，从渲染树移除 |
| `flex` | 弹性容器 |
| `grid` | 网格容器 |
| `flow-root` | 触发 BFC 且无副作用（推荐替代 `overflow: hidden`） |
| `contents` | 元素自身不生成盒子，子元素「提升」到父级 |
| `table` / `table-cell` | 表格布局，`table-cell` 可做垂直居中、等高 |
| `list-item` | 生成列表项（带标记） |
| `inline-flex` / `inline-grid` | 行内的弹性 / 网格容器 |

```css
/* flow-root：清除浮动/阻止 margin 塌陷，且不会裁剪内容 */
.parent { display: flow-root; }
```

> `display: contents` 注意：元素自身盒子消失，可能破坏无障碍语义（如 `<ul>` 上的 `role`），需谨慎使用。

---

## 45. 多列等高布局

**方式一：Flex（推荐）**

```css
.row { display: flex; }
.col { flex: 1; }     /* 默认 align-items: stretch，自动等高 */
```

**方式二：Grid**

```css
.row { display: grid; grid-template-columns: repeat(3, 1fr); }
/* 单元格天然等高 */
```

**方式三：`table` / `table-cell`**

```css
.row { display: table; width: 100%; }
.col { display: table-cell; }   /* 天然等高 */
```

**方式四：负 margin + padding 补偿（伪等高）**

```css
.col {
  padding-bottom: 9999px;
  margin-bottom: -9999px;   /* 视觉上等高的经典 hack */
}
.row { overflow: hidden; }
```

---

## 46. 什么是 PostCSS？

**PostCSS** 是一个用 JS 编写的 **CSS 转换工具**（本质是 CSS 解析器 + 插件体系），本身几乎不做任何事，能力全部来自插件。

**常见插件：**

- `autoprefixer`：根据 `browserslist` **自动补全浏览器前缀**
- `postcss-pxtorem` / `postcss-px-to-viewport`：px 转 rem / vw，移动端适配
- `cssnano`：压缩、去重、优化
- `postcss-preset-env`：使用未来的 CSS 语法（类似 Babel）
- `stylelint`：CSS 代码检查

```js
// postcss.config.js
module.exports = {
  plugins: {
    autoprefixer: {},
    'postcss-pxtorem': { rootValue: 37.5, propList: ['*'] },
  },
};
```

**与预处理器（Less/SCSS）的区别：** 预处理器是**定义新语法**；PostCSS 更偏向**转换和增强原生 CSS**，二者可以配合使用。

---

## 47. CSS 工程化方案：BEM / CSS Modules / CSS-in-JS / 原子化 CSS

| 方案 | 核心思想 | 优点 | 缺点 |
| --- | --- | --- | --- |
| 全局 CSS | 传统写法 | 简单直接 | 命名冲突、全局污染、难维护 |
| **BEM** | 命名约定 `block__element--modifier` | 降低冲突、可读性好 | 全靠自觉，类名冗长 |
| **CSS Modules** | 构建时把类名哈希化，形成局部作用域 | 天然隔离、无冲突 | 需构建支持，动态样式不便 |
| **CSS-in-JS** | 在 JS 中写样式（styled-components / emotion） | 动态、作用域隔离、组件化 | 运行时开销、可读性/调试较差 |
| **原子化 CSS** | Tailwind 等，组合原子类 | 复用率高、产物可摇树、风格统一 | 类名冗长、有学习成本、HTML 可读性差 |

**BEM 示例：**

```html
<div class="card card--featured">
  <h2 class="card__title">标题</h2>
</div>
```

**原子化 CSS 示例（Tailwind）：**

```html
<div class="flex items-center gap-4 rounded-lg bg-purple-500 p-4 text-white">
  ...
</div>
```

> 选择建议：大型团队可用 CSS Modules 或原子化 CSS 保证可维护性；小型项目 BEM 即可。

---

## 48. CSS 选择器的匹配原理与性能优化

**关键原理：选择器是从右向左（从后往前）匹配的。**

```css
/* 差：先匹配文档中所有 a，再逐级向上查找祖先 */
.nav ul li a { color: red; }

/* 好：类选择器，浏览器直接定位，最快 */
.nav-link { color: red; }
```

**优化建议：**

- 少用标签选择器和通配符 `*`（匹配范围大）。
- 避免层级过深（`a > b > c > d > e`），既慢又难维护。
- 尽量用 `class` 选择器，ID 虽快但不利于复用。
- 避免滥用 `!important` 和超长选择器。
- 需要频繁匹配的场景（如 `:hover`）保持选择器简单。
- 大列表避免用 `*:nth-child()` 这类复杂伪类做高频重排。

> 补充：现代浏览器对选择器性能做了大量优化，**过度的选择器优化收益很小**，真正影响性能的是重排重绘、动画属性、资源体积等。

---

## 49. 毛玻璃效果 backdrop-filter

`backdrop-filter` 对元素**背后的区域**做滤镜处理（模糊、饱和度等），常用于毛玻璃 UI。

```css
.glass {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px) saturate(180%);
  -webkit-backdrop-filter: blur(10px);   /* Safari 需要 */
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
}
```

**与 `filter` 的区别：**

- `filter`：作用于**元素自身**（包括其内容）。
- `backdrop-filter`：作用于**元素背后的内容**。

**注意：** 需要元素本身有一定透明度（否则看不到背后内容）；性能开销较大，避免大面积/多层叠加使用。

---

## 50. CSS 性能优化有哪些手段？

**1）渲染层面**

- 减少重排重绘，动画优先用 `transform` / `opacity`（走合成层）。
- 用 `will-change` 提前告知浏览器（用后移除，避免滥用）。
- 用 `contain: layout / paint / content` 限制回流范围。
- 用 `content-visibility: auto` 延迟渲染屏幕外内容。

**2）加载层面**

- **关键 CSS 内联（Critical CSS）**，其余异步加载，避免 FOUC 和首屏阻塞。
- 避免 `@import`（串行加载），改用 `<link>`。
- 压缩 CSS（cssnano）、去除无用样式（PurgeCSS）。
- 合理拆分、按需加载，配合 HTTP 缓存 / CDN。

**3）代码层面**

- 减少选择器复杂度和嵌套层级。
- 用 CSS 变量、工具类减少重复。
- 避免巨大的 `box-shadow`、`filter`、`blur`。
- 用 `transform: translateZ(0)` 触发 GPU 加速时注意内存开销。

**4）字体与资源**

- 字体子集化、`font-display: swap` 避免文字不可见（FOIT）。
- 用 SVG / 字体图标替代位图图标。