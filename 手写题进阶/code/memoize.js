/**
 * 手写 memoize（含 TTL、容量限制、异步请求合并）
 * 运行：node 手写题进阶/code/memoize.js
 */

/** 基础版：只支持单参数或自定义 resolver */
function memoize(fn, resolver) {
    const cache = new Map();

    return function (...args) {
        const key = resolver ? resolver.apply(this, args) : args[0];
        if (cache.has(key)) return cache.get(key);

        const result = fn.apply(this, args);
        cache.set(key, result);
        return result;
    };
}

/** 进阶版：TTL + LRU 容量上限 */
function memoizeAdvanced(fn, { resolver, ttl = 0, max = Infinity } = {}) {
    const cache = new Map(); // key -> { value, expireAt }

    return function (...args) {
        const key = resolver ? resolver.apply(this, args) : JSON.stringify(args);
        const now = Date.now();
        const hit = cache.get(key);

        if (hit && (hit.expireAt === 0 || hit.expireAt > now)) {
            // 命中后重新插入，维持 LRU 顺序
            cache.delete(key);
            cache.set(key, hit);
            return hit.value;
        }

        const value = fn.apply(this, args);
        cache.set(key, { value, expireAt: ttl ? now + ttl : 0 });

        if (cache.size > max) {
            cache.delete(cache.keys().next().value);
        }
        return value;
    };
}

/** 异步版：缓存 Promise，实现请求合并；失败不缓存 */
function memoizeAsync(fn) {
    const cache = new Map();

    return function (...args) {
        const key = JSON.stringify(args);
        if (!cache.has(key)) {
            const promise = fn.apply(this, args).catch((error) => {
                cache.delete(key); // 失败允许重试
                throw error;
            });
            cache.set(key, promise);
        }
        return cache.get(key);
    };
}

/* ------------------------------ 自测 ------------------------------ */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function assert(condition, label) {
    console.log(`${condition ? 'PASS' : 'FAIL'} - ${label}`);
    if (!condition) process.exitCode = 1;
}

(async () => {
    // 基础缓存
    let calls = 0;
    const slowSquare = memoize((n) => {
        calls++;
        return n * n;
    });
    slowSquare(4);
    slowSquare(4);
    assert(calls === 1, '相同参数只执行一次');

    // 多参数 + resolver
    const add = memoize((a, b) => a + b, (a, b) => `${a}-${b}`);
    add(1, 2);
    add(1, 2);
    add(2, 1);
    assert(add(1, 2) === 3 && add(2, 1) === 3, 'resolver 生成不同的 key');

    // TTL
    let ttlCalls = 0;
    const cached = memoizeAdvanced(
        (x) => {
            ttlCalls++;
            return x;
        },
        { ttl: 30 }
    );
    cached('a');
    cached('a');
    assert(ttlCalls === 1, 'TTL 内命中缓存');
    await sleep(40);
    cached('a');
    assert(ttlCalls === 2, 'TTL 过期后重新计算');

    // 容量上限（LRU）
    let maxCalls = 0;
    const limited = memoizeAdvanced(
        (x) => {
            maxCalls++;
            return x;
        },
        { max: 2 }
    );
    limited(1);
    limited(2);
    limited(3); // 淘汰 1
    limited(1); // 重新计算
    assert(maxCalls === 4, '超过容量后按 LRU 淘汰');

    // 异步请求合并
    let requestCount = 0;
    const fetchUser = memoizeAsync(async (id) => {
        requestCount++;
        await sleep(20);
        return { id, name: `user-${id}` };
    });

    const [u1, u2] = await Promise.all([fetchUser(1), fetchUser(1)]);
    assert(requestCount === 1 && u1 === u2, '并发相同请求只发一次');

    // 失败不缓存
    let failCount = 0;
    const unstable = memoizeAsync(async () => {
        failCount++;
        throw new Error('network');
    });
    try { await unstable(); } catch { }
    try { await unstable(); } catch { }
    assert(failCount === 2, '失败结果不缓存，允许重试');

    console.log('\nmemoize 用例执行完毕');
})();