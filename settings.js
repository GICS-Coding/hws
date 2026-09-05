(function () {
    // ---------- Service Worker 注册 ----------
    // 高级设置页自身也注册 SW，保证离线可用（与 logs 页一致）
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(function () {});
    }

    // ---------- 设置项渲染 / 保存（待开放） ----------
    // 具体设置项方案讨论中（涉及自动更新与转义），后续版本在此渲染表单、
    // 读取 localStorage 填写当前值，保存后写入并留在本页提示。
})();
