# LangChain 面试题 · 04 Agent 与工具篇

[← 返回总览](README.md)

> 内容：Agent 概念与原理、ReAct 模式、@tool 自定义工具、Tool Calling 与 Function Calling、AgentExecutor、最大迭代次数、LangGraph 核心概念、State 与 Reducer、条件分支、多 Agent 协作、Agent 记忆、人类介入、常见坑与调试（共 14 题）。

---

## 目录

1. [什么是 Agent](#1-什么是-agent)
2. [Agent 的工作原理](#2-agent-的工作原理)
3. [ReAct 模式是什么](#3-react-模式是什么)
4. [如何自定义工具 tool 装饰器](#4-如何自定义工具-tool-装饰器)
5. [Tool Calling 与 Function Calling](#5-tool-calling-与-function-calling)
6. [AgentExecutor 的作用](#6-agentexecutor-的作用)
7. [如何控制 Agent 的最大迭代次数](#7-如何控制-agent-的最大迭代次数)
8. [LangGraph 的核心概念](#8-langgraph-的核心概念)
9. [LangGraph 中的 State 与 Reducer](#9-langgraph-中的-state-与-reducer)
10. [如何在 LangGraph 中实现条件分支](#10-如何在-langgraph-中实现条件分支)
11. [如何实现多 Agent 协作](#11-如何实现多-agent-协作)
12. [Agent 中的记忆如何实现](#12-agent-中的记忆如何实现)
13. [人类介入 Human in the loop](#13-人类介入-human-in-the-loop)
14. [Agent 的常见坑与调试方法](#14-agent-的常见坑与调试方法)

---

## 1. 什么是 Agent

**Agent（智能体）** = **LLM（大脑）+ 工具（手脚）+ 循环（反复思考）**。它让模型不再只做「输入一段文本、输出一段文本」，而是能够**自主决定调用哪些工具、调用几次、何时停止**，最终完成一个需要多步操作的任务。

**与 Chain 的本质区别（面试核心）：**

| 维度 | Chain（链） | Agent（智能体） |
| --- | --- | --- |
| 控制流 | **写死的**，由编排方预先决定 | **运行时动态决定**，由 LLM 决定下一步 |
| 步骤数 | 固定 | 可变（0 步到 N 步） |
| 谁来决策 | 开发者 | 模型 |
| 典型场景 | 翻译、摘要、RAG 问答（流程确定） | 查天气到查机票到比价下单（流程不确定） |
| 可预测性 | 高 | 低（必须配护栏） |
| 底座 | LCEL / Runnable | LangGraph 状态图（当前主流） |

一句话：**Chain 是「流程图」，Agent 是「会看图、也会自己画图的人」。**

**Agent 的四个组成要素：**

1. **模型（LLM/ChatModel）**：负责推理与决策，输出「要不要调工具、调哪个、参数是什么」。
2. **工具（Tools）**：模型可以调用的外部函数（搜索、计算器、数据库、业务 API）。
3. **提示词（Prompt）**：告诉模型有哪些工具、当前状态、以及「该怎么循环」。
4. **循环与状态（Loop & State）**：把模型的决策、工具结果串起来，并决定何时结束。

**最简 Agent 的可运行示例（不依赖 LangGraph，只用 `bind_tools` 手写循环）：**

```python
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI

@tool
def get_weather(city: str) -> str:
    """查询某座城市今天的天气。"""
    # 这里用假数据代替真实 API
    return f"{city} 今天晴，气温 25 摄氏度"

# 1) 模型绑定工具：模型从此知道「有哪些工具可用」
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
llm_with_tools = llm.bind_tools([get_weather])

# 2) 极简 Agent 循环
messages = [("user", "北京今天天气怎么样？")]
while True:
    ai_msg = llm_with_tools.invoke(messages)   # 模型决策
    messages.append(ai_msg)
    if not ai_msg.tool_calls:                  # 没有工具调用，说明已给出答案
        print("最终回答：", ai_msg.content)
        break
    for call in ai_msg.tool_calls:             # 执行模型指定的工具
        result = get_weather.invoke(call)       # ToolCall 字典可直接交给工具执行
        messages.append(result)                # 结果回写，供下一轮推理
```

**用 LangGraph 的预置 Agent（当前推荐写法）：**

```python
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

@tool
def get_weather(city: str) -> str:
    """查询某座城市今天的天气。"""
    return f"{city} 今天晴，气温 25 摄氏度"

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
agent = create_react_agent(llm, tools=[get_weather])   # 一个函数搞定 ReAct 图

result = agent.invoke({"messages": [("user", "北京今天天气怎么样？")]})
print(result["messages"][-1].content)
```

> 版本提示：旧版 `langchain.agents` 的 `initialize_agent` 自 0.1.0 起弃用、计划在 2.0 移除；LangChain 1.0 起这批旧实现迁入 `langchain-classic`。新项目直接用 `langgraph.prebuilt.create_react_agent`，或 v1 的 `langchain.agents.create_agent`。

**面试怎么答：** 先给「LLM + 工具 + 循环」的定义，再用「Chain 固定流程 / Agent 动态决策」的对比点出本质（控制反转），最后补一句「生产上用 LangGraph 做编排，因为它提供状态、持久化、流式与人类介入」。

**易错点：**
- Agent 不是「更强的 Chain」，而是把「下一步做什么」的决策权交给了模型，因此必须配护栏（迭代上限、工具白名单、权限校验）。
- 「能调工具」不等于「一定会调工具」：模型可能直接编造答案，要用提示词与工具描述约束它「必须基于工具结果回答」。

---

## 2. Agent 的工作原理

**一个 Agent 的本质，是一个受控的 `while` 循环。**

```text
messages = [用户输入]
循环直到结束：
    1) 把 messages（含工具定义）交给 LLM
    2) LLM 输出：
       - 若是「最终回答」 → 结束
       - 若是「工具调用」 → 进入第 3 步
    3) 执行工具，把结果作为 ToolMessage 追加到 messages
    4) 回到第 1 步
```

**四个阶段的职责：**

| 阶段 | 做什么 | 关键点 |
| --- | --- | --- |
| 决策（Model） | 读状态，输出工具调用或最终答案 | 依赖 `bind_tools` 送出的工具 JSON Schema |
| 执行（Tool） | 真正调用外部函数 | 参数由模型生成，必须校验 |
| 观察（Observation） | 把工具结果写回消息列表 | 用 `ToolMessage`，`tool_call_id` 必须与调用对应 |
| 回到决策 | 带着新观察再次推理 | 直到无工具调用或触发上限 |

**为什么必须循环：** 单次调用只能「问一句答一句」，而复杂任务需要多跳（先搜索、再计算、再总结）。循环把多跳变成可能。

**手写循环的完整示例：**

```python
from langchain_core.tools import tool
from langchain_core.messages import ToolMessage
from langchain_openai import ChatOpenAI

@tool
def multiply(a: int, b: int) -> int:
    """计算两个整数的乘积。"""
    return a * b

tools_by_name = {"multiply": multiply}
llm_with_tools = ChatOpenAI(model="gpt-4o-mini").bind_tools([multiply])

messages = [("user", "12 乘 8 等于多少？再把结果乘以 2 呢？")]
for step in range(10):                       # 硬性上限，防止死循环
    ai_msg = llm_with_tools.invoke(messages)
    messages.append(ai_msg)
    if not ai_msg.tool_calls:
        print("完成：", ai_msg.content)
        break
    for call in ai_msg.tool_calls:
        output = tools_by_name[call["name"]].invoke(call["args"])
        messages.append(
            ToolMessage(content=str(output), tool_call_id=call["id"])
        )                                    # 观察写回，供下一步推理
else:
    print("达到最大步数仍未结束")
```

**LangGraph 的等价表达：** `agent 节点`（调 LLM）+ `tools 节点`（执行工具）+ `条件边`（判断继续还是结束）+ `tools 回到 agent 的普通边`。这张图就是把上面的 `while` 循环**显式画了出来**。

**面试怎么答：** 「Agent 是一个由 LLM 决策驱动的循环：读状态、决定调哪个工具、执行、把观察写回，再回到决策，直到产出最终答案或触发上限。LangGraph 把这一循环建模成状态图，让流程可观测、可持久化。」

**易错点：**
- `ToolMessage` 的 `tool_call_id` 必须与对应 `tool_calls` 的 `id` 一致，否则模型无法关联，可能报错或幻觉。
- 循环必须有上限（`recursion_limit` / `max_iterations`），裸 `while True` 就是死循环风险。

---

## 3. ReAct 模式是什么

**ReAct = Reasoning + Acting**，出自论文 *ReAct: Synergizing Reasoning and Acting in Language Models*。核心思想：让模型在「**推理（Thought）**」与「**行动（Action）**」之间交替，用真实世界的反馈（**Observation**）不断修正下一步。

**三段循环：**

| 环节 | 含义 | 举例 |
| --- | --- | --- |
| **Thought（思考）** | 模型分析现状、规划下一步 | 「我需要先知道北京天气，再决定要不要带伞」 |
| **Action（行动）** | 选择一个工具并给出参数 | 「调用 get_weather，参数 city=北京」 |
| **Observation（观察）** | 工具返回的真实结果 | 「北京今天晴，25℃」 |

循环往复：`Thought → Action → Observation → Thought → Action → ... → Final Answer`。

**两种实现形态：**

| 形态 | 决策如何表达 | 特点 | 现状 |
| --- | --- | --- | --- |
| **文本式 ReAct** | 模型输出 `Thought:/Action:/Observation:` 结构文本，再正则解析 | 依赖模型守格式，易解析失败 | 早期 `langchain.agents.create_react_agent` 用 `ReActSingleInputOutputParser` |
| **工具调用式 ReAct** | 模型通过原生 Tool Calling 输出结构化 `tool_calls` | 由模型保证格式，稳定 | **当前主流**：`langgraph.prebuilt.create_react_agent` |

**文本式 ReAct 的经典提示词模板：**

```text
你可以使用以下工具：
{tools}

请严格按如下格式回答：
Question: 用户问题
Thought: 你的思考
Action: 要调用的工具名，必须是 [{tool_names}] 之一
Action Input: 工具的输入参数
Observation: 工具返回结果
...（Thought / Action / Action Input / Observation 可重复多次）
Thought: 我已经知道最终答案
Final Answer: 给用户的最终回答

开始！
Question: {input}
{agent_scratchpad}
```

**工具调用式 ReAct 的等价示例：**

```python
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

@tool
def get_weather(city: str) -> str:
    """查询城市天气。"""
    return f"{city} 今天晴，25℃"

@tool
def suggest_umbrella(weather: str) -> str:
    """根据天气给出是否带伞的建议。"""
    return "不用带伞" if "晴" in weather else "建议带伞"

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
agent = create_react_agent(llm, tools=[get_weather, suggest_umbrella])

# 观察中间过程：think -> act -> observe -> think -> act -> final
for event in agent.stream(
    {"messages": [("user", "北京今天要带伞吗？")]},
    stream_mode="updates",
):
    print(event)
```

**面试怎么答：** 先给 ReAct 的定义与三段循环，再点出「文本式 vs 工具调用式」的演进（前者靠解析文本、后者靠原生 Tool Calling 更稳），最后说「LangGraph 的 `create_react_agent` 就是工具调用式 ReAct 的开箱实现」。

**易错点：**
- 把 ReAct 理解为「提示词写死 Thought/Action 格式」是过时理解；现在它指的是「推理—行动交替」的范式，由 Tool Calling 承载。
- 文本式 ReAct 解析失败的根因是模型不守格式，现代做法是改用 Tool Calling，而不是反复调正则。
- ReAct 只是**一种** Agent 范式，还有 Plan-and-Execute、Reflexion 等；不要把 Agent 等同于 ReAct。

---

## 4. 如何自定义工具 tool 装饰器

`@tool` 来自 `langchain_core.tools`，把一个普通 Python 函数包装成带「名称、描述、参数 Schema」的 `BaseTool`。

**装饰器做了四件事：**
1. 用函数名作工具名（可用 `@tool("name")` 覆盖）；
2. 用 **docstring** 作工具描述（模型正是靠它判断何时调用）；
3. 用**类型注解**生成参数 JSON Schema；
4. 生成 `.invoke()` / `.ainvoke()` / `.args_schema` 等标准接口。

**四种创建方式对比：**

| 方式 | 写法 | 适用 |
| --- | --- | --- |
| `@tool` 装饰器 | `@tool def f(...)` | 绝大多数场景，最简单 |
| `@tool` + Pydantic | `args_schema=MyModel` | 参数复杂、需要强校验或枚举 |
| `StructuredTool.from_function` | 显式指定 name/description | 需要运行时动态构造工具 |
| 继承 `BaseTool` | 重写 `_run` / `_arun` | 需要自定义异步、状态或流式 |

**完整示例：**

```python
from typing import Literal
from pydantic import BaseModel, Field
from langchain_core.tools import tool

# 1) 最简：靠类型注解 + docstring 生成 Schema
@tool
def add(a: int, b: int) -> int:
    """计算两个整数之和。"""
    return a + b

# 2) 结构化参数：用 Pydantic 模型强约束，避免模型传错
class WeatherInput(BaseModel):
    city: str = Field(description="城市名，例如 北京")
    unit: Literal["celsius", "fahrenheit"] = Field(
        default="celsius", description="温度单位"
    )

@tool(args_schema=WeatherInput)
def get_weather(city: str, unit: str = "celsius") -> str:
    """查询指定城市的天气。单位可选摄氏度或华氏度。"""
    return f"{city} 晴，25 {'摄氏度' if unit == 'celsius' else '华氏度'}"

# 3) 覆盖名称 + 直接返回（结果不再回到模型，直接作为最终答案）
@tool("sum_all", return_direct=True)
def sum_all(numbers: list[int]) -> int:
    """计算一组数字的总和，并直接作为最终答案返回。"""
    return sum(numbers)

# 4) 异步工具：耗时 IO 用 async，避免阻塞事件循环
@tool
async def fetch_data(url: str) -> str:
    """异步抓取某个 URL 的内容。"""
    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, timeout=10)
        return resp.text[:200]

# 绑定给模型
from langchain_openai import ChatOpenAI
llm = ChatOpenAI(model="gpt-4o-mini")
llm_with_tools = llm.bind_tools([add, get_weather, sum_all, fetch_data])

print(add.name, add.description)
print(add.args_schema.model_json_schema())
# 也可直接调用：add.invoke({"a": 1, "b": 2}) -> 3
```

**写好工具描述的三条经验：**
1. **描述即接口**：模型选不选这个工具，几乎全靠 description，要写清「做什么、什么时候用、参数含义」。
2. **参数类型明确**：用 `int` / `str` / `Literal` / 枚举，减少模型传错类型的概率。
3. **错误要可控**：工具内部捕获异常并返回可读错误（如 `"查询失败：超时"`），让模型能自我纠偏。

**面试怎么答：** 「`@tool` 把函数转成 `BaseTool`，用 docstring 生成描述、用类型注解生成参数 Schema；复杂参数用 Pydantic 的 `args_schema`；`return_direct=True` 可让结果直接作为最终答案。」

**易错点：**
- 没写 docstring 的工具描述为空，模型基本不会调用。
- `return_direct=True` 会让工具结果**直接成为最终回答并终止循环**，用错会跳过后续推理。
- 工具名重复会报错；`bind_tools` 只能接收 `BaseTool`、可转换的函数或 `dict`，不要传未装饰的裸函数。

---

## 5. Tool Calling 与 Function Calling

**二者在 LangChain 语境里基本是同一件事**：模型不直接产出文本答案，而是输出**结构化的「要调用哪个工具、参数是什么」**，由外部代码执行后把结果回传。

**为什么从 Function Calling 改叫 Tool Calling：** 早期 OpenAI 把可调用项叫 `functions` 且字段为 `function_call`，但它**不一定真是函数**（可能是 API、检索器、数据库操作），且后来支持**并行调用**，`function` 这个名字有误导。于是社区统一改称 **Tool Calling**，语义更准确，LangChain 的接口也从 `bind_functions` 演进为 **`bind_tools`**。

| 维度 | Function Calling（旧叫法） | Tool Calling（现叫法） |
| --- | --- | --- |
| 提出 | OpenAI 2023，字段名 `functions` / `function_call` | 社区统一后的术语 |
| 可调用对象 | 「函数」 | **工具**：函数、API、检索器、数据库等 |
| 单次调用数 | 1 个 | 支持**并行多个** `tool_calls` |
| LangChain 接口 | 早期 `bind_functions` | **`bind_tools`** |
| 消息字段 | `function_call` | `tool_calls` / `ToolMessage` |

**绑定与调用：**

```python
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI

@tool
def add(a: int, b: int) -> int:
    """两个整数相加。"""
    return a + b

@tool
def multiply(a: int, b: int) -> int:
    """两个整数相乘。"""
    return a * b

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

# 绑定工具：模型在请求里收到工具的 JSON Schema
llm_with_tools = llm.bind_tools([add, multiply])

# 强制必须调用某个工具（部分厂商支持 tool_choice）
# llm_forced = llm.bind_tools([add, multiply], tool_choice="multiply")

ai_msg = llm_with_tools.invoke("帮我算 (3 + 5) * 2")
print(ai_msg.tool_calls)
# 输出形如：
# [{'name': 'add', 'args': {'a': 3, 'b': 5}, 'id': 'call_abc', 'type': 'tool_call'},
#  {'name': 'multiply', 'args': {'a': 8, 'b': 2}, 'id': 'call_def', 'type': 'tool_call'}]

# 模型只会「说」要调什么，真正执行仍由你的代码负责
for call in ai_msg.tool_calls:
    print(call["name"], call["args"])
```

**要点：**
- **模型不执行工具**：它只输出 `tool_calls`，执行与结果回传是你的责任（Agent 的「执行节点」）。
- **并行调用**：一条 `AIMessage` 里可能有多个 `tool_calls`，要全部执行并各自回一个 `ToolMessage`。
- **结构化输出**：Tool Calling 也是 `with_structured_output` 的底层机制。
- **能力差异**：不同厂商（OpenAI / Anthropic / 国产模型）支持程度与字段不同，LangChain 用统一的 `tool_calls` 抹平差异。

**面试怎么答：** 「Tool Calling 是 Function Calling 的统一叫法，因为可调用项不限于函数且支持并行调用。模型只输出结构化的工具调用请求，执行由框架完成；LangChain 用 `bind_tools` 绑定、用 `tool_calls` / `ToolMessage` 承载。」

**易错点：**
- 只有支持 Tool Calling 的模型才能用 `bind_tools`；纯 completion 的老模型只能走文本式 ReAct。
- 忘记把结果包成 `ToolMessage` 并带上正确 `tool_call_id`，下一轮模型会无法关联。
- 参数是模型「生成」的，可能编造不存在的字段，工具内必须做校验。

---

## 6. AgentExecutor 的作用

**AgentExecutor 是旧版（`langchain.agents`）Agent 的运行时**：它拿着「Agent（决策器）」和「Tools（工具）」，负责**执行循环、捕获错误、控制迭代次数、汇总中间步骤**。

**它到底做了什么：**
1. 调用 Agent（LLM）得到下一步动作（工具调用 / 最终答案）；
2. 若为工具调用，则执行工具、把结果写回 scratchpad；
3. 循环，直到拿到 `AgentFinish` 或触发上限；
4. 统一处理解析错误、工具报错、超时。

**常见参数：**

| 参数 | 作用 |
| --- | --- |
| `agent` | 决策器（旧版 `create_react_agent(...)` 产出的 `Runnable`） |
| `tools` | 可用工具列表 |
| `max_iterations` | 最大循环次数，防死循环 |
| `max_execution_time` | 最长执行时间（秒） |
| `early_stopping_method` | 超限后的收尾方式（`"force"` 直接给答案 / `"generate"` 再让模型总结） |
| `handle_parsing_errors` | 解析失败时是否交给模型自纠 |
| `return_intermediate_steps` | 是否返回每一步的「动作 + 观察」，便于调试 |
| `verbose` | 打印执行过程 |

**旧写法（了解即可，注意其版本状态）：**

```python
from langchain.agents import AgentExecutor, create_react_agent  # 旧版入口（legacy）
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.prompts import PromptTemplate

@tool
def add(a: int, b: int) -> int:
    """两个整数相加。"""
    return a + b

llm = ChatOpenAI(model="gpt-4o-mini")
prompt = PromptTemplate.from_template("{input}\n\n{agent_scratchpad}")

agent = create_react_agent(llm, [add], prompt)       # 旧版 ReAct 决策器
executor = AgentExecutor(
    agent=agent,
    tools=[add],
    max_iterations=8,
    early_stopping_method="force",
    handle_parsing_errors=True,
    return_intermediate_steps=True,
)
result = executor.invoke({"input": "3 加 5 等于几？"})
```

**版本状态（务必知道）：**
- `initialize_agent`、`langchain.agents.create_react_agent`、`AgentExecutor` 属于 **legacy**：`initialize_agent` 自 0.1.0 起弃用、计划 2.0 移除；LangChain 1.0 起这批旧实现被**迁入 `langchain-classic`** 包，官方推荐改用 `langchain.agents.create_agent` 或 LangGraph。
- 新项目**不要再用 AgentExecutor**，改用 LangGraph。

**LangGraph 替代方案（一个函数即可）：**

```python
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

@tool
def add(a: int, b: int) -> int:
    """两个整数相加。"""
    return a + b

llm = ChatOpenAI(model="gpt-4o-mini")
agent = create_react_agent(llm, tools=[add])              # 自带循环与工具执行
result = agent.invoke(
    {"messages": [("user", "3 加 5 等于几？")]},
    {"recursion_limit": 8},                               # 对应 max_iterations
)
```

**面试怎么答：** 「AgentExecutor 是旧版 Agent 的循环执行器，负责调 Agent、跑工具、控上限与收尾。现在被 LangGraph 取代，因为 LangGraph 提供显式状态图、持久化、流式与人类介入——这些 AgentExecutor 都做不到。」

**易错点：**
- `max_iterations` 触发后若 `early_stopping_method="force"` 会直接返回半成品答案，容易误导用户，应配合日志与兜底提示。
- `return_intermediate_steps=True` 很有用但会让输出变重，生产按需开启。
- 新版 LangChain 里 `from langchain.agents import AgentExecutor` 可能报错或告警，需改从 `langchain-classic` 导入。

---

## 7. 如何控制 Agent 的最大迭代次数

**为什么要控制：** Agent 是「模型自己决定循环」的结构，一旦模型反复调错工具、或提示词有歧义，就会**无限循环**，既烧钱又拖垮服务。因此必须给循环一个硬上限。

**控制手段：**

| 层面 | 手段 | 说明 |
| --- | --- | --- |
| 迭代次数 | LangGraph 的 `recursion_limit`（默认 25） | 图的总步数上限，超限抛 `GraphRecursionError` |
| 迭代次数 | 旧版 `AgentExecutor(max_iterations=n)` | 旧写法，等价控制 |
| 执行时间 | `max_execution_time`（旧）/ 自定义超时 | 防止单次工具调用卡死 |
| 提示词软约束 | 在系统提示里限制调用次数、要求尽早收敛 | 不可靠，必须配硬上限 |
| 业务兜底 | 捕获 `GraphRecursionError` 后返回友好提示 | 保证用户体验 |

**LangGraph 中的两种用法：**

```python
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from langgraph.errors import GraphRecursionError

@tool
def search(q: str) -> str:
    """搜索关键词。"""
    return f"关于 {q} 的结果"

llm = ChatOpenAI(model="gpt-4o-mini")
agent = create_react_agent(llm, tools=[search])

# 方式一：调用时通过 config 传入 recursion_limit
try:
    result = agent.invoke(
        {"messages": [("user", "帮我查资料")]},
        {"recursion_limit": 10},        # 最多 10 步（每个节点算一步）
    )
except GraphRecursionError:
    print("达到最大迭代次数，请简化问题后重试")
```

```python
# 方式二：在编译后用 with_config 固定默认上限
agent = agent.with_config({"recursion_limit": 15})
```

**注意 `recursion_limit` 的粒度：** 它统计的是**图执行的步数（super-step）**，不是「模型调用次数」。一个 ReAct 循环通常消耗「agent 节点 + tools 节点」两步，所以 `recursion_limit=10` 大约对应 5 轮「思考—行动」。

**更精细：在图里自己计轮次：**

```python
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

class State(TypedDict):
    messages: Annotated[list, add_messages]
    steps: int                      # 自己计数

def agent_node(state: State):
    # ... 调模型 ...
    return {"steps": state["steps"] + 1}

def should_continue(state: State) -> str:
    if state["steps"] >= 5:         # 自定义上限，到点就结束
        return END
    # ... 其余判断 ...
    return "tools"
```

**面试怎么答：** 「用 LangGraph 的 `recursion_limit` 做硬上限，配合提示词软约束与 `GraphRecursionError` 兜底；旧版是 `AgentExecutor` 的 `max_iterations`。要注意 `recursion_limit` 统计的是图步数而不是模型轮次。」

**易错点：**
- `recursion_limit` 太小会**误伤正常的多跳任务**，要在测试中估算合适值。
- 超限不是「静默停止」，会抛异常，必须 `try/except`，否则线上直接 500。
- 只靠提示词「请不要调太多次」不够可靠，硬上限才是底线。

---

## 8. LangGraph 的核心概念

**LangGraph 是把 Agent 的「循环」显式建模成一张状态图（State Graph）的编排库**，核心是用**节点 + 边 + 状态**描述「谁读什么、写什么、下一步去哪」。

**六大核心概念：**

| 概念 | 含义 | 关键点 |
| --- | --- | --- |
| **State（状态）** | 图里流转的共享数据，如消息列表 | 用 `TypedDict` / Pydantic 定义，靠 **Reducer** 合并更新 |
| **Node（节点）** | 一个执行单元，接收 State 并返回更新 | 普通函数或 `Runnable`，返回**局部更新字典** |
| **Edge（边）** | 节点间的固定跳转 | `add_edge(A, B)`：A 执行完必去 B |
| **Conditional Edge（条件边）** | 按运行时状态动态选下一节点 | `add_conditional_edges(A, router, {...})` |
| **Checkpointer（检查点）** | 持久化每一步状态，支持记忆、恢复、续跑 | `MemorySaver` / `InMemorySaver`、SQLite、Postgres |
| **Compile（编译）** | 校验图定义并变成可执行对象 | `graph.compile(checkpointer=...)` 后才能 `invoke` |

**两个高频衍生概念：**
- **START / END**：虚拟节点，分别表示图入口与出口。
- **Reducer**：决定「新值如何与旧值合并」（覆盖 or 追加），`add_messages` 就是消息专用的追加 Reducer。

**最小完整示例（一张能跑的图）：**

```python
from typing import Annotated, TypedDict
from langchain_core.messages import BaseMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver

# 1) 定义状态
class State(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]   # 追加式更新

llm = ChatOpenAI(model="gpt-4o-mini")

# 2) 定义节点：接收 state，返回「部分更新」
def chatbot(state: State):
    return {"messages": [llm.invoke(state["messages"])]}

# 3) 建图
builder = StateGraph(State)
builder.add_node("chatbot", chatbot)
builder.add_edge(START, "chatbot")
builder.add_edge("chatbot", END)

# 4) 编译（挂上检查点以便多轮记忆）
graph = builder.compile(checkpointer=MemorySaver())

# 5) 执行：thread_id 用于区分会话
cfg = {"configurable": {"thread_id": "u1"}}
out = graph.invoke({"messages": [HumanMessage("你好")]}, cfg)
print(out["messages"][-1].content)
```

**数据流一句话总结：** `START -> 节点读 State -> 返回更新 -> Reducer 合并进 State -> 沿边到下一节点 -> ... -> END`。

**为什么用图而不是 AgentExecutor：** 图是**显式、可组合、可观测**的——能加条件分支、并行、子图、持久化与人类介入，这些在 `while` 循环里都很难干净地表达。

**面试怎么答：** 「LangGraph 用 State、Node、Edge、Conditional Edge、Checkpointer、Compile 六个概念把 Agent 建模成状态图：节点读写状态、边控制流向、条件边做动态路由、检查点做持久化与记忆、compile 产出可执行对象。」

**易错点：**
- 节点**不要原地修改 `state` 对象**，应返回新值由 Reducer 合并，否则并发或回放会出问题。
- 没 `compile()` 的 `StateGraph` 不能执行；没 `checkpointer` 就没有跨轮次记忆。
- `START` / `END` 是虚拟节点名，不要拿它们去 `add_node`。

---

## 9. LangGraph 中的 State 与 Reducer

**State（状态）** 是整张图的共享内存；**Reducer** 决定「一次节点更新如何合并进状态」。

**默认行为 vs 带 Reducer：**

| 字段定义 | 合并规则 | 适用 |
| --- | --- | --- |
| `messages: list` | **覆盖**（直接用新值替换旧值） | 每次整体重算的字段 |
| `messages: Annotated[list, add_messages]` | **追加**（新消息并入旧列表） | 对话历史、日志 |
| `count: Annotated[int, operator.add]` | **累加** | 计数器、投票 |
| `Annotated[set, operator.or_]` | **集合并集** | 去重收集 |
| 自定义函数 `def reducer(old, new): ...` | 任意逻辑 | 复杂合并（如按 id 去重覆盖） |

**为什么要 Reducer：** 一个节点通常只产生「增量」（一条新消息、一个 +1），而不是完整状态。Reducer 让多个节点、以及并行的更新能**安全地合并**，避免互相覆盖。

**关键 API：`add_messages`**

```python
from typing import Annotated, TypedDict
from langgraph.graph.message import add_messages
from langchain_core.messages import AnyMessage

class State(TypedDict):
    messages: Annotated[list[AnyMessage], add_messages]
```

`add_messages` 不只是追加，它还支持：
- 传入带 `id` 的消息时**按 id 更新**（用于编辑或重排历史）；
- 传入 `RemoveMessage(...)` 时**按 id 删除**（用于裁剪历史）。

**自定义 Reducer 示例（按消息 id 去重后保留最新）：**

```python
from langchain_core.messages import BaseMessage

def dedup_messages(old: list[BaseMessage], new: list[BaseMessage]) -> list[BaseMessage]:
    merged = {m.id: m for m in old}
    for m in new:
        merged[m.id] = m
    return list(merged.values())

class State(TypedDict):
    messages: Annotated[list[BaseMessage], dedup_messages]
```

**完整示例：消息追加 + 计数：**

```python
import operator
from typing import Annotated, TypedDict
from langchain_core.messages import BaseMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages

class State(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]   # 追加
    llm_calls: Annotated[int, operator.add]                # 累加

llm = ChatOpenAI(model="gpt-4o-mini")

def call_model(state: State):
    resp = llm.invoke(state["messages"])
    return {"messages": [resp], "llm_calls": 1}            # 增量：+1

builder = StateGraph(State)
builder.add_node("model", call_model)
builder.add_edge(START, "model")
builder.add_edge("model", END)
graph = builder.compile()

out = graph.invoke({"messages": [HumanMessage("你好")]})
print(out["llm_calls"])            # 1
```

**进阶：输入 / 输出 Schema 与私有状态**
- `StateGraph(State, input=InSchema, output=OutSchema)`：限制对外暴露的字段。
- 节点的私有数据可在函数内部处理，不写进公共 State。

**面试怎么答：** 「State 是图的共享数据，Reducers 决定更新如何合并；默认是覆盖，消息字段要用 `Annotated[list, add_messages]` 才会追加，计数用 `operator.add`。Reducer 的意义是让多个节点的增量更新能安全合并，并为并行/回放提供确定性。」

**易错点：**
- **不加 `Annotated` 就是覆盖**：很多人以为 `messages: list` 会自动追加，结果每轮历史被清空。
- `operator.add` 不适用于消息列表，消息要用 `add_messages`，否则拼接逻辑会错乱。
- 并行节点写同一字段时，若 Reducer 不满足可交换 / 可结合，结果会不确定。

---

## 10. 如何在 LangGraph 中实现条件分支

条件分支让图**根据运行时状态决定走哪条路**，对应 API 是 `add_conditional_edges`。

**签名与三种返回：**

```python
builder.add_conditional_edges(
    source="agent",                               # 从哪个节点出发
    path=route,                                   # 路由函数：state -> 目标
    path_map={"continue": "tools", "end": END},   # 可选：返回值到节点的映射
)
```

| 路由函数返回 | 含义 |
| --- | --- |
| 节点名字符串 | 跳到该节点 |
| `END` | 结束图 |
| 节点名列表 | 并行跳转多个节点（fan-out） |

**ReAct 的经典条件分支：**

```python
from typing import Annotated, Literal, TypedDict
from langchain_core.messages import BaseMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

@tool
def get_weather(city: str) -> str:
    """查询城市天气。"""
    return f"{city} 晴，25℃"

class State(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]

llm = ChatOpenAI(model="gpt-4o-mini").bind_tools([get_weather])

def agent(state: State):
    return {"messages": [llm.invoke(state["messages"])]}

def route(state: State) -> Literal["tools", "__end__"]:
    last = state["messages"][-1]
    return "tools" if last.tool_calls else END       # 有工具调用就继续

builder = StateGraph(State)
builder.add_node("agent", agent)
builder.add_node("tools", ToolNode([get_weather]))    # 预置工具执行节点
builder.add_edge(START, "agent")
builder.add_conditional_edges("agent", route, {"tools": "tools", END: END})
builder.add_edge("tools", "agent")                   # 工具执行完回到 agent
graph = builder.compile()
```

**并列分支（fan-out / map-reduce）：** 用 `Send` 动态生成多个并行任务（如对每个子问题各起一个节点），再由 Reducer 汇总。

```python
from langgraph.types import Send

def fan_out(state: State) -> list[Send]:
    return [Send("worker", {"topic": t}) for t in state["topics"]]

builder.add_conditional_edges("planner", fan_out)   # 动态并行
```

**面试怎么答：** 「条件边 = 路由函数 + 路径映射；路由函数读 state 返回节点名、`END` 或节点名列表。ReAct 里就是判断最后一条消息有没有 `tool_calls`：有就去 tools 节点，没有就结束。复杂扇出用 `Send`。」

**易错点：**
- 路由函数**不应有副作用**，只读 state 做判断。
- 返回未注册的节点名会运行时报错，用 `path_map` 显式声明合法分支更安全。
- `END` 的实际字符串值是 `"__end__"`，手写字符串判断时写错会导致路由异常。

---

## 11. 如何实现多 Agent 协作

单个 Agent 工具体一多、职责一杂，就难维护、易跑偏。**多 Agent 协作**把任务拆给多个各司其职的 Agent，再让它们分工与交接。

**主流协作拓扑：**

| 拓扑 | 结构 | 优势 | 劣势 | 典型实现 |
| --- | --- | --- | --- | --- |
| **Supervisor（主管）** | 一个主管统一调度多个子 Agent，子 Agent 干完交回主管 | 控制集中、易调试、权限清晰 | 主管是瓶颈与单点 | `langgraph-supervisor` 的 `create_supervisor` |
| **Network（网络 / 交接）** | Agent 之间可点对点交接（handoff） | 灵活、去中心化 | 路径难预测、易绕圈 | `langgraph-swarm`、`Command` 移交 |
| **Hierarchical（层级）** | 主管管主管，多层组织 | 适合大规模、职责分层 | 层级深则延迟与错误放大 | 主管套主管（compile 后当子 Agent） |
| **Custom（自定义图）** | 自己用 StateGraph 画协作流程 | 完全可控、贴合业务 | 需自己处理交接与状态 | 手写节点与条件边 |

**取舍建议：**
- **能单 Agent 就别多 Agent**：多 Agent 的通信开销、状态同步与失败放大都会显著上升。
- 任务**可清晰分层、需要集中决策**：选 **Supervisor**。
- 任务**需要在专家间来回切换**：选 **Network（Swarm）**。
- 组织**规模大、有中层**：选 **Hierarchical**。

**Supervisor 示例（`langgraph-supervisor`）：**

```python
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from langgraph_supervisor import create_supervisor

@tool
def web_search(query: str) -> str:
    """执行网络搜索。"""
    return f"搜索结果：{query} 的相关资料"

@tool
def calculator(expr: str) -> str:
    """计算数学表达式。"""
    return str(eval(expr))

model = ChatOpenAI(model="gpt-4o-mini")

research_agent = create_react_agent(model, tools=[web_search], name="researcher")
math_agent = create_react_agent(model, tools=[calculator], name="mathematician")

supervisor = create_supervisor(
    [research_agent, math_agent],
    model=model,                        # 主管用这个模型做调度决策
    prompt="你是主管，负责把任务分派给研究员或数学家，汇总后给用户最终答案。",
).compile()

result = supervisor.invoke({
    "messages": [("user", "先查一下 LangGraph 是什么，再算 12 * 8 的结果")]
})
```

**Network / handoff 示例（用 `Command` 把控制权交给另一个 Agent）：**

```python
from langgraph.types import Command

def sales_agent(state):
    # 判断需要售后处理，直接把控制权交接给 support_agent
    return Command(
        goto="support_agent",
        update={"messages": [("assistant", "已转接售后同事")]},
    )
```

**共享状态与通信约定：**
- 多 Agent 通常共用同一份 `messages`（靠 `add_messages` 汇总），各 Agent 也可带自己的私有 State 字段。
- 交接有两种写法：`Command(goto=...)` 直接移交，或「把下一个 Agent 封装成工具让当前 Agent 调用」。
- 主管派活常用「把子 Agent 做成工具（工具名即子 Agent 职责）」的 pattern。

**面试怎么答：** 「多 Agent 常见三种拓扑：Supervisor（中心调度，最常用）、Network（点对点交接，灵活但易绕圈）、Hierarchical（主管套主管，适合大规模）。选择依据是任务能否分层、是否需要集中决策；能用单 Agent 就别上多 Agent。」

**易错点：**
- 多 Agent 共用一个对话历史时，容易出现「谁的发言算数」的歧义；应约定**只有主管对用户输出**。
- Agent 之间无限交接 = 无限循环，务必配合 `recursion_limit` 与交接次数限制。
- 子 Agent 的工具权限要隔离，避免越权调用不属于它的工具。

---

## 12. Agent 中的记忆如何实现

**短期记忆（short-term memory）**：同一会话内的对话历史，靠 **Checkpointer + `thread_id`** 实现。
**长期记忆（long-term memory）**：跨会话、跨用户的持久知识，靠 **Store**（如 `InMemoryStore`、Postgres Store）实现。

| 类型 | 存什么 | 存储机制 | 作用域 |
| --- | --- | --- | --- |
| 短期记忆 | 当前会话的消息历史 | Checkpointer（`thread_id`） | 单个会话 |
| 长期记忆 | 用户偏好、事实、经验 | Store（`namespace` + key） | 跨会话、跨线程 |

> 版本提示：旧版 `ConversationBufferMemory`、`ConversationSummaryMemory` 等 `Memory` 类**已弃用**，LangChain 1.0 起迁入 `langchain-classic`；新代码请用 LangGraph 的 Checkpointer 与 Store。

**短期记忆最小示例：**

```python
from typing import Annotated, TypedDict
from langchain_core.messages import BaseMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver

class State(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]

llm = ChatOpenAI(model="gpt-4o-mini")

def chatbot(state: State):
    return {"messages": [llm.invoke(state["messages"])]}

builder = StateGraph(State)
builder.add_node("chatbot", chatbot)
builder.add_edge(START, "chatbot")
builder.add_edge("chatbot", END)
graph = builder.compile(checkpointer=MemorySaver())     # 关键：挂检查点

cfg = {"configurable": {"thread_id": "session-42"}}     # 用 thread_id 区分会话
graph.invoke({"messages": [HumanMessage("我叫小明")]}, cfg)
out = graph.invoke({"messages": [HumanMessage("我叫什么？")]}, cfg)
print(out["messages"][-1].content)                      # 能想起「小明」
```

**预置 Agent 直接内置记忆：**

```python
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver

agent = create_react_agent(llm, tools=[], checkpointer=MemorySaver())
agent.invoke({"messages": [("user", "我叫小明")]}, {"configurable": {"thread_id": "t1"}})
```

**长期记忆（跨会话）：**

```python
from langgraph.store.memory import InMemoryStore
from langgraph.prebuilt import create_react_agent

store = InMemoryStore()
agent = create_react_agent(llm, tools=[], store=store)

# 用户偏好写进 store（实际项目常通过工具在节点内读写）
store.put(("users", "u1"), "preference", {"language": "中文", "tone": "简洁"})
```

**历史太长怎么办：**
- **裁剪（trim）**：只保留最近 N 条，或最近 N 个 token。
- **摘要（summarize）**：把旧历史压缩成一段摘要后替换。
- 用 `RemoveMessage` 精确删除某条历史。

```python
from langchain_core.messages import RemoveMessage

def trim_messages(state: State):
    msgs = state["messages"]
    if len(msgs) > 20:
        # 只保留最近 10 条
        return {"messages": [RemoveMessage(id=m.id) for m in msgs[:-10]]}
    return {}
```

**面试怎么答：** 「短期记忆 = Checkpointer + `thread_id`，保存会话内消息；长期记忆 = Store，按命名空间跨会话存用户画像与事实。旧 Memory 类已弃用，迁到了 `langchain-classic`。历史过长要用裁剪或摘要来控制上下文与成本。」

**易错点：**
- 不传 `thread_id`，所有会话会串在一起；不同用户 / 会话务必用不同 `thread_id`。
- `MemorySaver` 是**内存态**，进程重启即丢，生产要用 SQLite / Postgres Checkpointer。
- 记忆无限增长会撑爆上下文并推高成本，必须做裁剪或摘要。

---

## 13. 人类介入 Human in the loop

**Human-in-the-loop（HITL）**：在 Agent 的关键步骤**暂停**，把控制权交给人类（审批、修改、补充信息），确认后再继续。常用于「高风险操作」（下单、转账、发邮件、删数据）。

**两种实现方式：**

| 方式 | 写法 | 特点 |
| --- | --- | --- |
| **静态中断** | 编译时指定 `interrupt_before=["tools"]` / `interrupt_after=["agent"]` | 在固定节点前后暂停，简单 |
| **动态中断（推荐）** | 节点内调用 `interrupt(payload)` | 由运行时条件决定是否暂停，可传上下文，更灵活 |

**动态中断的完整流程：**

```python
from typing import Annotated, TypedDict
from langchain_core.messages import BaseMessage, HumanMessage, ToolMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command, interrupt

@tool
def send_money(to: str, amount: int) -> str:
    """向某人转账。"""
    return f"已向 {to} 转账 {amount} 元"

class State(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]

llm = ChatOpenAI(model="gpt-4o-mini").bind_tools([send_money])

def agent(state: State):
    return {"messages": [llm.invoke(state["messages"])]}

# 关键：把工具执行包一层，执行前请求人类批准
def approval_node(state: State):
    last = state["messages"][-1]
    for call in last.tool_calls:
        decision = interrupt({                 # 暂停并抛出审批请求
            "action": call["name"],
            "args": call["args"],
            "prompt": "是否批准这次转账？",
        })
        if decision.get("approved"):
            result = send_money.invoke(call)
            return {"messages": [result]}
        return {
            "messages": [
                ToolMessage(content="操作已被人工拒绝", tool_call_id=call["id"])
            ]
        }
    return {}

builder = StateGraph(State)
builder.add_node("agent", agent)
builder.add_node("approval", approval_node)
builder.add_edge(START, "agent")
builder.add_conditional_edges(
    "agent",
    lambda s: "approval" if s["messages"][-1].tool_calls else END,
)
builder.add_edge("approval", "agent")

# 必须挂 checkpointer，否则无法从中断点恢复
graph = builder.compile(checkpointer=MemorySaver())

cfg = {"configurable": {"thread_id": "txn-1"}}
state = graph.invoke({"messages": [HumanMessage("给小王转 1000 元")]}, cfg)

# 执行到 interrupt 会停下，state 里出现 __interrupt__ 待处理请求
print(state.get("__interrupt__"))

# 人类确认后，用 Command(resume=...) 从中断点续跑
final = graph.invoke(Command(resume={"approved": True}), cfg)
print(final["messages"][-1].content)
```

**要点：**
- `interrupt()` 必须配合 **checkpointer**，暂停点状态被持久化，靠 `Command(resume=值)` 恢复。
- 人类除了「批准 / 拒绝」，还能**编辑状态**（如修改工具参数）后再续跑。
- 中断是**可恢复**的：恢复时从暂停的那个节点**重新执行**，`interrupt()` 这次返回人类的输入。
- 与流式结合：`stream()` 会产出中断事件，前端据此渲染审批 UI。

**面试怎么答：** 「HITL 用 LangGraph 的 `interrupt()` + `Command(resume=...)` 实现：节点内暂停、向人类展示所需信息，人类决策后从检查点续跑；前提是挂 checkpointer。静态版用 `interrupt_before/after`。」

**易错点：**
- 没有 checkpointer 的图**无法中断后恢复**，`interrupt` 会无效或报错。
- `interrupt()` 传入的 payload 必须是可 JSON 序列化的值。
- 恢复时会**重新执行整个节点**，节点内 `interrupt()` 之前的副作用要**幂等**，避免重复执行。

---

## 14. Agent 的常见坑与调试方法

**常见坑清单：**

| 现象 | 根因 | 解决 |
| --- | --- | --- |
| 无限循环 / 反复调同一个工具 | 缺少迭代上限、提示词歧义 | 设 `recursion_limit`，明确提示词与工具描述 |
| 工具死活不被调用 | docstring 缺失或模糊、模型不支持 Tool Calling | 补全描述、换支持 Tool Calling 的模型 |
| 报「tool_call_id 不匹配」 | `ToolMessage` 未回填正确 id | 用 `ToolNode` 或手动带上 `call["id"]` |
| 参数类型错误 | 模型编造参数 | 用 Pydantic Schema 强校验、工具内兜底 |
| 上下文爆炸 / 超 token | 历史无限增长 | 裁剪或摘要历史（见第 12 题） |
| 模型直接幻觉答案 | 未强制用工具、提示词弱 | 提示「必须基于工具结果回答」、`tool_choice` |
| 并行工具调用漏执行 | 只处理了第一个 `tool_call` | 遍历全部 `tool_calls` |
| 恢复中断后行为异常 | 节点副作用不幂等 | 把副作用放到中断之后 |
| `GraphRecursionError` 未捕获 | 没有 try/except | 捕获后给友好兜底 |
| 多轮对话失忆 | 没挂 checkpointer 或没传 `thread_id` | 挂 `MemorySaver` 并固定 `thread_id` |

**调试三板斧：**

**① 用 `stream` 观察每一步（最实用）**

```python
from langgraph.prebuilt import create_react_agent
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool

@tool
def search(q: str) -> str:
    """搜索关键词。"""
    return f"{q} 的结果"

agent = create_react_agent(ChatOpenAI(model="gpt-4o-mini"), tools=[search])

# stream_mode="updates"：每个节点执行后产出一次更新，能看到 think / act / observe
for chunk in agent.stream(
    {"messages": [("user", "帮我查 LangGraph")]},
    stream_mode="updates",
):
    print(chunk)

# stream_mode="messages"：直接流式吐出 token 与工具调用（适合前端）
for token, meta in agent.stream(
    {"messages": [("user", "帮我查 LangGraph")]},
    stream_mode="messages",
):
    print(token.content, end="")
```

**② 用 LangSmith 做全链路追踪**

```bash
# 设置环境变量后，所有 LangChain / LangGraph 调用自动上报
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY=<your-key>
export LANGCHAIN_PROJECT="my-agent"
```

开启后可在 LangSmith 里看到完整的 **trace**：每一步 LLM 的输入输出、工具调用参数与结果、耗时与 token，是定位「模型为什么做出这个决策」的最强工具。

**③ 打开 verbose 与中间步骤**
- 旧版：`AgentExecutor(verbose=True, return_intermediate_steps=True)`。
- 新版：用 `stream_mode="updates"`，或查看 `messages` 列表里的 `AIMessage.tool_calls` 与 `ToolMessage`。

**面试怎么答：** 「调试 Agent 先看控制流（`stream_mode="updates"` 看 think-act-observe）、再看决策依据（LangSmith trace 看 prompt 与模型输出）、最后看约束（`recursion_limit`、工具 schema、错误处理）。大部分坑集中在循环无上限、工具描述不清、消息 id 不匹配、上下文超限这几类。」

**易错点：**
- 只盯「最终答案对不对」而不看中间步骤，会漏掉「答案对了但逻辑错了」的隐患。
- 关掉 tracing 后线上出问题几乎无法复盘，生产建议常开或采样上报。
- 大量日志直接 `print` 到 stdout 会拖慢并泄漏信息，应用结构化 tracing 而非打印。

[← 返回总览](README.md)
