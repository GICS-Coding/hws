(function () {
    var LOG_STORAGE_KEY = 'operationLogs';
    var LONG_CONTENT_THRESHOLD = 48;
    var searchInput = document.getElementById('logs-search');
    var exportButton = document.getElementById('logs-export');
    var clearButton = document.getElementById('logs-clear');
    var logsList = document.getElementById('logs-list');
    var emptyText = document.getElementById('logs-empty-text');

    function getOperationLogs() {
        try {
            var raw = localStorage.getItem(LOG_STORAGE_KEY);
            if (raw === null) return [];
            var value = JSON.parse(raw);
            return Array.isArray(value) ? value : [];
        } catch (e) {
            return [];
        }
    }

    function setOperationLogs(logs) {
        localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(Array.isArray(logs) ? logs : []));
    }

    function appendOperationLog(type, content) {
        var logs = getOperationLogs();
        logs.push({
            type: type,
            content: content,
            timestamp: new Date().toISOString()
        });
        if (logs.length > 200) {
            logs = logs.slice(logs.length - 200);
        }
        setOperationLogs(logs);
    }

    function formatLogTimestamp(isoString) {
        var date = new Date(isoString);
        if (isNaN(date.getTime())) return '000000 00:00:00';
        var year = String(date.getFullYear()).slice(-2);
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var day = String(date.getDate()).padStart(2, '0');
        var hours = String(date.getHours()).padStart(2, '0');
        var minutes = String(date.getMinutes()).padStart(2, '0');
        var seconds = String(date.getSeconds()).padStart(2, '0');
        return year + month + day + ' ' + hours + ':' + minutes + ':' + seconds;
    }

    function formatLogLine(log) {
        var timestamp = '[' + formatLogTimestamp(log.timestamp) + ']';
        var type = String(log.type || 'X').toUpperCase();
        return timestamp + '[' + type + '] ' + String(log.content || '');
    }

    function getTypeClass(type) {
        return 'log-type-' + String(type || '').toLowerCase();
    }

    function appendLogContent(container, content) {
        var parts = String(content || '').split('->');
        parts.forEach(function (part, index) {
            var textSpan = document.createElement('span');
            textSpan.textContent = part;
            container.appendChild(textSpan);

            if (index < parts.length - 1) {
                var arrowSpan = document.createElement('span');
                arrowSpan.className = 'log-change-arrow';
                arrowSpan.textContent = ' -> ';
                container.appendChild(arrowSpan);
            }
        });
    }

    function isLongLog(log) {
        return formatLogLine(log).length > LONG_CONTENT_THRESHOLD;
    }

    function createLogRow(log) {
        var row = document.createElement('div');
        row.className = 'logs-row';
        row.setAttribute('data-log-row', '');
        row.setAttribute('data-log-text', formatLogLine(log).toLowerCase());

        var main = document.createElement('div');
        main.className = 'logs-row-main';
        if (isLongLog(log)) {
            main.classList.add('is-collapsed');
        }

        var timestampNode = document.createTextNode('[' + formatLogTimestamp(log.timestamp) + ']');
        main.appendChild(timestampNode);

        var type = String(log.type || 'X').toUpperCase();
        var typeSpan = document.createElement('span');
        typeSpan.className = 'log-type ' + getTypeClass(type);
        typeSpan.textContent = '[' + type + ']';
        main.appendChild(typeSpan);
        main.appendChild(document.createTextNode(' '));
        appendLogContent(main, log.content);

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

    function renderLogs() {
        var logs = getOperationLogs().slice().reverse();
        var keyword = searchInput.value.trim().toLowerCase();

        logsList.innerHTML = '';

        logs.forEach(function (log) {
            var row = createLogRow(log);
            var haystack = row.getAttribute('data-log-text') || '';
            if (keyword !== '' && haystack.indexOf(keyword) === -1) {
                row.hidden = true;
            }
            logsList.appendChild(row);
        });

        var visibleRows = Array.prototype.slice.call(logsList.querySelectorAll('[data-log-row]')).filter(function (row) {
            return !row.hidden;
        });

        if (logs.length === 0) {
            emptyText.textContent = '暂无日志';
            emptyText.hidden = false;
        } else if (visibleRows.length === 0) {
            emptyText.textContent = '没有匹配的日志';
            emptyText.hidden = false;
        } else {
            emptyText.hidden = true;
        }
    }

    function exportLogs() {
        var now = new Date();
        var filename = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0')
        ].join('') + '_logs.txt';

        appendOperationLog('X', '系统操作：导出日志 ' + filename);

        var lines = getOperationLogs().map(formatLogLine);
        var blob = new Blob([lines.join('\n')], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        renderLogs();
    }

    searchInput.addEventListener('input', renderLogs);
    exportButton.addEventListener('click', exportLogs);

    clearButton.addEventListener('click', function () {
        setOperationLogs([]);
        renderLogs();
    });

    renderLogs();
})();
