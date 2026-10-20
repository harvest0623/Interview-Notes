# LangChain 常见面试题

> 本目录收录 LangChain / LangGraph 相关的高频面试题及参考答案。因内容较多，按主题拆分为若干分册。默认以 **langchain 0.3.x + langgraph 0.2.x + Python 3.10+** 为背景，涉及旧版 API（如 `LLMChain`、`ConversationBufferMemory`）时会单独标注其弃用状态。

---

## 目录

| 分册 | 内容 | 题量 |
| --- | --- | --- |
| [01 - 基础与 LCEL 篇](01-基础与LCEL篇.md) | LangChain 是什么、整体架构与包结构、与 LangGraph 的关系、LCEL、Runnable 接口、管道符原理、`invoke`/`stream`/`batch`、异步接口、`RunnablePassthrough`/`Lambda`/`Parallel`/`Branch`、`RunnableConfig`、链的组合、调试与观察、核心组件、常见链模式 | 15 |
| [02 - Prompt 与模型篇](02-Prompt与模型篇.md) | `PromptTemplate` 与 `ChatPromptTemplate`、多轮对话提示、`MessagesPlaceholder`、`FewShotPromptTemplate`、`ExampleSelector`、`ChatModel` 与 `LLM`、消息类型、OpenAI 与国产模型接入、模型参数、流式与批量调用、`OutputParser`、结构化输出、解析失败处理 | 13 |
| [03 - RAG 与检索篇](03-RAG与检索篇.md) | RAG 概念与完整链路、`Document Loader`、文本分割器、chunk size 与 overlap、Embedding 原理与模型、向量数据库选型、相似度检索、MMR、检索质量优化、Rerank、父子文档、MultiQuery 与查询改写、常见问题与优化方向 | 14 |
| [04 - Agent 与工具篇](04-Agent与工具篇.md) | Agent 概念与原理、ReAct 模式、`@tool` 自定义工具、Tool Calling 与 Function Calling、`AgentExecutor`、最大迭代次数、LangGraph 核心概念、State 与 Reducer、条件分支、多 Agent 协作、Agent 记忆、人类介入、常见坑与调试 | 14 |
| [05 - 生态与工程实践篇](05-生态与工程实践篇.md) | 记忆机制、短期与长期记忆、历史消息裁剪、LangServe、LangSmith、Callbacks、Token 统计与成本、缓存、流式响应到前端、RAG 与 Agent 评估、版本兼容、部署上线、性能瓶颈、生产排查 | 14 |

---

## 学习路径建议

```
基础与 LCEL 篇（LangChain 的骨架，面试最常问）
   ↓
Prompt 与模型篇（输入输出的组装与解析，动手写链的第一步）
   ↓
RAG 与检索篇（企业落地最多的场景，工程细节最密集）
   ↓
Agent 与工具篇（从 Chain 到自主决策，LangGraph 是当前主流）
   ↓
生态与工程实践篇（记忆、追踪、评估、部署——体现项目经验）
```

> 面试策略：**LCEL 与 Runnable 是硬门槛**（答不出基本说明没真正用过），**RAG 链路是分水岭**（能讲清检索质量优化才算做过落地），**LangGraph 与评估体系是加分项**（体现对新版生态的跟进）。

---

## 高频必背 TOP 10

| 序号 | 题目 | 所在分册 |
| --- | --- | --- |
| 1 | LangChain 是什么？它解决了什么问题？ | [01 - 基础与 LCEL 篇](01-基础与LCEL篇.md#1-langchain-是什么它解决了什么问题) |
| 2 | 什么是 LCEL？ | [01 - 基础与 LCEL 篇](01-基础与LCEL篇.md#4-什么是-lcel) |
| 3 | `invoke`、`stream`、`batch` 的用法与区别？ | [01 - 基础与 LCEL 篇](01-基础与LCEL篇.md#7-invoke-stream-batch-的用法与区别) |
| 4 | `ChatModel` 与 `LLM` 的区别？ | [02 - Prompt 与模型篇](02-Prompt与模型篇.md#6-chatmodel-与-llm-的区别) |
| 5 | 什么是 RAG？ | [03 - RAG 与检索篇](03-RAG与检索篇.md#1-什么是-rag) |
| 6 | RAG 的完整链路是什么？ | [03 - RAG 与检索篇](03-RAG与检索篇.md#2-rag-的完整链路是什么) |
| 7 | 如何提升 RAG 的检索质量？ | [03 - RAG 与检索篇](03-RAG与检索篇.md#10-如何提升-rag-的检索质量) |
| 8 | 什么是 Agent？ | [04 - Agent 与工具篇](04-Agent与工具篇.md#1-什么是-agent) |
| 9 | LangGraph 的核心概念有哪些？ | [04 - Agent 与工具篇](04-Agent与工具篇.md#8-langgraph-的核心概念) |
| 10 | LangSmith 如何做追踪与评估？ | [05 - 生态与工程实践篇](05-生态与工程实践篇.md#5-langsmith-如何做追踪与评估) |

---

## 核心速查表

**包结构与分层**

```
langchain-core       ：Runnable / Prompt / Message / OutputParser 等抽象接口，最稳定
langchain-community  ：社区集成（各种 Loader、VectorStore、Tool），质量参差
langchain-openai      ：OpenAI 官方 partner 包（ChatOpenAI、OpenAIEmbeddings）
langchain-anthropic   ：Anthropic 官方 partner 包（ChatAnthropic）
langchain-xxx         ：其他厂商 partner 包，一年内基本完成拆分
langchain            ：元包，聚合常用组件；旧版 Chain / Memory 已迁往 langchain-classic
langgraph            ：有状态编排（State / Node / Edge / Checkpointer），Agent 的新底座
langserve / langsmith：服务化部署 / 追踪与评估平台
```

**LCEL 常用 Runnable**

```
RunnableSequence       ：管道串起来的顺序链
RunnablePassthrough    ：原样传递输入（.assign 可追加字段）
RunnableLambda         ：把任意函数包装成 Runnable
RunnableParallel       ：并行执行多路，结果合成字典
RunnableBranch         ：按条件选择分支
RunnableWithMessageHistory：为链挂上会话历史
```

**RAG 链路清单**

```
Document Loader → Text Splitter → Embedding → VectorStore
       → Retriever（相似度 / MMR / 多查询） → Rerank → Prompt → LLM → OutputParser
优化点：切块策略、混合检索、重排序、查询改写、上下文压缩、引用溯源
```

**常见工具链**

```
模型接入：langchain-openai / langchain-anthropic / langchain-ollama
向量库　：Chroma（本地开发）、FAISS（内存）、Milvus / pgvector（生产）
检索增强：MultiQueryRetriever、ContextualCompressionRetriever、CrossEncoderReranker
记忆持久：LangGraph Checkpointer（SQLite / Postgres）
观测评估：LangSmith、RAGAS、自定义 LLM-as-Judge
服务化　：LangServe、FastAPI + SSE 流式
```

**易错点清单**

```
1. 别把 | 管道当成 shell 管道，它调用的是 Runnable.__or__，两端必须都是 Runnable
2. ChatModel 返回的是 AIMessage，忘记 .content 直接当字符串用会报错
3. 结构化输出失败多因模型不遵循格式，应优先用 with_structured_output 而非手工解析
4. Retriever 的 k 不是越大越好，噪声会稀释信号，通常配合 Rerank 使用
5. 异步链里混用同步的 invoke 会阻塞事件循环，应统一用 ainvoke
6. Memory 类旧 API 已弃用，新代码用 LangGraph 的 Checkpointer 做持久化
7. 上下文超长不会自动报错只会截断或报 token 超限，需要自己做裁剪与压缩
```
