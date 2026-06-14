// Service Worker for 作业王 v1.4.8 - 缓存管理
// 24小时缓存图片及静态资源，减少网络请求

const CACHE_NAME = 'homework-king-v1.4.8';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 1 天

// 需要预缓存的资源列表
const PRECACHE_URLS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './ico.png',
    './img/ad01.png',
    './img/ad02.png',
    './img/bgimg.png',
    './img/bgimg2.png',
    './img/bgimg2 (2).png',
    './img/ico.png',
    './img/ico2.png',
    './img/照片1.jpg'
];

// 安装事件：预缓存所有核心资源
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(PRECACHE_URLS);
        }).then(function () {
            return self.skipWaiting();
        })
    );
});

// 激活事件：清理旧版本缓存
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.map(function (name) {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );
        }).then(function () {
            return self.clients.claim();
        })
    );
});

// 检查缓存条目是否过期（超过1天）
function isCacheExpired(response) {
    var dateHeader = response.headers.get('date');
    if (!dateHeader) return false;
    var cacheDate = new Date(dateHeader).getTime();
    var now = Date.now();
    return (now - cacheDate) > MAX_AGE_MS;
}

// 请求拦截：Stale-While-Revalidate 策略
self.addEventListener('fetch', function (event) {
    var requestUrl = new URL(event.request.url);

    // 仅处理同源及 img/ 下的资源
    if (requestUrl.origin !== self.location.origin) return;

    // 仅缓存 GET 请求
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.match(event.request).then(function (cachedResponse) {
                // 后台发起网络请求更新缓存
                var fetchPromise = fetch(event.request).then(function (networkResponse) {
                    // 仅缓存成功响应
                    if (networkResponse && networkResponse.status === 200) {
                        // 排除 blob: 响应
                        if (!networkResponse.url.startsWith('blob:')) {
                            cache.put(event.request, networkResponse.clone());
                        }
                    }
                    return networkResponse;
                }).catch(function () {
                    // 网络失败，忽略
                });

                // 如果有缓存且未过期，立即返回缓存
                if (cachedResponse && !isCacheExpired(cachedResponse)) {
                    return cachedResponse;
                }

                // 无缓存或已过期：等待网络响应
                return fetchPromise.then(function (response) {
                    return response || cachedResponse;
                });
            });
        })
    );
});

// 监听主线程消息，支持手动清除缓存
self.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(function () {
            // 通知所有客户端刷新
            return self.clients.matchAll().then(function (clients) {
                clients.forEach(function (client) {
                    client.postMessage({ type: 'CACHE_CLEARED' });
                });
            });
        });
    }
});
