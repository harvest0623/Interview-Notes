# Vue 面试题 · 03 组合式 API 篇

[← 返回总览](README.md)

> 内容：组合式 API 与选项式对比、`setup`、`ref`/`reactive`、`toRef`/`toRefs`、`computed`、`watch`/`watchEffect`、`provide`/`inject`、组合式函数、`script setup`、编译宏（共 14 题）。

---

## 目录

1. [什么是组合式 API？与选项式 API 的区别？](#1-什么是组合式-api与选项式-api-的区别)
2. [setup 的执行时机与参数](#2-setup-的执行时机与参数)
3. [ref 与 reactive 的区别？](#3-ref-与-reactive-的区别)
4. [toRef 与 toRefs](#4-toref-与-torefs)
5. [computed 在组合式 API 中的用法](#5-computed-在组合式-api-中的用法)
6. [watch 与 watchEffect](#6-watch-与-watcheffect)
7. [生命周期钩子在 setup 中的写法](#7-生命周期钩子在-setup-中的写法)
8. [provide 与 inject](#8-provide-与-inject)
9. [组合式函数（自定义 Hook）](#9-组合式函数自定义-hook)
10. [script setup 语法糖](#10-script-setup-语法糖)
11. [编译宏：defineProps / defineEmits / defineExpose](#11-编译宏defineprops--defineemits--defineexpose)
12. [模板 ref 与组件实例访问](#12-模板-ref-与组件实例访问)
13. [mixins 与组合式函数的对比](#13-mixins-与组合式函数的对比)
14. [Vue 3 中为什么要用 shallowRef / markRaw？](#14-vue-3-中为什么要用-shallowref--markraw)

---

## 1. 什么是组合式 API？与选项式 API 的区别？

**选项式 API（Options API）**：按**选项类型**组织代码（`data`、`methods`、`computed`、`watch`、生命周期）。

**组合式 API（Composition API）**：按**逻辑关注点**组织代码，把一件事的相关逻辑写在一起。

```vue
<!-- 选项式：同一个功能的逻辑被拆散在多个选项里 -->
<script>
export default {
  data() { return { count: 0, keyword: '' }; },
  computed: { double() { return this.count * 2; } },
  methods: { inc() { this.count++; }, search() {} },
  watch: { keyword() {} },
  mounted() { this.search(); },
};
</script>
```

```vue
<!-- 组合式：同一个功能的逻辑聚在一起 -->
<script setup>
import { ref, computed, watch, onMounted } from 'vue';

// —— 计数器功能 ——
const count = ref(0);
const double = computed(() => count.value * 2);
const inc = () => count.value++;

// —— 搜索功能 ——
const keyword = ref('');
watch(keyword, () => {});
onMounted(() => {});
</script>
```

| | 选项式 API | 组合式 API |
| --- | --- | --- |
| 组织方式 | 按选项类型 | 按逻辑关注点 |
| 逻辑复用 | mixins（命名冲突、来源不清） | **组合式函数**（来源清晰、无冲突） |
| 类型推导 | 较弱 | **对 TS 友好** |
| 可读性（小项目） | 直观 | 稍分散 |
| 可读性（大项目） | 逻辑分散难维护 | **聚合并可抽取** |
| 能否混用 | —— | 可以（同一组件可共存） |

**要点：** 组合式 API **不是替代**选项式，而是提供更强的**逻辑复用与组织能力**，大型项目与 TS 项目优势明显；小项目用选项式也完全合理。

---

## 2. setup 的执行时机与参数

**执行时机：** `setup` 在组件**实例创建之前、`beforeCreate` 之前**执行，因此在 `setup` 中**拿不到 `this`**。

**参数：** `setup(props, context)`

```js
export default {
  props: { title: String },
  emits: ['change'],
  setup(props, context) {
    // props：响应式对象（只读，不要解构，会失去响应式）
    console.log(props.title);

    // context：包含 attrs / slots / emit / expose
    const { attrs, slots, emit, expose } = context;

    emit('change', 1);
    return { /* 暴露给模板 */ };
  },
};
```

| 参数 | 内容 | 注意 |
| --- | --- | --- |
| `props` | 父组件传入的 props | **响应式但只读**，解构会失去响应式（用 `toRefs`） |
| `attrs` | 未声明为 props 的属性（含 `class`/`style`/事件） | 非响应式（Vue 3.5+ 改为响应式） |
| `slots` | 插槽内容 | 函数形式 |
| `emit` | 触发事件 | 等价于 `$emit` |
| `expose` | 暴露给父组件的方法 | 配合 `ref` 访问 |

**要点：**

- `setup` **必须同步返回**一个对象（`<script setup>` 下会自动返回，无需手写）。
- 在 `setup` 中**不能使用 `this`**。
- 顶层 `await`（`<script setup>` 中）会让组件变成 **async 组件**，需配合 `<Suspense>`。
- `setup` 只执行**一次**（组件实例创建时），不是每次渲染都执行。

---

## 3. ref 与 reactive 的区别？

| | `ref` | `reactive` |
| --- | --- | --- |
| 可接受类型 | **任意类型**（基本类型 + 对象） | **仅对象/数组/Map/Set** |
| 访问方式 | `.value`（模板中自动解包） | 直接访问属性 |
| 整体替换 | **支持**（`x.value = {...}`） | 不支持（会断开响应式） |
| 解构 | 保持响应式（本身是 ref） | **丢失响应式**（需 `toRefs`） |
| 深层响应式 | 默认是（对象会转为 reactive） | 是 |
| 类型标注 | `Ref<T>` | `T` |
| 推荐场景 | 基本类型、需要整体替换、跨函数传参 | 一组相关的、不需整体替换的状态 |

```js
import { ref, reactive } from 'vue';

// ref：基本类型
const count = ref(0);
count.value++;
console.log(count.value);

// ref 也能包对象
const user = ref({ name: 'Tom' });
user.value.name = 'Jerry';

// reactive：对象
const state = reactive({ count: 0, list: [] });
state.count++;

// reactive 解构会丢响应式
const { count: c } = state;                  // ❌ 普通值
const { count: c2 } = toRefs(state);         // ✅ 保持响应式
```

**选择建议：**

```
基本类型                → ref
需要整体替换的对象       → ref
一组相关、结构固定的状态 → reactive
需要在函数间传递/返回    → ref
```

**要点：**

- `ref(obj)` 的内部实现是 `reactive({ value: obj })`，因此 `ref` 包对象也是深层响应式。
- `<script setup>` 中返回 `ref` 时，模板会**自动解包**。
- **在 JS 中必须写 `.value`**，这是最高频的初学错误。

---

## 4. toRef 与 toRefs

**作用：** 把 `reactive` 对象的属性转成 `ref`，**解构后仍保持响应式**。

```js
import { reactive, toRef, toRefs } from 'vue';

const state = reactive({ count: 0, name: 'Tom' });

// toRef：单个属性
const count = toRef(state, 'count');
count.value++;            // 会同步修改 state.count
console.log(state.count); // 1

// toRefs：所有属性
const { count: c, name } = toRefs(state);
c.value++;                // 依然响应式

// 常见用途：在组合式函数中返回
function useCounter() {
  const state = reactive({ count: 0 });
  return toRefs(state);   // 调用方解构后仍响应式
}
const { count: counter } = useCounter();
```

**对比：**

| | `toRef(obj, key)` | `toRefs(obj)` |
| --- | --- | --- |
| 返回 | 单个 `ref` | 由 `ref` 组成的对象 |
| 场景 | 只关心某个属性 | 解构整个对象 |

**注意：**

- `toRef`/`toRefs` 生成的 ref 与源对象**双向同步**（改 ref 会改源对象）。
- 若源对象的**属性本身不存在**，`toRef` 会返回一个「可写但没有源」的 ref，修改它不会影响源对象。
- 替代方案：直接对 `ref` 解构（`ref` 包对象时解构 `.value` 才需要）。

```js
// ref 包对象时的解构也要注意
const state = ref({ count: 0 });
const { count } = state.value;   // ❌ 失去响应式
const count2 = computed(() => state.value.count); // ✅
```

---

## 5. computed 在组合式 API 中的用法

```js
import { ref, computed } from 'vue';

const firstName = ref('张');
const lastName = ref('三');

// 只读
const fullName = computed(() => firstName.value + lastName.value);
console.log(fullName.value);   // '张三'

// 可写（get/set）
const fullName2 = computed({
  get: () => `${firstName.value}${lastName.value}`,
  set: (val) => {
    firstName.value = val.slice(0, 1);
    lastName.value = val.slice(1);
  },
});
fullName2.value = '李四';
```

**特点：**

- **有缓存**：依赖不变则直接返回缓存值，不重新计算。
- **惰性求值**：首次被访问时才计算，之后依赖变化才重算。
- 返回的是一个 **`ComputedRef`**，在 JS 中需 `.value`，模板中自动解包。
- 计算属性是**副作用无关**的纯计算，不要在内部做异步/修改其他状态。

**与 `watch` 的分工：**

```js
// 派生展示数据 → computed
const total = computed(() => list.value.reduce((s, i) => s + i.price, 0));

// 数据变化后做副作用（请求/存储）→ watch
watch(total, (val) => { saveToServer(val); });
```

**要点：** `computed` 的缓存依赖**响应式依赖的追踪**；若依赖了非响应式数据，缓存不会更新。

---

## 6. watch 与 watchEffect

| | `watch` | `watchEffect` |
| --- | --- | --- |
| 依赖来源 | **显式指定**（ref / getter / 数组） | **自动收集**（执行时访问到的响应式数据） |
| 是否立即执行 | 默认否（`immediate: true` 才执行） | **立即执行一次** |
| 能否拿到旧值 | 能（`oldValue`） | 不能 |
| 是否惰性 | 是（依赖变化才执行） | 否（立即执行 + 依赖变化执行） |
| 适用 | 需要明确知道「哪个数据变了、从什么变成什么」 | 依赖较多、逻辑里自然会用到 |

```js
import { ref, reactive, watch, watchEffect } from 'vue';

const count = ref(0);
const state = reactive({ name: 'Tom' });

// watch：显式依赖
watch(count, (newVal, oldVal) => {
  console.log(`${oldVal} → ${newVal}`);
}, { immediate: true });

// watch 多个源
watch([count, () => state.name], ([c, n], [oldC, oldN]) => {});

// watch 侦听 getter（可精确侦听深层属性，避免 deep 开销）
watch(() => state.name, (val) => console.log(val));

// watchEffect：自动收集依赖，立即执行
const stop = watchEffect((onCleanup) => {
  console.log(count.value);            // 自动追踪 count
  const timer = setTimeout(() => {}, 1000);
  onCleanup(() => clearTimeout(timer)); // 清理
});

// 停止侦听
stop();
```

**`watch` 的常用选项：**

```js
watch(source, cb, {
  immediate: true,   // 立即执行一次
  deep: true,        // 深度侦听
  flush: 'post',     // 'pre'（默认，DOM 更新前）| 'post'（DOM 更新后）| 'sync'
  once: true,        // Vue 3.4+：只触发一次
});
```

**要点：**

- `watchEffect` **无法拿到旧值**，因为它在依赖变化后重新执行整个函数。
- 侦听 `reactive` 对象**默认 deep**；侦听 `ref` 对象需显式 `deep: true`。
- 需要**读取更新后的 DOM** 时用 `flush: 'post'`。
- 精确侦听深层属性优先用 getter：`() => obj.a.b`，比 `deep: true` 更省性能。
- **组件卸载时会自动停止**在 `setup` 中创建的侦听器；异步创建的需手动 `stop()`。

---

## 7. 生命周期钩子在 setup 中的写法

组合式 API 中，生命周期钩子以 `onXxx` 形式从 `vue` 导入，在 `setup` 中调用。

```vue
<script setup>
import {
  onBeforeMount, onMounted,
  onBeforeUpdate, onUpdated,
  onBeforeUnmount, onUnmounted,
  onActivated, onDeactivated,
  onErrorCaptured,
} from 'vue';

onMounted(() => console.log('挂载完成'));
onUnmounted(() => console.log('卸载完成'));
</script>
```

**对应关系：**

| 选项式 | 组合式 |
| --- | --- |
| `beforeCreate` / `created` | 无（`setup` 本身即此时机） |
| `beforeMount` | `onBeforeMount` |
| `mounted` | `onMounted` |
| `beforeUpdate` | `onBeforeUpdate` |
| `updated` | `onUpdated` |
| `beforeUnmount`（Vue 2 `beforeDestroy`） | `onBeforeUnmount` |
| `unmounted`（Vue 2 `destroyed`） | `onUnmounted` |
| `activated` | `onActivated` |
| `deactivated` | `onDeactivated` |
| `errorCaptured` | `onErrorCaptured` |

**要点：**

- `onXxx` 必须**同步调用**在 `setup` 中（不能在 `setTimeout`、`await` 之后调用，否则关联不到当前实例）。
- 同一个钩子可注册**多次**，按注册顺序执行。
- `beforeCreate`/`created` 的逻辑直接写在 `setup` 顶层即可。

---

## 8. provide 与 inject

**作用：** 跨层级传递数据（**依赖注入**），避免层层透传 props。

```vue
<!-- 祖先组件 -->
<script setup>
import { ref, provide, readonly } from 'vue';

const theme = ref('light');
const toggleTheme = () => (theme.value = theme.value === 'light' ? 'dark' : 'light');

provide('theme', readonly(theme));   // 用 readonly 防止后代直接修改
provide('toggleTheme', toggleTheme);
</script>
```

```vue
<!-- 任意后代组件 -->
<script setup>
import { inject } from 'vue';

const theme = inject('theme', 'light');       // 第二个参数为默认值
const toggleTheme = inject('toggleTheme', () => {});
</script>
```

**要点：**

- `provide` 的值若为 `ref`/`reactive`，注入后**保持响应式**；若为普通值则不是响应式。
- 用 **`readonly`** 包裹，避免后代随意修改祖先状态（单向数据流）。
- 建议**注入 key 用 `Symbol`** 且集中导出，避免字符串冲突：

```js
// keys.js
export const ThemeKey = Symbol('theme');

// 祖先
provide(ThemeKey, theme);
// 后代
const theme = inject(ThemeKey);
```

- 可配合 `app.provide()` 做**应用级**全局注入。
- **不要滥用**：适合主题、i18n、表单上下文等；业务状态共享优先用 **Pinia**。

---

## 9. 组合式函数（自定义 Hook）

**组合式函数（Composable）**：以 `use` 开头的函数，封装并复用**有状态逻辑**。

```js
// useCounter.js
import { ref, computed } from 'vue';

export function useCounter(initial = 0) {
  const count = ref(initial);
  const double = computed(() => count.value * 2);
  const increment = () => count.value++;
  const reset = () => (count.value = initial);

  return { count, double, increment, reset };
}
```

```js
// useMouse.js
import { ref, onMounted, onUnmounted } from 'vue';

export function useMouse() {
  const x = ref(0);
  const y = ref(0);

  const update = (e) => { x.value = e.pageX; y.value = e.pageY; };

  onMounted(() => window.addEventListener('mousemove', update));
  onUnmounted(() => window.removeEventListener('mousemove', update)); // 必须在组合式函数内清理

  return { x, y };
}
```

```vue
<script setup>
const { x, y } = useMouse();
const { count, increment } = useCounter(10);
</script>
```

**规范：**

- 命名以 **`use`** 开头（Vue 与 ESLint 靠此识别）。
- 在**同步**阶段调用，内部可安全使用生命周期钩子（`onMounted` 等）与 `onCleanup`。
- **返回 `ref` 而非 `reactive`**（解构保持响应式，调用方处理更灵活）。
- **副作用要自己清理**（事件监听、定时器）。
- 每个组件调用组合式函数都会得到**独立的状态**。

**要点：** 组合式函数是 Vue 3 的**逻辑复用首选方案**，取代了 mixins，来源清晰、无命名冲突、类型友好。

---

## 10. script setup 语法糖

`<script setup>` 是**编译期语法糖**，用于在单文件组件中使用组合式 API。

```vue
<script setup>
import { ref } from 'vue';
import MyComponent from './MyComponent.vue';

// 顶层变量自动暴露给模板
const msg = ref('hello');
const count = ref(0);
function increment() { count.value++; }
</script>

<template>
  <MyComponent />
  <p>{{ msg }}</p>
  <button @click="increment">{{ count }}</button>
</template>
```

**相比普通 `setup()` 的优势：**

| 特性 | 说明 |
| --- | --- |
| 更少样板 | 无需 `export default`、无需 `return` 暴露变量 |
| 自动注册组件 | 导入的组件可直接在模板使用 |
| 类型友好 | 顶层变量自动推导类型，对 TS 友好 |
| 编译期优化 | 编译为更高效的渲染函数 |
| 顶层 await | 可直接 `await`（组件变 async，需 `<Suspense>`） |

**注意：**

- 组件**默认关闭**，需 `<script setup>` 才能用；`<script>` 与 `<script setup>` 可**共存**（普通 `<script>` 用于导出 `export`、声明 `name` 等）。
- **不能**用 `this`。
- 顶层绑定会自动暴露给模板，但**不自动暴露给父组件**（需 `defineExpose`）。

```vue
<script>
export default { name: 'MyComponent' };   // 与 setup 共存
</script>
<script setup>
const msg = 'hi';
</script>
```

---

## 11. 编译宏：defineProps / defineEmits / defineExpose

**编译宏**是在 `<script setup>` 中**无需导入**即可使用的特殊函数，编译时会被处理掉。

**① `defineProps`：声明 props**

```vue
<script setup lang="ts">
// 运行时声明
const props = defineProps({
  title: { type: String, required: true },
  count: { type: Number, default: 0 },
});

// TS 类型声明（更推荐）
const props2 = defineProps<{
  title: string;
  count?: number;
}>();

// 结合默认值（Vue 3.5+ 响应式解构）
const { title, count = 0 } = defineProps<{ title: string; count?: number }>();
</script>
```

**② `defineEmits`：声明事件**

```vue
<script setup lang="ts">
const emit = defineEmits<{
  (e: 'change', value: number): void;
  (e: 'submit'): void;
}>();

emit('change', 1);
</script>
```

**③ `defineExpose`：暴露给父组件**

```vue
<script setup>
import { ref } from 'vue';
const inputRef = ref(null);

function focus() { inputRef.value.focus(); }
defineExpose({ focus });   // 父组件通过 ref 调用
</script>
```

**④ 其他宏：**

| 宏 | 作用 |
| --- | --- |
| `defineOptions` | 声明组件选项（`name`、`inheritAttrs` 等） |
| `defineSlots` | 声明插槽类型（TS） |
| `defineModel` | 简化 `v-model`（Vue 3.4+） |
| `withDefaults` | 为 TS 类型 props 提供默认值（3.5 前） |

```vue
<script setup>
// defineModel：自动处理 v-model
const model = defineModel();          // 等价于 modelValue + update:modelValue
model.value = 'new';
</script>
```

**要点：**

- 编译宏**不需要 import**，`defineProps`/`defineEmits` 是编译器识别的关键字。
- `defineProps` 返回的值是**只读**的，不要直接修改；需要本地派生用 `computed`。
- **不要解构 `defineProps` 的返回值**（Vue 3.5 前会失去响应式）；3.5+ 支持响应式解构。
- 事件声明建议用**数组或 TS 类型**，便于校验。

---

## 12. 模板 ref 与组件实例访问

**访问 DOM 元素：**

```vue
<script setup>
import { ref, onMounted } from 'vue';

const inputRef = ref(null);   // 变量名必须与 ref 属性名一致

onMounted(() => {
  inputRef.value.focus();     // 挂载后才能访问
});
</script>

<template>
  <input ref="inputRef" />
</template>
```

**访问子组件实例：**

```vue
<!-- 子组件 Child.vue -->
<script setup>
function focus() { /* ... */ }
defineExpose({ focus });      // 必须暴露，父组件才能调用
</script>
```

```vue
<!-- 父组件 -->
<script setup>
import { ref, onMounted } from 'vue';
import Child from './Child.vue';

const childRef = ref(null);
onMounted(() => childRef.value.focus());
</script>

<template>
  <Child ref="childRef" />
</template>
```

**`v-for` 中的 ref 数组：**

```vue
<script setup>
import { ref } from 'vue';
const itemRefs = ref([]);     // Vue 3.5+ 会自动收集为数组
</script>

<template>
  <li v-for="item in list" :key="item.id" ref="itemRefs">{{ item.name }}</li>
</template>
```

**函数式 ref（Vue 3.5+）：**

```vue
<input :ref="(el) => { /* el 为元素或组件实例 */ }" />
```

**要点：**

- 模板 ref 在 **`onMounted` 之后**才有值；`v-if` 为假时是 `null`。
- 子组件默认**封闭**，必须 `defineExpose` 才能被父组件访问。
- `<script setup>` 中 ref 变量名需与模板 `ref` 属性值**一致**。
- 优先用 props/emit 通信，**ref 直接调子组件方法**只用于命令式场景（如聚焦、滚动）。

---

## 13. mixins 与组合式函数的对比

| | `mixins` | 组合式函数 |
| --- | --- | --- |
| 定义 | 选项对象的复用 | 函数的逻辑复用 |
| 数据来源 | **不清晰**（不知道来自哪个 mixin） | **清晰**（显式导入与调用） |
| 命名冲突 | 会冲突且难以排查 | 无冲突（返回变量由调用方命名） |
| 隐含依赖 | 组件与 mixin 隐式耦合 | 依赖显式（参数传入） |
| 类型支持 | 差 | **好** |
| 状态隔离 | 每个组件独立 | 每个组件独立 |
| 推荐度 | Vue 3 中**不推荐** | **推荐** |

```js
// mixin 的问题：变量来源不明、可能重名
export default {
  mixins: [counterMixin, loggerMixin],   // count 来自哪个？
  data() { return { count: 0 }; },       // 与 mixin 冲突
};
```

```js
// 组合式函数：来源清晰、可组合
import { useCounter } from './useCounter';
import { useLogger } from './useLogger';

const { count, increment } = useCounter();
const { log } = useLogger();
```

**要点：**

- Vue 3 **仍支持** mixins（兼容），但官方推荐用**组合式函数**。
- 组合式函数的本质是「**把逻辑写进函数，靠闭包维护状态**」，天然支持组合与类型推导。
- 全局 mixin 会影响所有组件，风险更高，应避免。

---

## 14. Vue 3 中为什么要用 shallowRef / markRaw？

**默认的 `ref`/`reactive` 是深层响应式**，会对嵌套对象递归代理，这在某些场景下**开销大甚至有害**。

**`shallowRef` / `shallowReactive`：只做**浅层**响应式（不递归代理嵌套对象）。

```js
import { shallowRef, shallowReactive, triggerRef } from 'vue';

// 只有 .value 整体替换才触发更新，内部属性变化不触发
const state = shallowRef({ count: 0 });
state.value.count++;        // 不触发更新
state.value = { count: 1 }; // 触发更新
triggerRef(state);          // 手动强制触发

const s2 = shallowReactive({ nested: { a: 1 } });
s2.nested.a = 2;            // 不触发
s2.nested = { a: 3 };       // 触发
```

**`markRaw`：标记对象**永不**转为响应式代理。

```js
import { markRaw, reactive } from 'vue';

const state = reactive({
  // 第三方库实例、图表实例、大对象等不需要响应式
  chart: markRaw(new Chart()),
  map: markRaw(new Map()),
});
```

**典型使用场景：**

| 场景 | 方案 | 原因 |
| --- | --- | --- |
| 动态组件对象（`<component :is>`） | `shallowRef` / `markRaw` | 避免组件对象被深度代理 |
| 第三方库实例（ECharts、地图） | `markRaw` | 实例内部结构复杂，代理会出问题 |
| 大列表/大对象，只关心整体替换 | `shallowRef` | 省去递归代理开销 |
| 只想监听整体变化 | `shallowReactive` | 减少无效依赖收集 |
| 只读常量数据 | `markRaw` | 没有响应式需求 |

```vue
<script setup>
import { shallowRef, markRaw } from 'vue';
import TabA from './TabA.vue';

const current = shallowRef(TabA);       // 动态组件用 shallowRef
const chart = markRaw(echarts.init(el)); // 图表实例用 markRaw
</script>
```

**要点：**

- 深层响应式有**性能成本**（递归代理 + 依赖收集）；不必要时用浅层 API。
- 第三方实例、DOM 节点、组件对象等**不应被代理**，否则可能出现诡异报错。
- `triggerRef` 可手动触发 `shallowRef` 的更新。