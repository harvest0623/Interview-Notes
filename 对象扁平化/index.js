/**
 * 对象扁平化：把多层嵌套的对象（含数组）铺平成单层对象
 * 规则：父级是对象用 `.` 拼接，父级是数组用 `[index]` 拼接
 */

const input = {
    a: 1,
    b: [1, 2, { c: true }, [3]],
    d: { e: 2, f: 3 },
    g: null,
};

const output = {
    a: 1,
    'b[0]': 1,
    'b[1]': 2,
    'b[2].c': true,
    'b[3][0]': 3,
    'd.e': 2,
    'd.f': 3,
    g: null,
};

function flattenObj(obj) {
    const res = {};

    /**
     * @param {object|Array} target 当前遍历的对象/数组
     * @param {string} oldKey 父级已拼好的路径前缀
     */
    function dfs(target, oldKey) {
        for (const key in target) {
            let newKey;
            if (oldKey) {
                // 父级是数组 → b[0]；父级是对象 → d.e
                newKey = Array.isArray(target) ? `${oldKey}[${key}]` : `${oldKey}.${key}`;
            } else {
                newKey = key; // 顶层直接使用自身 key
            }

            const value = target[key];
            // 只有对象/数组才继续展开（null 的 typeof 也是 'object'，需排除）
            if (typeof value === 'object' && value !== null) {
                dfs(value, newKey);
            } else {
                res[newKey] = value;
            }
        }
    }

    dfs(obj, '');
    return res;
}

console.log(flattenObj(input));
// 与上方 output 一致：{ a: 1, 'b[0]': 1, 'b[1]': 2, 'b[2].c': true, ... 'g': null }