# Vue 常见面试题

> 本目录收录 Vue 相关的高频面试题及参考答案。由于内容较多，按主题拆分为若干分册，便于查阅与复习。默认以 **Vue 3** 为准，并在关键处标注 Vue 2 的差异。

---

## 目录

| 分册 | 内容 | 题量 |
| --- | --- | --- |
| [01 - 基础篇](01-基础篇.md) | Vue 特点、模板与指令、`v-if`/`v-show`、`v-for`、`computed`/`watch`、组件通信、插槽、生命周期 | 16 |
| [02 - 响应式与原理篇](02-响应式与原理篇.md) | 响应式原理、`Proxy` vs `defineProperty`、依赖收集、异步更新队列、`nextTick`、Diff 与编译优化 | 14 |
| [03 - 组合式 API 篇](03-组合式API篇.md) | `setup`、`ref`/`reactive`、`watch`/`watchEffect`、`provide`/`inject`、组合式函数、`script setup` | 14 |
| [04 - 生态与实战篇](04-生态与实战篇.md) | Vue Router、Pinia/Vuex、Axios 封装、样式方案、SSR/Nuxt、权限控制 | 14 |
| [05 - 性能优化与常见问题](05-性能优化与常见问题.md) | 渲染优化、首屏优化、虚拟列表、`keep-alive`、响应式陷阱、问题排查 | 12 |

---

## 学习路径建议

```
基础篇（模板语法与选项式写法）
   ↓
组合式 API 篇（Vue 3 主流写法）
   ↓
响应式与原理篇（Proxy / Diff / 编译优化，面试加分项）
   ↓
生态与实战篇（Router / Pinia / 工程化）
   ↓
性能优化与常见问题（实战追问）
```

---

## 高频必背 TOP 10

| 序号 | 题目 | 所在分册 |
| --- | --- | --- |
| 1 | Vue 2 与 Vue 3 的区别？ | [01 - 基础篇](01-基础篇.md#2-vue-2-与-vue-3-的区别) |
| 2 | `v-if` 与 `v-show` 的区别？ | [01 - 基础篇](01-基础篇.md#5-v-if-与-v-show-的区别) |
| 3 | `computed` 与 `watch` 的区别？ | [01-基础篇](01-基础篇.md#7-computed-与-watch-的区别) |
| 4 | Vue 响应式原理（Proxy vs defineProperty） | [02 - 响应式与原理篇](02-响应式与原理篇.md#1-vue-的响应式原理) |
| 5 | `ref` 与 `reactive` 的区别？ | [03 - 组合式 API 篇](03-组合式API篇.md#3-ref-与-reactive-的区别) |
| 6 | `nextTick` 是什么？原理？ | [01 - 基础篇](01-基础篇.md#16-nexttick-是什么) |
| 7 | `v-for` 中 `key` 的作用？ | [01 - 基础篇](01-基础篇.md#6-v-for-与-key-的作用) |
| 8 | Vue 的 Diff 算法 | [02 - 响应式与原理篇](02-响应式与原理篇.md#9-虚拟-dom-与-diff-算法) |
| 9 | `Pinia` 与 `Vuex` 的区别？ | [04 - 生态与实战篇](04-生态与实战篇.md#6-pinia-与-vuex-的对比) |
| 10 | `watch` 与 `watchEffect` 的区别？ | [03 - 组合式 API 篇](03-组合式API篇.md#6-watch-与-watcheffect) |

---

## 核心速查表

**组件通信**

```
父 → 子：props
子 → 父：emit 事件
双向：v-model
跨层级：provide / inject
任意组件：Pinia / 事件总线（已不推荐）
插槽内容：slot
访问实例：ref / $refs / defineExpose
```

**响应式 API（Vue 3）**

```
ref / reactive      创建响应式
toRef / toRefs      解构保持响应式
computed            派生状态（有缓存）
watch / watchEffect 侦听副作用
shallowRef / shallowReactive  浅层响应式（性能）
markRaw / toRaw     跳过代理 / 取原始对象
```

**常见易错点**

```
1. 解构 reactive 会丢失响应式 → 用 toRefs
2. v-for 与 v-if 不要同用一个元素
3. ref 在 setup 中必须 .value
4. 直接改数组下标 / length 在 Vue2 不响应（需 splice / $set）
5. watch 默认浅层，对象内部变化需 deep
```