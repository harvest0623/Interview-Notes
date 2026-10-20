# LangChain 面试题 · 02 Prompt 与模型篇

[← 返回总览](README.md)

> 内容：`PromptTemplate` 与 `ChatPromptTemplate`、多轮对话提示、`MessagesPlaceholder`、`FewShotPromptTemplate`、`ExampleSelector` 示例选择器、`ChatModel` 与 `LLM`、常见消息类型、OpenAI 与国产模型接入、模型参数（temperature / max_tokens / top_p 等）、流式与批量调用、`OutputParser`、结构化输出、输出解析失败的常见原因与处理（共 13 题）。

---

## 目录

1. [PromptTemplate 与 ChatPromptTemplate 的区别](#1-prompttemplate-与-chatprompttemplate-的区别)
2. [如何构建多轮对话提示](#2-如何构建多轮对话提示)
3. [MessagesPlaceholder 的作用](#3-messagesplaceholder-的作用)
4. [FewShotPromptTemplate 的用法](#4-fewshotprompttemplate-的用法)
5. [如何做示例选择器 ExampleSelector](#5-如何做示例选择器-exampleselector)
6. [ChatModel 与 LLM 的区别](#6-chatmodel-与-llm-的区别)
7. [常见消息类型与作用](#7-常见消息类型与作用)
8. [如何调用 OpenAI 与国产模型](#8-如何调用-openai-与国产模型)
9. [如何设置温度、最大 token 等参数](#9-如何设置温度最大-token-等参数)
10. [模型输出的流式与批量调用](#10-模型输出的流式与批量调用)
11. [OutputParser 的作用与常见类型](#11-outputparser-的作用与常见类型)
12. [如何获取结构化输出](#12-如何获取结构化输出)
13. [输出解析失败的常见原因与处理](#13-输出解析失败的常见原因与处理)

---

## 1. PromptTemplate 与 ChatPromptTemplate 的区别

两者都是**提示词模板（Prompt Template）**，负责把用户传入的变量渲染成最终送给模型的内容，区别在于**渲染出来的「形态」不同**。

- **`PromptTemplate`**：字符串模板，输出一段**纯文本**（`StringPromptValue`），对应老式的 text completion 模型（`LLM`）。
- **`ChatPromptTemplate`**：消息列表模板，输出一组**带角色的消息**（`ChatPromptValue`，即 `List[BaseMessage]`），对应主流的对话模型（`ChatModel`）。

| 维度 | PromptTemplate | ChatPromptTemplate |
| --- | --- | --- |
| 面向对象 | LLM（字符串进、字符串出） | ChatModel（消息进、消息出） |
| 渲染结果 | `StringPromptValue`（一段文本） | `ChatPromptValue`（`List[BaseMessage]`） |
| 模板结构 | 单个字符串 + `{变量}` | 一组 `(role, template)` 消息 |
| 角色控制 | 无（只能靠文字描述） | 有（`system` / `human` / `ai` 分明） |
| 多轮历史 | 需手动拼字符串 | 配合 `MessagesPlaceholder` 原样插入 |
| 现代地位 | 仍可用，但多用于纯文本场景 | **首选**（GPT / Claude / Qwen 都是 Chat 模型） |
| 同源 | `langchain_core.prompts` | `langchain_core.prompts` |

```python
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate

# 1) PromptTemplate：纯字符串模板
text_prompt = PromptTemplate.from_template("请用一句话介绍 {product} 的核心卖点。")
print(text_prompt.format(product="LangChain"))
# => 请用一句话介绍 LangChain 的核心卖点。

# 2) ChatPromptTemplate：消息列表模板，角色分明
chat_prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一名资深的{role}，回答要简洁、专业。"),
    ("human", "请用一句话介绍 {product} 的核心卖点。"),
])
messages = chat_prompt.format_messages(role="后端工程师", product="LangChain")
print(messages)
# => [SystemMessage(content='你是一名资深的后端工程师...'), HumanMessage(content='请用一句话...')]

# 3) 两者都能用 LCEL 直接接模型
# from langchain_openai import ChatOpenAI
# model = ChatOpenAI(model="gpt-4o-mini")
# chain = chat_prompt | model
# print(chain.invoke({"role": "后端工程师", "product": "LangChain"}).content)
```

**怎么答面试：** 一句话点出「字符串 vs 消息列表」，再补一句「ChatPromptTemplate 能表达角色，是现代 Chat 模型的标配；PromptTemplate 传给 ChatModel 会被自动包成一条 HumanMessage，会丢掉 system 语义」。

**易错点：**

- `PromptTemplate` 交给 ChatModel 时会被包装成**单条 HumanMessage**，无法表达 system 角色；反过来 `ChatPromptTemplate` 交给传统 `LLM` 会类型不匹配。
- 导入路径：旧写法 `from langchain.prompts import ...` 在新的 0.3.x 里应改为 `from langchain_core.prompts import ...`，前者只是兼容层，容易踩版本坑。
- `format()` 得到字符串，`format_messages()` 得到消息对象，两者不能混用；LCEL 链里直接传变量字典即可，无需手动 format。

---

## 2. 如何构建多轮对话提示

多轮对话的本质是：**把历史消息按时间顺序拼进本轮 Prompt 里**，让模型「记得」之前说过什么。注意——模型**本身无状态**，「记忆」完全靠你在每次请求里把历史带上。

三种做法：

1. **手工维护历史**：自己存一个 `List[BaseMessage]`，每轮把最新的一问一答追加进去，再通过 `MessagesPlaceholder` 渲染。
2. **`RunnableWithMessageHistory`**：LCEL 官方封装，按 `session_id` 自动存取历史，**推荐**。
3. **LangGraph Checkpointer**：做跨会话持久化（详见「05 生态与工程实践篇」）。

```python
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage

# 模板：system 规则 + 历史占位 + 本轮输入
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个乐于助人的中文助手。"),
    MessagesPlaceholder("history"),   # 历史消息原样插入
    ("human", "{input}"),             # 本轮用户输入
])

history = [
    HumanMessage(content="我叫小明"),
    AIMessage(content="你好，小明！"),
]
messages = prompt.invoke({"history": history, "input": "我叫什么名字？"}).messages
print([type(m).__name__ for m in messages])
# => ['SystemMessage', 'HumanMessage', 'AIMessage', 'HumanMessage']
```

用 `RunnableWithMessageHistory` 自动管理历史，不必手写维护逻辑：

```python
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_openai import ChatOpenAI

prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个中文助手，回答简洁。"),
    MessagesPlaceholder("history"),
    ("human", "{input}"),
])
chain = prompt | ChatOpenAI(model="gpt-4o-mini")

store = {}
def get_history(session_id: str) -> InMemoryChatMessageHistory:
    """按会话 id 取（或新建）历史对象。"""
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]

chat = RunnableWithMessageHistory(
    chain,
    get_history,
    input_messages_key="input",     # 模板里的 {input}
    history_messages_key="history", # 模板里的 MessagesPlaceholder 名
)

cfg = {"configurable": {"session_id": "user-1"}}
print(chat.invoke({"input": "我叫小明"}, config=cfg).content)
print(chat.invoke({"input": "我叫什么？"}, config=cfg).content)  # 能答出「小明」
```

**易错点：**

- **不要把历史拼成一整段字符串**塞进 `human`，那样会丢失角色边界，模型容易分不清谁说的，也更容易被注入攻击。
- 历史**只增不减**会导致 token 溢出，需要做裁剪或摘要（见「05 篇」的 `trim_messages` 与历史压缩）。
- `RunnableWithMessageHistory` 的 `input_messages_key` / `history_messages_key` 必须与模板里的 key 严格对应，拼错会报 `KeyError`。
- `InMemoryChatMessageHistory` 只在单进程内存里，多副本部署会「串会话」，生产要换成基于 Redis / DB 的持久化实现。

---

## 3. MessagesPlaceholder 的作用

`MessagesPlaceholder` 是一个**消息占位符**：它本身不产生消息，而是在格式化时把「外部传入的一整组消息」**原样插入**到模板的指定位置。

**为什么需要它：**

- 历史消息的**条数在运行期才确定**（可能 0 条，也可能 20 条），无法写死在模板里。
- 某些消息的**角色**要到运行时才知道，需要预留一个「任意消息」的位置。
- 它是多轮对话、Agent 中间步骤、工具调用轨迹的标准插入点。

**关键特性：**

- 参数 `variable_name` 指定变量名，与 `invoke` 时传入的 key 对应。
- `optional=True` 时，该变量缺失不会报错，会渲染成空（**历史为空时强烈建议开**）。
- 传入的内容必须是 **`BaseMessage` 对象列表**。

```python
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage

prompt = ChatPromptTemplate.from_messages([
    ("system", "你是客服助手。"),
    MessagesPlaceholder("history", optional=True),  # 历史可空
    ("human", "{input}"),
])

# 1) 历史为空：optional=True 时不会报错
empty = prompt.invoke({"input": "你好"}).messages
print([m.content for m in empty])   # ['你是客服助手。', '你好']

# 2) 传入 BaseMessage 列表
history = [
    HumanMessage(content="订单号 123 什么时候发货？"),
    AIMessage(content="预计明天发出。"),
]
msgs = prompt.invoke({"input": "能加急吗？", "history": history}).messages
print(len(msgs))   # 4
```

**易错点：**

- 传 `["你好", "在吗"]` 这类**字符串列表**或 `[{"role": "user", ...}]` 这类**字典列表**都会报错，必须是 `BaseMessage` 实例。
- `optional` 默认是 `False`：历史变量没传时直接 `KeyError`，很多人第一次用就在这里卡住。
- 同一个模板里出现两个 `MessagesPlaceholder` 时，变量名不能重复，否则取到的都是同一个。
- 它插入的是「消息对象」，不会帮你做格式转换；从数据库读出的 JSON 历史要先转成 `HumanMessage` / `AIMessage`。

---

## 4. FewShotPromptTemplate 的用法

**少样本提示（Few-shot Prompting）**：在 Prompt 里嵌入若干「输入 → 输出」示例，让模型**模仿示例的格式、风格或推理路径**，比单纯文字描述更稳定。

- **字符串版**：`FewShotPromptTemplate`，配合 `PromptTemplate` 使用，适合传统 LLM。
- **消息版**：`FewShotChatMessagePromptTemplate`，配合 `ChatPromptTemplate` 使用，**现代首选**（角色分明、示例复用清晰）。

```python
from langchain_core.prompts import (
    ChatPromptTemplate,
    FewShotChatMessagePromptTemplate,
)

# 示例数据：字段名与示例模板里的变量一一对应
examples = [
    {"input": "开心的反义词是什么？", "output": "难过"},
    {"input": "明亮的反义词是什么？", "output": "昏暗"},
]

# 一条示例的模板
example_prompt = ChatPromptTemplate.from_messages([
    ("human", "{input}"),
    ("ai", "{output}"),
])

# 把示例打包成一个「可插入的模板」
few_shot_prompt = FewShotChatMessagePromptTemplate(
    example_prompt=example_prompt,
    examples=examples,
)

# 组装最终 Prompt：system 规则 + 若干示例 + 真正的问题
final_prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个只回答反义词的助手，不要解释。"),
    few_shot_prompt,
    ("human", "{input}"),
])
print(final_prompt.invoke({"input": "寒冷的反义词是什么？"}).to_string())
```

需要兼容传统 LLM 时用字符串版：

```python
from langchain_core.prompts import PromptTemplate, FewShotPromptTemplate

example_prompt = PromptTemplate.from_template("输入：{input}\n输出：{output}")
few_shot = FewShotPromptTemplate(
    examples=examples,
    example_prompt=example_prompt,
    prefix="请模仿下面的示例，只输出反义词：",
    suffix="输入：{input}\n输出：",
    input_variables=["input"],
)
print(few_shot.format(input="寒冷的反义词是什么？"))
```

**易错点：**

- `FewShotPromptTemplate` 至少要给 `prefix` 或 `suffix`，否则示例和真正的问题之间没有边界，模型容易把问题也当成示例、直接续写示例里的答案。
- 示例必须**同构**：格式、粒度、语言一致。混入一条不同格式的示例，模型学到的「模式」就是乱的。
- 示例里的字段名（如 `input` / `output`）必须和 `example_prompt` 的变量名一致，否则渲染报 `KeyError`。
- 示例越多越占 token，超过十几条就该用第 5 题的**示例选择器**动态挑选。

---

## 5. 如何做示例选择器 ExampleSelector

当示例很多（几十上百条）时，把**全部示例**塞进 Prompt 既浪费 token、又引入噪声，还可能稀释真正相关的信号。`ExampleSelector` 的职责就是：**根据当前输入，动态挑出最合适的若干条示例。**

**常见类型：**

| Selector | 选择策略 | 适用场景 |
| --- | --- | --- |
| `LengthBasedExampleSelector` | 按 token 长度贪心挑选，长度超出就少放几条 | 严格控制上下文长度 |
| `SemanticSimilarityExampleSelector` | 用向量相似度挑**最相关**的 K 条 | 最常用，语义相关性优先 |
| `MaxMarginalRelevanceExampleSelector` | 相似度 + 多样性（MMR），避免示例重复 | 示例之间有冗余时 |
| `NGramOverlapExampleSelector` | 按 n-gram 重叠度打分 | 关键词重合度高、无需 embedding |
| 自定义 | 继承 `BaseExampleSelector` 实现 `select_examples` | 规则化、领域专属筛选 |

```python
from langchain_core.prompts import FewShotPromptTemplate, PromptTemplate
from langchain_core.example_selectors import SemanticSimilarityExampleSelector
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS

examples = [
    {"input": "2+2", "output": "4"},
    {"input": "2+3", "output": "5"},
    {"input": "2+4", "output": "6"},
    {"input": "9+9", "output": "18"},
]

# 语义相似度选择器：把示例建成向量库，按输入挑最相关的 k 条
selector = SemanticSimilarityExampleSelector.from_examples(
    examples,
    OpenAIEmbeddings(),   # embedding 模型
    FAISS,                # 向量库类
    k=2,                  # 每轮只挑 2 条
)

example_prompt = PromptTemplate.from_template("输入：{input}\n输出：{output}")
few_shot = FewShotPromptTemplate(
    example_selector=selector,   # 注意：用 selector 时不要同时传 examples
    example_prompt=example_prompt,
    prefix="只输出计算结果：",
    suffix="输入：{input}\n输出：",
    input_variables=["input"],
)
print(few_shot.format(input="2+9"))   # 会优先挑出与「2+x」最相近的示例
```

自定义一个按关键词挑选的选择器：

```python
from langchain_core.example_selectors.base import BaseExampleSelector

class KeywordExampleSelector(BaseExampleSelector):
    """只挑与当前问题关键词重合的示例（示意，实际可做得更精细）。"""

    def __init__(self, examples: list[dict]):
        self.examples = examples

    def add_example(self, example: dict) -> None:
        self.examples.append(example)

    def select_examples(self, input_variables: dict) -> list[dict]:
        query = input_variables["input"]
        hit = [e for e in self.examples if any(w in query for w in ("退货", "退款"))]
        return hit[:2] or self.examples[:1]   # 没命中就退回第一条
```

**易错点：**

- `FewShotPromptTemplate` 的 `examples` 与 `example_selector` **二选一**，同时传会直接报错。
- `SemanticSimilarityExampleSelector` 会多做一次 embedding 调用，**有额外成本与延迟**；示例少于 10 条时，直接全量塞进 Prompt 通常更简单划算。
- 相似度选择依赖 embedding 质量，中文场景要选对中文友好的 embedding 模型，否则挑出来的示例可能毫不相关。
- `select_examples` 的入参是**整个 `input_variables` 字典**，别只取单个字段，否则扩展时改不动。

---

## 6. ChatModel 与 LLM 的区别

**`LLM`** 是「文本补全」接口：**字符串进、字符串出**；**`ChatModel`** 是「对话」接口：**消息列表进、消息对象出**。现代大模型（GPT、Claude、Qwen、GLM）基本都是 ChatModel。

| 维度 | LLM（`BaseLLM`） | ChatModel（`BaseChatModel`） |
| --- | --- | --- |
| 输入 | 一个字符串（prompt） | 一组消息（`List[BaseMessage]`） |
| 输出 | `str` | `AIMessage`（取 `.content` 才是文本） |
| 角色 / 多轮 | 不支持角色，靠文字描述 | 天生支持 `system` / `user` / `assistant` |
| 工具调用 | 不支持 | 支持（`bind_tools` / `with_structured_output`） |
| 结构化输出 | 需自己解析文本 | 原生支持 JSON Schema / function calling |
| 现代地位 | 基本退场（仅遗留补全模型） | **主流** |
| 调用接口 | `invoke` / `stream` / `batch` | `invoke` / `stream` / `batch`（接口已统一） |

```python
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI

# 现代主流：ChatModel，输入是一组消息
chat = ChatOpenAI(model="gpt-4o-mini")
resp = chat.invoke([
    SystemMessage(content="你是简洁的助手。"),
    HumanMessage(content="用一句话解释什么是 RAG。"),
])
print(type(resp))     # <class 'langchain_core.messages.ai.AIMessage'>
print(resp.content)   # 真正要用的文本在这里
print(resp.usage_metadata)  # token 用量（新版挂在消息上）

# 旧式 LLM：字符串进、字符串出（仅示意，已很少用）
# from langchain_community.llms import Ollama
# llm = Ollama(model="qwen2")
# print(llm.invoke("用一句话解释什么是 RAG。"))  # 直接返回字符串
```

**面试怎么答：** 先说「一个收字符串、一个收消息列表」，再补「ChatModel 返回 AIMessage，需要取 `.content`，且支持工具调用与结构化输出，是现代开发的默认选择；两者的 `invoke`/`stream`/`batch` 接口在 0.3.x 已经统一，所以链的写法基本一致」。

**易错点：**

- ChatModel 返回的是 `AIMessage` **对象**，直接当字符串拼接、或直接塞进 `print` 会得到对象表示，必须 `.content`。
- 多模态场景下 `resp.content` 可能是**列表**（文本块 + 图片块），不能再假设它是 `str`，拼接前要先判断类型。
- 一个 `ChatOpenAI` 对象内部持有连接池，建议**复用同一个 model 实例**（其线程安全性用于 `batch` 并发），不要每次调用都新建。

---

## 7. 常见消息类型与作用

LangChain 用不同的消息类来区分「谁在说话」，它们是构建多轮对话与工具调用的基本单元。

| 消息类 | 对应 role | 作用 | 通常由谁生成 |
| --- | --- | --- | --- |
| `SystemMessage` | `system` | 设定角色、规则、全局约束，优先级最高 | 开发者 |
| `HumanMessage` | `user` | 用户输入 | 用户 / 上游系统 |
| `AIMessage` | `assistant` | 模型回复；`tool_calls` 也挂在这里 | 模型 |
| `ToolMessage` | `tool` | 工具执行结果回传给模型 | 工具 / 开发者 |
| `ChatMessage` | 任意（自定义） | 自定义角色的消息（如 `moderator`） | 开发者 |
| `FunctionMessage` | `function` | 旧版函数调用结果，**已被 `ToolMessage` 取代** | 已弃用 |

```python
from langchain_core.messages import (
    SystemMessage, HumanMessage, AIMessage, ToolMessage,
)

messages = [
    SystemMessage(content="你是一个天气助手。"),
    HumanMessage(content="北京今天天气怎么样？"),
    # 模型决定调用工具：tool_calls 挂在 AIMessage 上
    AIMessage(
        content="",
        tool_calls=[{
            "name": "get_weather",
            "args": {"city": "北京"},
            "id": "call_1",
        }],
    ),
    # 工具结果：tool_call_id 必须与上面的 id 对应
    ToolMessage(content='{"temp": 25, "weather": "晴"}', tool_call_id="call_1"),
]

# 把这组消息交给模型，它会基于工具结果继续回答
# from langchain_openai import ChatOpenAI
# resp = ChatOpenAI(model="gpt-4o-mini").invoke(messages)
# print(resp.content)
```

**常用属性：** `.content`（文本内容）、`.tool_calls`（模型的工具调用请求）、`.usage_metadata`（token 用量）、`.id`（消息标识）、`.response_metadata`（厂商原始返回）。

```python
# 历史裁剪：按 token 上限只保留最近的消息
from langchain_core.messages import trim_messages
trimmed = trim_messages(messages, max_tokens=200, strategy="last", token_counter=len)
```

**易错点：**

- `AIMessage.tool_calls[*].id` 与 `ToolMessage.tool_call_id` 必须**一一对应**，缺失或对不上时模型会报「工具调用无法匹配」。
- `SystemMessage` 应放在**最前面**；部分模型会忽略位置靠后的 system 消息，导致规则失效。
- 手工拼多轮时别把 `AIMessage` 的历史 `tool_calls` 忘了带上，否则工具链路会断。
- 旧代码里的 `FunctionMessage` 要做迁移，新版统一用 `ToolMessage`。

---

## 8. 如何调用 OpenAI 与国产模型

**核心思路：绝大多数国产大模型都提供「OpenAI 兼容接口」**，因此可以直接复用 `langchain-openai` 的 `ChatOpenAI`，**只改三项**：`base_url`、`api_key`、`model`，无需额外 SDK、也无需改业务代码。本地模型则用 `langchain-ollama` 的 `ChatOllama`。

| 厂商 | 接入方式 | `base_url` | 模型示例 |
| --- | --- | --- | --- |
| OpenAI | `langchain-openai` 的 `ChatOpenAI` | 默认（无需填） | `gpt-4o` / `gpt-4o-mini` |
| DeepSeek | `ChatOpenAI` 兼容 | `https://api.deepseek.com/v1` | `deepseek-chat` / `deepseek-reasoner` |
| 通义千问 | `ChatOpenAI` 兼容 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-max` / `qwen-plus` |
| 智谱 GLM | `ChatOpenAI` 兼容 | `https://open.bigmodel.cn/api/paas/v4/` | `glm-4` / `glm-4-flash` |
| 月之暗面 Kimi | `ChatOpenAI` 兼容 | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| 本地 Ollama | `langchain-ollama` 的 `ChatOllama` | `http://localhost:11434` | `qwen2.5:7b` / `llama3.1` |

```bash
# 安装 partner 包（0.3.x 起按厂商拆分）
pip install -U langchain-openai langchain-ollama
```

```python
import os
from langchain_openai import ChatOpenAI
from langchain_ollama import ChatOllama

# 1) OpenAI 官方（api_key 也可从环境变量 OPENAI_API_KEY 自动读取）
openai_model = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)

# 2) DeepSeek（OpenAI 兼容）
deepseek = ChatOpenAI(
    model="deepseek-chat",
    api_key=os.environ["DEEPSEEK_API_KEY"],
    base_url="https://api.deepseek.com/v1",
)

# 3) 通义千问（DashScope 的 OpenAI 兼容模式）
qwen = ChatOpenAI(
    model="qwen-plus",
    api_key=os.environ["DASHSCOPE_API_KEY"],
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

# 4) 智谱 GLM
glm = ChatOpenAI(
    model="glm-4-flash",
    api_key=os.environ["ZHIPUAI_API_KEY"],
    base_url="https://open.bigmodel.cn/api/paas/v4/",
)

# 5) 月之暗面 Kimi
kimi = ChatOpenAI(
    model="moonshot-v1-8k",
    api_key=os.environ["MOONSHOT_API_KEY"],
    base_url="https://api.moonshot.cn/v1",
)

# 6) 本地 Ollama（无需 API Key，先 ollama pull qwen2.5:7b）
local = ChatOllama(model="qwen2.5:7b", base_url="http://localhost:11434")

# 它们都是 ChatModel，接口完全一致：同一份 prompt/chain 直接换 model 即可
from langchain_core.prompts import ChatPromptTemplate
prompt = ChatPromptTemplate.from_messages([("human", "{q}")])
for name, model in [("deepseek", deepseek), ("qwen", qwen), ("local", local)]:
    print(name, (prompt | model).invoke({"q": "用一句话介绍你自己。"}).content)
```

**易错点：**

- 换厂商最常见的三个坑：**漏写 `base_url`**（默认打向 OpenAI）、**`api_key` 没配**、**模型名写错**（如把 `glm-4` 写成 `glm4`）。
- 部分 OpenAI 兼容接口**不完全支持** `with_structured_output` 的 `json_schema` 模式，可能需要改用 `method="function_calling"` 或退回到 `PydanticOutputParser`。
- 国产模型的 `max_tokens` 上限、上下文窗口与 OpenAI 不同，超限会直接报错。
- 用 `langchain_community` 里的老封装（如 `ChatZhipuAI`）虽能跑，但推荐统一走兼容接口 + `ChatOpenAI`，减少依赖分裂。
- Ollama 的模型名是本地已 pull 的标签，写错会报 `model not found`。

---

## 9. 如何设置温度、最大 token 等参数

模型参数决定「**输出的随机性**」与「**成本 / 稳定性**」，面试常被追问「temperature 和 top_p 什么关系」「max_tokens 和 max_new_tokens 有何区别」。

| 参数 | 含义 | 建议 |
| --- | --- | --- |
| `temperature` | 采样随机性，越高越发散、越低越确定 | 事实问答 / 抽取 / 分类：`0 ~ 0.3`；创作：`0.7 ~ 1.0` |
| `top_p` | 核采样，只在累积概率前 `top_p` 的词里采样 | 与 `temperature` **只调一个**，不要同时乱调 |
| `max_tokens` | 限制**生成**的最大 token 数（不含输入） | 按输出长度设，防止跑飞与超支 |
| `timeout` | 单次请求超时（秒） | 长文 / 流式可设大一些 |
| `max_retries` | 失败自动重试次数 | 默认 2，网络不稳可调高 |
| `frequency_penalty` | 按出现次数惩罚，降低重复 | 出现复读时小幅调高 |
| `presence_penalty` | 只要出现过就惩罚，鼓励新话题 | 需要发散时小幅调高 |
| `stop` | 停止词，遇到即停 | 控制输出边界 |
| `seed` | 采样种子（部分模型支持） | 追求可复现时使用 |

**关于 token 参数命名（高频追问）：**

- LangChain 的 ChatModel 接口里，参数名统一是 **`max_tokens`**（表示「最多生成多少 token」）。
- OpenAI 已在 2024-09 推出 `max_completion_tokens` 并逐步弃用 `max_tokens`，但 `ChatOpenAI` 层仍以 `max_tokens` 暴露，内部会做转换，**写 `max_tokens` 即可**。
- 而 HuggingFace `transformers` 的生成参数叫 **`max_new_tokens`**（「新生成的 token 数」，不含输入 prompt）。概念与 `max_tokens` 相同，但接入本地 HF 模型时**不要混用命名**，否则报「未知参数」。

```python
from langchain_openai import ChatOpenAI

model = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.0,        # 抽取 / 分类：尽量确定
    max_tokens=256,         # 限制生成长度（输出侧）
    top_p=1.0,              # 默认全量采样；调低可与 temperature 配合
    timeout=30,             # 30 秒超时
    max_retries=3,          # 失败自动重试 3 次
    frequency_penalty=0.0,
    presence_penalty=0.0,
)

# 也可以在单次调用时临时覆盖参数（不同请求不同温度）
resp = model.invoke(
    "把这句话转成 JSON：明天北京晴，25 度。",
    temperature=0.0,
    max_tokens=128,
)
print(resp.content)

# 生成一个固定了参数的 Runnable，不改变原 model（便于不同链用不同参数）
strict_model = model.bind(temperature=0.0, max_tokens=512)
```

**易错点：**

- `temperature=0` **不代表完全确定**：GPU 浮点、并行归约仍有微小非确定性，只能提高可复现概率。
- `top_p` 与 `temperature` 一般只调一个：两者都放低会让输出过于死板、也容易掉进重复。
- `max_tokens` 是**输出上限**，**不含输入**；设太小会把答案截断（可能正好截在 JSON 中间，直接导致解析失败）。
- 与流式配合时，`timeout` 要按「整段生成时间」给，否则长文容易整体超时。
- 不同厂商对参数支持不一（有的不支持 `seed` / `presence_penalty`），传入不支持的参数部分接口会**直接报错**而非忽略。

---

## 10. 模型输出的流式与批量调用

ChatModel（以及所有 Runnable）统一提供三类调用方式，异步版本只是前缀 `a`。

| 方法 | 返回 | 典型场景 |
| --- | --- | --- |
| `invoke` | 一个完整的 `AIMessage` | 简单、一次性请求 |
| `stream` | 迭代 `AIMessageChunk`（增量） | 前端逐字输出、长文本 |
| `batch` | `List[结果]` | 多条独立请求，内部并发执行 |
| `ainvoke` / `astream` / `abatch` | 对应的协程/异步迭代 | 高并发服务（FastAPI） |

```python
from langchain_openai import ChatOpenAI

model = ChatOpenAI(model="gpt-4o-mini")

# 1) 流式：逐块产出 AIMessageChunk，content 是「增量」片段
for chunk in model.stream("写一首关于春天的四行小诗。"):
    print(chunk.content, end="", flush=True)
print()

# 2) 批量：一次提交多条独立输入，内部并发执行
resps = model.batch([
    "把 1 转成英文",
    "把 2 转成英文",
    "把 3 转成英文",
])
for r in resps:
    print(r.content)

# 3) 批量 + 限制并发数，避免触发限流
resps2 = model.batch(
    ["问题 A", "问题 B", "问题 C"],
    config={"max_concurrency": 2},   # 最多同时 2 个请求
)
```

异步流式（Web 服务 SSE 场景）：

```python
import asyncio
from langchain_openai import ChatOpenAI

async def main():
    model = ChatOpenAI(model="gpt-4o-mini")
    async for chunk in model.astream("讲个冷笑话"):
        print(chunk.content, end="", flush=True)

asyncio.run(main())
```

把流式片段**聚合**回完整消息（`AIMessageChunk` 支持相加）：

```python
chunks = list(model.stream("你好"))
full = chunks[0]
for c in chunks[1:]:
    full = full + c        # 累加，得到完整 AIMessage
print(full.content)
```

**易错点：**

- 流式下 `chunk.content` 是**增量片段**，直接赋值覆盖显示会只剩最后一个字，必须**累加**。
- `tool_calls`、`usage_metadata` 在流式里也可能分块出现，需要聚合逻辑，不能只看第一块。
- `batch` 默认并发较高，生产上要配 `max_concurrency` 防限流；`return_exceptions=True` 可让个别失败不影响整批。
- 在 `async` 链路里混用同步 `invoke` 会**阻塞事件循环**，应全程用 `ainvoke` / `astream`。
- LCEL 链也支持 `stream`，但链条中若有**非流式组件**（某些 Parser / 转换器）会导致流式退化，需要逐个确认。

---

## 11. OutputParser 的作用与常见类型

**OutputParser（输出解析器）** 负责把模型的**自然语言输出**转成程序可直接使用的**结构化数据**（字符串、列表、字典、Pydantic 对象）。在 LCEL 里它的位置是链的最后一环：

```text
prompt | model | output_parser
```

| Parser | 作用 | 依赖 |
| --- | --- | --- |
| `StrOutputParser` | `AIMessage` → 纯字符串，最常用 | 无 |
| `JsonOutputParser` | 解析 JSON / dict（容错较好，能剥离代码块） | 无 |
| `PydanticOutputParser` | 解析成 Pydantic 对象（带字段校验） | `pydantic` |
| `CommaSeparatedListOutputParser` | 逗号分隔 → `list[str]` | 无 |
| `XMLOutputParser` | 解析 XML 结构 | `lxml` |
| `RetryOutputParser` / `OutputFixingParser` | 解析失败时交给模型修复/重试 | `langchain`（旧版） |

**关键机制 `get_format_instructions()`**：`PydanticOutputParser` 会生成一段「请按此 JSON Schema 输出」的格式说明，你需要把它**拼进 Prompt**，模型才知道该输出什么格式。

```python
from pydantic import BaseModel, Field
from langchain_core.output_parsers import (
    PydanticOutputParser, JsonOutputParser, StrOutputParser,
)
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

class Movie(BaseModel):
    """电影信息"""
    title: str = Field(description="电影名称")
    year: int = Field(description="上映年份")
    rating: float = Field(description="评分，0-10")

parser = PydanticOutputParser(pydantic_object=Movie)

prompt = ChatPromptTemplate.from_messages([
    ("system", "从用户描述中抽取电影信息。\n{format_instructions}"),
    ("human", "{query}"),
]).partial(format_instructions=parser.get_format_instructions())

chain = prompt | ChatOpenAI(model="gpt-4o-mini", temperature=0) | parser
movie = chain.invoke({"query": "《盗梦空间》2010 年上映，评分 9.3"})
print(type(movie))                 # <class 'Movie'>
print(movie.title, movie.year, movie.rating)

# 只要纯文本
# text_chain = prompt | model | StrOutputParser()
# 只要 dict（不想定义 Pydantic 模型）
# json_chain = prompt | model | JsonOutputParser()
```

**易错点：**

- 用结构化 Parser 时**必须把 `format_instructions` 放进 Prompt**，否则模型不知道目标格式，解析大概率失败。
- `PydanticOutputParser` 遇到多余文字会直接失败（模型输出「好的，结果如下：{...}」）；对格式敏感的场景建议改用 `JsonOutputParser`（容错更强）或 `with_structured_output`（见下一题）。
- `.partial(...)` 把固定内容预填进模板，避免每次都传参；但别把真正需要的变量也 partial 掉。
- `OutputFixingParser` / `RetryOutputParser` 属于旧版组件，在 langchain 0.3 里位于 `langchain.output_parsers`（较新的 1.x 生态里迁移到 `langchain-classic`），迁移时注意导入路径。

---

## 12. 如何获取结构化输出

获取结构化输出有两条路，**现代首选是 `with_structured_output`**。

| 方式 | 原理 | 可靠性 | 适用 |
| --- | --- | --- | --- |
| `model.with_structured_output(schema)` | 底层走模型的 **function calling / json_schema**，由模型原生保证格式 | **高** | 主流 ChatModel（OpenAI、DeepSeek、Qwen 等） |
| `prompt + PydanticOutputParser` | 靠**提示词约束** + 事后文本解析 | 中（依赖模型守格式） | 模型不支持工具调用时 |

```python
from typing import Literal
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

class Review(BaseModel):
    """用户评论的结构化结果"""
    sentiment: Literal["positive", "negative"] = Field(description="情感倾向")
    rating: int = Field(description="评分，1-5", ge=1, le=5)
    key_points: list[str] = Field(description="要点，每条 1-3 个词")

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
structured_model = model.with_structured_output(Review)

result = structured_model.invoke(
    "这家餐厅菜品很棒，服务也热情，就是等位太久。满分 5 分打 4 分。"
)
print(type(result))            # <class 'Review'>
print(result.sentiment, result.rating, result.key_points)

# include_raw=True：同时返回「原始 AIMessage + 解析结果 + 解析报错」，便于调试
structured_raw = model.with_structured_output(Review, include_raw=True)
out = structured_raw.invoke("味道一般，给 3 分。")
# out => {"raw": AIMessage(...), "parsed": Review(...), "parsing_error": None}
print(out["parsed"].rating)
```

接进 LCEL 链，与普通 Runnable 用法一致：

```python
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是评论分析助手。"),
    ("human", "{review}"),
])
chain = prompt | model.with_structured_output(Review)
print(chain.invoke({"review": "服务态度很好，但菜品偏咸，打 3 分。"}))
```

**可指定底层方法：** `model.with_structured_output(Review, method="json_schema")` 或 `method="function_calling"`。默认随厂商选择，兼容接口**可能只支持其中一种**，切换厂商时要验证。

**易错点：**

- `with_structured_output` 依赖模型的**工具调用能力**，某些国产兼容接口或老模型不支持，会静默退化或报错——此时应退回 `PydanticOutputParser` + 明确的 `format_instructions`。
- Schema 字段的 `description` **必须写清楚**，否则模型经常猜错字段含义，尤其在中文字段上。
- 用 `Literal[...]` 固定枚举、用 `Field(ge=..., le=...)` 限定范围，能显著**降低解析失败率**，比自由字符串稳得多。
- `include_raw=True` 会多返回一条 `raw` 消息，`parsed` 为 `None` 时要去看 `parsing_error`，别直接对 `parsed` 取属性。

---

## 13. 输出解析失败的常见原因与处理

**解析失败的本质**：模型输出的文本**不符合预期格式**。处理口诀是「先定位原因，再分场景处理」。

| 常见原因 | 表现 | 处理方式 |
| --- | --- | --- |
| 没把 `format_instructions` 给模型 | 输出自由文本，无法解析 | Prompt 里补格式说明，或改用 `with_structured_output` |
| 模型加了解释性文字 | `好的，结果如下：{...}` | 用 `JsonOutputParser`（容错）；或改结构化输出 |
| 输出被 `max_tokens` 截断 | JSON 不完整、括号没闭合 | 调大 `max_tokens`，或要求输出更简短 |
| 温度过高 | 格式漂移、偶尔不守格式 | 结构化任务把 `temperature` 设为 0 |
| 字段描述含糊 | 字段值答错 / 幻觉 | 写清 `Field(description=...)`，用 `Literal` 限枚举 |
| 模型不支持 json_schema | 结构化输出报错 | 换 `method`，或退回文本 Parser |
| 输出被代码块包裹 | ```json ... ``` | `JsonOutputParser` 会自动剥离 |
| 输入被截断 | 上下文不完整导致瞎编 | 检查历史裁剪 / 上下文拼接逻辑 |

**处理一：优先换更稳的方案（推荐）**

```python
from typing import Literal
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI

class Answer(BaseModel):
    question: str = Field(description="原始问题")
    answer: str = Field(description="简短回答")

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
# 走模型原生约束，失败率最低
structured = model.with_structured_output(Answer, include_raw=True)
out = structured.invoke("什么是 RAG？")
if out["parsing_error"]:
    print("解析失败：", out["parsing_error"])
else:
    print(out["parsed"].answer)
```

**处理二：用 `OutputFixingParser` 自动修复坏输出**

把「原始输出 + 报错信息」再丢回模型，让它重排成正确格式：

```python
from langchain_core.output_parsers import PydanticOutputParser
# langchain 0.3 位于 langchain.output_parsers（1.x 生态迁至 langchain-classic）
from langchain.output_parsers import OutputFixingParser
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

class Answer(BaseModel):
    question: str
    answer: str

model = ChatOpenAI(model="gpt-4o-mini", temperature=0)
parser = PydanticOutputParser(pydantic_object=Answer)
fixing_parser = OutputFixingParser.from_llm(parser=parser, llm=model)

# 单引号、缺双引号等「坏 JSON」会被修复成合法结构
print(fixing_parser.parse("{'question': '什么是 RAG', 'answer': '检索增强生成'}"))
```

**处理三：捕获异常 + 兜底**

```python
from langchain_core.exceptions import OutputParserException

try:
    result = (prompt | model | parser).invoke({"query": "..."})
except OutputParserException as e:
    # 记录原始输出，走兜底逻辑（重试一次 / 降级为纯文本 / 告警）
    print("解析失败，原始输出：", getattr(e, "llm_output", ""))
    result = None
```

**易错点：**

- 不要用 `try/except` 吞掉异常后**静默返回 `None`**——业务会拿到空结果却无从排查，至少要把原始输出与报错**记进日志**。
- `OutputFixingParser` 会**额外调用一次模型**，有成本与延迟，只在失败率不高时作为兜底，别当默认路径。
- 解析失败常被误判为「模型不行」，其实多数是 **Prompt 里没给格式说明** 或 **`max_tokens` 太小把 JSON 截断了**，先查这两点。
- 结构化输出的 schema 一旦**改动**（增删字段、改类型），要同步检查 Prompt 与解析器，否则会出现「字段对不上」的隐性失败。

[← 返回总览](README.md)
