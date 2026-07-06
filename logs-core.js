(function () {
    var LOG_STORAGE_KEY = 'operationLogs';
    var MAX_OPERATION_LOGS = 500;

    var SETTING_LABELS = {
        adEnabled: '广告开关',
        liquidGlassEnabled: 'liquid glass',
        bottomDisplayEnabled: '靠下显示',
        dailyClearEnabled: '每日清空',
        easterEggEnabled: '彩蛋',
        messyStewEnabled: '大乱炖'
    };

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

    function normalizeLogs(logs) {
        if (!Array.isArray(logs)) return [];
        return logs.slice(-MAX_OPERATION_LOGS);
    }

    function setOperationLogs(logs) {
        localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(normalizeLogs(logs)));
    }

    function createLogId() {
        return 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    }

    function appendOperationLog(entry) {
        var logEntry = Object.assign({
            id: createLogId(),
            timestamp: new Date().toISOString()
        }, entry || {});

        for (var attempt = 0; attempt < 3; attempt++) {
            var logs = getOperationLogs();
            if (logs.some(function (item) { return item && item.id === logEntry.id; })) {
                return logEntry;
            }

            logs.push(logEntry);
            setOperationLogs(logs);

            var latest = getOperationLogs();
            if (latest.some(function (item) { return item && item.id === logEntry.id; })) {
                return logEntry;
            }
        }

        var fallbackLogs = getOperationLogs();
        if (!fallbackLogs.some(function (item) { return item && item.id === logEntry.id; })) {
            fallbackLogs.push(logEntry);
            setOperationLogs(fallbackLogs);
        }
        return logEntry;
    }

    function formatLogTimestamp(isoString) {
        var date = isoString instanceof Date ? isoString : new Date(isoString);
        if (isNaN(date.getTime())) return '000000 00:00:00';
        var year = String(date.getFullYear()).slice(-2);
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var day = String(date.getDate()).padStart(2, '0');
        var hours = String(date.getHours()).padStart(2, '0');
        var minutes = String(date.getMinutes()).padStart(2, '0');
        var seconds = String(date.getSeconds()).padStart(2, '0');
        return year + month + day + ' ' + hours + ':' + minutes + ':' + seconds;
    }

    function getResolvedLogType(log) {
        return String(log && log.type ? log.type : 'X').toUpperCase();
    }

    function formatHomeworkLogSubject(subjectLabel, index) {
        return subjectLabel + '.' + index;
    }

    function formatToggleValue(enabled) {
        return enabled ? '开' : '关';
    }

    function formatAddHomeworkLog(subject, subjectLabel, index, homeworkContent) {
        return {
            type: 'A',
            action: 'add-homework',
            subject: subject,
            subjectLabel: subjectLabel,
            index: index,
            homeworkContent: homeworkContent,
            content: '添加作业：' + formatHomeworkLogSubject(subjectLabel, index) + ' ' + homeworkContent
        };
    }

    function formatChangeHomeworkLog(subject, subjectLabel, index, oldValue, newValue) {
        return {
            type: 'C',
            action: 'change-homework',
            subject: subject,
            subjectLabel: subjectLabel,
            index: index,
            oldValue: oldValue,
            newValue: newValue,
            content: '修改作业：' + formatHomeworkLogSubject(subjectLabel, index) + ' ' + oldValue + ' -> ' + newValue
        };
    }

    function formatRemoveHomeworkLog(subject, subjectLabel, index, oldValue) {
        return {
            type: 'R',
            action: 'remove-homework',
            subject: subject,
            subjectLabel: subjectLabel,
            index: index,
            oldValue: oldValue,
            content: '删除作业：' + formatHomeworkLogSubject(subjectLabel, index) + ' ' + oldValue
        };
    }

    function formatEditNoticeLog(oldValue, newValue) {
        return {
            type: 'E',
            action: 'edit-notice',
            oldValue: oldValue,
            newValue: newValue,
            content: '编辑公告：' + oldValue + ' -> ' + newValue
        };
    }

    function formatSettingLog(settingKey, oldValue, newValue) {
        var label = SETTING_LABELS[settingKey] || settingKey;
        return {
            type: 'S',
            action: 'change-setting',
            settingKey: settingKey,
            settingLabel: label,
            oldValue: oldValue,
            newValue: newValue,
            content: '修改设置：' + label + ' ' + formatToggleValue(newValue)
        };
    }

    function formatSystemLog(operation, options) {
        var payload = options || {};
        var content = '系统操作：' + operation;
        if (payload.file) {
            content += ' ' + payload.file;
        }
        return {
            type: 'X',
            action: 'system-operation',
            operation: operation,
            file: payload.file || null,
            source: payload.source || 'user',
            content: content
        };
    }

    function formatLogLine(log) {
        var timestamp = '[' + formatLogTimestamp(log.timestamp) + ']';
        var type = getResolvedLogType(log);
        return timestamp + '[' + type + '] ' + String(log.content || '');
    }

    window.LogsCore = {
        LOG_STORAGE_KEY: LOG_STORAGE_KEY,
        MAX_OPERATION_LOGS: MAX_OPERATION_LOGS,
        SETTING_LABELS: SETTING_LABELS,
        getOperationLogs: getOperationLogs,
        setOperationLogs: setOperationLogs,
        appendOperationLog: appendOperationLog,
        formatLogTimestamp: formatLogTimestamp,
        getResolvedLogType: getResolvedLogType,
        formatHomeworkLogSubject: formatHomeworkLogSubject,
        formatToggleValue: formatToggleValue,
        formatAddHomeworkLog: formatAddHomeworkLog,
        formatChangeHomeworkLog: formatChangeHomeworkLog,
        formatRemoveHomeworkLog: formatRemoveHomeworkLog,
        formatEditNoticeLog: formatEditNoticeLog,
        formatSettingLog: formatSettingLog,
        formatSystemLog: formatSystemLog,
        formatLogLine: formatLogLine
    };
})();
