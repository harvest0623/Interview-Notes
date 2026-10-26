/**
 * 数组转树与树转数组
 * 运行：node 手写题进阶/code/array-to-tree.js
 */

/** 数组转树：一次遍历 + Map，O(n) */
function toTree(list, rootId = null) {
    const map = new Map();

    // 1. 建索引，同时拷贝，避免修改原数据
    for (const item of list) {
        map.set(item.id, { ...item, children: [] });
    }

    const roots = [];
    // 2. 一次遍历挂载
    for (const node of map.values()) {
        if (node.parentId === rootId || !map.has(node.parentId)) {
            roots.push(node);
        } else {
            map.get(node.parentId).children.push(node);
        }
    }

      // 3. 叶子节点去掉空 children
      for (const node of map.values()) {
          if (node.children.length === 0) delete node.children;
      }
    return roots;
}

/** 树转数组：递归 DFS，保留 parentId */
function flattenTree(tree, parentId = null, result = []) {
    for (const node of tree) {
        const { children, ...rest } = node;
        result.push({ ...rest, parentId });
        if (children && children.length) flattenTree(children, node.id, result);
    }
    return result;
}

/** 树转数组：显式栈，避免深树爆栈 */
function flattenTreeIterative(tree) {
    const result = [];
    const stack = tree.map((node) => ({ node, parentId: null }));

    while (stack.length) {
        const { node, parentId } = stack.pop();
        const { children, ...rest } = node;
        result.push({ ...rest, parentId });

        if (children) {
            for (let i = children.length - 1; i >= 0; i--) {
                stack.push({ node: children[i], parentId: node.id });
            }
        }
    }
    return result;
}

/* ------------------------------ 自测 ------------------------------ */

function assert(condition, label) {
    console.log(`${condition ? 'PASS' : 'FAIL'} - ${label}`);
    if (!condition) process.exitCode = 1;
}

const list = [
    { id: 1, parentId: null, name: '总经办' },
    { id: 2, parentId: 1, name: '研发部' },
    { id: 3, parentId: 2, name: '前端组' },
    { id: 4, parentId: 1, name: '市场部' },
    { id: 5, parentId: 999, name: '孤儿部门' },
];

const tree = toTree(list);
assert(tree.length === 2, '根节点包含正常根与孤儿节点');
assert(tree[0].children.length === 2, '研发部与市场部挂载正确');
assert(tree[0].children[0].children[0].name === '前端组', '三级节点层级正确');
assert(list[0].children === undefined, '不修改原数组');

const flat = flattenTree(toTree(list.filter((x) => x.id !== 5)));
assert(flat.length === 4, '树转数组数量正确');
assert(flat.find((x) => x.id === 3).parentId === 2, '保留 parentId 关系');

const flatIterative = flattenTreeIterative(toTree(list.filter((x) => x.id !== 5)));
assert(flatIterative.length === 4, '迭代版数量正确');
assert(new Set(flatIterative.map((x) => x.id)).size === 4, '迭代版无重复节点');

console.log('\n数组转树用例执行完毕');