/**
 * 手写带超时、重试、取消的 fetch 封装
 * 运行：node 手写题进阶/code/fetch-wrapper.js
 *
 * 说明：为了让示例离线可运行，这里用 mockFetch 替代真实网络。
 * 真实项目里把 mockFetch 换成全局 fetch 即可。
 */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** 主动取消不重试；其余错误（网络错误、超时）可以重试 */
function isRetryableError(error) {
    if (!error) return true;
    // AbortController.abort(reason) 的 reason 会原样抛给 fetch
    // 用户主动取消传入的是 AbortError，超时传入的是 Error('timeout')
    return !(error.name === 'AbortError');
}

/**
 * @param {string} url
 * @param {object} options
 * @param {number} [options.timeout=5000] 单次请求超时
 * @param {number} [options.retries=2] 失败后的重试次数
 * @param {number} [options.retryDelay=300] 首次重试等待（之后指数增长）
 * @param {AbortSignal} [options.signal] 外部取消信号
 */
async function request(url, options = {}) {
    const {
        timeout = 5000,
        retries = 2,
        retryDelay = 300,
        signal: outerSignal,
        ...rest
    } = options;

    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
        // 每次尝试都用新的 controller：signal 一旦 abort 就不可复用
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(new Error('timeout')), timeout);

        const onOuterAbort = () => controller.abort(outerSignal.reason);
        if (outerSignal) {
            if (outerSignal.aborted) controller.abort(outerSignal.reason);
            else outerSignal.addEventListener('abort', onOuterAbort, { once: true });
        }

        try {
            const response = await fetch(url, { ...rest, signal: controller.signal });

            // 5xx / 429 可重试；4xx 业务错误直接返回
            if (response.status >= 500 || response.status === 429) {
                lastError = new Error(`HTTP ${response.status}`);
            } else {
                return response;
            }
        } catch (error) {
            lastError = error;
            if (!isRetryableError(error)) throw error;
        } finally {
            clearTimeout(timer);
            if (outerSignal) outerSignal.removeEventListener('abort', onOuterAbort);
        }

        // 用户主动取消后，不再浪费一次重试
        if (outerSignal && outerSignal.aborted) throw outerSignal.reason;

        if (attempt < retries) {
            // 指数退避 + 随机抖动，避免大量客户端同时重试
            const backoff = retryDelay * 2 ** attempt + Math.random() * 100;
            await sleep(backoff);
        }
    }
    throw lastError;
}

/* --------------------------- mock 与自测 --------------------------- */

/**
 * 构造一个可控的假 fetch
 * @param {(url: string, callIndex: number) => {status?: number, delay?: number, body?: any, error?: Error}} handler
 */
function createMockFetch(handler) {
    let callIndex = 0;

    return function mockFetch(url, { signal } = {}) {
        const call = callIndex++;
        const { status = 200, delay = 10, body = { ok: true }, error } = handler(url, call);

        return new Promise((resolve, reject) => {
            if (signal?.aborted) return reject(signal.reason);

            const timer = setTimeout(() => {
                if (error) return reject(error);
                resolve({
                    ok: status >= 200 && status < 300,
                    status,
                    json: async () => body,
                });
            }, delay);

            signal?.addEventListener(
                'abort',
                () => {
                    clearTimeout(timer);
                    reject(signal.reason);
                },
                { once: true }
            );
        });
    };
}

function assert(condition, label) {
    console.log(`${condition ? 'PASS' : 'FAIL'} - ${label}`);
    if (!condition) process.exitCode = 1;
}

(async () => {
    // 1. 前两次网络错误，第三次成功
    let realFetch = createMockFetch((url, call) => {
        if (call < 2) return { error: new TypeError('network error') };
        return { status: 200, body: { call } };
    });
    globalThis.fetch = realFetch;

    const response = await request('https://api.example.com/user', { retries: 2, retryDelay: 10 });
    assert((await response.json()).call === 2, '网络错误后重试成功');

    // 2. 5xx 重试，最终仍失败则抛出
    globalThis.fetch = createMockFetch(() => ({ status: 503 }));
    let failed = false;
    try {
        await request('https://api.example.com/user', { retries: 1, retryDelay: 10 });
    } catch (error) {
        failed = error.message === 'HTTP 503';
    }
    assert(failed, '5xx 重试耗尽后抛出');

    // 3. 4xx 不重试：只调用一次
    let calls = 0;
    globalThis.fetch = createMockFetch(() => {
        calls++;
        return { status: 404 };
    });
    const notFound = await request('https://api.example.com/user');
    assert(notFound.status === 404 && calls === 1, '4xx 直接返回、不重试');

    // 4. 超时触发重试，最终抛出 timeout
    globalThis.fetch = createMockFetch(() => ({ status: 200, delay: 200 }));
    let timeoutError = false;
    try {
        await request('https://api.example.com/slow', { timeout: 20, retries: 1, retryDelay: 10 });
    } catch (error) {
        timeoutError = error.message === 'timeout';
    }
    assert(timeoutError, '超时后按策略重试并最终失败');

    // 5. 外部主动取消：立即失败且不重试
    let cancelCalls = 0;
    globalThis.fetch = createMockFetch(() => {
        cancelCalls++;
        return { status: 200, delay: 500 };
    });
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException('user cancel', 'AbortError')), 10);

    let cancelled = false;
    try {
        await request('https://api.example.com/cancel', { signal: controller.signal, retries: 3 });
    } catch (error) {
        cancelled = error.name === 'AbortError';
    }
    assert(cancelled && cancelCalls === 1, '主动取消不重试');

    console.log('\nfetch 封装用例执行完毕');
})();