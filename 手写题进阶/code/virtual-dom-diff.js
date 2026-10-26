/**
 * 虚拟 DOM 与同层 diff
 * 运行：node 手写题进阶/code/virtual-dom-diff.js
 *
 * 这里只生成 patch 描述，便于在 Node 中验证；
 * 真实浏览器里再用 patch 函数把描述应用到 DOM。
 */

function h(type, props = {}, children = []) {
    return {
        type,
        props,
        children: (Array.isArray(children) ? children : [children]).map((child) =>
            typeof child === 'object' ? child : String(child)
        ),
        key: props.key,
    };
}

function diff(oldNode, newNode) {
    // 1. 新增或删除整个节点
    if (!oldNode) return [{ type: 'INSERT', node: newNode }];
    if (!newNode) return [{ type: 'REMOVE' }];

    // 2. 文本节点
    if (typeof oldNode !== 'object' || typeof newNode !== 'object') {
        return oldNode === newNode ? [] : [{ type: 'TEXT', value: newNode }];
    }

    // 3. 类型不同，整棵替换
    if (oldNode.type !== newNode.type || oldNode.key !== newNode.key) {
        return [{ type: 'REPLACE', node: newNode }];
    }

    const patches = [];

    // 4. 属性 diff
    const changedProps = {};
    const propKeys = new Set([
        ...Object.keys(oldNode.props),
        ...Object.keys(newNode.props),
    ]);
    for (const key of propKeys) {
        if (key === 'key') continue;
        if (oldNode.props[key] !== newNode.props[key]) {
            changedProps[key] = newNode.props[key];
        }
    }
    if (Object.keys(changedProps).length) {
        patches.push({ type: 'PROPS', props: changedProps });
    }

    // 5. 子节点 diff：优先按 key 复用
    const oldChildren = oldNode.children || [];
    const newChildren = newNode.children || [];
    const oldKeyed = new Map();
    oldChildren.forEach((child, index) => {
        if (child && typeof child === 'object' && child.key != null) {
            oldKeyed.set(child.key, { child, index });
        }
    });

    newChildren.forEach((child, index) => {
        const key = child && typeof child === 'object' ? child.key : null;
        if (key != null && oldKeyed.has(key)) {
            // 命中 key：递归 diff，复用节点
            const { child: oldChild } = oldKeyed.get(key);
            patches.push(...diff(oldChild, child).map((p) => ({ ...p, index })));
        } else if (
            key == null &&
            index < oldChildren.length &&
            (typeof oldChildren[index] !== 'object' || oldChildren[index].key == null)
        ) {
            // 无 key：按索引比较
            patches.push(...diff(oldChildren[index], child).map((p) => ({ ...p, index })));
        } else {
            patches.push({ type: 'INSERT', index, node: child });
        }
    });

    // 6. 删除新列表里不存在的旧 key
    const newKeys = new Set(
        newChildren
            .filter((child) => child && typeof child === 'object' && child.key != null)
            .map((child) => child.key)
    );
    oldChildren.forEach((child, index) => {
        if (child && typeof child === 'object' && child.key != null && !newKeys.has(child.key)) {
            patches.push({ type: 'REMOVE', index });
        }
    });

    // 7. 新列表变短时，删除尾部多余的无 key 子节点
    for (let i = newChildren.length; i < oldChildren.length; i++) {
        const child = oldChildren[i];
        if (child && (typeof child !== 'object' || child.key == null)) {
            patches.push({ type: 'REMOVE', index: i });
        }
    }

    return patches;
}

/* ------------------------------ 自测 ------------------------------ */

function assert(condition, label) {
    console.log(`${condition ? 'PASS' : 'FAIL'} - ${label}`);
    if (!condition) process.exitCode = 1;
}

// 1. 文本变化
assert(diff('old', 'new')[0].type === 'TEXT', '文本节点变化');

// 2. 类型不同 → 整棵替换
assert(diff(h('div'), h('span'))[0].type === 'REPLACE', '标签不同整棵替换');

// 3. 属性变化
const propsPatch = diff(h('div', { id: 'a' }), h('div', { id: 'b' }));
assert(propsPatch[0].type === 'PROPS' && propsPatch[0].props.id === 'b', '属性 diff');

// 4. key 复用 + 新增
const oldList = h('ul', {}, [
    h('li', { key: 'a' }, ['A']),
    h('li', { key: 'b' }, ['B']),
]);
const newList = h('ul', {}, [
    h('li', { key: 'b' }, ['B']),
    h('li', { key: 'a' }, ['A']),
    h('li', { key: 'c' }, ['C']),
]);
const listPatches = diff(oldList, newList);
assert(listPatches.some((p) => p.type === 'INSERT' && p.index === 2), '新增 key 节点');
assert(!listPatches.some((p) => p.type === 'REPLACE'), 'key 命中时不替换节点');

// 5. 删除 key
const removed = diff(
    h('ul', {}, [h('li', { key: 'a' }), h('li', { key: 'b' })]),
    h('ul', {}, [h('li', { key: 'a' })])
);
assert(removed.some((p) => p.type === 'REMOVE'), '删除未复用的 key');

// 6. 无变化
assert(diff(h('div', {}, ['x']), h('div', {}, ['x'])).length === 0, '无变化返回空 patch');

console.log('\n虚拟 DOM diff 用例执行完毕');