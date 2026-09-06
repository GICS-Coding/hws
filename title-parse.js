/**
 * 作业王 - 自定义标题标记解析器（共享：主页与高级设置页均加载）
 *
 * 语法（单个输入框，可任意位置插入、可共存一段、不可嵌套）：
 *   <h1>~<h6>        标题字号（不闭合，延续到末尾或下一级）
 *   #aabbcc          颜色（强制十六进制 #xxxxxx，延续到末尾或下一 #）
 *   <a|url>...</a>   超链接（成对闭合；未闭合则整段按普通文字）
 *   <b></b> <i></i> <u></u> <s></s>  字形（成对闭合；未闭合按普通文字）
 *   \< \# \| \> \\    字面量转义（反斜杠后字符按普通文字输出）
 *
 * 安全红线：本模块只把输入解析成"节点描述数组"，绝不内联执行 HTML；
 * 由调用方用 DOM createElement + textContent 落位，颜色/URL 均过白名单。
 *
 * 样式归属规则：
 *   - 字号/颜色是"环境量"，延续到下一同类声明或串末尾；它们落在**文本节点**上
 *     （每个文本片段按 flush 时刻的环境量带自己的 style），故 <h4>#aabbccxxx 中
 *     xxx 会同时拿到 h4 字号与 #aabbcc 颜色。
 *   - b/i/u/s 是"成对作用域"，落在 inline 容器节点上，可叠加、可嵌文本。
 */

(function () {
    // ---------- 正则 ----------
    var RE_OPEN = /^(<h([1-6])>|<a\|([^>]*)>|<(b|i|u|s)>)/;

    var H1_REM = 2.5;

    function hFontSize(level) {
        var v = H1_REM * Math.pow(0.78, level - 1);
        return v.toFixed(2) + 'rem';
    }

    function tagStyle(tag) {
        switch (tag) {
            case 'b': return { fontWeight: 'bold' };
            case 'i': return { fontStyle: 'italic' };
            case 'u': return { textDecoration: 'underline' };
            case 's': return { textDecoration: 'line-through' };
        }
        return {};
    }

    /**
     * 解析输入串 → 节点描述数组（顶层）。
     * 节点类型：
     *   {type:'text', text, style?}           文本（style 含 fontSize/color 环境量）
     *   {type:'inline', tag, url?, children}  a/b/i/u/s 容器；a 是链接，b/i/u/s 带样式
     */
    function parseTitle(input) {
        var s = String(input || '');
        var len = s.length;
        var i = 0;

        /**
         * 解析一段内容直到碰到 closeTag（若提供）。返回 {closed, nodes, raw, endIndex}。
         *  - closed=true ：nodes 为已解构子节点，raw='' ，endIndex 为闭合标签后下标
         *  - closed=false：nodes=[]，raw 为该段未被当前 closeTag 闭合的**原始子串**（含内部一切），
         *                  endIndex=len。调用方把 raw 按普通文字输出。
         * 内部入参 hRef/colorRef 为进入本段的初始环境量（对象引用，读值不改外部）。
         */
        function segment(closeTag, h, color) {
            var nodes = [];
            var buf = '';
            var pH = h;       // 局部字号
            var pC = color;   // 局部颜色
            var start = i;

            function push(text) {
                if (!text.length) return;
                var st = {};
                if (pH) st.fontSize = hFontSize(pH);
                if (pC) st.color = pC;
                if (pH || pC) nodes.push({ type: 'text', text: text, style: st });
                else nodes.push({ type: 'text', text: text });
            }

            while (i < len) {
                // 关闭标签文命中
                if (closeTag && s.slice(i, i + closeTag.length) === closeTag && closeTag.charAt(0) === '<') {
                    push(buf); buf = '';
                    i += closeTag.length;
                    return { closed: true, nodes: nodes, raw: '', endIndex: i };
                }
                // 匹配顶层起始标签（含 closeTag 本身外层）——
                // 但注意：closeTag 是精确串，已在上句处理；这里 RE_OPEN 匹配的必然是结构标签，
                // 与 closeTag 无关（b/i/u/s 的闭合串由调用处传入，不被 RE_OPEN 匹配为结构）。
                var ch = s.charAt(i);

                // 字面量转义
                if (ch === '\\' && i + 1 < len) {
                    var nx = s.charAt(i + 1);
                    if ('<>#|\\'.indexOf(nx) !== -1) { buf += nx; i += 2; continue; }
                }

                var m = RE_OPEN.exec(s.slice(i));
                if (m) {
                    push(buf); buf = '';
                    if (m[2]) { // <hN> 环境量
                        pH = parseInt(m[2], 10);
                        i += m[0].length;
                        continue;
                    }
                    if (m[3] !== undefined) { // <a|url>
                        var url = m[3].trim();
                        var aStart = i;
                        i += m[0].length;
                        var sub = segment('</a>', pH, pC);
                        if (sub.closed) {
                            nodes.push({ type: 'inline', tag: 'a', url: url, children: sub.nodes });
                        } else {
                            push(s.slice(aStart));       // 未闭合整段按普通文字
                            i = len;
                        }
                        continue;
                    }
                    if (m[4]) { // <b>/<i>/<u>/<s>
                        var tag = m[4];
                        var css = '<' + tag + '>';
                        var cse = '</' + tag + '>';
                        var bStart = i;
                        i += m[0].length;
                        var isub = segment(cse, pH, pC);
                        if (isub.closed) {
                            // 字形作用域：容器收一个 style
                            nodes.push({ type: 'inline', tag: tag, style: tagStyle(tag), children: isub.nodes });
                        } else {
                            push(s.slice(bStart));      // 未闭合粗暴回退：含 <tag> 起的整段原文
                            i = len;
                        }
                        continue;
                    }
                    continue;
                }

                // 颜色 #hex（仅在该上下文里非链接 URL 起始）
                if (ch === '#') {
                    var hx = /^#[0-9a-fA-F]{6}/.exec(s.slice(i));
                    if (hx) {
                        push(buf); buf = '';
                        pC = hx[0].toLowerCase();
                        i += hx[0].length; // 含 # 的 7 字符
                        continue;
                    }
                    buf += ch; i += 1;
                    continue;
                }

                buf += ch; i += 1;
            }

            push(buf);
            return { closed: false, nodes: nodes, raw: s.slice(start), endIndex: len };
        }

        var res = segment(null, null, null);
        return res.nodes;
    }

    // ---------- 渲染 ----------
    var STYLE_ALLOWED = ['fontSize', 'color', 'fontWeight', 'fontStyle', 'textDecoration'];

    function buildNode(node, isSafeUrl) {
        if (node.type === 'text') {
            if (node.style) {
                var span = document.createElement('span');
                applyStyle(span, node.style);
                span.textContent = node.text;
                return span;
            }
            return document.createTextNode(node.text);
        }
        var isA = node.tag === 'a';
        var validA = isA && node.url && isSafeUrl(node.url);
        var el = document.createElement(validA ? 'a' : 'span');
        if (node.style) applyStyle(el, node.style);
        if (validA) {
            el.href = node.url;
            el.target = '_blank';
            el.rel = 'noopener noreferrer';
        }
        (node.children || []).forEach(function (cn) {
            el.appendChild(buildNode(cn, isSafeUrl));
        });
        return el;
    }

    function applyStyle(el, style) {
        for (var k = 0; k < STYLE_ALLOWED.length; k++) {
            var prop = STYLE_ALLOWED[k];
            if (style[prop]) el.style[prop] = style[prop];
        }
    }

    function renderTitle(container, nodes, isSafeUrl) {
        (nodes || []).forEach(function (node) {
            container.appendChild(buildNode(node, isSafeUrl));
        });
    }

    function isSafeLinkUrl(url) {
        try {
            var parsed = new URL(url, window.location.href);
            return ['http:', 'https:', 'mailto:'].indexOf(parsed.protocol) !== -1;
        } catch (e) {
            return false;
        }
    }

    function titleToPlainText(input) {
        var s = String(input || '');
        s = s.replace(/\\([<>#|\\])/g, '$1');       // 去掉字面量转义反斜杠
        s = s.replace(/<a\|[^>]*>/g, '').replace(/<\/a>/g, '');
        s = s.replace(/<h[1-6]>/g, '');
        s = s.replace(/<\/(b|i|u|s)>/g, '');
        s = s.replace(/<(b|i|u|s)>/g, '');
        return s;
    }

    window.TitleParse = {
        parseTitle: parseTitle,
        renderTitle: renderTitle,
        isSafeLinkUrl: isSafeLinkUrl,
        titleToPlainText: titleToPlainText,
        hFontSize: hFontSize
    };
})();