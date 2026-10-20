# LangChain 面试题 · 03 RAG 与检索篇

[← 返回总览](README.md)

> 内容：RAG 概念与完整链路、`Document Loader`、文本分割器、chunk size 与 overlap、Embedding 原理与模型、向量数据库选型、相似度检索、MMR、检索质量优化、Rerank、父子文档、MultiQuery 与查询改写、常见问题与优化方向（共 14 题）。

---

## 目录

1. [什么是 RAG](#1-什么是-rag)
2. [RAG 的完整链路是什么](#2-rag-的完整链路是什么)
3. [Document Loader 的常见类型](#3-document-loader-的常见类型)
4. [文本分割器有哪些](#4-文本分割器有哪些)
5. [如何选择 chunk size 与 overlap](#5-如何选择-chunk-size-与-overlap)
6. [Embedding 的原理与常见模型](#6-embedding-的原理与常见模型)
7. [向量数据库的选型](#7-向量数据库的选型)
8. [相似度检索的实现原理](#8-相似度检索的实现原理)
9. [什么是 MMR 检索](#9-什么是-mmr-检索)
10. [如何提升 RAG 的检索质量](#10-如何提升-rag-的检索质量)
11. [RAG 中的重排序 Rerank](#11-rag-中的重排序-rerank)
12. [父子文档与小段落检索](#12-父子文档与小段落检索)
13. [MultiQuery 与查询改写](#13-multiquery-与查询改写)
14. [RAG 的常见问题与优化方向](#14-rag-的常见问题与优化方向)

---

## 1. 什么是 RAG

**RAG（Retrieval-Augmented Generation，检索增强生成）**：在让大模型回答之前，先**从外部知识库检索出与问题相关的片段**，把这些片段作为**上下文**和问题一起塞进 Prompt，再让模型基于上下文生成答案。

一句话概括：**先查资料，再作答**——相当于给模型开卷考试，而不是让它闭卷回忆。

**RAG 解决的核心问题：**

1. **幻觉**：模型会一本正经地编造事实，给出可溯源的材料能显著降低编造概率。
2. **知识时效**：训练数据的知识截止时间之后发生的事，模型不知道，RAG 可以随时查最新资料。
3. **私有数据**：企业内部的文档、代码、工单、规章模型从未见过，重新训练成本极高。

**RAG 与微调（Fine-tuning）的对比（面试高频）：**

| 维度 | RAG | 微调 |
| --- | --- | --- |
| 知识存放 | 外部知识库（随时增删改） | 模型权重（已固化） |
| 更新成本 | 低（改索引即可） | 高（需重新训练） |
| 时效性 | 实时 | 训练时刻的快照 |
| 幻觉控制 | 有引用、可溯源 | 仍可能编造 |
| 能改变什么 | 只补充「知识」 | 可改变风格、格式、语气 |
| 数据需求 | 现成文档即可 | 大量高质量标注样本 |
| 主要成本 | 检索 + 推理 | 训练 + 推理 |
| 典型风险 | 检索不到就答不好 | 灾难性遗忘、知识过期 |

结论：**「知识」用 RAG，「能力/风格」用微调**，二者可以叠加——先用微调对齐输出格式，再用 RAG 补充事实知识。

**核心名词速记：**

| 名词 | 含义 |
| --- | --- |
| `Document` | 一段文本 + `metadata` 的载体 |
| Chunk | 切分后的文本块，检索的最小单位 |
| Embedding | 文本的稠密向量表示 |
| VectorStore | 存向量并支持相似度检索的库 |
| Retriever | 抽象接口，输入 query 输出 `Document` 列表 |
| Indexing | 离线把文档加工进向量库的过程 |
| Retrieval | 在线把问题映射到相关文档的过程 |

```python
# 最小可运行的 RAG：加载 → 切块 → 向量化 → 检索 → 生成
# 运行前请先设置环境变量 OPENAI_API_KEY（不要写死在代码里）
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

# 1) 加载：把文档读成 Document 列表
docs = TextLoader("knowledge.txt", encoding="utf-8").load()

# 2) 切块：切成大小合适、带少量重叠的片段
splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
chunks = splitter.split_documents(docs)

# 3) 向量化并建索引（FAISS 是内存向量库，适合原型）
vectorstore = FAISS.from_documents(chunks, OpenAIEmbeddings(model="text-embedding-3-small"))

# 4) 检索器：相似度检索，返回最相关的 4 个片段
retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

# 5) 提示词：强约束「只依据上下文回答」
prompt = ChatPromptTemplate.from_messages([
    ("system", "只根据下面的上下文回答问题；若上下文没有答案，直接回答「不知道」。\n\n上下文：\n{context}"),
    ("human", "{question}"),
])

def format_docs(docs):
    return "\n\n".join(d.page_content for d in docs)

# 6) 用 LCEL 组装 RAG 链：检索结果填进 context，问题原样传给 question
rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | ChatOpenAI(model="gpt-4o-mini", temperature=0)
    | StrOutputParser()
)

print(rag_chain.invoke("这套系统支持哪些部署方式？"))
```

**易错点：**

- RAG 并不会「让模型记住」知识，每次都是临时拼上下文；只改原文档而不重建索引，效果不会变。
- `RetrievalQA.from_chain_type` 是旧版封装（已迁至 `langchain-classic`），新代码统一用 LCEL 或 `create_retrieval_chain`。
- 检索到**无关内容**比「检索不到」更糟——它会主动把模型带偏，所以必须验证检索质量，而不是只看最终答案。

---

## 2. RAG 的完整链路是什么

RAG 分为**两个阶段**：**索引（离线）** 与 **检索生成（在线）**。

```text
索引阶段（离线，可批量、可重跑）
  加载 Document Loader → 切块 Splitter → 向量化 Embedding → 入库 VectorStore

检索生成阶段（在线，要求低延迟）
  用户提问 →（可选）查询改写 → 检索 Retrieve →（可选）重排 Rerank
           → 组装 Prompt（问题 + 上下文）→ LLM 生成 → 输出解析 / 引用
```

| 环节 | 做什么 | 常见组件 | 常见坑 |
| --- | --- | --- | --- |
| 加载 | 把各种格式读成 `Document` | `PyPDFLoader`、`WebBaseLoader`、`DirectoryLoader` | 扫描件无文字层、编码错乱 |
| 切块 | 切成利于检索的片段 | `RecursiveCharacterTextSplitter` | 块太大噪声多、太小语义碎 |
| 向量化 | 文本转向量 | `OpenAIEmbeddings`、`HuggingFaceEmbeddings` | 与索引时模型不一致 |
| 入库 | 存向量 + 元数据 | `FAISS`、`Chroma`、`Milvus`、`Qdrant` | 维度不匹配、无法持久化 |
| 检索 | query → 相关片段 | `as_retriever()`、MMR、混合检索 | k 过小漏召回、过大进噪声 |
| 精排 | 候选重新排序 | `CrossEncoderReranker` | 延迟高，候选不足救不回 |
| 组装 | 拼问题与上下文 | `ChatPromptTemplate` | 上下文超长被截断 |
| 生成 | 基于上下文作答 | `ChatOpenAI` | 不遵循约束、仍会幻觉 |
| 解析 | 结构化/引用输出 | `StrOutputParser`、`with_structured_output` | 忘取 `.content` |

```python
# 生产常用形态：create_retrieval_chain + create_stuff_documents_chain
# 请先设置环境变量 OPENAI_API_KEY
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain

# ---------- 索引阶段 ----------
docs = PyPDFLoader("manual.pdf").load()
splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
chunks = splitter.split_documents(docs)
vectorstore = Chroma.from_documents(
    chunks,
    OpenAIEmbeddings(model="text-embedding-3-small"),
    persist_directory="./chroma_db",   # 持久化，避免每次重建
)
retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

# ---------- 检索生成阶段 ----------
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

prompt = ChatPromptTemplate.from_messages([
    ("system", "你是企业知识助手，只依据检索到的上下文作答，并在末尾列出引用来源编号。\n\n上下文：\n{context}"),
    ("human", "{input}"),
])

# 1) 文档组合链：把检索到的文档「stuff」进 prompt 上下文
question_answer_chain = create_stuff_documents_chain(llm, prompt)

# 2) 检索链：自动完成 检索 → 填充 context → 生成
rag_chain = create_retrieval_chain(retriever, question_answer_chain)

result = rag_chain.invoke({"input": "系统的默认并发数是多少？"})
print(result["answer"])    # 生成的答案
print(result["context"])   # 本次实际用到的 Document 列表（便于调试与溯源）
```

**易错点：**

- 索引与检索两个阶段使用的 **embedding 模型必须一致**，否则向量不在同一空间，检索结果完全失真。
- `create_retrieval_chain` 返回的是 **dict**，字段为 `input` / `context` / `answer`，不是字符串，直接当字符串用会报错或拿到整个字典。
- 加载与重排这类重操作不应放进每次在线请求；重排应只作用于小规模候选集。

---

## 3. Document Loader 的常见类型

**Document Loader** 负责把不同来源、不同格式的数据读成 LangChain 统一的 `Document` 对象（`page_content` + `metadata`）。它是整条链路的入口，**入口丢信息，后面怎么调都救不回来**。

| Loader | 来源 | 依赖 | 典型场景 |
| --- | --- | --- | --- |
| `TextLoader` | `.txt` | 无 | 纯文本 |
| `PyPDFLoader` | PDF（文字层） | `pypdf` | 常规 PDF，逐页返回 |
| `UnstructuredPDFLoader` | PDF/扫描件 | `unstructured` | 复杂排版、OCR 场景 |
| `CSVLoader` | `.csv` | `csv` | 每行一条记录 |
| `JSONLoader` | `.json` | `jq` | 结构化字段抽取 |
| `UnstructuredMarkdownLoader` | `.md` | `unstructured` | Markdown 文档 |
| `WebBaseLoader` | 网页 URL | `beautifulsoup4` | 抓取在线文档 |
| `DirectoryLoader` | 目录 | 配合上述 Loader | 批量加载整个目录 |
| `DoclingLoader` / `UnstructuredWordDocumentLoader` | Word/PPT | 相应库 | 办公文档 |
| `NotionDBLoader` / `ConfluenceLoader` | SaaS | API | 企业知识库 |

```python
# 常见 Loader 组合用法
from langchain_community.document_loaders import (
    PyPDFLoader, DirectoryLoader, WebBaseLoader, CSVLoader,
)

# 1) 单个 PDF：每个页面一个 Document，metadata 含 source 与 page
pages = PyPDFLoader("docs/manual.pdf").load()
print(pages[0].metadata)   # {'source': 'docs/manual.pdf', 'page': 0}

# 2) 整个目录的 PDF：glob 指定扩展名，loader_cls 指定具体 Loader
loader = DirectoryLoader(
    "docs/",
    glob="**/*.pdf",
    loader_cls=PyPDFLoader,
    show_progress=True,
    use_multithreading=True,
)
dir_docs = loader.load()

# 3) 网页：抽取正文文本（可传 bs_kwargs 控制选择器）
web_docs = WebBaseLoader(
    "https://example.com/post",
    bs_kwargs={"parse_only": None},
).load()

# 4) CSV：source_column 指定哪一列作为来源标识
csv_docs = CSVLoader("faq.csv", source_column="url").load()

# 5) 懒加载：返回生成器，大文件不一次性吃内存
for doc in DirectoryLoader("docs/", loader_cls=PyPDFLoader).lazy_load():
    pass   # 逐条处理，例如边读边切块
```

> 提示：`metadata` 是后续**过滤检索**（按部门、按时间、按权限）与**引用溯源**的基础。加载时就要把 `source`、`title`、`page`、`department` 等字段补全，不要等到检索时才追悔。

**易错点：**

- **扫描版 PDF 没有文字层**，`PyPDFLoader` 只能抽到空内容；需要走 OCR（`unstructured` + `tesseract`，或 `pdfplumber`/专用 OCR 服务）。
- `.load()` 一次性返回 `list[Document]`，`.lazy_load()` 返回生成器；大批量文件请用后者。
- 不同 Loader 的 `metadata` 字段不一致，若依赖某个字段做过滤，需在加载阶段统一规范化。
- 网页抓取要注意反爬、动态渲染（JS 渲染的内容 `WebBaseLoader` 抓不到，需 `PlaywrightURLLoader` 等）。

---

## 4. 文本分割器有哪些

**文本分割器（Text Splitter）** 把长文档切成块。切块质量直接决定检索上限：**块是检索的最小单位，块不好，检索必然不好**。

| 分割器 | 切分依据 | 是否保留结构 | 典型场景 |
| --- | --- | --- | --- |
| `CharacterTextSplitter` | 单一分隔符（默认 `\n\n`） | 否 | 简单文本，易产出超长块 |
| `RecursiveCharacterTextSplitter` | 分隔符列表递归回退 | 部分 | **通用默认首选** |
| `RecursiveCharacterTextSplitter.from_language` | 语言级分隔符（按语法） | 是 | 源代码（py/js/java…） |
| `TokenTextSplitter` | token 数 | 否 | 严格控制 token 预算 |
| `MarkdownHeaderTextSplitter` | Markdown 标题层级 | 是 | 结构化笔记、文档站 |
| `HTMLHeaderTextSplitter` | HTML 标签层级 | 是 | 网页正文 |
| `SemanticChunker` | 语义相似度断点 | 否 | 高质量切块（慢、贵） |
| `RecursiveJsonSplitter` | JSON 层级 | 是 | 配置、接口 JSON |

```python
# 1) 通用首选：递归切分，按 [段落, 换行, 句号, 空格] 顺序回退
from langchain_text_splitters import (
    RecursiveCharacterTextSplitter, MarkdownHeaderTextSplitter, TokenTextSplitter,
)

splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=100,
    separators=["\n\n", "\n", "。", "！", "？", "；", " ", ""],  # 中文场景可按需调整
    add_start_index=True,   # metadata 里记录块在原文的起始位置，便于溯源
)
chunks = splitter.split_documents(docs)

# 2) 代码：按语言语法（类/函数/语句）切，保留结构
code_splitter = RecursiveCharacterTextSplitter.from_language(
    language="python", chunk_size=500, chunk_overlap=0,
)
code_chunks = code_splitter.split_text(open("app.py", encoding="utf-8").read())

# 3) Markdown：先按标题切，再用递归分割器兜底可能超长的块
md_splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=[("#", "h1"), ("##", "h2"), ("###", "h3")]
)
md_sections = md_splitter.split_text(open("guide.md", encoding="utf-8").read())
md_chunks = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=80).split_documents(md_sections)

# 4) 按 token 切：适合对上下文预算敏感的场景
token_splitter = TokenTextSplitter(chunk_size=512, chunk_overlap=50)
token_chunks = token_splitter.split_documents(docs)

# 5) 语义切分：依据相邻句子 embedding 相似度找「话题断点」
# 需额外安装 langchain-experimental
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings
semantic_splitter = SemanticChunker(OpenAIEmbeddings(), breakpoint_threshold_type="percentile")
semantic_chunks = semantic_splitter.split_documents(docs)
```

**易错点：**

- `CharacterTextSplitter` 只认**一个**分隔符，遇到没有该分隔符的超长段落会**原样返回**，产出超过 `chunk_size` 的巨块；通用场景应改用 `RecursiveCharacterTextSplitter`。
- `MarkdownHeaderTextSplitter` 只按标题切，**仍可能超长**，实践中要与 `RecursiveCharacterTextSplitter` 串联。
- `SemanticChunker` 在 `langchain-experimental` 中，需要调用 embedding，**速度慢、有成本**，适合离线高质量建库。
- 切块时务必开启 `add_start_index`，否则后续做「引用第几段」时无法定位。

---

## 5. 如何选择 chunk size 与 overlap

**chunk_size** 是每块的（字符或 token）长度上限，**chunk_overlap** 是相邻块的重叠长度。二者没有「唯一正确答案」，要结合**文档结构、问题粒度、embedding 模型的最大输入、生成模型的上下文窗口**来定。

| 场景 | chunk_size（字符） | chunk_overlap | 说明 |
| --- | --- | --- | --- |
| 通用文本问答 | 500 – 1000 | 10% – 20% | 最稳妥的起点 |
| 技术文档 / API 手册 | 800 – 1500 | 100 – 200 | 概念段落较长 |
| FAQ / 短问答 | 200 – 400 | 0 – 50 | 一问一答天然成块 |
| 长文 / 书籍 / 法条 | 1000 – 2000 | 150 – 300 | 保证上下文完整 |
| 代码 | 按函数/类，200 – 500 | 0 – 50 | 用语言分割器，别按字符硬切 |

**决策依据：**

1. **块太大**：噪声多、检索粒度粗、真相关的那句话被稀释、token 成本高、容易触发「lost in the middle」（模型忽略长上下文中段）。
2. **块太小**：语义不完整、跨块信息被切断（如「它适用于以上三种情况」）、命中多但每块都答不全。
3. **overlap 的作用**：防止关键句恰好被切在块边界，导致两边都读不懂。overlap 太大会造成**重复召回**与存储浪费。

```python
# 用「字符长度」切分（默认），适合中英文混排
from langchain_text_splitters import RecursiveCharacterTextSplitter

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=120,          # 约 15%，常用 10%~20%
    length_function=len,        # 也可换成 token 计数函数
    add_start_index=True,
)
chunks = text_splitter.split_documents(docs)
print(f"共 {len(chunks)} 块，首块长度 {len(chunks[0].page_content)}")

# 用「token 数」切分：当生成模型上下文预算紧张、需要精确控制时
import tiktoken
from langchain_text_splitters import RecursiveCharacterTextSplitter

enc = tiktoken.get_encoding("cl100k_base")
token_splitter = RecursiveCharacterTextSplitter(
    chunk_size=256,
    chunk_overlap=32,
    length_function=lambda t: len(enc.encode(t)),   # 以 token 计长度
)

# 小实验：扫描不同 chunk_size，观察块数量与平均长度
for size in (400, 800, 1200):
    s = RecursiveCharacterTextSplitter(chunk_size=size, chunk_overlap=size // 8)
    result = s.split_documents(docs)
    avg = sum(len(c.page_content) for c in result) / len(result)
    print(f"size={size} → 块数={len(result)}，平均长度={avg:.0f}")
```

> 提示：把切块当作**可调超参数**。先用「`RecursiveCharacterTextSplitter` + 800/100」做基线，再用评估集（如 RAGAS 的 `context_recall` / `context_precision`）对比不同切块策略，用数据而不是感觉决定。若文档有强结构（标题、条款），优先结构感知切分，而非无条件调小 `chunk_size`。

**易错点：**

- 用字符数当长度时，中文一个字算 1、英文一个词算多个字符，**同一 `chunk_size` 下中英文字数差异很大**，需要分别调。
- `chunk_overlap` 不能大于等于 `chunk_size`，否则切分器会报错或陷入重复。
- 盲目调小 `chunk_size` 会切碎语义，反而不如用「父子文档」兼顾检索精度与上下文完整性。

---

## 6. Embedding 的原理与常见模型

**Embedding（文本嵌入）** 把文本映射为固定维度的稠密向量，使**语义相近的文本在向量空间中距离更近**。它是「语义检索」能够工作的根本。

**原理要点：**

1. **双塔（bi-encoder）结构**：query 与 document **分别**编码成向量，因此文档向量可以**离线预计算**，线上只需编码 query 再做一次相似度比较，速度快。
2. **对比学习训练**：正样本对（问题—正确答案）拉近、负样本对推远，常配合 in-batch negatives 提升效果。
3. **相似度**：用余弦相似度或点积度量方向接近程度；很多模型输出已做 L2 归一化，此时**余弦 = 点积**。
4. **非对称检索**：query 通常是短问题、doc 是长段落，天然不对称，因此部分模型要求给 query 加**指令前缀**。

| 模型 | 维度 | 语言 | 形态 | 备注 |
| --- | --- | --- | --- | --- |
| `text-embedding-3-small` | 1536 | 多语言 | API | 便宜、够用，支持自定义降维 |
| `text-embedding-3-large` | 3072 | 多语言 | API | OpenAI 效果最强，成本更高 |
| `BAAI/bge-m3` | 1024 | 多语言 | 本地 | 支持稠密+稀疏+多向量，长文本友好 |
| `BAAI/bge-large-zh-v1.5` | 1024 | 中文 | 本地 | 中文检索常用，需加 query 指令 |
| `moka-ai/m3e-base` | 768 | 中文 | 本地 | 轻量，资源受限时可用 |
| `jina-embeddings-v3` | 1024 | 多语言 | API/本地 | 支持长文本与任务指令 |
| `text-embedding-004` | 768 | 多语言 | API | Google/Gemini 生态 |
| `embed-v3`（Cohere） | 1024 | 多语言 | API | 用 `input_type` 区分检索/索引 |

```python
# 方式一：云端 API（OpenAI）
from langchain_openai import OpenAIEmbeddings

api_emb = OpenAIEmbeddings(model="text-embedding-3-small")   # 读环境变量 OPENAI_API_KEY
v1 = api_emb.embed_query("如何配置并发数")
print(len(v1))   # 1536

# 方式二：本地模型（HuggingFace），无网络也能跑，适合私有化部署
from langchain_community.embeddings import HuggingFaceEmbeddings

local_emb = HuggingFaceEmbeddings(
    model_name="BAAI/bge-large-zh-v1.5",           # 首次运行会自动下载权重
    model_kwargs={"device": "cpu"},                 # 有 GPU 可改 "cuda"
    encode_kwargs={"normalize_embeddings": True},   # 归一化，便于用点积/余弦
)
docs_vec = local_emb.embed_documents(["系统的默认并发数是 4", "日志保留 7 天"])
print(len(docs_vec), len(docs_vec[0]))   # 2 条文档，各 1024 维

# 注意：bge 中文系列做「检索」时，query 需要加指令前缀，效果才最佳
query = "为这个句子生成表示以用于检索相关文章：系统的默认并发数是多少"
print(len(local_emb.embed_query(query)))
```

**易错点：**

- **换 embedding 模型必须重建整个向量库**：旧向量与新模型不在同一向量空间，混用会得到毫无意义的相似度。
- 中文模型（如 `bge-zh`）在**检索**时通常要求给 query 加特定指令前缀，不加会使效果明显下降；这属于「训练时约定」，不是可选项。
- 是否归一化会影响「余弦」与「点积」是否等价；自行计算相似度时要确认模型输出的归一化状态。
- 不同模型维度不同（768 / 1024 / 1536 / 3072），入库前必须与向量库维度配置对齐。

---

## 7. 向量数据库的选型

向量数据库负责**存储向量并做相似度检索**。选型要综合考虑**部署形态、元数据过滤能力、性能规模、成本、运维复杂度**。

| 数据库 | 类型 | 部署形态 | 元数据过滤 | 性能 / 规模 | 成本 | 适用场景 |
| --- | --- | --- | --- | --- | --- | --- |
| **FAISS** | 库（非服务） | 进程内 | 弱（多为后过滤） | 极高（内存），百万级内 | 免费 | 原型、离线批处理、单机内存够用 |
| **Chroma** | 轻量 DB | 进程内 / 单机服务 | 支持（`where`） | 中，十万级内 | 免费 | 本地开发、小规模应用 |
| **Milvus** | 分布式 DB | 集群（K8s/单机） | 支持（强，pre-filter） | 高，十亿级 | 自建/云 | 大规模生产、需水平扩展 |
| **pgvector** | PG 扩展 | 复用 PostgreSQL | 支持（SQL） | 中（HNSW 后可观） | 低（复用现有 PG） | 已用 PG、要事务与 JOIN、数据量中等 |
| **Qdrant** | 向量 DB | 单机/集群/云 | 支持（强，payload 过滤） | 高，Rust 实现 | 免费/云 | 生产常用，过滤灵活 |
| **Pinecone** | SaaS（全托管） | 无需自运维 | 支持 | 高 | 按量付费 | 免运维、快速上线 |
| **Weaviate** | 向量 DB | 自建/云 | 支持 | 中高 | 免费/云 | 需要混合检索、模块化能力 |
| **Elasticsearch / OpenSearch** | 搜索引擎 | 集群 | 支持 | 中高 | 自建/云 | 已有 ES，做传统 BM25 + 向量混合检索 |

**选型口诀（面试可照此作答）：**

```text
原型验证            → Chroma（最省事）或 FAISS（最快）
单机 / 中小规模生产 → Qdrant 或 pgvector（复用已有 PG）
大规模 / 高并发     → Milvus（可水平扩展，功能最全）
完全不想运维        → Pinecone 等全托管 SaaS
已重度使用 ES       → ES 的向量字段 + BM25 做混合检索
```

```python
# ---------- A. FAISS：速度快，适合原型，需自行持久化 ----------
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

emb = OpenAIEmbeddings(model="text-embedding-3-small")
faiss_db = FAISS.from_documents(chunks, emb)
faiss_db.save_local("faiss_index")                      # 持久化到本地目录
faiss_db2 = FAISS.load_local(
    "faiss_index", emb, allow_dangerous_deserialization=True   # 本地文件反序列化需显式开启
)
print(faiss_db2.similarity_search("默认并发数", k=3))

# ---------- B. Chroma：支持元数据过滤，适合中小规模 ----------
from langchain_community.vectorstores import Chroma

chroma_db = Chroma.from_documents(
    chunks,
    emb,
    persist_directory="./chroma_db",
    collection_name="kb",
)

# 元数据过滤（where 语法）：只检索「部门=工程」且「年份>=2024」的块
filtered = chroma_db.similarity_search(
    "部署要求",
    k=3,
    filter={"$and": [{"department": "工程"}, {"year": {"$gte": 2024}}]},
)
print(len(filtered))

# ---------- C. Qdrant：生产常用，payload 过滤强 ----------
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient

client = QdrantClient(url="http://localhost:6333")       # 也可用 :memory: 本地调试
qdrant_db = QdrantVectorStore.from_documents(
    chunks, emb, client=client, collection_name="kb",
)
print(qdrant_db.similarity_search("默认并发数", k=3))
```

**易错点：**

- **FAISS 是「库」不是「服务」**：不能多进程并发写，也不自带持久化，重启需靠 `save_local` / `load_local`。
- **「支持过滤」有两种语义**：pre-filter（先按元数据过滤再检索，准确）与 post-filter（先检索再过滤，可能召回不足）。数据量大时务必选支持 **pre-filter** 的库（Milvus、Qdrant）。
- 迁移数据库时**必须重写向量**，不能只搬元数据——不同库的索引结构不通用。
- Chroma 默认落盘到本地目录，多副本/多进程部署要注意并发与锁；`FAISS.load_local` 反序列化本地文件需显式传 `allow_dangerous_deserialization=True`（只对自己生成的文件开启）。
- 向量维度必须与 embedding 模型一致，配置不一致会直接写入失败或检索异常。

---

## 8. 相似度检索的实现原理

**相似度检索**：把 query 编码成向量，在向量库中找出与它**距离最近**的 k 个文档向量，返回对应文本。

**常见的距离度量：**

| 度量 | 含义 | 特点 | 归一化后 |
| --- | --- | --- | --- |
| 余弦相似度 Cosine | 向量夹角余弦 | 只看方向，不受长度影响 | 与点积等价 |
| 点积 Dot Product | 向量内积 | 受长度影响，未归一化时不等价于余弦 | 与余弦等价 |
| 欧氏距离 L2 | 直线距离 | 越小越相似，常用于图像/通用场景 | 单调对应余弦 |
| 曼哈顿距离 L1 | 坐标差绝对值之和 | 对个别维度异常更稳健 | 少用 |

**索引结构与近似检索（ANN）：**

| 索引 | 原理 | 精度 | 速度 | 内存 |
| --- | --- | --- | --- | --- |
| Flat（暴力） | 逐个比较全部向量 | 精确 | 慢（线性） | 大 |
| IVF | 先聚类分桶，只搜少数桶 | 近似 | 快 | 中 |
| PQ | 乘积量化压缩向量 | 近似 | 很快 | 小 |
| IVF-PQ | 分桶 + 量化组合 | 近似 | 很快 | 很小 |
| HNSW | 分层可导航小世界图 | 近似（高） | 极快 | 较大 |

ANN 的本质：**用少量精度换大幅速度**，参数（如 HNSW 的 `efSearch`、IVF 的 `nprobe`）就是在「召回率」与「延迟」之间调平衡。

```python
# 相似度打分：不同库返回的 score 语义不同，务必先确认是「距离」还是「相似度」
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

db = FAISS.from_documents(chunks, OpenAIEmbeddings(model="text-embedding-3-small"))

# 1) 带距离分数：FAISS 的 L2 索引返回的是「距离」，越小越相关
for doc, score in db.similarity_search_with_score("默认并发数是多少", k=4):
    print(f"距离={score:.4f}  {doc.page_content[:40]}")

# 2) 归一化后的相似度（0~1，越大越相关），便于用阈值过滤
for doc, score in db.similarity_search_with_relevance_scores("默认并发数是多少", k=4):
    print(f"相似度={score:.4f}  {doc.page_content[:40]}")

# 3) 用相似度阈值过滤低质量结果（search_type="similarity_score_threshold"）
retriever = db.as_retriever(
    search_type="similarity_score_threshold",
    search_kwargs={"score_threshold": 0.5, "k": 5},
)
docs = retriever.invoke("默认并发数是多少")
print(f"通过阈值的文档数：{len(docs)}")
```

**易错点：**

- FAISS 的 L2 索引默认返回**距离**（越小越相似），而 `similarity_score_threshold` 期望的是**相似度**（越大越相似，0~1）；直接混用会「筛空」或「筛不掉」，务必用 `similarity_search_with_relevance_scores` 对齐语义。
- 余弦与点积在**未归一化**时结果不同；OpenAI 向量默认已归一化，本地模型不一定，需自行确认。
- k 越大召回越高但噪声越多，常见做法是**先召回 20~50 个候选，再 Rerank 精选 3~5 个**送入 LLM。
- 高维向量的精确检索是 O(N)，数据量上去后必须上 ANN 索引，否则延迟不可接受。

---

## 9. 什么是 MMR 检索

**MMR（Maximal Marginal Relevance，最大边际相关性）** 是一种在**相关性**与**多样性**之间取平衡的检索策略：每次挑选「与问题相关」且「与已选结果尽量不重复」的文档，避免返回一堆高度雷同的片段。

**选择公式：**

```text
MMR = argmax_{d ∈ C \ S} [ λ · sim(d, q)  −  (1 − λ) · max_{d_j ∈ S} sim(d, d_j) ]
```

其中 `C` 是候选集、`S` 是已选集合、`λ` 是权衡系数：

- `λ = 1` → 退化为纯相似度检索；
- `λ = 0` → 只看多样性，几乎不管相关性；
- 默认 `λ = 0.5`，问答场景常取 `0.5 ~ 0.7`。

| 维度 | 相似度检索（similarity） | MMR 检索（mmr） |
| --- | --- | --- |
| 目标 | 只追求最相关 | 相关性 + 多样性 |
| 结果特点 | 可能高度重复（同一段落的多个副本） | 覆盖多角度，信息更全面 |
| 额外参数 | `k` | `k`、`fetch_k`、`lambda_mult` |
| 典型用途 | 精确问答、单点事实 | 综述、多角度问答、长文档摘要 |
| 代价 | 低 | 需先取候选再迭代挑选，略慢 |

```python
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

db = FAISS.from_documents(chunks, OpenAIEmbeddings(model="text-embedding-3-small"))

# 相似度检索：直接取最相关的 4 条
sim_retriever = db.as_retriever(search_kwargs={"k": 4})

# MMR 检索：先取 20 个候选（fetch_k），再挑出 6 个既相关又多样的（k）
mmr_retriever = db.as_retriever(
    search_type="mmr",
    search_kwargs={
        "k": 6,            # 最终返回数量
        "fetch_k": 20,     # 送给 MMR 算法的候选数量
        "lambda_mult": 0.5 # 0=最大多样性，1=最大相关性
    },
)

q = "这套系统在安全性和性能上有哪些设计？"
print("相似度：", [d.page_content[:20] for d in sim_retriever.invoke(q)])
print("MMR  ：", [d.page_content[:20] for d in mmr_retriever.invoke(q)])
```

**易错点：**

- MMR 需要先把 `fetch_k` 个候选**取回内存**再迭代挑选；`fetch_k` 太小会退化成相似度检索，太大则拖慢速度。
- MMR 是**去冗余**，**不解决「召回不到」**——候选里没有的内容，它变不出来，需与查询改写/Rerank 配合。
- `lambda_mult` 越小越多样的同时越可能引入弱相关文档；纯事实问答反而可能因「追求多样」而漏掉最相关的那条。

---

## 10. 如何提升 RAG 的检索质量

RAG 的瓶颈**绝大多数在检索，而非生成**。面试回答建议按下面六条主线成体系展开。

| # | 手段 | 解决什么 | 代价 | 何时用 |
| --- | --- | --- | --- | --- |
| 1 | **切块策略**（结构感知、overlap、父子文档） | 语义不完整、边界切断 | 实现成本 | 基础，始终要做 |
| 2 | **混合检索**（向量 + BM25/关键词） | 专有名词、编号、缩写召回差 | 多一路检索 | 术语多、含代码/型号 |
| 3 | **Rerank 重排** | 召回了但排序不准 | 延迟↑、需模型 | 有算力、要求精度 |
| 4 | **查询改写**（MultiQuery、HyDE、分解） | 用户问法与文档表述不一致 | 多一次 LLM | 口语化提问、多轮 |
| 5 | **上下文压缩** | 噪声多、上下文超长 | 一次压缩调用 | 命中多但冗余 |
| 6 | **引用溯源** | 不可信、无法评估 | 元数据要求 | 面向用户、要评估 |

**展开说明：**

- **切块**：优先结构感知（标题/条款/函数），用「小块检索、大块返回」（父子文档）兼顾精度与完整性。
- **混合检索**：向量擅长语义泛化，BM25 擅长精确匹配（型号、编号、专有名词）。用 `EnsembleRetriever` 融合，或在库内用 RRF（Reciprocal Rank Fusion）合并两路排名。
- **Rerank**：把粗排召回的 Top-50 用 cross-encoder 精排成 Top-5，是性价比最高的精度提升手段之一。
- **查询改写**：MultiQuery 多视角召回、HyDE 用假想答案检索、复杂问题分解为子问题、多轮对话消解代词。
- **上下文压缩**：用 LLM 或小模型把命中片段压缩成要点，去掉无关内容，降低 token 成本、提升注意力集中度。
- **引用溯源**：返回 `source`、页码与片段编号，让答案可核对，也是评估检索质量的前提。

```python
# 混合检索：向量检索 + BM25 关键词检索，用 EnsembleRetriever 融合
from langchain_community.retrievers import BM25Retriever
from langchain.retrievers import EnsembleRetriever
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings

# 1) 向量检索器：语义召回，取 10 条
vector_db = FAISS.from_documents(chunks, OpenAIEmbeddings(model="text-embedding-3-small"))
vector_retriever = vector_db.as_retriever(search_kwargs={"k": 10})

# 2) BM25 关键词检索器：精确匹配型号/编号，取 10 条
bm25_retriever = BM25Retriever.from_documents(chunks)
bm25_retriever.k = 10

# 3) 融合两路结果（weights 控制各自权重，和为 1）
ensemble_retriever = EnsembleRetriever(
    retrievers=[vector_retriever, bm25_retriever],
    weights=[0.6, 0.4],
)

docs = ensemble_retriever.invoke("型号 X200 的默认并发数是多少")
print(f"融合后候选数：{len(docs)}")

# 中文 BM25 需要合适的分词；BM25Retriever 默认按空格切分，
# 中文场景建议先自行分词（如 jieba）再传入 preprocess_func
import jieba
bm25_zh = BM25Retriever.from_documents(
    chunks,
    preprocess_func=lambda t: list(jieba.cut(t)),   # 用 jieba 分词替换默认切分
)
```

> 提示：优化一定要有**评估闭环**。用 RAGAS 的 `context_recall`（该召回的召回了没）、`context_precision`（召回的干不干净）、`faithfulness`（答案是否忠于上下文）做基线，再逐项对比改动效果；否则「感觉变好了」往往只是错觉。

**易错点：**

- **不要一次上全套**：混合检索 + 重排 + 改写会显著增加延迟与成本，应按瓶颈**分层添加**并持续评估。
- 中文 BM25 必须处理分词，默认按空格切分对中文几乎无效。
- 提升召回（加大 k、多路检索）会引入更多噪声，通常要**同步上线 Rerank**，否则噪声会稀释信号、拖累生成质量。

---

## 11. RAG 中的重排序 Rerank

**Rerank（重排序）** 是「两段式检索」的第二段：先用便宜、快速的方式**召回**一批候选，再用更贵、更准的模型对这些候选**精排**，只把最好的几条交给 LLM。

**为什么需要它：** 向量检索用的是 **bi-encoder**（query、doc 分开编码），为了能离线预计算文档向量，牺牲了 query 与 doc 之间的细粒度交互；**cross-encoder** 把 query 与 doc **拼接后一起编码**，能建模二者的交互，精度更高，但每对都要现场计算，无法预计算。

| 维度 | Bi-Encoder（向量检索） | Cross-Encoder（重排） |
| --- | --- | --- |
| 编码方式 | query、doc 分别编码 | query + doc 拼在一起编码 |
| 能否离线预计算 | 能（文档侧） | 不能（每对都要算） |
| 复杂度 | 近似 O(1) 检索，O(N) 建库 | 每个候选算一次，O(k) |
| 精度 | 粗排 | 精排，显著更准 |
| 在链路中的角色 | 从百万级召回 Top-k | 把 Top-k 精排成 Top-n |
| 典型模型 | `bge-m3`、`text-embedding-3` | `bge-reranker-base/large`、Cohere Rerank、Jina Reranker |

```python
# 用 Cross-Encoder 重排：召回 20 条 → 精排保留 4 条
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import CrossEncoderReranker
from langchain_community.cross_encoders import HuggingFaceCrossEncoder

# 1) 基础检索器：先粗排召回较多候选（k=20）
db = FAISS.from_documents(chunks, OpenAIEmbeddings(model="text-embedding-3-small"))
base_retriever = db.as_retriever(search_kwargs={"k": 20})   # 注意：召回要「多」

# 2) 交叉编码器：中文场景可用 BAAI/bge-reranker-base 或 -v2-m3
model = HuggingFaceCrossEncoder(model_name="BAAI/bge-reranker-base")
compressor = CrossEncoderReranker(model=model, top_n=4)     # 精排后只留 4 条

# 3) 压缩检索器：把「召回 + 精排」串起来，对外仍是标准 Retriever 接口
compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=base_retriever,
)

docs = compression_retriever.invoke("系统在高并发下如何保证稳定性？")
print(f"重排后文档数：{len(docs)}")
for d in docs:
    print("-", d.page_content[:40])
```

```python
# 轻量替代：FlashRank（无需 GPU，依赖极轻，适合快速上线）
from langchain_community.document_compressors import FlashrankRerank
from langchain.retrievers import ContextualCompressionRetriever

flash = FlashrankRerank(top_n=4)     # 内部使用轻量 cross-encoder
compression_retriever = ContextualCompressionRetriever(
    base_compressor=flash, base_retriever=base_retriever,
)
```

**易错点：**

- Rerank **只能改善「候选里已有的」结果顺序**；若正确文档压根没被召回（不在 Top-k 中），重排救不回来——**先保证召回，再谈精排**。
- cross-encoder 是**逐对计算**，线上延迟随候选数线性增长；`k` 一般取 20~50，别把几千条丢给重排器。
- 重排模型与 embedding 模型相互独立、可自由搭配；但语言最好一致（中文内容选中文重排模型），否则精度会打折。
- 重排会改变文档顺序但**不会改写内容**；若还想去噪/压缩，需再接上下文压缩环节。

---

## 12. 父子文档与小段落检索

**核心思想：索引用小片段（保证检索精度），返回给 LLM 用大片段（保证上下文完整）。** 这样就绕开了「块大则检索粗、块小则上下文碎」的两难。

**两种典型实现：**

| 方案 | 索引单元 | 返回单元 | 关键组件 | 特点 |
| --- | --- | --- | --- | --- |
| 常规切块 | 中块 | 同一个中块 | `RecursiveCharacterTextSplitter` | 简单，两难无法兼得 |
| **父子文档** | 子块（小） | 父块（大） | `ParentDocumentRetriever` + docstore | 精度与完整性兼顾，需存父块 |
| **小段落检索** | 单句（小） | 该句 ± 窗口（中） | `ParentDocumentRetriever`（子=句，父=窗口） | 定位精准，窗口提供上下文 |

**`ParentDocumentRetriever` 的工作方式：** 子块向量化后进向量库用于检索，父块原文存进 **docstore**；检索命中某个子块时，按 ID 回 docstore 取出它所属的**父块**返回。

```python
# 父子文档检索：父块 1000~2000 字符，子块 200~400 字符
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.retrievers import ParentDocumentRetriever
from langchain.storage import InMemoryStore          # 原型用；生产换 Redis/SQLite

# 1) 父块分割器：用于产生「返回给 LLM 的大块」
parent_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1600, chunk_overlap=100, add_start_index=True,
)

# 2) 子块分割器：用于产生「进向量库检索的小块」
child_splitter = RecursiveCharacterTextSplitter(
    chunk_size=320, chunk_overlap=40, add_start_index=True,
)

# 3) 向量库只存子块（用于检索）
vectorstore = Chroma(
    collection_name="child_chunks",
    embedding_function=OpenAIEmbeddings(model="text-embedding-3-small"),
    persist_directory="./chroma_child",
)

# 4) docstore 存父块原文（用于返回）——生产环境务必持久化
docstore = InMemoryStore()

retriever = ParentDocumentRetriever(
    vectorstore=vectorstore,
    docstore=docstore,
    child_splitter=child_splitter,
    parent_splitter=parent_splitter,
)

# 5) 添加文档：向量库存子块，docstore 存父块
retriever.add_documents(docs)

# 6) 检索：命中的是子块，但返回的是它所属的父块（上下文更完整）
results = retriever.invoke("如何配置连接池的最大连接数？")
print(f"返回 {len(results)} 个父块，首个长度 {len(results[0].page_content)}")

# 小段落（句子窗口）变体：子块=单句，父块=该句附近的一个窗口
sentence_splitter = RecursiveCharacterTextSplitter(
    chunk_size=80, chunk_overlap=0,
    separators=["。", "！", "？", "\n", " "],
)
window_splitter = RecursiveCharacterTextSplitter(chunk_size=600, chunk_overlap=200)
retriever_window = ParentDocumentRetriever(
    vectorstore=vectorstore,
    docstore=docstore,
    child_splitter=sentence_splitter,
    parent_splitter=window_splitter,
)
```

**易错点：**

- 父子模式下**向量库里只有子块**，直接用 `vectorstore.as_retriever()` 会返回子块，拿不到父块，**必须用 `ParentDocumentRetriever`**。
- `InMemoryStore` 只适合原型；进程重启后父块全丢，生产务必换成 **Redis / SQLite / Postgres** 等持久化 docstore。
- 父块也不能无限大，否则上下文超长、稀释注意力；常见「父 1000~2000、子 200~400」，或用窗口（± 若干句）控制返回粒度。
- 父块/子块的 `add_start_index` 与自定义 ID 要保持一致，否则回查父块会失败。

---

## 13. MultiQuery 与查询改写

用户提问的**表述方式**往往与文档中的**措辞**不一致，导致「语义相同的两句话，向量却不够近」。**查询改写**就是在检索前把用户问题改造成**更容易命中**的形式。

| 方法 | 原理 | 适用场景 | 代价 |
| --- | --- | --- | --- |
| **MultiQuery** | 用 LLM 生成 N 个不同角度的改写问题，各自检索后取并集 | 口语化提问、表述歧义 | N 次检索 + 1 次 LLM |
| **RAG-Fusion** | 多查询 + RRF 融合各路排名（比简单并集更稳） | 同上，追求稳定排序 | 同上 + 融合计算 |
| **HyDE** | 先让 LLM 生成「假想答案」，再用假想答案去检索 | query 与 doc 表述鸿沟大 | 1 次 LLM |
| **问题分解** | 复杂问题拆成多个子问题分别检索、汇总 | 多跳、多条件问题 | 多次检索 + 汇总 |
| **Step-back** | 先回答更抽象的上位问题，再回到细节 | 需要先建立背景知识 | 1~2 次 LLM |
| **代词消解 / 历史改写** | 多轮对话中把「它、这个」补全成完整问题 | 多轮对话 | 1 次 LLM |

```python
# 1) MultiQueryRetriever：自动把一个问题改写成多个角度的问题
import logging
from langchain.retrievers.multi_query import MultiQueryRetriever
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import FAISS

vectorstore = FAISS.from_documents(chunks, OpenAIEmbeddings(model="text-embedding-3-small"))
base_retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
mq_retriever = MultiQueryRetriever.from_llm(
    retriever=base_retriever,
    llm=llm,                     # 默认提示词会生成 3 个改写问题
    include_original=True,       # 最终结果里保留原始问题检索到的文档
)

# 打开日志可看到 LLM 实际生成了哪些改写问题，便于调试
logging.getLogger("langchain.retrievers.multi_query").setLevel(logging.INFO)

docs = mq_retriever.invoke("它支持多长时间的数据保留？")
print(f"多查询合并后候选数：{len(docs)}")

# 2) 自定义改写提示词：约束「只做同义/视角扩展，不改变事实」
from langchain_core.prompts import PromptTemplate

custom_prompt = PromptTemplate.from_template(
    """你是检索助手。请就下面的问题生成 3 个不同表述、不同视角的检索查询，
    只做同义替换与视角扩展，不得改变或添加任何事实。
    每行一个查询，不要编号，不要解释。

    原始问题：{question}
    检索查询："""
)
mq_custom = MultiQueryRetriever.from_llm(
    retriever=base_retriever,
    llm=llm,
    prompt=custom_prompt,
)

# 3) HyDE：先让 LLM 生成「假想答案」，再用假想答案去检索
from langchain_core.output_parsers import StrOutputParser

hyde_chain = (
    PromptTemplate.from_template(
        "请写一段能回答下面问题的短文（假设性文档，不必保证真实）：\n{question}"
    )
    | llm
    | StrOutputParser()
)

def hyde_search(question: str):
    hypothetical_doc = hyde_chain.invoke({"question": question})
    return vectorstore.similarity_search(hypothetical_doc, k=4)

print([d.page_content[:20] for d in hyde_search("系统支持多长时间的数据保留？")])
```

**易错点：**

- 多查询会**成倍增加** embedding 与检索调用，成本与延迟上升；N 一般取 3~5，别无限扩。
- 多查询**取并集会引入噪声**，最好配合 Rerank 或 RRF 加权融合，而不是简单拼接。
- 改写依赖 LLM，若不加约束，模型可能**把问题改跑偏**（添加臆想条件、改变事实），因此提示词要明确「只改写、不改事实」。
- HyDE 生成的假想答案可能包含错误信息，但它只用于**检索**（找相近段落），不直接作为答案，因此是可接受的。

---

## 14. RAG 的常见问题与优化方向

落地 RAG 时的问题大多有迹可循。下面按**现象 → 原因 → 方向**梳理，是面试中「你有没有真做过落地」的检验题。

| 现象 | 可能原因 | 优化方向 |
| --- | --- | --- |
| 检索不到（召回低） | 切块过大/过小、术语不匹配、embedding 不合适、k 太小 | 结构感知切块、混合检索、查询改写、父子文档、调大 k |
| 答非所问 | 召回到无关内容、prompt 未约束 | Rerank、`score_threshold` 过滤、强化 system 约束 |
| 幻觉 / 编造 | 上下文缺失、模型不遵循约束 | 强制「仅依据上下文」、引用溯源、降低 temperature |
| 答不全 | top-k 太小、上下文被截断 | 提高 k + Rerank、上下文压缩、map-reduce 汇总 |
| 多轮指代错 | 未做历史改写 | 查询改写 / 代词消解，把「它」补全 |
| 上下文超长 | 一次性塞太多块 | 上下文压缩、限制 token、父子/窗口控制返回粒度 |
| 引用不准 | 元数据缺失或切块未留位置 | 保留 `source`/页码、`add_start_index`、编号引用 |
| 延迟高 | 多路检索 + 重排 + 大模型 | 缓存、并行检索、模型分级（小模型粗排）、预计算 |
| 更新难 | 全量重建索引 | 增量索引、文档 ID 版本化、删除策略 |
| 效果不稳定 | 无评估、凭感觉调参 | 建评估集，用 RAGAS 的 recall/precision/faithfulness 量化 |

**进阶 RAG 链路（可作为答题总纲）：**

```text
用户提问
   │
   ├─ 多轮上下文：历史改写 / 代词消解
   │
   ├─ 查询改写：MultiQuery / HyDE / 问题分解 / Step-back
   │
   ├─ 混合召回：向量检索(k=30)  +  BM25/关键词检索(k=30)
   │        └─ RRF 融合
   │
   ├─ 精排：Cross-Encoder Rerank → Top 5
   │        └─ 上下文压缩：去噪、压要点
   │
   ├─ 组装 Prompt：系统约束 + 编号上下文 + 原始问题
   │
   └─ LLM 生成 → 结构化输出 + 引用溯源（source / 页码 / 编号）
```

```python
# 一个较完整的进阶 RAG 链：混合召回 → 重排 → 约束生成 → 引用出处
# 请先设置环境变量 OPENAI_API_KEY
from langchain_community.vectorstores import FAISS
from langchain_community.retrievers import BM25Retriever
from langchain_community.cross_encoders import HuggingFaceCrossEncoder
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.retrievers import (
    EnsembleRetriever, ContextualCompressionRetriever,
)
from langchain.retrievers.document_compressors import CrossEncoderReranker
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

emb = OpenAIEmbeddings(model="text-embedding-3-small")
db = FAISS.from_documents(chunks, emb)

# 1) 双路召回：向量（语义）+ BM25（关键词）
vector_retriever = db.as_retriever(search_kwargs={"k": 30})
bm25_retriever = BM25Retriever.from_documents(chunks)
bm25_retriever.k = 30
ensemble = EnsembleRetriever(retrievers=[vector_retriever, bm25_retriever], weights=[0.6, 0.4])

# 2) 精排：cross-encoder 把候选压到 Top 5
reranker = CrossEncoderReranker(
    model=HuggingFaceCrossEncoder(model_name="BAAI/bge-reranker-base"),
    top_n=5,
)
retriever = ContextualCompressionRetriever(
    base_compressor=reranker, base_retriever=ensemble,
)

# 3) 组装 Prompt：强约束 + 带编号的上下文，便于引用
prompt = ChatPromptTemplate.from_messages([
    ("system",
     "你是严谨的知识助手。只依据下列上下文回答，禁止编造；"
     "无法从上下文得出答案时回答「根据现有资料无法确定」。"
     "回答末尾用 [编号] 标注引用来源。\n\n上下文：\n{context}"),
    ("human", "{question}"),
])

def format_docs(docs):
    # 给每个片段编号，并带上来源文件，便于溯源
    return "\n\n".join(
        f"[{i + 1}] 来源：{d.metadata.get('source', '未知')}\n{d.page_content}"
        for i, d in enumerate(docs)
    )

chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | ChatOpenAI(model="gpt-4o-mini", temperature=0)
    | StrOutputParser()
)

print(chain.invoke("系统默认的并发数与数据保留时长分别是多少？"))
```

**易错点：**

- **评估先于优化**：没有评估集，就无法判断某项改动是「变好」还是「只是感觉变好」；RAGAS / 人工标注集是必要投入。
- **区分「检索问题」与「生成问题」**：答案错了，先看 `context` 里有没有正确内容——有则是生成/提示词问题，没有则是检索问题，**定位错了就白优化**。
- **注意成本与延迟的平衡**：混合检索、重排、改写都会叠加耗时，生产上常做缓存、并行与模型分级（小模型粗排、大模型精答）。
- **上下文不是越多越好**：过长会触发「lost in the middle」，中段信息被忽略，宁可用压缩与重排保证「少而准」。

[← 返回总览](README.md)
