/**
 * 解析 URL：拆出协议、主机名、端口、路径、查询参数、hash
 * 要求：同名查询参数合并为数组，并做 decodeURIComponent 解码
 */

const url =
    'https://www.baidu.com:8080/order/home?user=Tom&id=123&city=%E5%8D%97%E6%98%8C&id=56#top';

// 期望结果
// {
//   protocol: 'https',
//   hostname: 'www.baidu.com',
//   port: '8080',
//   path: '/order/home',
//   query: { user: 'Tom', id: ['123', '56'], city: '南昌' },
//   hash: 'top'
// }

/**
 * @param {string} url 待解析的完整 URL
 * @returns {{protocol:string, hostname:string, port:string, path:string, query:object, hash:string}}
 */
function urlParser(url) {
    // 1. 用 '#' 切出 hash
    const [main, hash = ''] = url.split('#');

    // 2. 用 '?' 切出 query 字符串
    const [prefix, queryStr = ''] = main.split('?');

    // 3. 协议：以 '://' 分隔，左边是协议
    const [protocol, rest] = prefix.split('://');

    // 4. 主机与端口：'/' 之前的部分；形如 host:port
    const hostPart = rest.split('/')[0];
    const [hostname, port = ''] = hostPart.split(':');

    // 5. 路径：去掉主机部分后、'?' 之前的部分
    const path = rest.slice(hostPart.length).split('?')[0];

    // 6. 解析查询参数：同名 key 合并为数组
    const query = {};
    if (queryStr) {
        queryStr.split('&').forEach((pair) => {
            if (!pair) return;
            const [rawKey, rawValue = ''] = pair.split('=');
            const key = decodeURIComponent(rawKey);
            const value = decodeURIComponent(rawValue);

            if (key in query) {
                query[key] = [].concat(query[key], value); // 已存在 → 转成/追加到数组
            } else {
                query[key] = value;
            }
        });
    }

    return { protocol, hostname, port, path, query, hash };
}

console.log(urlParser(url));
// {
//     protocol: 'https',
//     hostname: 'www.baidu.com',
//     port: '8080',
//     path: '/order/home',
//     query: { user: 'Tom', id: [ '123', '56' ], city: '南昌' },
//     hash: 'top'
// }