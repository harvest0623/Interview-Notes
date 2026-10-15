# 前端工程化常见面试题

> 本目录收录「前端工程化」相关的高频面试题及参考答案。由于内容较多，按主题拆分为若干分册，便于查阅与复习。默认以**现代工具链**（Vite、pnpm、ESLint 9、TypeScript）为背景，并在关键处标注 Webpack 4/5 等经典方案的差异。

---

## 目录

| 分册 | 内容 | 题量 |
| --- | --- | --- |
| [01 - 模块化与包管理篇](01-模块化与包管理篇.md) | 工程化概述、模块化规范、CommonJS vs ESM、循环依赖、npm/yarn/pnpm、幽灵依赖、semver、lock 文件、Monorepo、发布 npm 包 | 14 |
| [02 - 构建工具篇](02-构建工具篇.md) | Webpack 核心概念与构建流程、Loader/Plugin、HMR、Tree Shaking、Vite 原理与预构建、Rollup/esbuild/Rspack、选型对比 | 15 |
| [03 - 规范与质量保障篇](03-规范与质量保障篇.md) | ESLint/Prettier/Stylelint、Husky + lint-staged、commitlint、Git 工作流、单元测试与覆盖率、Code Review、版本发布 | 14 |
| [04 - 构建优化与部署篇](04-构建优化与部署篇.md) | Tree Shaking、代码分割、构建速度优化、产物缓存与 CDN、环境变量、CI/CD、Docker、Nginx 部署、灰度与回滚 | 14 |
| [05 - 微前端与进阶篇](05-微前端与进阶篇.md) | 微前端方案对比、qiankun 与 Module Federation 原理、样式/JS 隔离、脚手架实现、组件库工程化、SSR、依赖治理 | 13 |

---

## 学习路径建议

```
模块化与包管理篇（先搞懂「代码怎么组织、依赖怎么装」）
   ↓
构建工具篇（Webpack / Vite 的核心模型与原理）
   ↓
规范与质量保障篇（团队协作：Lint / Git 规范 / 测试）
   ↓
构建优化与部署篇（产物优化、CI/CD、上线）
   ↓
微前端与进阶篇（大型项目的架构级方案）
```

> 面试策略：**1 → 2 是必答基础，3 → 4 是「有项目经验」的标志，5 是加分项**。

---

## 高频必背 TOP 10

| 序号 | 题目 | 所在分册 |
| --- | --- | --- |
| 1 | 什么是前端工程化？包含哪些方面？ | [01 - 模块化与包管理篇](01-模块化与包管理篇.md#1-什么是前端工程化) |
| 2 | CommonJS 与 ES Module 的区别？ | [01 - 模块化与包管理篇](01-模块化与包管理篇.md#3-commonjs-与-es-module-的区别) |
| 3 | npm、yarn、pnpm 的区别？ | [01 - 模块化与包管理篇](01-模块化与包管理篇.md#7-npm-yarn-pnpm-的区别) |
| 4 | Webpack 的构建流程？ | [02 - 构建工具篇](02-构建工具篇.md#2-webpack-的构建流程) |
| 5 | Loader 和 Plugin 的区别？ | [02 - 构建工具篇](02-构建工具篇.md#3-loader-和-plugin-的区别) |
| 6 | Vite 为什么快？ | [02 - 构建工具篇](02-构建工具篇.md#9-vite-为什么快) |
| 7 | Vite 与 Webpack 的区别？ | [02 - 构建工具篇](02-构建工具篇.md#11-vite-与-webpack-的区别) |
| 8 | ESLint 与 Prettier 的区别与配合 | [03 - 规范与质量保障篇](03-规范与质量保障篇.md#2-eslint-与-prettier-的区别与配合) |
| 9 | Tree Shaking 是什么？为什么没生效？ | [04 - 构建优化与部署篇](04-构建优化与部署篇.md#1-tree-shaking-是什么为什么没生效) |
| 10 | 微前端的主流方案对比 | [05 - 微前端与进阶篇](05-微前端与进阶篇.md#2-微前端的主流方案对比) |

---

## 核心速查表

**包管理器命令对照**

```
                 npm              yarn(v1)        pnpm
安装依赖         npm i            yarn            pnpm i
新增依赖         npm i axios      yarn add axios  pnpm add axios
删除依赖         npm rm axios     yarn remove     pnpm rm axios
全局安装         npm i -g         yarn global add pnpm add -g
运行脚本         npm run dev      yarn dev        pnpm dev
查看依赖树       npm ls           yarn list       pnpm list
```

**三者的核心差异**

```
npm  ：依赖提升（扁平化 node_modules），可能产生「幽灵依赖」
yarn ：最初解决 npm 速度与一致性问题，引入 lock 与缓存
pnpm ：内容寻址存储 + 硬链接/软链接，只有声明过的依赖才能访问，最省空间、最严格
```

**Webpack 核心概念**

```
entry    入口：从哪个文件开始打包
output   出口：产物放哪、叫什么名字
loader   转换器：把非 JS 资源转成 Webpack 能处理的模块（对「文件」）
plugin   插件：基于钩子扩展构建流程（对「整个构建过程」）
mode     development / production，决定内置优化
```

**Vite 快的三个原因**

```
1. 开发阶段不做打包：利用浏览器原生 ESM，按需编译单个文件
2. 依赖预构建：用 esbuild 把 CJS/UMD 依赖转成 ESM，并合并请求
3. 基于 Rollup 的构建 + esbuild 压缩，产物构建也很快
```

**工程化常见工具链**

```
代码检查：ESLint（JS/TS）、Stylelint（CSS）、Prettier（格式化）
提交规范：Husky（Git Hooks）+ lint-staged + commitlint + Conventional Commits
构建工具：Vite（默认推荐）、Webpack（老项目/复杂定制）、Rspack（Webpack 兼容迁移）
包管理　：pnpm（推荐）、npm、yarn
测试　　：Vitest / Jest（单元）、Playwright / Cypress（E2E）
CI/CD　 ：GitHub Actions / GitLab CI / Jenkins
```
