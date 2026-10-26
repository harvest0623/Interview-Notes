/**
 * 手写 LRU 缓存（两种实现）
 * 运行：node 手写题进阶/code/lru-cache.js
 */

/** 方案 A：利用 Map 的插入顺序 */
class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.map = new Map();
    }

    get(key) {
        if (!this.map.has(key)) return -1;
        const value = this.map.get(key);
        // 删除后重新插入，移动到最新位置
        this.map.delete(key);
        this.map.set(key, value);
        return value;
    }

    put(key, value) {
        if (this.capacity <= 0) return;
        if (this.map.has(key)) this.map.delete(key);
        this.map.set(key, value);

        if (this.map.size > this.capacity) {
            // Map 的第一个 key 是最久未使用的
            const oldestKey = this.map.keys().next().value;
            this.map.delete(oldestKey);
        }
    }
}

/** 方案 B：哈希表 + 双向链表 */
class Node {
    constructor(key, value) {
        this.key = key;
        this.value = value;
        this.prev = null;
        this.next = null;
    }
}

class LRUCacheLinked {
    constructor(capacity) {
        this.capacity = capacity;
        this.map = new Map();
        this.head = new Node(null, null);
        this.tail = new Node(null, null);
        this.head.next = this.tail;
        this.tail.prev = this.head;
    }

    #remove(node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    #addToHead(node) {
        node.next = this.head.next;
        node.prev = this.head;
        this.head.next.prev = node;
        this.head.next = node;
    }

    get(key) {
        const node = this.map.get(key);
        if (!node) return -1;
        this.#remove(node);
        this.#addToHead(node);
        return node.value;
    }

    put(key, value) {
        if (this.capacity <= 0) return;

        const node = this.map.get(key);
        if (node) {
            node.value = value;
            this.#remove(node);
            this.#addToHead(node);
            return;
        }

        if (this.map.size === this.capacity) {
            const oldest = this.tail.prev;
            this.#remove(oldest);
            this.map.delete(oldest.key);
        }

        const newNode = new Node(key, value);
        this.map.set(key, newNode);
        this.#addToHead(newNode);
    }
}

/* ------------------------------ 自测 ------------------------------ */

function assert(condition, label) {
    console.log(`${condition ? 'PASS' : 'FAIL'} - ${label}`);
    if (!condition) process.exitCode = 1;
}

function test(CacheClass, name) {
    const cache = new CacheClass(2);
    cache.put(1, 1);
    cache.put(2, 2);
    assert(cache.get(1) === 1, `${name}: 命中已有 key`);
    cache.put(3, 3); // 淘汰最久未使用的 2
    assert(cache.get(2) === -1, `${name}: 淘汰最久未使用`);
    assert(cache.get(3) === 3, `${name}: 新 key 存在`);

    cache.put(1, 100); // 更新已有 key，并移到最新
    cache.put(4, 4);   // 应淘汰 3
    assert(cache.get(3) === -1, `${name}: 更新已有 key 会刷新使用顺序`);
    assert(cache.get(1) === 100, `${name}: 更新值生效`);
}

test(LRUCache, 'Map 方案');
test(LRUCacheLinked, '链表方案');

console.log('\nLRU 用例执行完毕');