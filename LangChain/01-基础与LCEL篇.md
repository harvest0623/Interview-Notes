# LangChain 面试题 · 01 基础与 LCEL 篇

[← 返回总览](README.md)

> 内容：LangChain 是什么、整体架构与包结构、与 LangGraph 的关系、什么是 LCEL、Runnable 接口与核心方法、管道操作符原理、invoke/stream/batch、同步与异步接口、RunnablePassthrough 与 RunnableLambda、RunnableParallel 与 RunnableBranch、RunnableConfig、Runnable 的组合与串联、LCEL 流式输出机制、核心组件、常见链模式（共 15 题）。

---

## 目录

1. [LangChain 是什么？它解决了什么问题](#1-langchain-是什么它解决了什么问题)
2. [LangChain 的整体架构与包结构](#2-langchain-的整体架构与包结构)
3. [LangChain 与 LangGraph 的关系](#3-langchain-与-langgraph-的关系)
4. [什么是 LCEL](#4-什么是-lcel)
5. [Runnable 接口与核心方法](#5-runnable-接口与核心方法)
6. [LCEL 管道操作符的工作原理](#6-lcel-管道操作符的工作原理)
7. [invoke、stream、batch 的用法与区别](#7-invoke-stream-batch-的用法与区别)
8. [同步与异步接口的区别](#8-同步与异步接口的区别)
9. [RunnablePassthrough 与 RunnableLambda](#9-runnablepassthrough-与-runnablelambda)
10. [RunnableParallel 与 RunnableBranch](#10-runnableparallel-与-runnablebranch)
11. [如何通过 RunnableConfig 传递配置](#11-如何通过-runnableconfig-传递配置)
12. [如何组合与串联多个 Runnable](#12-如何组合与串联多个-runnable)
13. [LCEL 的流式输出机制](#13-lcel-的流式输出机制)
14. [LangChain 的核心组件有哪些](#14-langchain-的核心组件有哪些)
15. [常见链模式与适用场景](#15-常见链模式与适用场景)

---

## 1. LangChain 是什么？它解决了什么问题

**LangChain** 是一个用于构建 **LLM（大语言模型）应用**的开源开发框架。它的核心价值不在于「帮你调用一次模型」，而在于**把模型调用与外部数据、外部能力、多步骤流程编排成可复用、可观测、可上线的应用**。

一句话概括：**LangChain 之于 LLM 应用，相当于 Spring 之于 Java Web、Django 之于 Python Web——它是一层「抽象 + 编排」的脚手架。**

**它解决的六类问题：**

| 问题 | 不用 LangChain 的写法 | LangChain 的方案 |
| --- | --- | --- |
| 模型接口千差万别 | 每换一家模型就改一遍 SDK 调用 | 统一 `BaseChatModel` 接口，一行换模型 |
| 提示词靠字符串拼接 | `f"请把{text}翻译成{lang}"` 到处散落 | `PromptTemplate` / `ChatPromptTemplate` 模板化 |
| 输出要自己解析 | 手工 `json.loads`、正则截取 | `OutputParser` / `with_structured_output` |
| 多步骤流程难维护 | 一堆 `if/else` + 中间变量 | LCEL 用 `\|` 声明式组合 |
| 外部能力接入无标准 | 自己封装向量库、检索、工具调用 | `Retriever` / `Tool` / `VectorStore` 抽象 |
| 生产化需求（流式/并发/重试/追踪） | 每处自己造轮子 | Runnable 内建 `stream` / `batch` / `with_retry` / Callbacks |

**它的分层定位（很重要，面试常追问）：**

1. **抽象层（langchain-core）**：定义 `Runnable`、`BaseMessage`、`BaseChatModel`、`BaseRetriever` 等接口。
2. **集成层（partner 包 / langchain-community）**：把 OpenAI、Anthropic、Milvus、Chroma 等第三方实现接上这些接口。
3. **编排层（LCEL / LangGraph）**：把组件拼成链与智能体。
4. **可观测层（Callbacks / LangSmith）**：记录每一步的输入输出。

**它「不」是什么：**

- 不是模型本身，它不训练模型，只是调用模型。
- 不是向量数据库，只是给向量库提供统一封装。
- 不是必须的重型框架——简单场景可以只用 `langchain-core` 的几个类，甚至只写原生 SDK。

```python
# langchain 0.3.x：一个最小的 LCEL 链，把「提示 -> 模型 -> 解析」串起来
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一名资深工程师，回答要简洁、分点。"),
    ("human", "{question}"),
])
model = ChatOpenAI(model="gpt-4o-mini", temperature=0)  # 需要环境变量 OPENAI_API_KEY
parser = StrOutputParser()

chain = prompt | model | parser          # 声明式组合，此时并未执行
print(chain.invoke({"question": "什么是 LCEL？"}))
```

**面试怎么答：** 先给定义（LLM 应用开发框架），再按「统一抽象 → 模板化提示 → 结构化输出 → 声明式编排 → 外部能力集成 → 可观测与生产化」六条线讲，最后补一句「核心是 `Runnable` 抽象与 LCEL 组合能力」。

**易错点：**

- 不要把 LangChain 说成「大模型」或「Agent 框架」——它是**应用层框架**，Agent 只是它的一个上层用法。
- 简单的一次性调用不必上框架，LangChain 的价值在**多步骤、多组件、需可观测**的场景才体现。

---

## 2. LangChain 的整体架构与包结构

从 0.1 到 0.3，LangChain 完成了一次重要的**包拆分（modularization）**：把「抽象接口」「第三方集成」「主包」解耦，目的是解决**依赖地狱**（装一个向量库要拖一堆无关依赖）与**版本兼容**问题。

**0.3.x 的包结构：**

| 包 | 职责 | 稳定性 | 常见导入 |
| --- | --- | --- | --- |
| `langchain-core` | 所有**抽象接口**：Runnable、Prompt、Message、OutputParser、Retriever、Tool | 最稳定（独立发版） | `langchain_core.prompts` |
| `langchain` | **元包**，聚合常用组件（Chain、Agent 编排入口），自身代码越来越少 | 稳定 | `langchain.chains` |
| `langchain-community` | **社区集成**：各种 Loader、VectorStore、Tool、第三方模型 | 质量参差 | `langchain_community.vectorstores` |
| `langchain-openai` | OpenAI 官方 partner 包 | 稳定 | `langchain_openai.ChatOpenAI` |
| `langchain-anthropic` | Anthropic 官方 partner 包 | 稳定 | `langchain_anthropic.ChatAnthropic` |
| `langchain-text-splitters` | 文本分割器（从 community 抽出） | 稳定 | `langchain_text_splitters` |
| `langchain-classic` | **承接旧版 Chain / Memory**（1.0 起正式拆分出去） | 仅兼容用 | `langchain_classic.chains` |
| `langgraph` | **有状态编排**：State / Node / Edge / Checkpointer | 稳定 | `langgraph.graph.StateGraph` |
| `langserve` | 把 Runnable 暴露成 REST 服务 | 稳定 | `langserve.add_routes` |
| `langsmith` | 追踪与评估平台 | 稳定 | 环境变量开启 |

```bash
# 最小安装：只装抽象与所需集成，而不是一次性全装
pip install langchain-core langchain-openai

# 需要社区集成（各种 loader、向量库）时再加
pip install langchain-community langchain-text-splitters
```

```python
# 依赖方向：上层 -> 下层，core 永远在最底层
# langchain_openai.ChatOpenAI 继承自 langchain_core.language_models.BaseChatModel
from langchain_core.language_models import BaseChatModel
from langchain_openai import ChatOpenAI

model: BaseChatModel = ChatOpenAI(model="gpt-4o-mini")
print(isinstance(model, BaseChatModel))  # True，所以它能直接接入 LCEL
```

**为什么拆分（面试重点）：**

1. **减少依赖冲突**：主包曾经把所有集成塞在一起，装 `chromadb` 会连带一堆包。
2. **明确稳定性承诺**：`langchain-core` 的接口尽量不破坏兼容；第三方集成可独立升级。
3. **partner 包优先**：官方维护的模型集成（OpenAI / Anthropic）比社区包质量更高、更新更快。

> 版本演进提示：LangChain 已在 2025 年发布 **1.0**，主包进一步瘦身，**旧版 Chain / Memory 明确迁往 `langchain-classic`**，Agent 统一为 `langchain.agents.create_agent`（0.3.x 时代则是 `langgraph.prebuilt.create_react_agent`）。本分册以 **0.3.x** 为默认背景写作，涉及 1.0 差异处会单独标注。

**易错点：**

- `from langchain.llms import OpenAI` 这类旧路径在 0.3 起大多已移除，正确写法是 `from langchain_openai import ChatOpenAI`。
- 不要一次性 `pip install langchain` 就以为装齐了——partner 包（如 `langchain-openai`）需要单独安装。
- 版本混装（`langchain-core` 与 partner 包版本不匹配）是报错高发区，务必按官方约束对齐 `0.3.*`。

---

## 3. LangChain 与 LangGraph 的关系

**核心区别一句话：LangChain（LCEL）负责「组件与线性编排」，LangGraph 负责「有状态、可循环、可持久化的图编排」。**

- **LangChain** 提供模型、提示、解析器、检索器、工具这些**积木**，以及用 `|` 串起积木的 LCEL。
- **LangGraph** 是建立在 LangChain 之上的**编排运行时**：把流程建模成「状态（State）+ 节点（Node）+ 边（Edge）」，支持**循环、条件分支、持久化（Checkpointer）、人类介入（interrupt）**。Agent 本质就是一个带循环的图。

| 维度 | LangChain / LCEL | LangGraph |
| --- | --- | --- |
| 编排形态 | 有向**无环**链（DAG，线性为主） | 有向**有环**图，可循环 |
| 状态管理 | 输入输出逐级透传，无全局状态 | 显式 `State`（TypedDict / Pydantic + Reducer） |
| 条件分支 | `RunnableBranch`（静态分支） | 条件边（运行时动态决定下一步） |
| 循环 / 迭代 | 不支持原生循环 | 原生支持（ReAct 循环即在此） |
| 持久化 | 无（需外挂 Memory / 数据库） | 内建 Checkpointer（SQLite / Postgres） |
| 人类介入 | 需自行实现 | 内建 `interrupt` / 恢复机制 |
| 多 Agent 协作 | 需手工拼装 | 天然支持（子图、Supervisor 模式） |
| 适用场景 | 线性链路：RAG、翻译、分类 | Agent、多轮决策、长流程工作流 |

```python
# 用 LCEL 做「顺序链」：简单、直接
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

translate = ChatPromptTemplate.from_template("把下面内容翻译成英文：{text}") | ChatOpenAI(model="gpt-4o-mini") | StrOutputParser()
print(translate.invoke({"text": "你好"}))
```

```python
# 等价的 LangGraph 写法（0.3.x）：显式建状态、建节点、连边
from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

class State(TypedDict):
    text: str
    result: str

model = ChatOpenAI(model="gpt-4o-mini")
prompt = ChatPromptTemplate.from_template("把下面内容翻译成英文：{text}")

def translate_node(state: State) -> dict:
    msg = (prompt | model).invoke({"text": state["text"]})
    return {"result": msg.content}

builder = StateGraph(State)
builder.add_node("translate", translate_node)
builder.add_edge(START, "translate")
builder.add_edge("translate", END)
graph = builder.compile()

print(graph.invoke({"text": "你好", "result": ""})["result"])
```

> Agent 演进路线：`initialize_agent` + `AgentExecutor`（已弃用）→ `langgraph.prebuilt.create_react_agent`（0.3.x 推荐）→ `langchain.agents.create_agent`（1.0 推荐）。三者都是「图 + 循环」封装程度不同。

**易错点：**

- 不要以为「用了 LangGraph 就不能用 LCEL」——**LangGraph 的节点内部通常就是一条 LCEL 链**，二者是叠加而非替代关系。
- `RunnableBranch` 只能做静态分支，真正的「根据上一步结果反复决策」必须用 LangGraph 的条件边。

---

## 4. 什么是 LCEL

**LCEL（LangChain Expression Language，LangChain 表达式语言）** 是用**声明式**方式组合 Runnable 的一套写法，最典型的特征就是用管道符 `|` 把组件串起来：

```python
chain = prompt | model | parser
```

**它带来了什么（面试必答的六点）：**

1. **统一接口**：任意组件只要实现 `Runnable`，就能被组合（提示、模型、解析器、检索器、函数皆可）。
2. **流式（streaming）**：链首尾自动支持逐块输出，无需为每步单独写流式逻辑。
3. **异步（async）**：`ainvoke` / `astream` / `abatch` 与同步版本一一对应。
4. **并行（parallel）**：`RunnableParallel`、`batch` 自动并发。
5. **重试与回退**：`with_retry()`、`with_fallbacks()` 声明式开关。
6. **可观测**：`with_config()`、Callbacks、`astream_events` 可拿到每一步的中间状态。

| 维度 | 旧写法（`LLMChain` 等） | LCEL |
| --- | --- | --- |
| 组合方式 | 类的构造函数传参 `LLMChain(llm=..., prompt=...)` | `\|` 声明式组合 |
| 中间结果 | 藏在 `dict` 里，`chain.run()` 拿最终字符串 | Runnable 之间逐级透传，`stream`/`batch` 全链路可用 |
| 流式 | 需 `LLMChain(streaming=True)` 等特判 | `chain.stream()` 天生可用 |
| 异步 | 部分支持，参差不齐 | 每个 Runnable 都有 `ainvoke/astream` |
| 并行 | 需自行多线程 | `RunnableParallel` / `batch` 内建 |
| 可组合性 | 差（Chain 只接受特定参数） | 强（链本身就是 Runnable，可再被组合） |
| 状态 | 0.1 起弃用，1.0 移入 `langchain-classic` | **当前推荐** |

```python
# 0.3.x 推荐写法
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

prompt = ChatPromptTemplate.from_template("用一句话解释：{term}")
model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

chain = prompt | model | StrOutputParser()
print(chain.invoke({"term": "向量数据库"}))

# 旧写法（已弃用，仅作对比；1.0 起需 from langchain_classic.chains import LLMChain）
# from langchain.chains import LLMChain
# chain = LLMChain(llm=model, prompt=prompt)
# print(chain.run(term="向量数据库"))
```

**易错点：**

- `chain = prompt | model | parser` 只是**构造**，不执行；执行要靠 `invoke` / `stream` / `batch`。
- LCEL 不是一种新语言或 DSL 文件格式，它就是**基于 Python 运算符重载的普通表达式**（核心是 `Runnable.__or__`）。
- 只有实现了 Runnable 接口的对象才能参与 `|`，纯字符串/字典会被自动强制转换（见第 6 题）。

---

## 5. Runnable 接口与核心方法

**Runnable** 是 LangChain 的**统一可执行协议**（一个抽象基类 `langchain_core.runnables.Runnable`）。任何实现了它的对象都具备同一套调用方法与组合能力。它用泛型表示：`Runnable[Input, Output]`。

**执行类方法（同步 / 异步一一对应）：**

| 方法 | 异步版 | 作用 | 返回 |
| --- | --- | --- | --- |
| `invoke(input, config)` | `ainvoke` | 单个输入，返回最终结果 | `Output` |
| `stream(input, config)` | `astream` | 单个输入，逐块产出 | `Iterator[Output]` |
| `batch(inputs, config)` | `abatch` | 多个输入并行处理，**结果顺序与输入一致** | `list[Output]` |
| `batch_as_completed` | `abatch_as_completed` | 多输入并行，**谁先完成先返回** | `Iterator[(index, Output)]` |
| — | `astream_events(v2)` | 细粒度事件流（每个组件、每个 token） | 事件 dict |
| `astream_log` | — | 记录每步中间状态（旧 API，推荐迁到 `astream_events`） | `RunLogPatch` |

**组合 / 装饰类方法：**

| 方法 | 作用 |
| --- | --- |
| `__or__` / `pipe` | 与另一个 Runnable 串联成 `RunnableSequence` |
| `bind(**kwargs)` | 预绑定固定参数（如 `model.bind(temperature=0)`、`bind_tools`） |
| `with_config(config)` | 固定一份配置（tags、metadata、callbacks） |
| `with_types(input_type, output_type)` | 声明类型，便于 IDE 与校验 |
| `with_retry(...)` | 失败重试（`stop_after_attempt`、指数退避） |
| `with_fallbacks([...])` | 主链路失败时依次尝试备选 Runnable |
| `with_listeners(...)` | 挂载生命周期回调 |
| `assign(**kwargs)` | 在输入字典上追加字段（RunnablePassthrough 的能力） |
| `map()` | 把 Runnable 转成「对列表逐项处理」的版本 |
| `pick(keys)` | 从输出字典中挑出指定字段 |

```python
from langchain_core.runnables import RunnableLambda

# 任意函数都能被包装成 Runnable
add_one = RunnableLambda(lambda x: x + 1)
double = RunnableLambda(lambda x: x * 2)
chain = add_one | double

print(chain.invoke(1))              # 4  -> (1+1)*2
print(chain.batch([1, 2, 3]))       # [4, 6, 8]
print(list(chain.stream(1)))        # [4]，无中间步骤支持流式，一次性产出
print(chain.with_retry(stop_after_attempt=3).invoke(1))  # 失败自动重试最多 3 次
```

```python
# with_fallbacks：主模型挂了自动切备用模型
from langchain_openai import ChatOpenAI, ChatAnthropic  # 需各自 partner 包
primary = ChatOpenAI(model="gpt-4o-mini")
backup = ChatOpenAI(model="gpt-3.5-turbo")
robust = primary.with_fallbacks([backup])
```

**易错点：**

- `stream` 对「不支持流式的中间步骤」会退化为**一次性产出**（不是报错）；要逐 token 需要模型与解析器都支持。
- `batch` 默认用线程池并发，**同步版在 asyncio 事件循环里调用会阻塞**，异步环境应使用 `abatch`。
- `with_retry` / `with_fallbacks` 返回的是**新的 Runnable**，不会改变原对象。

---

## 6. LCEL 管道操作符的工作原理

`|` 的魔力来自 **Python 的运算符重载**：`Runnable` 实现了 `__or__`（以及 `__ror__`），所以 `a | b` 等同于调用 `a.__or__(b)`。

**执行链条：**

1. `a | b` 触发 `a.__or__(b)`。
2. 内部调用 `coerce_to_runnable(b)` 把 `b` **强制转换成 Runnable**：
   - 若 `b` 已是 Runnable → 直接用；
   - 若 `b` 是**可调用对象（函数/lambda）** → 包装成 `RunnableLambda`；
   - 若 `b` 是**字典**（值里含 Runnable） → 包装成 `RunnableParallel`。
3. 返回 `RunnableSequence(first=a, last=b)`，**此时不执行任何逻辑**。
4. 真正 `invoke` 时，输入依次流经各元素，前一个的输出作为后一个的输入。

| 写法 | 等价于 | 说明 |
| --- | --- | --- |
| `a \| b` | `a.__or__(b)` | 运算符重载，最常用 |
| `a.pipe(b)` | 同上 | 函数式写法，可读性略好 |
| `RunnableSequence(a, b)` | 同上 | 显式构造，便于类型标注 |
| `a \| func` | `a \| RunnableLambda(func)` | 函数被自动包装 |
| `a \| {"x": b}` | `a \| RunnableParallel(x=b)` | 字典被自动包装成并行 |

```python
from langchain_core.runnables import RunnableSequence, RunnableLambda, RunnableParallel
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

prompt = ChatPromptTemplate.from_template("写一句关于{topic}的标语")
model = ChatOpenAI(model="gpt-4o-mini")

# 下面三种写法完全等价
chain1 = prompt | model | RunnableLambda(lambda msg: msg.content)
chain2 = RunnableSequence(prompt, model, RunnableLambda(lambda msg: msg.content))

# 字典会自动被 coerce 成 RunnableParallel：并行跑两条支路
side = model | {"raw": RunnableLambda(lambda m: m.content), "len": RunnableLambda(lambda m: len(m.content))}
combined = prompt | side

# 查看组合后的执行图，验证顺序
chain1.get_graph().print_ascii()
```

> 关键理解：**`|` 是「组合」而非「执行」**。它把组件拼装成一张可复用的图，只有调用 `invoke/stream/batch` 时才真正按图跑数据。这也是 LCEL 能整体支持流式/异步/批量/追踪的根本原因。

**易错点：**

- `"字符串" | model` **不是** LCEL：字符串左侧不是 Runnable，这里触发的是 `str.__or__`，会报 `TypeError`（字符串没有对 Runnable 的 `__or__`）。
- `|` 两端的**数据契约必须对齐**：前一个输出是 `AIMessage`，后一个若期望 `str`，就要先接 `StrOutputParser()`。
- `chain.get_graph()` 只展示结构，不展示运行时的真实分支（`RunnableBranch` 会画成多个候选）。

---

## 7. invoke、stream、batch 的用法与区别

三者都是 Runnable 的**执行入口**，区别在于「一次处理几个输入」以及「一次性返回还是流式返回」。

| 维度 | `invoke` | `stream` | `batch` |
| --- | --- | --- | --- |
| 输入个数 | 单个 | 单个 | 多个（`list`） |
| 返回形态 | 完整结果（阻塞直到结束） | **迭代器**，逐块产出 | `list`，顺序与输入一致 |
| 首字节延迟 | 高（等全部生成完） | **低**（首个 token 即可返回） | 高 |
| 并发 | 无 | 无 | **有**（线程池并发） |
| 典型场景 | 一次性问答、离线任务 | 聊天前端打字机效果 | 批量分类、批量摘要 |
| 异步版 | `ainvoke` | `astream` | `abatch` |
| 出错策略 | 直接抛异常 | 抛异常 | `return_exceptions=True` 可收集异常而非中断 |

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

prompt = ChatPromptTemplate.from_template("用一句话解释：{term}")
chain = prompt | ChatOpenAI(model="gpt-4o-mini") | StrOutputParser()

# invoke：一次一个输入，拿到完整字符串
print(chain.invoke({"term": "RAG"}))

# stream：逐块拿到增量文本（打字机效果）
for chunk in chain.stream({"term": "RAG"}):
    print(chunk, end="", flush=True)

# batch：一次多个输入，内部并发，结果顺序与输入一致
results = chain.batch([
    {"term": "RAG"},
    {"term": "LCEL"},
    {"term": "向量数据库"},
])
print(results)
```

```python
# batch_as_completed：按完成顺序返回，适合「进度条 / 边完成边处理」
from langchain_core.runnables import RunnableLambda
import time

slow = RunnableLambda(lambda x: (time.sleep(x), x)[1])
for index, value in slow.batch_as_completed([2, 1, 3]):
    print("完成序号:", index, "值:", value)  # 先返回 index=1，再 index=0，最后 index=2
```

**易错点：**

- `stream` 返回的是**生成器**，不消费就不会执行；且**只有至少一处支持流式的组件**才会逐块产出，纯 `RunnableLambda` 步骤会整体产出。
- `batch` 的并发度可用 `config={"max_concurrency": 5}` 限制，否则可能瞬间打爆 API 限流。
- `batch` 里某一个输入报错会**中断整批**，需要容错时加 `return_exceptions=True`（结果中对应位置是异常对象）。

---

## 8. 同步与异步接口的区别

LangChain 的每个执行方法都有 **同步版** 与 **异步版**（`invoke/ainvoke`、`stream/astream`、`batch/abatch`、`batch_as_completed/abatch_as_completed`）。

| 维度 | 同步（`invoke` 等） | 异步（`ainvoke` 等） |
| --- | --- | --- |
| 实现方式 | 直接阻塞当前线程 | `async def` + `await`，基于 asyncio |
| 并发模型 | 需线程池（`batch` 内部用） | 单线程事件循环并发，开销小 |
| 适用环境 | 脚本、CLI、离线批处理 | Web 服务（FastAPI）、高并发网关 |
| 阻塞风险 | 会阻塞调用线程 | **不会阻塞事件循环** |
| 组合方式 | `chain.batch` | `asyncio.gather` / `chain.abatch` |
| 缓存 | 支持 | 支持 |

**最主要的原则：在异步环境（如 FastAPI 路由、asyncio 应用）里，一定要用 `ainvoke/astream`，混用同步 `invoke` 会阻塞整个事件循环。**

```python
import asyncio
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

prompt = ChatPromptTemplate.from_template("用一句话解释：{term}")
chain = prompt | ChatOpenAI(model="gpt-4o-mini") | StrOutputParser()

async def main():
    # 异步单次调用
    print(await chain.ainvoke({"term": "LCEL"}))

    # 异步并发：多个独立请求并行等待
    results = await asyncio.gather(
        chain.ainvoke({"term": "RAG"}),
        chain.ainvoke({"term": "Agent"}),
        chain.ainvoke({"term": "Embedding"}),
    )
    print(results)

    # 异步流式
    async for chunk in chain.astream({"term": "LangGraph"}):
        print(chunk, end="", flush=True)

asyncio.run(main())
```

```python
# 反例：在异步函数里调用同步 invoke
async def bad():
    chain.invoke({"term": "RAG"})   # 会阻塞事件循环，其他协程全部卡住
    # 正确：await chain.ainvoke({"term": "RAG"})
```

**易错点：**

- 在 Jupyter / 已有事件循环的环境里直接 `asyncio.run()` 会报 `RuntimeError: This event loop is already running`；应改用 `await`（Jupyter 支持顶层 await）或用 `nest_asyncio`。
- `astream` 必须用 `async for` 遍历，写成普通 `for` 会得到协程对象而非数据。
- 异步并发的数量要受 `max_concurrency` 约束，否则同样会触发限流。

---

## 9. RunnablePassthrough 与 RunnableLambda

两者都是「把非 Runnable 的东西接入 LCEL」的桥梁，但用途不同：

- **`RunnablePassthrough`**：**原样透传输入**（`invoke(x)` 返回 `x`），常用于「既要把原始输入继续往下传，又要同时算出派生字段」的场景。
- **`RunnableLambda`**：把一个**自定义函数**包装成 Runnable，便于插入任意处理逻辑。

| 维度 | `RunnablePassthrough` | `RunnableLambda` |
| --- | --- | --- |
| 作用 | 透传输入，不改数据 | 执行自定义函数，产出新数据 |
| 典型用法 | `{"question": RunnablePassthrough(), "context": retriever}` | `RunnableLambda(format_docs)` |
| 追加字段 | `RunnablePassthrough.assign(x=...)` | 通常配合字典使用 |
| 输入/输出 | 输入 == 输出 | 输出由函数决定 |
| 是否支持流式 | 支持（透传） | 支持，但函数内部若返回整体字符串则整体产出 |
| 异步 | 支持 | 若函数是 `async def`，则支持异步 |

```python
from langchain_core.runnables import RunnablePassthrough, RunnableLambda

# 1) 纯透传
print(RunnablePassthrough().invoke({"q": "hi"}))   # {'q': 'hi'}

# 2) assign：保留原输入，追加新字段（RAG 链中最常见的写法）
#    输入 {"question": "..."}，输出 {"question": "...", "context": "检索到的文档"}
fake_retriever = RunnableLambda(lambda q: f"关于「{q}」的检索片段...")

chain = RunnablePassthrough.assign(context=lambda x: fake_retriever.invoke(x["question"]))
print(chain.invoke({"question": "什么是 LCEL"}))

# 3) 组合进模板：把 question 和 context 都喂给提示
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

prompt = ChatPromptTemplate.from_messages([
    ("system", "只依据下面的资料回答：\n{context}"),
    ("human", "{question}"),
])
rag_chain = (
    RunnablePassthrough.assign(context=lambda x: fake_retriever.invoke(x["question"]))
    | prompt
    | ChatOpenAI(model="gpt-4o-mini")
    | StrOutputParser()
)
print(rag_chain.invoke({"question": "什么是 LCEL"}))
```

**易错点：**

- `RunnablePassthrough.assign(...)` 要求**输入是字典**；传入字符串会报错。
- `RunnableLambda` 里的函数若返回**另一个 Runnable**，会得到嵌套对象而非结果，要留意返回值类型。
- 传给 `RunnableLambda` 的函数若需要多参数，必须用 `**kwargs` 或先解包字典（Runnable 只接受单个输入）。

---

## 10. RunnableParallel 与 RunnableBranch

- **`RunnableParallel`**：让**多个 Runnable 并行执行同一个输入**，结果合并成字典返回。典型用途：同时「检索文档 + 保留原问题」、「跑两个模型做对比」。
- **`RunnableBranch`**：**条件路由**，根据输入选择走哪条分支（类似 `switch/if-else`），必须有默认分支。

| 维度 | `RunnableParallel` | `RunnableBranch` |
| --- | --- | --- |
| 语义 | 并行执行、结果合流 | 按条件选择一条分支 |
| 输入输出 | 同一输入 → 字典 | 输入 → 某条分支的输出 |
| 执行条数 | **全部**都执行 | 只执行**命中的一条** |
| 是否需要默认 | 不需要 | **必须提供默认分支** |
| 典型场景 | 多路召回、对比生成 | 按意图分派到不同链 |
| 简写形式 | 字典字面量 `{"a": ra, "b": rb}` | 无（必须显式构造） |

```python
from langchain_core.runnables import RunnableParallel, RunnableBranch, RunnableLambda, RunnablePassthrough
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# RunnableParallel：同一个输入并行跑两条链，结果合成字典
summary_chain = ChatPromptTemplate.from_template("用一句话总结：{text}") | model | StrOutputParser()
sentiment_chain = ChatPromptTemplate.from_template("判断情感（正向/负向）：{text}") | model | StrOutputParser()

parallel = RunnableParallel(summary=summary_chain, sentiment=sentiment_chain)
print(parallel.invoke({"text": "这个框架用起来太顺手了"}))

# 字典字面量等价写法（在 | 中被自动 coerce 成 RunnableParallel）
parallel2 = {"summary": summary_chain, "sentiment": sentiment_chain}

# RunnableBranch：按主题关键词路由
math_chain = ChatPromptTemplate.from_template("你是数学老师，解答：{question}") | model | StrOutputParser()
code_chain = ChatPromptTemplate.from_template("你是程序员，解答：{question}") | model | StrOutputParser()
default_chain = ChatPromptTemplate.from_template("通用助手，回答：{question}") | model | StrOutputParser()

router = RunnableBranch(
    (lambda x: any(k in x["question"] for k in ["方程", "求导", "积分"]), math_chain),
    (lambda x: any(k in x["question"] for k in ["代码", "报错", "函数"]), code_chain),
    default_chain,   # 默认分支，必填
)
print(router.invoke({"question": "Python 里怎么捕获异常"}))
```

**易错点：**

- `RunnableParallel` 的每个分支必须能接受**同一个输入**；如果某分支想要输入中的某个字段，用 `RunnableLambda(lambda x: x["field"])` 先取出来。
- `RunnableBranch` 的条件是**函数**（输入 → bool），不是 Runnable；条件函数不能有副作用。
- 忘记写默认分支会直接抛错；且分支顺序敏感，**第一个命中的条件生效**。

---

## 11. 如何通过 RunnableConfig 传递配置

**`RunnableConfig`** 是一个字典式配置对象，在 `invoke/stream/batch` 的 `config` 参数中传入，用于控制**追踪、并发、回调、可配置参数**。它可以逐层向下传递，并在子链中合并。

**常用键：**

| 键 | 作用 |
| --- | --- |
| `callbacks` | 挂回调处理器（日志、Token 统计、LangSmith） |
| `tags` | 给本次运行打标签，便于在 LangSmith 中筛选 |
| `metadata` | 附加元数据（用户 ID、会话 ID），用于追踪 |
| `run_name` | 覆盖本次运行的显示名 |
| `max_concurrency` | 限制并发（`batch` / `abatch`）数量 |
| `recursion_limit` | 限制图/链的递归次数（LangGraph、Agent 循环） |
| `configurable` | 运行时覆盖「可配置字段」（动态换模型、换温度等） |

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.callbacks import StdOutCallbackHandler
from langchain_openai import ChatOpenAI

chain = (
    ChatPromptTemplate.from_template("用一句话解释：{term}")
    | ChatOpenAI(model="gpt-4o-mini")
    | StrOutputParser()
)

config = {
    "tags": ["qa", "v2"],
    "metadata": {"user_id": "u-1001", "session_id": "s-abc"},
    "run_name": "explain_term",
    "callbacks": [StdOutCallbackHandler()],
    "max_concurrency": 4,
}
print(chain.invoke({"term": "LCEL"}, config=config))
```

```python
# configurable：把「模型」「温度」变成运行时可变，而不用重建链
from langchain_openai import ChatOpenAI
from langchain_core.runnables import ConfigurableField

model = ChatOpenAI(model="gpt-4o-mini", temperature=0).configurable_fields(
    temperature=ConfigurableField(id="temperature", name="采样温度")
)
# 默认走 temperature=0；运行时覆盖为 0.9
print(model.invoke("讲个冷笑话", config={"configurable": {"temperature": 0.9}}))

# 备选切换：一个链在不同场景用不同模型（如「便宜版 / 强力版」）
fast = ChatOpenAI(model="gpt-4o-mini")
strong = ChatOpenAI(model="gpt-4o")
switchable = fast.configurable_alternatives(
    ConfigurableField(id="model"), default_key="fast", strong=strong
)
print(switchable.invoke("分析这段代码", config={"configurable": {"model": "strong"}}))
```

**易错点：**

- `config` 是**第二个位置参数之外的关键字参数**：`chain.invoke(input, config=...)`，不是 `chain.invoke(input, ...)` 里的普通字典。
- `max_concurrency` 只在 `batch/abatch` 生效；单次 `invoke` 无意义。
- 想用 `configurable_fields` 必须显式在链/模型上调用 `.configurable_fields()` / `.configurable_alternatives()`，否则传了也没用。

---

## 12. 如何组合与串联多个 Runnable

LCEL 的组合能力围绕「**顺序、并行、条件、函数、输入扩增**」五种模式展开：

| 组合方式 | 语法 | 用途 |
| --- | --- | --- |
| 顺序串联 | `a \| b \| c` | 流水线：提示 → 模型 → 解析 |
| 显式顺序 | `RunnableSequence(a, b, c)` | 需要类型标注或动态拼装时 |
| 并行 | `RunnableParallel(x=a, y=b)` / `{"x": a, "y": b}` | 同一输入跑多路 |
| 条件分支 | `RunnableBranch((cond, r), default)` | 路由到不同链 |
| 输入扩增 | `RunnablePassthrough.assign(...)` | 保留输入同时追加字段 |
| 包装函数 | `RunnableLambda(fn)` | 插入任意处理逻辑 |
| 预绑定参数 | `runnable.bind(...)` | 固定某些调用参数 |
| 附加配置 | `runnable.with_config(...)` | 固定 tags/metadata/callbacks |
| 容错 | `with_retry` / `with_fallbacks` | 重试与降级 |
| 复用 | `chain = step1 \| step2`，再把 `chain` 当积木 | 分治，提高可读性 |

```python
from langchain_core.runnables import (
    RunnablePassthrough, RunnableLambda, RunnableParallel, RunnableBranch,
)
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# 1) 分治：把「检索」和「生成」拆成独立 Runnable，便于单独测试与复用
def retrieve(question: str) -> str:
    # 真实项目里这里是 retriever.invoke(question)，返回拼接好的上下文
    return f"[检索片段] 关于「{question}」的资料……"

retrieval = RunnableLambda(lambda x: retrieve(x["question"]))
qa_prompt = ChatPromptTemplate.from_messages([
    ("system", "依据资料回答问题，不要编造：\n{context}"),
    ("human", "{question}"),
])

# 2) 输入扩增 + 顺序串联
rag = (
    RunnablePassthrough.assign(context=retrieval)
    | qa_prompt
    | model
    | StrOutputParser()
)

# 3) 并行：同时给出「答案」和「关键词」
keywords_prompt = ChatPromptTemplate.from_template("提取 3 个关键词：{question}")
full = rag | RunnableParallel(answer=RunnablePassthrough(),
                              keywords=keywords_prompt | model | StrOutputParser())

print(full.invoke({"question": "什么是 RAG"}))
```

**易错点：**

- 链拆得越细越可复用，但**不要把每个小函数都包成 Runnable**，否则调试时全是匿名步骤。
- `rag | RunnableParallel(answer=RunnablePassthrough(), ...)` 这种「既保留上一步输出又派生新字段」的写法很常用，注意 `RunnablePassthrough()` 此时收的是上一步的字符串。
- 复用链时留意**输入契约**：一条链若期望 `dict`，直接喂字符串会报错。

---

## 13. LCEL 的流式输出机制

**流式输出**指模型生成的 token **边生成边返回**，用户不必等整段生成完（首字节延迟从数秒降到数百毫秒）。LCEL 的流式是**全链路透传**的：

1. 模型层 `astream/stream` 逐块产出 `AIMessageChunk`。
2. `RunnableSequence` 的 `stream` 会调用每一步的 `transform`/`astream`，把块依次往下传。
3. 支持流式的组件（提示、模型、`StrOutputParser`）逐块处理；不支持流式的组件（普通 `RunnableLambda`）会**先聚合再一次性输出**。

| 方式 | 粒度 | 用途 |
| --- | --- | --- |
| `chain.stream(input)` | 最终输出的块 | 前端打字机效果（最简单） |
| `chain.astream(input)` | 同上，异步 | 异步 Web 服务 |
| `chain.astream_events(input, version="v2")` | **每个组件、每个 token 的事件** | 展示「思考过程 / 中间步骤」 |
| `chain.astream_log(input)` | 每步中间状态补丁 | 旧 API，已被 `astream_events` 取代 |

```python
import asyncio
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

chain = (
    ChatPromptTemplate.from_template("用 3 句话介绍：{topic}")
    | ChatOpenAI(model="gpt-4o-mini", streaming=True)
    | StrOutputParser()
)

def sync_stream():
    for chunk in chain.stream({"topic": "向量数据库"}):
        print(chunk, end="", flush=True)   # 逐 token 打印

async def event_stream():
    # 细粒度事件：可以看到是哪个组件、哪个步骤产出了内容
    async for event in chain.astream_events({"topic": "向量数据库"}, version="v2"):
        if event["event"] == "on_chat_model_stream":
            piece = event["data"]["chunk"].content
            if piece:
                print(piece, end="", flush=True)

sync_stream()
asyncio.run(event_stream())
```

```python
# FastAPI + SSE：把流式结果推给前端
# pip install fastapi uvicorn sse-starlette
from fastapi import FastAPI
from sse_starlette.sse import EventSourceResponse
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

app = FastAPI()
chat = ChatPromptTemplate.from_template("{question}") | ChatOpenAI(model="gpt-4o-mini", streaming=True) | StrOutputParser()

@app.get("/chat")
async def chat_sse(question: str):
    async def gen():
        async for chunk in chat.astream({"question": question}):
            yield {"event": "message", "data": chunk}
        yield {"event": "done", "data": "[DONE]"}
    return EventSourceResponse(gen())
```

**易错点：**

- 忘记给模型传 `streaming=True` 且用 `invoke` 时，拿不到增量；**用 `stream/astream` 时模型会自动走流式**，但 `with_structured_output` 等特殊路径可能不支持。
- 流式下**无法拿到完整结果再做后处理**（如全局校验 JSON），需要自己拼接后处理。
- 中间若插入了会「聚合整段」的步骤（如某些自定义解析器），流式会退化为一次性输出，前端看不到打字机效果。

---

## 14. LangChain 的核心组件有哪些

LangChain 把 LLM 应用拆成若干**可替换的核心组件**，它们大多实现为 Runnable，因此可自由组合。

| 组件 | 代表类 | 作用 |
| --- | --- | --- |
| **Models 模型** | `ChatOpenAI` / `ChatAnthropic` / `ChatOllama` | 统一聊天模型接口（`BaseChatModel`） |
| **Prompts 提示** | `ChatPromptTemplate` / `PromptTemplate` / `FewShotPromptTemplate` / `MessagesPlaceholder` | 把变量渲染成消息/字符串 |
| **Output Parsers 解析器** | `StrOutputParser` / `JsonOutputParser` / `PydanticOutputParser` | 把模型输出转成结构化对象 |
| **Messages 消息** | `SystemMessage` / `HumanMessage` / `AIMessage` / `ToolMessage` | 对话的基本单位 |
| **Embeddings 嵌入** | `OpenAIEmbeddings` / `HuggingFaceEmbeddings` | 文本 → 向量 |
| **Vector Stores 向量库** | `Chroma` / `FAISS` / `Milvus` / `PGVector` | 存储与相似度检索 |
| **Retrievers 检索器** | `VectorStoreRetriever` / `MultiQueryRetriever` / `ParentDocumentRetriever` | 统一「查询 → 文档」接口 |
| **Document Loaders 加载器** | `PyPDFLoader` / `UnstructuredMarkdownLoader` | 各类数据源 → `Document` |
| **Text Splitters 分割器** | `RecursiveCharacterTextSplitter` | 长文本切块 |
| **Tools 工具** | `@tool` 装饰器 / `StructuredTool` | 供模型调用的外部函数 |
| **Agents 智能体** | `create_agent`（1.0）/ `create_react_agent`（0.3 LangGraph） | 自主决策、循环调用工具 |
| **Memory 记忆** | `RunnableWithMessageHistory` / LangGraph Checkpointer | 保存多轮对话上下文 |
| **Callbacks 回调** | `BaseCallbackHandler` / `StdOutCallbackHandler` | 生命周期钩子：日志、追踪、统计 |
| **Indexes 索引** | 加载/分割/嵌入/存储的组合流程 | 为 RAG 准备知识库 |

```python
# 一次导入，看清各组件的命名空间归属
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.vectorstores import InMemoryVectorStore      # 抽象接口
from langchain_core.embeddings import DeterministicFakeEmbedding  # 测试用假嵌入
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
# 社区集成（第三方）：from langchain_community.vectorstores import Chroma
```

**易错点：**

- 组件分属不同包：**抽象接口在 `langchain_core`**，官方厂商实现在 `langchain_openai` 等 partner 包，社区实现在 `langchain_community`，别记混导入路径。
- `Embeddings` 与 `VectorStore` **不是** Runnable；要做检索必须先用 `vectorstore.as_retriever()` 转成 Retriever（Retriever 才是 Runnable）。
- `Memory` 的旧实现（`ConversationBufferMemory`）已弃用，新代码用 `RunnableWithMessageHistory` 或 LangGraph Checkpointer。

---

## 15. 常见链模式与适用场景

把 LCEL 的积木按「模式」组合，就能覆盖绝大多数业务需求。下面是面试中经常被问到的几种典型模式（旧版 `RetrievalQA`、`LLMChain`、`ConversationalRetrievalChain` 等**均已弃用**，1.0 起移入 `langchain-classic`，应改用 LCEL 手工拼装）。

| 模式 | 结构 | 适用场景 | 关键 Runnable |
| --- | --- | --- | --- |
| **顺序链** | `prompt \| model \| parser` | 单步生成：翻译、摘要、改写 | `RunnableSequence` |
| **RAG 链** | `assign(context=retriever) \| prompt \| model \| parser` | 基于私有知识问答 | `RunnablePassthrough.assign` |
| **路由链** | `RunnableBranch((cond, chain), default)` | 按意图/类型分派 | `RunnableBranch` |
| **并行链** | `RunnableParallel(a=..., b=...)` | 多路召回、同时出多个结果 | `RunnableParallel` |
| **回退链** | `primary.with_fallbacks([backup])` | 主模型不可用时的降级 | `with_fallbacks` |
| **重试链** | `chain.with_retry(stop_after_attempt=3)` | 网络抖动、限流场景 | `with_retry` |
| **Map-Reduce 链** | `map: 逐块处理 → reduce: 汇总` | 长文档总结（超上下文） | `RunnableLambda` + `batch` |
| **对话链** | `RunnableWithMessageHistory` | 多轮对话带记忆 | `MessagesPlaceholder` |

```python
from typing import TypedDict
from langchain_core.runnables import (
    RunnablePassthrough, RunnableLambda, RunnableParallel, RunnableBranch,
)
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI

# 场景：客服机器人——先路由「技术问题 / 账单问题」，技术问题走 RAG，最后统一加上免责声明
model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
parser = StrOutputParser()

# 1) 知识库检索（示意，真实项目用 retriever.invoke）
def search_docs(question: str) -> str:
    return f"[知识库] 与「{question}」相关的文档内容……"

retrieval = RunnableLambda(lambda x: search_docs(x["question"]))

rag_chain = (
    RunnablePassthrough.assign(context=retrieval)
    | ChatPromptTemplate.from_messages([
        ("system", "依据资料回答，资料没有就说不知道：\n{context}"),
        ("human", "{question}"),
    ])
    | model
    | parser
)

billing_chain = ChatPromptTemplate.from_template("你是账单客服，请核实并回复：{question}") | model | parser

# 2) 路由
router = RunnableBranch(
    (lambda x: any(k in x["question"] for k in ["账单", "扣费", "退款"]), billing_chain),
    rag_chain,   # 默认走 RAG
)

# 3) 兜底重试 + 结果加免责声明（并行：既出答案又出声明）
robust = router.with_retry(stop_after_attempt=2)

final_chain = robust | RunnableParallel(
    answer=RunnablePassthrough(),
    disclaimer=RunnableLambda(lambda _: "本回答由 AI 生成，仅供参考。"),
)

for q in ["如何退款", "LangChain 是什么"]:
    out = final_chain.invoke({"question": q})
    print(q, "->", out["answer"], "|", out["disclaimer"])
```

**面试延伸：** 被追问「新项目该用哪个」时，标准答案是——**线性流程用 LCEL，需要循环/状态/持久化的 Agent 与工作流用 LangGraph**；旧 Chain 类只在维护老代码时才会遇到，均视为弃用。

**易错点：**

- 别再用 `RetrievalQA.from_chain_type` 这类旧封装；它无法优雅支持流式与异步，且已在 1.0 移出主包。
- Map-Reduce 场景要注意 `reduce` 阶段的输入是**列表**，需自行拼接或再走一次模型汇总。
- `with_retry` 适合**幂等**操作；对「已经产生副作用（如写库）」的链要谨慎重试。

---

[← 返回总览](README.md)
