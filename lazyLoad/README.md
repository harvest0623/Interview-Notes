# 图片懒加载（Lazy Load）

> **题目：当页面中存在大量图片时，如何只加载「当前视口内」的图片，从而提升首屏加载速度？**

懒加载（Lazy Load）指的是：图片**只有当即将进入可视区域时才真正加载**，其余图片先占位、不发起请求。这样可以减少首屏请求数量、加快首屏渲染、节省流量。

---

## 目录

1. [核心原理](#1-核心原理)
2. [方案一：滚动监听 + getBoundingClientRect](#2-方案一滚动监听--getboundingclientrect)
3. [方案二：IntersectionObserver](#3-方案二intersectionobserver)
4. [方案三：原生 loading="lazy"](#4-方案三原生-loadinglazy)
5. [三种方案对比](#5-三种方案对比)
6. [难点问答](#6-难点问答)
7. [目录文件说明](#7-目录文件说明)

---

## 1. 核心原理

1. 真实图片地址**不放在 `src`**，而是放在自定义属性里（如 `data-origin`），此时浏览器不会发起请求。
2. 监听滚动（或使用观察器），判断图片是否进入视口。
3. 进入视口后，把 `data-origin` 赋给 `src`，浏览器才开始加载图片。
4. 加载过的图片打上标记，避免重复处理。

```html
<img lazyload="true" data-origin="https://example.com/a.jpg" alt="">
```

> 注意：`src=""` 在某些浏览器里仍会请求当前页面地址，实践中建议用 1×1 的占位图，或不写 `src` 只靠 `data-origin`。

---

## 2. 方案一：滚动监听 + getBoundingClientRect

**思路**：监听 `scroll`，用 `getBoundingClientRect()` 拿到图片相对视口的位置，判断是否露出。

```js
// 视口高度
const visibleHeight = window.innerHeight;

function lazyLoad() {
    const imgs = document.querySelectorAll('img[lazyload]');
    imgs.forEach((img) => {
        const rect = img.getBoundingClientRect();
        // 图片顶部进入视口 且 底部还没完全滚出去 → 可见
        if (rect.top < visibleHeight && rect.bottom >= 0) {
            img.src = img.dataset.origin;      // 触发真实加载
            img.removeAttribute('lazyload');   // 移除标记，避免重复处理
        }
    });
}

lazyLoad(); // 首屏先执行一次
// 滚动时执行，用节流降低触发频率
window.addEventListener('scroll', throttle(lazyLoad, 200));

// 节流：规定时间内只执行一次
function throttle(fn, wait) {
    let preTime = Date.now();
    return () => {
        const nowTime = Date.now();
        if (nowTime - preTime >= wait) {
            preTime = nowTime;
            fn();
        }
    };
}
```

**关键 API**

- `window.innerHeight` / `document.documentElement.clientHeight`：获取视口高度。
- `getBoundingClientRect()`：返回元素相对**视口**的 `top/right/bottom/left`，滚动时会实时变化。
- 节流（throttle）：滚动事件触发极其频繁，必须节流，否则性能很差。

**缺点**：`scroll` 事件高频触发，即使节流也有计算开销；需要手动处理节流/防抖。

---

## 3. 方案二：IntersectionObserver

**思路**：交给浏览器异步观察元素与视口的交叉状态，无需监听 `scroll`，性能更好。

```js
const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {          // 进入视口
          entry.target.src = entry.target.dataset.origin;
          entry.target.removeAttribute('lazyload');
          io.unobserve(entry.target);        // 加载完就停止观察，节省性能
      }
    });
});

document.querySelectorAll('img[lazyload]').forEach((img) => io.observe(img));
```

**构造函数第二个参数（可选配置）**

```js
new IntersectionObserver(callback, {
    root: null,          // 观察的根元素，null 表示视口
    rootMargin: '0px 0px 200px 0px', // 提前 200px 触发（预加载）
    threshold: 0.1       // 元素可见比例达到 10% 时触发回调
});
```

**回调参数 `entries` 常用属性**

| 属性 | 含义 |
| --- | --- |
| `isIntersecting` | 是否与根元素相交（进入视口） |
| `intersectionRatio` | 相交比例 0~1 |
| `target` | 被观察的元素 |

---

## 4. 方案三：原生 loading="lazy"

浏览器已原生支持图片懒加载，零 JS 成本：

```html
<img src="a.jpg" loading="lazy" alt="">
```

- `loading` 取值：`lazy`（懒加载）/ `eager`（立即加载，默认）/ `auto`。
- 适合大多数场景，但对「触发时机」可控性差，兼容性不如前两种方案（旧浏览器不支持）。
- 同样支持 `iframe loading="lazy"`。

---

## 5. 三种方案对比

| 方案 | 性能 | 触发时机可控 | 兼容性 | 代码量 |
| --- | --- | --- | --- | --- |
| 滚动监听 + 节流 | 一般（依赖 scroll 计算） | 高 | 最好 | 中 |
| IntersectionObserver | 好（浏览器异步回调） | 高（支持 rootMargin） | 较好（IE 不支持） | 少 |
| 原生 `loading="lazy"` | 好 | 低 | 现代浏览器 | 最少 |

> 面试回答顺序建议：先说原理，再说三种实现，最后补充「优先用 IntersectionObserver，简单场景可用原生属性」。

---

## 6. 难点问答

**Q：为什么 `scroll` 要加节流？**
滚动事件每帧都可能触发，频繁执行 `getBoundingClientRect` 会强制回流（layout），导致卡顿。节流可以限制执行频率。

**Q：`rect.top < window.innerHeight` 就够了，为什么还要 `rect.bottom >= 0`？**
只判断 `top < 视口高度` 会把**已经滚上去、离开视口**的图片也判定为可见（它们的 `top` 是负数，同样满足 `< visibleHeight`）。加上 `bottom >= 0` 才能排除「已滚出上方」的图片。

**Q：`IntersectionObserver` 为什么要在加载后 `unobserve`？**
图片只需加载一次，加载完成后继续观察没有意义，及时取消观察可以减少浏览器的计算开销。

**Q：如何让图片提前一点加载，避免「滚到了才加载」的空白？**
用 `rootMargin`，例如 `'0px 0px 300px 0px'`，让元素距离视口还有 300px 时就提前触发。

---

## 7. 目录文件说明

| 文件 | 说明 |
| --- | --- |
| [lazy/index.html](lazy/index.html) | 方案一：滚动监听 + `getBoundingClientRect` + 节流 |
| [observe/index.html](observe/index.html) | 方案二：`IntersectionObserver` 实现图片懒加载 |
| [observe/demo.html](observe/demo.html) | `IntersectionObserver` 基础用法：观察元素进入视口 |
| [observe/test.html](observe/test.html) | 方案二带详细注释的演示版本 |

> 用浏览器打开上述 HTML 文件并滚动页面即可观察效果。