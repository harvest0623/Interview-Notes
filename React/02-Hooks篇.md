# React 面试题 · 02 Hooks 篇

[← 返回总览](README.md)

> 内容：常用 Hook 用法、`useEffect` 依赖与闭包陷阱、自定义 Hook、Hooks 规则与原理（共 16 题）。

---

## 目录

1. [Hooks 是什么？解决了什么问题？](#1-hooks-是什么解决了什么问题)
2. [useState 的用法与注意事项](#2-usestate-的用法与注意事项)
3. [useEffect 是什么？执行时机](#3-useeffect-是什么执行时机)
4. [useEffect 与 useLayoutEffect 的区别？](#4-useeffect-与-uselayouteffect-的区别)
5. [useMemo 与 useCallback](#5-usememo-与-usecallback)
6. [useRef 与 forwardRef](#6-useref-与-forwardref)
7. [useContext](#7-usecontext)
8. [useEffect 的依赖数组与闭包陷阱](#8-useeffect-的依赖数组与闭包陷阱)
9. [useReducer](#9-usereducer)
10. [自定义 Hook](#10-自定义-hook)
11. [useTransition 与 useDeferredValue](#11-usetransition-与-usedeferredvalue)
12. [useId 与 useSyncExternalStore](#12-useid-与-usesyncexternalstore)
13. [React 18 与 19 新增的 Hooks](#13-react-18-与-19-新增的-hooks)
14. [为什么 Hooks 不能写在条件或循环里？](#14-为什么-hooks-不能写在条件或循环里)
15. [如何用 Hooks 模拟生命周期？](#15-如何用-hooks-模拟生命周期)
16. [useState 与 useRef 的区别？](#16-usestate-与-useref-的区别)

---

## 1. Hooks 是什么？解决了什么问题？

**Hooks** 是 React 16.8 引入的一类函数，让**函数组件**拥有状态、副作用等能力，无需编写类组件。

**解决了什么问题：**

| 问题 | 说明 |
| --- | --- |
| **逻辑复用困难** | 类组件靠 HOC / render props，易产生嵌套地狱；Hooks 用自定义 Hook 直接复用逻辑 |
| **复杂组件难维护** | 生命周期中混杂不相关逻辑（`componentDidMount` 里塞各种请求）；Hooks 按「关注点」拆分 |
| **`this` 心智负担** | 函数组件无需处理 `this` 绑定 |
| **编译优化** | 更利于 tree-shaking 与未来编译优化 |

```jsx
function Counter() {
  const [count, setCount] = useState(0);           // 状态
  useEffect(() => { document.title = count; }, [count]); // 副作用
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

**要点：** Hooks 不是「替代类」，而是让函数组件具备类的能力；逻辑复用从「包裹组件」（HOC）变为「组合函数」（自定义 Hook）。

---

## 2. useState 的用法与注意事项

```jsx
const [state, setState] = useState(initialValue);
// initialValue 可以是值，也可以是惰性初始化函数
const [data, setData] = useState(() => expensiveCompute());
```

**注意事项：**

**① 不可变更新**：对象/数组要创建新引用，否则不会触发渲染。

```jsx
// 错误
state.list.push(item);
setList(state.list);

// 正确
setList([...state.list, item]);
setList((prev) => [...prev, item]);
```

**② 函数式更新**：新值依赖旧值时用函数形式，避免闭包拿到旧值。

```jsx
setCount((c) => c + 1);
```

**③ 惰性初始化**：初始值计算昂贵时传入函数，仅在首次渲染执行一次。

```jsx
const [v] = useState(() => JSON.parse(localStorage.getItem('k')));
```

**④ 批量更新**：同一次事件中的多次 `setState` 会被合并（React 18 所有场景自动批量）。

**⑤ 更新的比较**：`useState` 用 `Object.is` 比较，**值相同则跳过渲染**。

```jsx
setX(1); // 若 x 已是 1，不触发渲染
setObj({}); // 新引用，即使内容一样也会触发渲染
```

**⑥ 不要直接改 state**（同 ①），且不要依赖 state 的即时值：

```jsx
const [count, setCount] = useState(0);
const onClick = () => {
  setCount(count + 1);
  console.log(count); // 仍是旧值
};
```

---

## 3. useEffect 是什么？执行时机

`useEffect` 用于在函数组件中处理**副作用**（请求、订阅、DOM 操作、日志等）。

```jsx
useEffect(() => {
  // 副作用逻辑
  return () => {
    // 清理逻辑（可选）
  };
}, [deps]);
```

**执行时机：** 在**渲染（render）提交到 DOM 之后**、浏览器绘制完成后**异步执行**（不阻塞绘制）。

**依赖数组决定执行频率：**

| 依赖 | 执行时机 |
| --- | --- |
| 不传（省略） | 每次渲染后都执行 |
| `[]` | 仅首次挂载后执行一次 |
| `[a, b]` | 首次 + `a` 或 `b` 变化时执行 |
| 返回清理函数 | 组件卸载时、或下次 effect 执行前调用 |

```jsx
useEffect(() => {
  const timer = setInterval(() => console.log('tick'), 1000);
  return () => clearInterval(timer);   // 卸载 / 依赖变化前清理
}, []);

useEffect(() => {
  fetch(`/api/user/${id}`).then(/* ... */);
}, [id]);  // id 变化时重新请求
```

**要点：**

- **清理函数**用于取消订阅、清除定时器、中止请求，防止内存泄漏与竞态。
- effect 的执行是**异步的**（在绘制之后），若需在绘制前同步执行用 `useLayoutEffect`。
- StrictMode（开发环境）下 effect 会**故意执行两次**（挂载 → 卸载 → 挂载），用于暴露清理不彻底的问题。

---

## 4. useEffect 与 useLayoutEffect 的区别？

| | `useEffect` | `useLayoutEffect` |
| --- | --- | --- |
| 执行时机 | DOM 更新后、**浏览器绘制之后**（异步） | DOM 更新后、**浏览器绘制之前**（同步） |
| 是否阻塞绘制 | 否 | **会阻塞绘制** |
| 适用 | 数据请求、订阅、日志等大多数副作用 | 需要**读取布局/同步改样式**的场景 |
| 性能 | 更好（不阻塞渲染） | 有阻塞风险，慎用 |

```jsx
// 需要测量 DOM 尺寸、避免闪烁时用 useLayoutEffect
useLayoutEffect(() => {
  const { height } = ref.current.getBoundingClientRect();
  setHeight(height);   // 在绘制前同步更新，避免闪一下
}, []);
```

**执行顺序：**

```
render → DOM 更新 → useLayoutEffect（同步）→ 浏览器绘制 → useEffect（异步）
```

**要点：**

- 默认优先用 `useEffect`；只有出现**视觉闪烁**或需要**同步读取布局**时才用 `useLayoutEffect`。
- **SSR 中 `useLayoutEffect` 会告警**（服务端没有布局），应改用 `useEffect` 或做环境判断。

---

## 5. useMemo 与 useCallback

| | `useMemo` | `useCallback` |
| --- | --- | --- |
| 缓存内容 | **计算结果（值）** | **函数本身** |
| 语法 | `useMemo(fn, deps)` | `useCallback(fn, deps)` |
| 关系 | —— | `useCallback(fn, deps)` ≈ `useMemo(() => fn, deps)` |

```jsx
// useMemo：缓存昂贵的计算结果
const sorted = useMemo(() => list.slice().sort(cmp), [list]);

// useCallback：缓存函数引用
const handleClick = useCallback(() => {
  setCount((c) => c + 1);
}, []);
```

**使用场景：**

- **昂贵计算**：大数组排序/过滤、复杂派生数据。
- **保持引用稳定**：把函数/对象传给 `React.memo` 子组件，避免因引用变化导致的无效重渲染。
- **作为其他 Hook 的依赖**：避免 effect 因函数引用变化而反复执行。

**不要滥用：**

- 缓存本身有开销（分配 + 依赖比较），简单计算包 `useMemo` 反而更慢。
- **依赖数组写错**会导致用了过期值（stale）——这是常见 bug 来源。
- React 官方立场：`useMemo`/`useCallback` 是**性能优化手段**，不是语义保证，不应依赖它「一定缓存」。

---

## 6. useRef 与 forwardRef

**`useRef`**：返回一个在组件生命周期内**稳定的**可变对象 `{ current: T }`，修改 `.current` **不触发渲染**。

```jsx
const ref = useRef(0);
ref.current += 1;   // 不触发渲染

const domRef = useRef(null);
useEffect(() => { domRef.current.focus(); }, []);
return <input ref={domRef} />;
```

**常见用途：**

- 访问 DOM 节点。
- 保存定时器 ID、上一次的值、是否首次渲染等**跨渲染的可变值**。

```jsx
// 保存「上一次」的值
const prevCount = useRef();
useEffect(() => { prevCount.current = count; }, [count]);
```

**`forwardRef`**：把父组件传入的 `ref` **转发**到子组件内部的 DOM 或组件上（函数组件默认不能接收 `ref`）。

```jsx
const MyInput = React.forwardRef((props, ref) => (
  <input ref={ref} {...props} />
));

// 父组件
const ref = useRef(null);
<MyInput ref={ref} />;
```

**`useImperativeHandle`**：配合 `forwardRef`，只向父组件暴露**指定的方法**，而非整个 DOM。

```jsx
const MyInput = forwardRef((props, ref) => {
  const inputRef = useRef(null);
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus(),
    clear: () => (inputRef.current.value = ''),
  }));
  return <input ref={inputRef} />;
});
```

> React 19 起，`ref` 可作为普通 prop 直接传递，`forwardRef` 不再是必须。

---

## 7. useContext

**`useContext`** 用于订阅 Context，**跨层级**读取共享数据，避免逐层透传 props（prop drilling）。

```jsx
const ThemeContext = React.createContext('light'); // 默认值

// 顶层提供
function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Toolbar />
    </ThemeContext.Provider>
  );
}

// 任意层级消费
function Button() {
  const theme = useContext(ThemeContext);
  return <button className={theme}>btn</button>;
}
```

**要点与坑：**

- **Provider 的 `value` 变化**会导致**所有消费该 Context 的组件重渲染**，即使它们只用了 value 的一部分。
- 优化方式：拆分多个 Context、用 `useMemo` 稳定 `value` 引用、把 value 拆成 `{state, dispatch}` 两部分。

```jsx
// 优化：稳定 value 引用
const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);
<ThemeContext.Provider value={value}>...</ThemeContext.Provider>
```

- 只在**低频、全局**的数据（主题、语言、登录态）上使用；高频更新数据用状态管理库更合适。
- Context 是「依赖注入」而非「状态管理」，状态仍需 `useState`/`useReducer` 维护。

---

## 8. useEffect 的依赖数组与闭包陷阱

**核心问题：** effect（及事件回调）会**捕获**定义时的变量，形成闭包；若依赖数组不写全，就会一直读到**旧值（stale closure）**。

```jsx
// 陷阱：定时器只打印 0，因为 count 被闭包捕获
const [count, setCount] = useState(0);
useEffect(() => {
  const timer = setInterval(() => console.log(count), 1000); // 永远是 0
  return () => clearInterval(timer);
}, []);   // 依赖写空，count 不会更新
```

**解决方式：**

**① 补全依赖：**

```jsx
useEffect(() => {
  const timer = setInterval(() => console.log(count), 1000);
  return () => clearInterval(timer);
}, [count]);   // count 变化时重建定时器
```

**② 用函数式更新（对 `setState`）：**

```jsx
useEffect(() => {
  const timer = setInterval(() => setCount((c) => c + 1), 1000);
  return () => clearInterval(timer);
}, []);   // 无需依赖 count
```

**③ 用 `useRef` 保存最新值：**

```jsx
const countRef = useRef(count);
useEffect(() => { countRef.current = count; }, [count]);

useEffect(() => {
  const timer = setInterval(() => console.log(countRef.current), 1000);
  return () => clearInterval(timer);
}, []);
```

**④ 用 `useEvent`/`useLatest` 思路封装**（社区方案，React 19 有 `useEffectEvent` 实验特性）。

**依赖数组规则：**

- **必须包含** effect 中使用的**所有**参与响应的 props/state/函数。
- 用 `eslint-plugin-react-hooks` 的 `exhaustive-deps` 规则自动检查。
- 依赖是**浅比较**：对象/函数每次渲染都是新引用，会导致 effect 频繁执行 → 用 `useMemo`/`useCallback` 稳定引用。
- 依赖数组长度必须保持不变（不能条件性传入）。

---

## 9. useReducer

`useReducer` 是 `useState` 的替代方案，适合**状态逻辑复杂、状态间有关联**的场景。

```jsx
const initialState = { count: 0 };

function reducer(state, action) {
  switch (action.type) {
    case 'increment': return { count: state.count + 1 };
    case 'decrement': return { count: state.count - 1 };
    case 'reset': return initialState;
    default: return state;
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <>
      <p>{state.count}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
    </>
  );
}
```

**`useState` vs `useReducer`：**

| | `useState` | `useReducer` |
| --- | --- | --- |
| 适合 | 简单、独立的状态 | 复杂、多字段、有联动的状态 |
| 更新方式 | 直接设值 | `dispatch(action)` |
| 逻辑位置 | 分散在事件处理函数 | 集中在 `reducer` |
| 可测试性 | 一般 | **好**（纯函数，易单测） |
| 传参 | 无需 | 可把 `dispatch` 通过 Context 下发，避免层层传回调 |

**要点：**

- `reducer` 必须是**纯函数**（不可有副作用），返回新对象。
- `dispatch` 引用稳定，可作为依赖或通过 Context 下发。
- 配合 `useContext` 可实现轻量的全局状态管理（`useReducer + Context`）。

---

## 10. 自定义 Hook

**自定义 Hook** 是名字以 `use` 开头的函数，用于**复用组件间的有状态逻辑**。

```jsx
// useToggle
function useToggle(initial = false) {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return [value, toggle];
}

// useFetch
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };   // 防止竞态
  }, [url]);

  return { data, loading, error };
}
```

**要点：**

- 必须以 `use` 开头（React 与 ESLint 靠命名识别）。
- 内部可以调用其他 Hook；本质是**逻辑复用**，不是 UI 复用。
- **两个组件用同一个自定义 Hook，状态相互独立**（每次调用都是新的 state）。
- 抽取原则：**关注点**拆分为独立 Hook（如 `useWindowSize`、`useDebounce`、`useLocalStorage`）。

---

## 11. useTransition 与 useDeferredValue

两者用于把**非紧急更新**标记为「可中断」，保持 UI 响应（React 18 并发特性）。

**`useTransition`**：把某次更新标记为过渡更新，返回 `isPending` 与 `startTransition`。

```jsx
function Search() {
  const [input, setInput] = useState('');
  const [list, setList] = useState([]);
  const [isPending, startTransition] = useTransition();

  const onChange = (e) => {
    setInput(e.target.value);            // 紧急：输入框立即响应
    startTransition(() => {
      setList(filterBigList(e.target.value)); // 非紧急：可被打断
    });
  };

  return (
    <>
      <input value={input} onChange={onChange} />
      {isPending && <Spinner />}
      <List data={list} />
    </>
  );
}
```

**`useDeferredValue`**：返回一个「延迟版本」的值，让依赖它的组件稍后更新。

```jsx
function Search({ query }) {
  const deferredQuery = useDeferredValue(query);
  // deferredQuery 落后于 query，避免大列表同步阻塞输入
  return <BigList query={deferredQuery} />;
}
```

| | `useTransition` | `useDeferredValue` |
| --- | --- | --- |
| 控制对象 | 更新动作 | 值 |
| 是否有 `isPending` | 有 | 无（可自行比较新旧值） |
| 适用 | 自己触发的更新 | 来自 props 的值 |

**要点：** 过度使用会增加复杂度；仅当**大数据量渲染拖慢输入**等场景才需要。

---

## 12. useId 与 useSyncExternalStore

**`useId`**：生成在**服务端与客户端一致**的唯一 ID，主要解决 SSR 中 ID 不匹配（hydration mismatch）问题。

```jsx
function Input() {
  const id = useId();
  return (
    <>
      <label htmlFor={id}>姓名</label>
      <input id={id} />
    </>
  );
}
```

> 注意：`useId` **不是**用来生成列表 `key` 的（列表 key 应来自数据）。

**`useSyncExternalStore`**：订阅**外部数据源**（非 React 状态），并保证在并发渲染下与外部存储同步。

```jsx
const isOnline = useSyncExternalStore(
  (callback) => {
    window.addEventListener('online', callback);
    window.addEventListener('offline', callback);
    return () => {
      window.removeEventListener('online', callback);
      window.removeEventListener('offline', callback);
    };
  },
  () => navigator.onLine,      // 客户端快照
  () => true                   // 服务端快照
);
```

**用途：** 状态管理库（Redux、Zustand）内部用它订阅 store；也可订阅 `window` 尺寸、媒体查询、localStorage 等。

---

## 13. React 18 与 19 新增的 Hooks

**React 18 新增：**

| Hook | 作用 |
| --- | --- |
| `useTransition` | 标记非紧急更新 |
| `useDeferredValue` | 延迟某个值的更新 |
| `useId` | 生成 SSR 一致的唯一 ID |
| `useSyncExternalStore` | 订阅外部数据源 |
| `useInsertionEffect` | 在 DOM 变更前插入样式（供 CSS-in-JS 使用） |

**React 19 新增 / 变化：**

| 特性 | 说明 |
| --- | --- |
| `useActionState` | 管理表单 action 状态（替代手写 pending/error） |
| `useFormStatus` | 读取父级表单的提交状态 |
| `useOptimistic` | 乐观更新（提交前先展示预期结果） |
| `use` | 在组件中读取 Promise / Context（可条件调用） |
| `ref` 作为 prop | 函数组件可直接接收 `ref`，无需 `forwardRef` |
| 文档元数据 | 直接在组件里写 `<title>`、`<meta>` |
| `useEffectEvent`（实验） | 在 effect 中访问最新值而不加入依赖 |

```jsx
// React 19：表单 action
function Form() {
  const [error, submitAction, isPending] = useActionState(
    async (prev, formData) => {
      const res = await save(formData);
      if (!res.ok) return '保存失败';
      return null;
    },
    null
  );
  return (
    <form action={submitAction}>
      <input name="name" />
      <button disabled={isPending}>提交</button>
      {error && <p>{error}</p>}
    </form>
  );
}
```

---

## 14. 为什么 Hooks 不能写在条件或循环里？

**根本原因：React 用「调用顺序」来关联每个 Hook 与其状态。** Hooks 的状态存储在一串**链表**中，每次渲染按**固定顺序**依次取值。

```jsx
function Component({ cond }) {
  const [a, setA] = useState('a');   // Hook 1
  if (cond) {
    const [b, setB] = useState('b'); // Hook 2（条件调用）
  }
  const [c, setC] = useState('c');   // 可能是 Hook 2 或 Hook 3
}
```

- 若 `cond` 从 `true` 变为 `false`，第二次渲染时 `useState('c')` 会**顶替**原先第二个 Hook 的位置，导致状态错乱。
- 同理，在**循环、嵌套函数、`try/catch`、提前 `return` 之后**调用 Hook 都会破坏顺序。

**规则：**

1. 只在**函数组件**或**自定义 Hook**的**顶层**调用。
2. 不在**条件、循环、嵌套函数**中调用。
3. 顺序在每次渲染中保持一致。

**需要条件逻辑时的正确写法：** 把条件**移到 Hook 内部**或**拆分子组件**。

```jsx
// 正确一：条件放进 Hook 内部
useEffect(() => {
  if (!cond) return;
  doSomething();
}, [cond]);

// 正确二：拆分子组件
{cond && <ChildWithHook />}
```

> 面试加分：能说出「Hooks 基于链表按顺序存储，因此顺序必须稳定」，并知道 `eslint-plugin-react-hooks` 会检查规则。

---

## 15. 如何用 Hooks 模拟生命周期？

| 生命周期 | Hooks 等价写法 |
| --- | --- |
| `componentDidMount` | `useEffect(() => {...}, [])` |
| `componentDidUpdate` | `useEffect(() => {...})`（无依赖）或 `[deps]` |
| `componentWillUnmount` | `useEffect(() => () => {...}, [])` 的清理函数 |
| `shouldComponentUpdate` | `React.memo` + 自定义比较、`useMemo` |
| `getSnapshotBeforeUpdate` | `useLayoutEffect` |

```jsx
// 挂载
useEffect(() => {
  console.log('mounted');
}, []);

// 更新（跳过首次）
const isFirst = useRef(true);
useEffect(() => {
  if (isFirst.current) { isFirst.current = false; return; }
  console.log('updated');
}, [dep]);

// 卸载
useEffect(() => {
  return () => console.log('unmounted');
}, []);

// 挂载 + 卸载（订阅模式）
useEffect(() => {
  const sub = subscribe(id);
  return () => sub.unsubscribe();
}, [id]);
```

**要点：**

- Hooks 心智模型不是「生命周期」，而是「**按依赖执行副作用**」；不要硬套生命周期思维。
- 「更新时不执行、只在挂载时执行」用 `useRef` 标记首次。
- effect 的清理会在**依赖变化**与**卸载**时都执行，比 `componentWillUnmount` 更细粒度。

---

## 16. useState 与 useRef 的区别？

| | `useState` | `useRef` |
| --- | --- | --- |
| 返回值 | `[值, 更新函数]` | `{ current }` 对象 |
| 修改是否触发渲染 | **触发** | **不触发** |
| 值的持久性 | 跨渲染保持 | 跨渲染保持（同一对象） |
| 渲染中的读取 | 本次渲染的**快照值** | **始终最新**（`.current`） |
| 适用 | 需要驱动 UI 的状态 | 不驱动 UI 的可变值、DOM 引用 |

```jsx
const [count, setCount] = useState(0);   // 变化 → 重渲染
const countRef = useRef(0);              // 变化 → 不重渲染

const handle = () => {
  setCount(count + 1);       // UI 更新
  countRef.current += 1;     // 仅记录，不更新 UI
};
```

**经典用途对比：保存定时器 ID、上一次的值、`isMounted` 标记 → 用 `useRef`；需要显示在界面上的数据 → 用 `useState`。**

**易错点：**

- `useRef` 在 `render` 期间**不应**修改（并发渲染下会出问题），应在事件或 effect 中修改。
- 想让 ref 的变化驱动 UI，说明**应该用 state**。
- 用 `useRef` 保存「上一次的值」需在 `useEffect` 中更新，而非直接在渲染体里改。