// Service Worker for 作业王 v1.4.9 - 永久缓存管理
// 永久缓存静态资源，仅在版本更新时刷新

const CACHE_NAME = 'homework-king-v1.4.9';

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

// 请求拦截：Cache-First（永久缓存），后台更新
self.addEventListener('fetch', function (event) {
    var requestUrl = new URL(event.request.url);

    // 仅处理同源资源
    if (requestUrl.origin !== self.location.origin) return;

    // 仅缓存 GET 请求
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.match(event.request).then(function (cachedResponse) {
                // 后台发起网络请求，静默更新缓存（有更新就更新）
                fetch(event.request).then(function (networkResponse) {
                    if (networkResponse && networkResponse.status === 200) {
                        if (!networkResponse.url.startsWith('blob:')) {
                            cache.put(event.request, networkResponse.clone());
                        }
                    }
                }).catch(function () {
                    // 网络失败，忽略
                });

                // 优先返回缓存
                return cachedResponse || fetch(event.request).then(function (networkResponse) {
                    if (networkResponse && networkResponse.status === 200) {
                        if (!networkResponse.url.startsWith('blob:')) {
                            cache.put(event.request, networkResponse.clone());
                        }
                    }
                    return networkResponse;
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
