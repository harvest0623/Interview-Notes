/**
 * 大数相加
 * 运行：node 手写题进阶/code/big-number-add.js
 */

/** 两个非负整数字符串相加 */
function addStrings(a, b) {
    let i = a.length - 1;
    let j = b.length - 1;
    let carry = 0;
    const result = [];

    while (i >= 0 || j >= 0 || carry) {
        // 字符串下标取字符，越界补 0
        const x = i >= 0 ? Number(a[i--]) : 0;
        const y = j >= 0 ? Number(b[j--]) : 0;
        const sum = x + y + carry;

        result.push(sum % 10);
        carry = Math.floor(sum / 10);
    }

    return result.reverse().join('');
}

/** 去掉前导零，保留单个 0 */
function normalize(str) {
    const trimmed = str.replace(/^0+(?=\d)/, '');
    return trimmed === '' ? '0' : trimmed;
}

/* ------------------------------ 自测 ------------------------------ */

function assert(condition, label) {
    console.log(`${condition ? 'PASS' : 'FAIL'} - ${label}`);
    if (!condition) process.exitCode = 1;
}

assert(addStrings('9007199254740991', '1') === '9007199254740992', '超过安全整数仍精确');
assert(addStrings('999', '1') === '1000', '连续进位');
assert(addStrings('0', '0') === '0', '零加零');
assert(addStrings('12345678901234567890', '98765432109876543210') === '111111111011111111100', '超长数字相加');
assert(normalize('000123') === '123', '去掉前导零');

// 对比 Number：超过安全范围会丢精度
const unsafe = 9007199254740991 + 1;
assert(String(unsafe) === '9007199254740992', 'Number 在边界刚好还能表示');
assert(addStrings('999999999999999999999', '1') === '1000000000000000000000', '21 位加法');

console.log('\n大数相加用例执行完毕');