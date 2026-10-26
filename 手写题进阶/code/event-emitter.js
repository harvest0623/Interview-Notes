/**
 * 手写 EventEmitter（发布订阅）
 * 运行：node 手写题进阶/code/event-emitter.js
 */

class EventEmitter {
    constructor() {
        // event -> Map<原始监听器, 实际执行的监听器>
        this.events = new Map();
    }

    on(event, listener) {
        return this.#add(event, listener, false);
    }

    once(event, listener) {
        return this.#add(event, listener, true);
    }

    #add(event, listener, once) {
        if (typeof listener !== 'function') {
            throw new TypeError('listener must be a function');
        }
        if (!this.events.has(event)) this.events.set(event, new Map());
        const listeners = this.events.get(event);

        // once 包一层：执行前先移除自己
        const wrapped = once
            ? (...args) => {
                this.off(event, listener);
                listener.apply(this, args);
            }
            : listener;

        listeners.set(listener, wrapped);

        // 返回取消订阅函数
        return () => this.off(event, listener);
    }

    off(event, listener) {
        if (!listener) {
            this.events.delete(event);
            return this;
        }
        const listeners = this.events.get(event);
        if (!listeners) return this;

        listeners.delete(listener);
        if (listeners.size === 0) this.events.delete(event);
        return this;
    }

    emit(event, ...args) {
        const listeners = this.events.get(event);
        if (!listeners) return false;
        if (!listeners) return false;

        // 复制一份再遍历：监听器内部可能 on/off
        for (const wrapped of [...listeners.values()]) {
            try {
                wrapped.apply(this, args);
            } catch (error) {
                // 单个监听器出错不影响其他监听器
                console.error(`[EventEmitter] listener error on "${event}":`, error.message);
            }
        }
        return true;
    }
}

/* ------------------------------ 自测 ------------------------------ */

function assert(condition, label) {
    console.log(`${condition ? 'PASS' : 'FAIL'} - ${label}`);
    if (!condition) process.exitCode = 1;
}

const bus = new EventEmitter();
const log = [];

const handler = (payload) => log.push(`on:${payload}`);
bus.on('message', handler);
bus.on('message', (payload) => log.push(`second:${payload}`));

bus.emit('message', 'A');
assert(JSON.stringify(log) === JSON.stringify(['on:A', 'second:A']), '多个监听器按注册顺序执行');

// once 只执行一次
let onceCount = 0;
bus.once('ready', () => onceCount++);
bus.emit('ready');
bus.emit('ready');
assert(onceCount === 1, 'once 只执行一次');

// off 能移除 once 的原始监听器
const onceHandler = () => onceCount++;
bus.once('close', onceHandler);
bus.off('close', onceHandler);
bus.emit('close');
assert(onceCount === 1, 'off 能移除 once 包装的监听器');

// 取消订阅
const unsubscribe = bus.on('tick', () => log.push('tick'));
unsubscribe();
bus.emit('tick');
assert(log.filter((x) => x === 'tick').length === 0, '取消订阅后不再触发');

// 单个监听器抛错不影响其他监听器
bus.on('boom', () => { throw new Error('bad listener'); });
bus.on('boom', () => log.push('after-error'));
bus.emit('boom');
assert(log.includes('after-error'), '监听器异常被隔离');

// 事件名不会污染原型链
const safe = new EventEmitter();
safe.on('__proto__', () => log.push('proto'));
assert(safe.events.size === 1, '使用 Map 存储，避免原型链问题');

console.log('\nEventEmitter 用例执行完毕');