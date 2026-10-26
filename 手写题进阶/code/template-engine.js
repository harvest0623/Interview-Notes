/**
 * 模板引擎：插值、表达式、转义、编译缓存
 * 运行：node 手写题进阶/code/template-engine.js
 */

/** 基础版：只支持 {{ user.name }} 取值 */
function compile(template, data) {
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
        const value = path.split('.').reduce((obj, key) => obj?.[key], data);
        return value == null ? '' : String(value);
    });
}

/** HTML 转义，渲染用户内容时必须调用 */
function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[ch]));
}

/** 进阶版：支持任意表达式（演示原理，模板必须来自可信来源） */
function compileWithExpression(template, data) {
    return template.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, expression) => {
        try {
            // with 让表达式可以直接访问 data 的属性
            const fn = new Function('data', `with (data) { return (${expression}); }`);
            const value = fn(data);
            return value == null ? '' : String(value);
        } catch {
            return '';
        }
    });
}

/** 编译缓存：同一模板只 new Function 一次 */
const cache = new Map();

function compileCached(template) {
    if (!cache.has(template)) {
        const escaped = template
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\$\{/g, '\\${');

        const body = escaped.replace(/\{\{\s*(.+?)\s*\}\}/g, '${$1}');
        const render = new Function('data', `with (data) { return \`${body}\`; }`);
        cache.set(template, render);
    }
    return cache.get(template);
}

/* ------------------------------ 自测 ------------------------------ */

function assert(condition, label) {
    console.log(`${condition ? 'PASS' : 'FAIL'} - ${label}`);
    if (!condition) process.exitCode = 1;
}

assert(compile('Hello {{ name }}', { name: 'Ada' }) === 'Hello Ada', '基础插值');
assert(compile('{{ user.name }} / {{ user.age }}', { user: { name: 'Ada', age: 36 } }) === 'Ada / 36', '嵌套路径');
assert(compile('{{ missing }}!', {}) === '!', '缺失字段渲染为空');
assert(escapeHtml('<script>alert(1)</script>') === '&lt;script&gt;alert(1)&lt;/script&gt;', 'HTML 转义');

assert(
    compileWithExpression('{{ price * count }} 元', { price: 3, count: 4 }) === '12 元',
    '表达式求值'
);
assert(
    compileWithExpression('{{ user.name.toUpperCase() }}', { user: { name: 'ada' } }) === 'ADA',
    '方法调用'
);
assert(compileWithExpression('{{ invalid( }}', {}) === '', '表达式错误时降级为空');

assert(compileCached('<h1>{{ title }}</h1>')({ title: 'Hello' }) === '<h1>Hello</h1>', '编译缓存渲染');

console.log('\n模板引擎用例执行完毕');