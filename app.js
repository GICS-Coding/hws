/**
 * 作业王 v1.4.2 - JavaScript Application Logic
 * 高中作业管理单页应用
 */

// ============================================================
// 工具函数
// ============================================================

/** 根据背景亮度返回自适应文字颜色 */
function getAdaptiveTextColor(element) {
    const computedStyle = window.getComputedStyle(element);
    const bgColor = computedStyle.backgroundColor;

    const rgb = bgColor.match(/\d+/g);
    if (!rgb || rgb.length < 3) return '#333';

    const r = parseInt(rgb[0]), g = parseInt(rgb[1]), b = parseInt(rgb[2]);
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return brightness < 0.5 ? '#ffffff' : '#333333';
}

/** 应用自适应文字颜色到所有相关元素 */
function applyAdaptiveTextColors() {
    const elements = document.querySelectorAll(
        '.modal-title, .form-group label, .homework-item, .action-button, ' +
        '.submit-button, .cancel-button, .delete-confirm-button, .modal-content p'
    );

    const isWhiteBackground = document.body.classList.contains('liquid-glass-disabled');

    elements.forEach(function (element) {
        var textColor;

        if (isWhiteBackground) {
            if (
                element.classList.contains('modal-title') ||
                element.closest('.form-group') ||
                element.classList.contains('action-button') ||
                element.classList.contains('submit-button') ||
                element.classList.contains('cancel-button') ||
                element.classList.contains('delete-confirm-button')
            ) {
                textColor = '#333333';
            } else {
                textColor = getAdaptiveTextColor(element);
            }
        } else {
            textColor = getAdaptiveTextColor(element);
        }

        element.style.color = textColor;
        element.style.textShadow = textColor === '#ffffff'
            ? '0 1px 2px rgba(0, 0, 0, 0.3)'
            : '0 1px 2px rgba(0, 0, 0, 0.1)';
    });
}

// ============================================================
// 模态框动画控制
// ============================================================

function showModal(modalId) {
    var modal = document.getElementById(modalId);
    var content = modal.querySelector('.modal-content');
    if (content) {
        content.classList.remove('is-static');
    }
    modal.style.display = 'flex';
    modal.offsetHeight; // 强制重排触发动画
    modal.classList.add('show');

    if (content) {
        var onTransitionEnd = function (e) {
            if (e.propertyName === 'transform') {
                content.classList.add('is-static');
                content.removeEventListener('transitionend', onTransitionEnd);
            }
        };
        content.addEventListener('transitionend', onTransitionEnd);
    }
}

function hideModal(modalId) {
    var modal = document.getElementById(modalId);
    var content = modal.querySelector('.modal-content');
    if (content) {
        content.classList.remove('is-static');
    }
    modal.classList.remove('show');
    setTimeout(function () {
        modal.style.display = 'none';
    }, 300);
}

// ============================================================
// Markdown 渲染
// ============================================================

function escapeHtml(text) {
    return text
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"');
}

function renderInlineMarkdown(text) {
    // 1. 提取行内代码到占位符
    var codeSpans = [];
    text = text.replace(/`([^`]+)`/g, function (match, code) {
        codeSpans.push('<code>' + escapeHtml(code) + '</code>');
        return '\u0000C' + (codeSpans.length - 1) + '\u0000';
    });
    // 2. 转义 HTML
    text = escapeHtml(text);
    // 3. 粗体（先于斜体）
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
    // 4. 斜体
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.+?)_/g, '<em>$1</em>');
    // 5. 删除线
    text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
    // 6. 链接
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    // 7. 还原行内代码
    text = text.replace(/\u0000C(\d+)\u0000/g, function (match, idx) {
        return codeSpans[parseInt(idx)];
    });
    return text;
}

function renderMarkdown(text) {
    if (!text) return '';
    // 预提取代码块（三反引号）
    var codeBlocks = [];
    text = text.replace(/```[\s\S]*?```/g, function (match) {
        var code = match.replace(/^```\n?/, '').replace(/\n?```$/, '');
        codeBlocks.push('<pre><code>' + escapeHtml(code) + '</code></pre>');
        return '\u0000B' + (codeBlocks.length - 1) + '\u0000';
    });
    var lines = text.split('\n');
    var result = '';
    var inList = false;
    var listType = '';
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var trimmed = line.trim();
        // 代码块占位符
        var blockMatch = trimmed.match(/^\u0000B(\d+)\u0000$/);
        if (blockMatch) {
            if (inList) { result += '</' + listType + '>'; inList = false; listType = ''; }
            result += codeBlocks[parseInt(blockMatch[1])];
            continue;
        }
        // 空行
        if (trimmed === '') {
            if (inList) { result += '</' + listType + '>'; inList = false; listType = ''; }
            continue;
        }
        // 标题
        var headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            if (inList) { result += '</' + listType + '>'; inList = false; listType = ''; }
            var level = headingMatch[1].length;
            result += '<h' + level + '>' + renderInlineMarkdown(headingMatch[2]) + '</h' + level + '>';
            continue;
        }
        // 水平线
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
            if (inList) { result += '</' + listType + '>'; inList = false; listType = ''; }
            result += '<hr>';
            continue;
        }
        // 引用
        if (trimmed.indexOf('> ') === 0) {
            if (inList) { result += '</' + listType + '>'; inList = false; listType = ''; }
            result += '<blockquote>' + renderInlineMarkdown(trimmed.slice(2)) + '</blockquote>';
            continue;
        }
        // 无序列表
        var ulMatch = trimmed.match(/^[-*]\s+(.+)$/);
        if (ulMatch) {
            if (!inList || listType !== 'ul') {
                if (inList) result += '</' + listType + '>';
                result += '<ul>';
                inList = true;
                listType = 'ul';
            }
            result += '<li>' + renderInlineMarkdown(ulMatch[1]) + '</li>';
            continue;
        }
        // 有序列表
        var olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
        if (olMatch) {
            if (!inList || listType !== 'ol') {
                if (inList) result += '</' + listType + '>';
                result += '<ol>';
                inList = true;
                listType = 'ol';
            }
            result += '<li>' + renderInlineMarkdown(olMatch[1]) + '</li>';
            continue;
        }
        // 普通段落
        if (inList) { result += '</' + listType + '>'; inList = false; listType = ''; }
        result += '<p>' + renderInlineMarkdown(trimmed) + '</p>';
    }
    if (inList) { result += '</' + listType + '>'; }
    return result;
}

// ============================================================
// 公告相关
// ============================================================

function updateNoticeDisplay() {
    var notice = localStorage.getItem('notice') || '';
    var display = document.getElementById('notice-display');
    if (notice.trim()) {
        display.innerHTML = renderMarkdown(notice);
        display.style.display = '';
    } else {
        display.innerHTML = '';
        display.style.display = 'none';
    }
}

function showCenterNotice() {
    var notice = localStorage.getItem('notice') || '';
    if (notice.trim()) {
        document.getElementById('notice-center-text').innerHTML = renderMarkdown(notice);
        showModal('notice-center-modal');
    }
}

function hideCenterNotice() {
    hideModal('notice-center-modal');
}

// ============================================================
// 作业渲染
// ============================================================

var SUBJECTS = [
    'chinese', 'math', 'english', 'physics', 'chemistry',
    'biology', 'politics', 'history', 'geography', 'other'
];

var SUBJECT_NAMES = {
    'chinese': '语文',
    'math': '数学',
    'english': '英语',
    'physics': '物理',
    'chemistry': '化学',
    'biology': '生物',
    'politics': '政治',
    'history': '历史',
    'geography': '地理',
    'other': '其他'
};

// ============================================================
// 彩蛋系统
// ============================================================

/** 简体→繁体映射（压缩格式：每2字符一组 [简,繁]） */
var S2T_PAIRS = '国國学學習習业業语語数數电電书書写寫练練册冊卷卷题題课課页頁复複预預读讀背背记記单單词詞选選开開关關门門车車马馬风風长長飞飛见見问问说說话話讲講识識让讓请請谢谢认認议議論論计計设設试試证證实實驗驗报報纸紙红紅绿綠蓝藍黄黃银銀铁鐵钢鋼钱錢饭飯饮飲动動运運过過还還进進來來会會体體个個里裡后後时時間間现現点點頭頭发發万万与與专專东東为為义義乐樂买買争爭亚亞产產从從传傳伤傷价價优優伟偉卫衛压壓县縣变變筆笔画画画試試题題錯錯对对難難简简類類型型归歸纳納總總結结篇篇章章幅幅译譯释释注注释釋积積累累计计熟熟诵诵读讀朗朗默默背背听听寫寫抄抄摘摘编编辑輯案案答答复復订訂正正错錯改改练练訓訓練練巩巩固固强強化化薄薄弱弱难難重重點點考考試试测測验驗绩绩评評估估档档案案记记录录录錄目目內内容容查查资资料料索索引引章章节节單單元元模模块块专专题题知知識识能能力力素素养养方方法法策策略略技技巧巧规规范范标标准准流流程程要要求求任任务务项项目目完完成进進行檢查检查批批阅阅评评价价反反馈馈沟沟通通合合作作参参与与讨討論論交交流流准準備备預预习习温温顾顾巩巩固固掌掌握握运运用用实实践践探探究究搜搜集集整整理理归归纳纳观觀察察记记录录分分析析評评价价创创造造联联系系比比較较推推理理论论证证验验证证解解释辞說說明明阐阐釋釋表表达达传传達達提提问问回回答答案案错错反反思思改改进進优优化化调调整整巩巩固固迁迁移运運用用总总结结归归纳纳会會体体会会心心得得启启发发联聯想发發散散聚聚焦焦审審题题解解题题答答题题卷卷面面字字迹迹规規範范标標準准计計算算公公式式定定理理概概念念定定義义结结構构图图表表变變化学化學反反應应实實驗驗观觀察察纪紀錄錄论論证证实實踐踐运運動动能能量量电电磁磁力力学学热热学学光光学学原子子分分子子细細胞胞遗遺传传进进化态态系系統统环境境保保護护发發展展资資源源地地理理历歷史史政政治治法法律律经經濟济文文化化社社會会国國家际际关關系统一体体多多元元传傳統统现現代代创創新新批批判判思思维维问問題题解解决决';

function s2t(text) {
    var map = {};
    for (var i = 0; i < S2T_PAIRS.length; i += 2) {
        map[S2T_PAIRS[i]] = S2T_PAIRS[i + 1];
    }
    var result = '';
    for (var j = 0; j < text.length; j++) {
        var ch = text[j];
        result += map[ch] || ch;
    }
    return result;
}

/** 判断某科是否触发彩蛋，返回效果名称或 null */
function checkEasterEgg(subject) {
    if (localStorage.getItem('easterEggEnabled') !== 'true') return null;
    var homeworks = JSON.parse(localStorage.getItem(subject) || '[]');
    var n = homeworks.length;
    if (n <= 2) return null;
    var probability = (n - 2) * 0.25;
    if (probability >= 1) probability = 1;
    if (Math.random() < probability) {
        switch (subject) {
            case 'chinese': return 'chinese';
            case 'english': return 'english';
            case 'biology': return 'biology';
            case 'other':   return 'other';
            default:        return null;
        }
    }
    return null;
}

/** 全局彩蛋结果缓存（页面加载时计算一次） */
var easterEggResults = {};

function computeAllEasterEggs() {
    easterEggResults = {};
    ['chinese', 'english', 'biology', 'other'].forEach(function (subject) {
        easterEggResults[subject] = checkEasterEgg(subject);
    });
}

/** 字符串随机打乱 */
function shuffleString(str) {
    var arr = str.split('');
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
    return arr.join('');
}

/** 应用彩蛋效果到显示数据，返回 { displayList, subjectNameOverride } */
function applyEasterEgg(subject, homeworks) {
    var effect = easterEggResults[subject];
    var displayList = homeworks.slice(); // shallow copy
    var subjectNameOverride = null;

    if (!effect) return { displayList: displayList, subjectNameOverride: null };

    if (effect === 'chinese') {
        displayList = displayList.map(function (h) { return s2t(h); });
    } else if (effect === 'english') {
        subjectNameOverride = '勾石';
        displayList = displayList.map(function (h) {
            // 随机位置插入随机数量的 💩
            var count = Math.floor(Math.random() * 4) + 1; // 1~4 个
            var s = h;
            for (var k = 0; k < count; k++) {
                var pos = Math.floor(Math.random() * (s.length + 1));
                s = s.slice(0, pos) + '\uD83D\uDCA9' + s.slice(pos);
            }
            return s;
        });
    } else if (effect === 'biology') {
        // 每条内部打乱：先按3~5字符分组再打乱组顺序
        displayList = displayList.map(function (h) {
            var chunkSize = Math.floor(Math.random() * 3) + 3; // 3~5
            var chunks = [];
            for (var ci = 0; ci < h.length; ci += chunkSize) {
                chunks.push(h.slice(ci, ci + chunkSize));
            }
            // 打乱组顺序
            for (var si = chunks.length - 1; si > 0; si--) {
                var sj = Math.floor(Math.random() * (si + 1));
                var tmp = chunks[si];
                chunks[si] = chunks[sj];
                chunks[sj] = tmp;
            }
            return chunks.join('');
        });
        // 染色体交叉互换：次数范围 [1, 条数*2]
        var maxCrossovers = displayList.length * 2;
        var crossoverCount = Math.floor(Math.random() * maxCrossovers) + 1;
        if (displayList.length >= 2) {
            for (var cross = 0; cross < crossoverCount; cross++) {
                var i1 = Math.floor(Math.random() * displayList.length);
                var i2 = (i1 + 1 + Math.floor(Math.random() * (displayList.length - 1))) % displayList.length;
                var s1 = displayList[i1];
                var s2 = displayList[i2];
                if (s1.length > 0 && s2.length > 0) {
                    var cut1 = Math.floor(Math.random() * s1.length);
                    var cut2 = Math.floor(Math.random() * s2.length);
                    var len1 = Math.floor(Math.random() * (s1.length - cut1)) + 1;
                    var len2 = Math.floor(Math.random() * (s2.length - cut2)) + 1;
                    var seg1 = s1.slice(cut1, cut1 + len1);
                    var seg2 = s2.slice(cut2, cut2 + len2);
                    s1 = s1.slice(0, cut1) + seg2 + s1.slice(cut1 + len1);
                    s2 = s2.slice(0, cut2) + seg1 + s2.slice(cut2 + len2);
                    displayList[i1] = s1;
                    displayList[i2] = s2;
                }
            }
        }
    } else if (effect === 'other') {
        displayList = displayList; // handled per-character in render
    }

    return { displayList: displayList, subjectNameOverride: subjectNameOverride };
}

// ============================================================
// 作业渲染
// ============================================================

function renderHomework(subject) {
    var container = document.getElementById(subject + '-homework');
    var row = container.closest('tr');
    var homeworks = JSON.parse(localStorage.getItem(subject));

    container.innerHTML = '';

    if (homeworks.length === 0) {
        row.classList.add('hidden');
        // 恢复科目名称（英语彩蛋可能改过）
        var subjectCell = row.querySelector('.subject-cell');
        if (subjectCell) subjectCell.textContent = SUBJECT_NAMES[subject];
        return;
    }

    row.classList.remove('hidden');

    // 应用彩蛋
    var eggResult = applyEasterEgg(subject, homeworks);
    var displayList = eggResult.displayList;
    var subjectNameOverride = eggResult.subjectNameOverride;

    // 更新科目名称
    var subjectCell = row.querySelector('.subject-cell');
    if (subjectCell) {
        subjectCell.textContent = subjectNameOverride || SUBJECT_NAMES[subject];
    }

    displayList.forEach(function (homework, index) {
        var homeworkItem = document.createElement('div');
        homeworkItem.className = 'homework-item';

        // 其他彩蛋：每字随机颜色
        if (easterEggResults[subject] === 'other') {
            homeworkItem.textContent = '';
            var prefix = (index + 1) + '. ';
            var prefixSpan = document.createElement('span');
            prefixSpan.textContent = prefix;
            prefixSpan.style.color = ''; // 默认颜色
            homeworkItem.appendChild(prefixSpan);
            for (var ci = 0; ci < homework.length; ci++) {
                var span = document.createElement('span');
                span.textContent = homework[ci];
                span.style.color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
                homeworkItem.appendChild(span);
            }
        } else {
            homeworkItem.textContent = (index + 1) + '. ' + homework;
        }
        container.appendChild(homeworkItem);
    });
}

function updateHomeworkItems(subjectSelectId, itemSelectId) {
    var subject = document.getElementById(subjectSelectId).value;
    var homeworks = JSON.parse(localStorage.getItem(subject));
    var itemSelect = document.getElementById(itemSelectId);

    itemSelect.innerHTML = '';

    if (homeworks.length === 0) {
        var option = document.createElement('option');
        option.value = '';
        option.textContent = '暂无作业';
        itemSelect.appendChild(option);
        return;
    }

    homeworks.forEach(function (homework, index) {
        var option = document.createElement('option');
        option.value = index;
        option.textContent = '作业 ' + (index + 1);
        itemSelect.appendChild(option);
    });

    if (itemSelectId === 'homework-item-select') {
        itemSelect.value = 0;
        document.getElementById('modify-homework-input').value = homeworks[0];
    }
}

function updateTableHeader() {
    var hasAnyHomework = SUBJECTS.some(function (subject) {
        var homeworks = JSON.parse(localStorage.getItem(subject) || '[]');
        return homeworks.length > 0;
    });

    var headerRow = document.querySelector('.homework-table tr:first-child');
    if (hasAnyHomework) {
        headerRow.classList.remove('hidden');
    } else {
        headerRow.classList.add('hidden');
    }
}

function checkCompactView() {
    var table = document.querySelector('.homework-table');
    var tableHeight = table.offsetHeight;
    var windowHeight = window.innerHeight;

    if (tableHeight > windowHeight * 0.8) {
        document.querySelectorAll('.homework-items-container').forEach(function (container) {
            container.classList.add('compact');
        });
    } else {
        document.querySelectorAll('.homework-items-container').forEach(function (container) {
            container.classList.remove('compact');
        });
    }
}

// ============================================================
// 靠下显示 / Liquid Glass 背景
// ============================================================

function setLiquidGlassBackground(enabled) {
    var body = document.body;
    if (enabled) {
        body.classList.add('liquid-glass-enabled');
        body.classList.remove('liquid-glass-disabled');
    } else {
        body.classList.add('liquid-glass-disabled');
        body.classList.remove('liquid-glass-enabled');
    }
}

function adjustNoticePosition() {
    var noticeDisplay = document.getElementById('notice-display');
    var bottomDisplayEnabled = localStorage.getItem('bottomDisplayEnabled') === 'true';

    if (!bottomDisplayEnabled) return;

    var hasHomework = SUBJECTS.some(function (subject) {
        var homeworks = JSON.parse(localStorage.getItem(subject) || '[]');
        return homeworks.length > 0;
    });

    if (hasHomework) {
        noticeDisplay.style.position = '';
        noticeDisplay.style.bottom = '';
        noticeDisplay.style.left = '';
        noticeDisplay.style.right = '';
        noticeDisplay.style.width = '';
        noticeDisplay.style.zIndex = '';
        noticeDisplay.style.margin = '18px 0 10px 0';
    } else {
        noticeDisplay.style.position = 'fixed';
        noticeDisplay.style.bottom = '20px';
        noticeDisplay.style.left = '20px';
        noticeDisplay.style.right = '20px';
        noticeDisplay.style.width = 'auto';
        noticeDisplay.style.margin = '0';
        noticeDisplay.style.zIndex = '99';
    }
}

function setBottomDisplay(enabled) {
    var table = document.querySelector('.homework-table');
    var noticeDisplay = document.getElementById('notice-display');
    var noticeBtn = document.getElementById('bottom-notice-btn');

    if (enabled) {
        table.classList.add('bottom-display');
        noticeBtn.style.display = 'none';
        adjustNoticePosition();
    } else {
        table.classList.remove('bottom-display');
        noticeBtn.style.display = '';
        noticeDisplay.style.position = '';
        noticeDisplay.style.bottom = '';
        noticeDisplay.style.left = '';
        noticeDisplay.style.right = '';
        noticeDisplay.style.width = '';
        noticeDisplay.style.zIndex = '';
        noticeDisplay.style.margin = '18px 0 10px 0';
    }
}

// ============================================================
// 广告轮播
// ============================================================

var currentAdIndex = 0;
var adImages = ['ad01.png', 'ad02.png'];
var adLinks = [
    'https://www.apple.com.cn',
    'http://playvalorant.com/zh-tw/'
];
var adInterval = null;

function rotateAd() {
    currentAdIndex = (currentAdIndex + 1) % adImages.length;
    var adImage = document.getElementById('ad-image');
    var adContainer = document.getElementById('ad-container');

    requestAnimationFrame(function () {
        adImage.src = 'img/' + adImages[currentAdIndex];
        adImage.onclick = function () {
            window.open(adLinks[currentAdIndex], '_blank');
        };

        var adEnabled = localStorage.getItem('adEnabled') === 'true';
        if (adEnabled) {
            adContainer.style.display = 'flex';
        }
    });
}

function startAdRotation() {
    rotateAd();
    if (adInterval) clearInterval(adInterval);
    adInterval = setInterval(rotateAd, 60000);
}

function stopAdRotation() {
    if (adInterval) {
        clearInterval(adInterval);
        adInterval = null;
    }
    document.getElementById('ad-container').style.display = 'none';
}

// ============================================================
// 每日数据清空
// ============================================================

function checkAndClearDailyData() {
    var dailyClearEnabled = localStorage.getItem('dailyClearEnabled') !== 'false';
    if (!dailyClearEnabled) return;

    var today = new Date().toDateString();
    var lastClearDate = localStorage.getItem('lastClearDate');

    if (lastClearDate !== today) {
        SUBJECTS.forEach(function (subject) {
            localStorage.setItem(subject, JSON.stringify([]));
        });
        localStorage.setItem('lastClearDate', today);
    }
}

// ============================================================
// 保存到文件
// ============================================================

function checkAutoSave() {
    var now = new Date();
    if (now.getHours() === 20 && now.getMinutes() === 0) {
        saveHomeworkToFile(true, true);
    }
}

function saveHomeworkToFile(saveHomework, saveNotice) {
    if (saveHomework === undefined) saveHomework = true;
    if (saveNotice === undefined) saveNotice = true;

    var content = '作业王 v1.4.2 - 高中作业单\n';
    content += '生成时间: ' + new Date().toLocaleString() + '\n\n';

    if (saveHomework) {
        SUBJECTS.forEach(function (subject) {
            var homeworks = JSON.parse(localStorage.getItem(subject));
            content += '【' + SUBJECT_NAMES[subject] + '】\n';
            if (homeworks.length === 0) {
                content += '  暂无作业\n';
            } else {
                homeworks.forEach(function (homework, index) {
                    content += '  ' + (index + 1) + '. ' + homework + '\n';
                });
            }
            content += '\n';
        });
    }

    if (saveNotice) {
        var notice = localStorage.getItem('notice') || '';
        if (notice.trim()) {
            content += '【公告】\n';
            content += '  ' + notice + '\n\n';
        }
    }

    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');
    var filename = year + month + day + '_homework.txt';

    var blob = new Blob([content], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================================
// 初始化 —— DOMContentLoaded
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

    // ---------- 初始设置 ----------
    applyAdaptiveTextColors();

    var liquidGlassEnabled = localStorage.getItem('liquidGlassEnabled') === 'true';
    var bottomDisplayEnabled = localStorage.getItem('bottomDisplayEnabled') === 'true';
    var adEnabled = localStorage.getItem('adEnabled') === 'true';

    setLiquidGlassBackground(liquidGlassEnabled);
    setBottomDisplay(bottomDisplayEnabled);

    // ---------- 每日数据清空 + 加载作业 ----------
    checkAndClearDailyData();
    computeAllEasterEggs();

    SUBJECTS.forEach(function (subject) {
        if (!localStorage.getItem(subject)) {
            localStorage.setItem(subject, JSON.stringify([]));
        }
        renderHomework(subject);
    });

    updateTableHeader();
    updateNoticeDisplay();
    adjustNoticePosition();
    checkCompactView();

    // ---------- 广告轮播 ----------
    if (adEnabled) {
        startAdRotation();
    } else {
        document.getElementById('ad-container').style.display = 'none';
    }

    // ---------- 公告居中弹窗 ----------
    document.getElementById('notice-center-close').addEventListener('click', hideCenterNotice);
    document.getElementById('notice-center-modal').addEventListener('click', function (e) {
        if (e.target === this) hideCenterNotice();
    });

    // 左下角公告按钮：单击打开居中弹窗
    document.getElementById('bottom-notice-btn').addEventListener('click', showCenterNotice);

    // 公告展示区点击打开居中弹窗
    document.getElementById('notice-display').addEventListener('click', showCenterNotice);

    // 右键单击公告按钮 → 公告编辑
    document.getElementById('bottom-notice-btn').addEventListener('contextmenu', function (e) {
        e.preventDefault();
        var notice = localStorage.getItem('notice') || '';
        document.getElementById('notice-textarea').value = notice;
        document.getElementById('notice-count').textContent = notice.length + '/3000';
        showModal('notice-modal');
        document.getElementById('notice-textarea').focus();
    });

    // ---------- 公告编辑模态框 ----------
    document.getElementById('notice-close').addEventListener('click', function () {
        hideModal('notice-modal');
    });
    document.getElementById('notice-cancel').addEventListener('click', function () {
        hideModal('notice-modal');
    });
    document.getElementById('notice-save').addEventListener('click', function () {
        var val = document.getElementById('notice-textarea').value;
        localStorage.setItem('notice', val);
        hideModal('notice-modal');
        updateNoticeDisplay();
    });
    document.getElementById('notice-textarea').addEventListener('input', function () {
        document.getElementById('notice-count').textContent = this.value.length + '/3000';
    });

    // ---------- 保存按钮 ----------
    document.getElementById('save-btn').addEventListener('click', function () {
        showModal('save-select-modal');
    });

    // ---------- 保存选择对话框 ----------
    document.getElementById('save-select-close').addEventListener('click', function () {
        hideModal('save-select-modal');
    });
    document.getElementById('save-select-cancel').addEventListener('click', function () {
        hideModal('save-select-modal');
    });
    document.getElementById('save-select-confirm').addEventListener('click', function () {
        var saveHomework = document.getElementById('save-homework-checkbox').checked;
        var saveNotice = document.getElementById('save-notice-checkbox').checked;
        var clearAfterSave = document.getElementById('save-clear-after-checkbox').checked;
        if (saveHomework || saveNotice) {
            saveHomeworkToFile(saveHomework, saveNotice);
            if (clearAfterSave) {
                SUBJECTS.forEach(function (subject) {
                    localStorage.setItem(subject, JSON.stringify([]));
                    renderHomework(subject);
                });
                updateTableHeader();
                adjustNoticePosition();
            }
            hideModal('save-select-modal');
        } else {
            alert('请至少选择一项内容进行保存');
        }
    });

    // ---------- 保存确认对话框 ----------
    document.getElementById('save-confirm-close').addEventListener('click', function () {
        hideModal('save-confirm-modal');
    });
    document.getElementById('save-cancel-button').addEventListener('click', function () {
        hideModal('save-confirm-modal');
    });
    document.getElementById('save-confirm-button').addEventListener('click', function () {
        saveHomeworkToFile(true, true);
        hideModal('save-confirm-modal');
    });

    // ---------- 悬浮球 → 操作选择对话框 ----------
    document.getElementById('floating-ball').addEventListener('click', function () {
        showModal('operation-modal');
    });
    document.getElementById('operation-close').addEventListener('click', function () {
        hideModal('operation-modal');
    });

    document.getElementById('op-add').addEventListener('click', function () {
        hideModal('operation-modal');
        setTimeout(function () { showModal('add-homework-modal'); }, 300);
    });
    document.getElementById('op-modify').addEventListener('click', function () {
        hideModal('operation-modal');
        setTimeout(function () {
            updateHomeworkItems('modify-subject-select', 'homework-item-select');
            showModal('modify-homework-modal');
        }, 300);
    });
    document.getElementById('op-delete').addEventListener('click', function () {
        hideModal('operation-modal');
        setTimeout(function () {
            updateHomeworkItems('delete-subject-select', 'delete-item-select');
            showModal('delete-homework-modal');
        }, 300);
    });
    document.getElementById('op-manage').addEventListener('click', function () {
        hideModal('operation-modal');
        var adEnabledVal = localStorage.getItem('adEnabled') === 'true';
        var liquidGlassVal = localStorage.getItem('liquidGlassEnabled') === 'true';
        var bottomDisplayVal = localStorage.getItem('bottomDisplayEnabled') === 'true';
        var dailyClearVal = localStorage.getItem('dailyClearEnabled') !== 'false';
        var easterEggVal = localStorage.getItem('easterEggEnabled') === 'true';

        document.getElementById('manage-ad-toggle-checkbox').checked = adEnabledVal;
        document.getElementById('manage-liquid-glass-toggle-checkbox').checked = liquidGlassVal;
        document.getElementById('manage-bottom-display-checkbox').checked = bottomDisplayVal;
        document.getElementById('manage-daily-clear-checkbox').checked = dailyClearVal;
        document.getElementById('manage-easter-egg-checkbox').checked = easterEggVal;

        setTimeout(function () { showModal('manage-modal'); }, 300);
    });

    // ---------- 管理对话框 ----------
    document.getElementById('manage-cancel').addEventListener('click', function () {
        hideModal('manage-modal');
    });
    document.getElementById('manage-close').addEventListener('click', function () {
        hideModal('manage-modal');
    });
    document.getElementById('manage-save').addEventListener('click', function () {
        var adEnabledVal = document.getElementById('manage-ad-toggle-checkbox').checked;
        var liquidGlassVal = document.getElementById('manage-liquid-glass-toggle-checkbox').checked;
        var bottomDisplayVal = document.getElementById('manage-bottom-display-checkbox').checked;
        var dailyClearVal = document.getElementById('manage-daily-clear-checkbox').checked;
        var easterEggVal = document.getElementById('manage-easter-egg-checkbox').checked;

        localStorage.setItem('adEnabled', adEnabledVal);
        localStorage.setItem('liquidGlassEnabled', liquidGlassVal);
        localStorage.setItem('bottomDisplayEnabled', bottomDisplayVal);
        localStorage.setItem('dailyClearEnabled', dailyClearVal);
        localStorage.setItem('easterEggEnabled', easterEggVal);

        if (adEnabledVal) {
            startAdRotation();
        } else {
            stopAdRotation();
        }

        setLiquidGlassBackground(liquidGlassVal);
        setBottomDisplay(bottomDisplayVal);
        computeAllEasterEggs();
        SUBJECTS.forEach(function (s) { renderHomework(s); });
        hideModal('manage-modal');
    });

    // ---------- 添加作业 ----------
    document.getElementById('submit-homework').addEventListener('click', function () {
        var subject = document.getElementById('subject-select').value;
        var homeworkInput = document.getElementById('homework-input');
        var homeworkText = homeworkInput.value.trim();

        if (homeworkText) {
            var homeworks = JSON.parse(localStorage.getItem(subject));
            homeworks.push(homeworkText);
            localStorage.setItem(subject, JSON.stringify(homeworks));
            easterEggResults[subject] = checkEasterEgg(subject);
            renderHomework(subject);
            homeworkInput.value = '';
            hideModal('add-homework-modal');
            checkCompactView();
            updateTableHeader();
            adjustNoticePosition();
        }
    });

    // ---------- 修改作业 ----------
    document.getElementById('modify-subject-select').addEventListener('change', function () {
        updateHomeworkItems('modify-subject-select', 'homework-item-select');
    });
    document.getElementById('homework-item-select').addEventListener('change', function () {
        var subject = document.getElementById('modify-subject-select').value;
        var index = this.value;
        var homeworks = JSON.parse(localStorage.getItem(subject));
        if (index !== '' && homeworks.length > 0) {
            document.getElementById('modify-homework-input').value = homeworks[index];
        }
    });
    document.getElementById('submit-modify').addEventListener('click', function () {
        var subject = document.getElementById('modify-subject-select').value;
        var index = document.getElementById('homework-item-select').value;
        var newHomework = document.getElementById('modify-homework-input').value.trim();

        if (newHomework && index !== '') {
            var homeworks = JSON.parse(localStorage.getItem(subject));
            homeworks[index] = newHomework;
            localStorage.setItem(subject, JSON.stringify(homeworks));
            easterEggResults[subject] = checkEasterEgg(subject);
            renderHomework(subject);
            hideModal('modify-homework-modal');
            adjustNoticePosition();
        }
    });

    // ---------- 删除作业 ----------
    document.getElementById('delete-subject-select').addEventListener('change', function () {
        updateHomeworkItems('delete-subject-select', 'delete-item-select');
    });
    document.getElementById('confirm-delete').addEventListener('click', function () {
        var subject = document.getElementById('delete-subject-select').value;
        var index = document.getElementById('delete-item-select').value;

        if (index !== '') {
            var homeworks = JSON.parse(localStorage.getItem(subject));
            homeworks.splice(index, 1);
            localStorage.setItem(subject, JSON.stringify(homeworks));
            easterEggResults[subject] = checkEasterEgg(subject);
            renderHomework(subject);
            hideModal('delete-homework-modal');
            checkCompactView();
            updateTableHeader();
            adjustNoticePosition();
        }
    });

    // ---------- 通用关闭按钮 ----------
    document.querySelectorAll('.close-button').forEach(function (button) {
        button.addEventListener('click', function () {
            var modal = this.closest('.modal');
            hideModal(modal.id);
        });
    });

    // ---------- 取消按钮（add/modify/delete 独立模态框） ----------
    document.getElementById('add-cancel-button').addEventListener('click', function () {
        hideModal('add-homework-modal');
    });
    document.getElementById('modify-cancel-button').addEventListener('click', function () {
        hideModal('modify-homework-modal');
    });
    document.getElementById('delete-cancel-button').addEventListener('click', function () {
        hideModal('delete-homework-modal');
    });

    // ---------- 点击模态框外部关闭 ----------
    document.querySelectorAll('.modal').forEach(function (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === this) {
                hideModal(this.id);
            }
        });
    });

    // ---------- 键盘事件 ----------
    document.addEventListener('keydown', function (e) {
        // ESC：关闭最上层打开的模态框
        if (e.key === 'Escape') {
            var openModals = document.querySelectorAll('.modal.show');
            if (openModals.length > 0) {
                hideModal(openModals[openModals.length - 1].id);
            }
        }

        // Enter：触发当前打开模态框的主操作
        if (e.key === 'Enter') {
            var addModal = document.getElementById('add-homework-modal');
            var modifyModal = document.getElementById('modify-homework-modal');
            var deleteModal = document.getElementById('delete-homework-modal');
            var noticeModal = document.getElementById('notice-modal');
            var opModal = document.getElementById('operation-modal');
            var saveConfirmModal = document.getElementById('save-confirm-modal');
            var saveSelectModal = document.getElementById('save-select-modal');
            var manageModal = document.getElementById('manage-modal');

            // 公告编辑框内 Enter 应为换行，不做触发
            if (document.activeElement === document.getElementById('notice-textarea')) return;

            if (addModal.style.display === 'flex') {
                document.getElementById('submit-homework').click();
            } else if (modifyModal.style.display === 'flex') {
                document.getElementById('submit-modify').click();
            } else if (deleteModal.style.display === 'flex') {
                document.getElementById('confirm-delete').click();
            } else if (opModal.style.display === 'flex') {
                document.getElementById('op-add').click();
            } else if (saveConfirmModal.style.display === 'flex') {
                document.getElementById('save-confirm-button').click();
            } else if (saveSelectModal.style.display === 'flex') {
                document.getElementById('save-select-confirm').click();
            } else if (manageModal.style.display === 'flex') {
                document.getElementById('manage-save').click();
            }
        }
    });

    // ---------- 快捷预设按钮 ----------
    document.getElementById('quick-preset-buttons').addEventListener('click', function (e) {
        var btn = e.target.closest('.preset-button');
        if (!btn) return;
        var text = btn.getAttribute('data-text');
        var input = document.getElementById('homework-input');
        input.value += text;
        input.focus();
    });

    // ---------- 窗口 resize ----------
    window.addEventListener('resize', checkCompactView);

    // ---------- 定时自动保存（每分钟检查） ----------
    setInterval(checkAutoSave, 60000);
});