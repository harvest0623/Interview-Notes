/**
 * 红绿灯算法：红灯 3s → 绿灯 2s → 黄灯 1s，循环往复
 */

/**
 * 点亮某个颜色，持续 time 毫秒，时间到后 resolve
 * @param {string} color 颜色
 * @param {number} time 持续时长(ms)
 */
function setColor(color, time) {
    return new Promise((resolve) => {
        console.log(`${color}灯亮，持续 ${time / 1000} 秒`);
        setTimeout(() => resolve(color), time);
    });
}

// ===================== 方法一：async / await（推荐） =====================
async function run() {
    while (true) {
        await setColor('红', 3000);
        await setColor('绿', 2000);
        await setColor('黄', 1000);
    }
}
run();

// ===================== 方法二：Promise 链式递归 =====================
function run() {
    setColor('红', 3000).then(() => {
        setColor('绿', 2000).then(() => {
            setColor('黄', 1000).then(() => run());
        });
    });
}
run();

// ===================== 方法三：定义完整灯序 + setInterval =====================
function lightSequence() {
    return setColor('红', 3000)
        .then(() => setColor('绿', 2000))
        .then(() => setColor('黄', 1000));
}
setInterval(lightSequence, 6000); // 一轮总时长 6 秒
lightSequence();                  // 立即执行一次，避免首次空等 6 秒

// ===================== 方法四：生成器函数 =====================
function* lightGenerator() {
    while (true) {
        yield setColor('红', 3000);
        yield setColor('绿', 2000);
        yield setColor('黄', 1000);
    }
}
async function runGenerator() {
    // for await 会自动 await 每个 yield 出的 Promise
    for await (const _ of lightGenerator()) { }
}
runGenerator();