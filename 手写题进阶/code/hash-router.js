/**
 * 简易 hash 路由
 * 运行：node 手写题进阶/code/hash-router.js
 *
 * Router 核心不依赖 window，方便在 Node 中测试；
 * HashRouter 只在浏览器环境下挂载 hashchange 监听。
 */

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

class Router {
    constructor() {
        this.routes = [];
    }

    add(path, handler) {
        const keys = [];
        // 先按 :param 切分，静态部分做正则转义
        const pattern = path
            .split('/')
            .map((segment) => {
                if (segment.startsWith(':')) {
                    keys.push(segment.slice(1));
                    return '([^/]+)';
                }
                return escapeRegExp(segment);
            })
            .join('/');

        this.routes.push({
            path,
            regex: new RegExp(`^${pattern}/?$`), // 允许末尾斜杠
            keys,
            handler,
        });

        // 静态路径优先于动态路径：/user/list 先于 /user/:id
        this.routes.sort((a, b) => a.keys.length - b.keys.length);
        return this;
    }

    resolve(pathname) {
        for (const route of this.routes) {
            const matched = pathname.match(route.regex);
            if (!matched) continue;

            const params = {};
            route.keys.forEach((key, index) => {
                params[key] = decodeURIComponent(matched[index + 1]);
            });

            return { route, params };
        }
        return null;
    }
}

/** 浏览器版：绑定 hashchange，首次加载也触发一次 */
class HashRouter extends Router {
    constructor({ onRoute } = {}) {
        super();
        this.onRoute = onRoute;
        this.current = null;
    }

    start() {
        window.addEventListener('hashchange', () => this.handle());
        window.addEventListener('load', () => this.handle());
        this.handle();
        return this;
    }

    getPath() {
        return window.location.hash.slice(1) || '/';
    }

    handle() {
        const path = this.getPath();
        const matched = this.resolve(path);
        this.current = path;

        if (matched) {
            matched.route.handler(matched.params, path);
        } else {
            this.onRoute?.({ path, matched: false });
        }
    }

    push(path) {
        window.location.hash = path;
    }
}

/* ------------------------------ 自测 ------------------------------ */

function assert(condition, label) {
    console.log(`${condition ? 'PASS' : 'FAIL'} - ${label}`);
    if (!condition) process.exitCode = 1;
}

const router = new Router()
    .add('/', () => 'home')
    .add('/user/:id', () => 'user')
    .add('/user/list', () => 'list')
    .add('/post/:id/edit', () => 'edit');

    // 测试 Router 核心功能
    assert(router.resolve('/').route.path === '/', '根路径匹配');
    assert(router.resolve('/user/42').params.id === '42', '动态参数提取');
    assert(router.resolve('/user/list').route.path === '/user/list', '静态路由优先于动态路由');
    assert(router.resolve('/user/%E5%BC%A0%E4%B8%89').params.id === '张三', '参数 decodeURIComponent');
    assert(router.resolve('/post/7/edit').params.id === '7', '多段动态参数');
    assert(router.resolve('/unknown') === null, '未匹配返回 null');
    assert(router.resolve('/user/42/') !== null, '允许末尾斜杠');

console.log('\nhash 路由用例执行完毕（浏览器中使用 HashRouter.start()）');