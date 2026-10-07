/**
 * 数组扁平化：递归 + 循环（最直观的写法）
 */

const arr = [1, [2, [3]]];

function flattenArr(target) {
    const res = [];
    for (const item of target) {
        if (Array.isArray(item)) {
            res.push(...flattenArr(item)); // 是数组 → 递归展开后展开push
        } else {
            res.push(item); // 是普通值 → 直接收集
        }
    }
    return res;
}

console.log(flattenArr(arr)); // [1, 2, 3]