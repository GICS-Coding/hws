(function () {
    var Logs = window.LogsCore;
    var LONG_CONTENT_THRESHOLD = 48;
    var searchInput = document.getElementById('logs-search');
    var exportButton = document.getElementById('logs-export');
    var clearButton = document.getElementById('logs-clear');
    var filterButtons = Array.prototype.slice.call(document.querySelectorAll('[data-type-filter]'));
    var logsList = document.getElementById('logs-list');
    var emptyText = document.getElementById('logs-empty-text');
    var activeTypeFilter = 'ALL';

    function appendStructuredContent(container, log) {
        var content = String(log.content || '');
        if (typeof log.oldValue === 'string' && typeof log.newValue === 'string') {
            var prefix = '';
            var marker = ' ' + log.oldValue + ' -> ' + log.newValue;
            var markerIndex = content.indexOf(marker);
            if (markerIndex >= 0) {
                prefix = content.slice(0, markerIndex + 1);
            } else {
                var fallbackMarker = log.oldValue + ' -> ' + log.newValue;
                markerIndex = content.indexOf(fallbackMarker);
                if (markerIndex >= 0) {
                    prefix = content.slice(0, markerIndex);
                }
            }

            if (prefix) {
                var prefixSpan = document.createElement('span');
                prefixSpan.textContent = prefix;
                container.appendChild(prefixSpan);
            }

            var oldSpan = document.createElement('span');
            oldSpan.textContent = log.oldValue;
            container.appendChild(oldSpan);

            var arrowSpan = document.createElement('span');
            arrowSpan.className = 'log-change-arrow';
            arrowSpan.textContent = ' -> ';
            container.appendChild(arrowSpan);

            var newSpan = document.createElement('span');
            newSpan.textContent = log.newValue;
            container.appendChild(newSpan);
            return;
        }

        var textSpan = document.createElement('span');
        textSpan.textContent = content;
        container.appendChild(textSpan);
    }

    function getTypeClass(type) {
        return 'log-type-' + String(type || '').toLowerCase();
    }

    function isLongLog(log) {
        return Logs.formatLogLine(log).length > LONG_CONTENT_THRESHOLD;
    }

    function createLogRow(log) {
        var row = document.createElement('div');
        row.className = 'logs-row';
        row.setAttribute('data-log-row', '');
        row.setAttribute('data-log-text', Logs.formatLogLine(log).toLowerCase());

        var main = document.createElement('div');
        main.className = 'logs-row-main';
        if (isLongLog(log)) {
            main.classList.add('is-collapsed');
        }

        main.appendChild(document.createTextNode('[' + Logs.formatLogTimestamp(log.timestamp) + ']'));

        var type = Logs.getResolvedLogType(log);
        var typeSpan = document.createElement('span');
        typeSpan.className = 'log-type ' + getTypeClass(type);
        typeSpan.textContent = '[' + type + ']';
        main.appendChild(typeSpan);
        main.appendChild(document.createTextNode(' '));
        appendStructuredContent(main, log);

        row.appendChild(main);

        if (isLongLog(log)) {
            var toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'logs-row-toggle';
            toggle.textContent = '◁';
            toggle.setAttribute('aria-label', '展开日志');
            toggle.addEventListener('click', function () {
                var collapsed = main.classList.toggle('is-collapsed');
                toggle.textContent = collapsed ? '◁' : '▽';
                toggle.classList.toggle('is-expanded', !collapsed);
                toggle.setAttribute('aria-label', collapsed ? '展开日志' : '收起日志');
            });
            row.appendChild(toggle);
        }

        return row;
    }

    function getFilteredLogs() {
        var logs = Logs.getOperationLogs().slice().reverse();
        var keyword = searchInput.value.trim().toLowerCase();
        return logs.filter(function (log) {
            var haystack = Logs.formatLogLine(log).toLowerCase();
            var typeMatches = activeTypeFilter === 'ALL' || Logs.getResolvedLogType(log) === activeTypeFilter;
            return (keyword === '' || haystack.indexOf(keyword) !== -1) && typeMatches;
        });
    }

    function renderLogs() {
        var logs = Logs.getOperationLogs().slice().reverse();
        var visibleLogs = getFilteredLogs();

        logsList.innerHTML = '';

        visibleLogs.forEach(function (log) {
            logsList.appendChild(createLogRow(log));
        });

        if (logs.length === 0) {
            emptyText.textContent = '暂无日志';
            emptyText.hidden = false;
        } else if (visibleLogs.length === 0) {
            emptyText.textContent = '没有匹配的日志';
            emptyText.hidden = false;
        } else {
            emptyText.hidden = true;
        }
    }

    function registerLogsPageServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(function () {});
        }
    }

    function exportLogs() {
        var now = new Date();
        var filename = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0')
        ].join('') + '_logs.txt';

        var lines = getFilteredLogs().slice().reverse().map(Logs.formatLogLine);
        var blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    searchInput.addEventListener('input', renderLogs);
    exportButton.addEventListener('click', exportLogs);

    filterButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            activeTypeFilter = button.getAttribute('data-type-filter') || 'ALL';
            filterButtons.forEach(function (item) {
                item.disabled = item === button;
            });
            renderLogs();
        });
    });

    clearButton.addEventListener('click', function () {
        Logs.setOperationLogs([]);
        renderLogs();
    });

    filterButtons.forEach(function (button) {
        button.disabled = (button.getAttribute('data-type-filter') || 'ALL') === activeTypeFilter;
    });

    registerLogsPageServiceWorker();
    renderLogs();
})();
