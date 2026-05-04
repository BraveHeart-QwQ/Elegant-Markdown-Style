({
    //===----------------------------------------------------------------------===//
    //
    // @author	: BraveHeart-QwQ
    // @desc	: https://github.com/BraveHeart-QwQ/Elegant-Markdown-Style
    //
    //===----------------------------------------------------------------------===//

    // NOTE: 
    // - Do not add new lines to markdown, as this will break the scroll synchronization in the preview.
    // - Inserting HTML code may cause parsing errors in adjacent Markdown line.
    // - HTML comments are stripped after onWillParseMarkdown and cannot be passed to onDidParseMarkdown.
    // - VSCode Preview may inject the data-source-line attribute into HTML tags. Regex matching should be permissive regarding attributes.
    // - HTML tags in Markdown may be removed by the sanitizer.
    // - Data Attribute should start with "data-" to avoid conflicts with standard attributes and ensure they are preserved in the output.

    /**
     * Hook to modify the Markdown code before it is parsed.
     *
     * @param {String} markdown The original Markdown code.
     * @returns {String} The modified Markdown code.
     */
    onWillParseMarkdown: async function (markdown: string): Promise<string> {
        class MarkdownProcessor {
            // 产生式
            private static readonly RE_BLOCK_CODE = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\1[ \t]*$/gm; // ```code```
            private static readonly RE_INLINE_CODE = /`[^`\n]+`/g; // `code`
            private static readonly RE_BLOCK_MATH = /\$\$[\s\S]+?\$\$/g; // $$math$$
            private static readonly RE_INLINE_MATH = /\$(?!\s)(?:\\.|[^$\n\\])+?(?<!\s)\$/g; // $math$
            private static readonly RE_IMAGE = /!\[([^\]\n]+)\]\(([^)\n]+)\)(\{[^}]*\})?/g; // ![title](url){attrs}
            private static readonly RE_TABLE_DIRECTIVE = /^([ \t]*)\[table:([^\]\n]+)\][ \t]*\n/gm; // [table: title="..."; align="..."; disabled; ...]
            private static readonly RE_LIST_DIRECTIVE = /^([ \t]*)\[list:([^\]\n]+)\][ \t]*\n/gm; // [list: style="table"; ...]
            private static readonly RE_CALLOUT_DIRECTIVE = /^([ \t]*(?:>[ \t]*)+)\[!([^\]\n]+)\]/gm; // > [!Mark]
            private static readonly RE_DETAILS_OPEN = /^([ \t]*):::[ \t]+details([ \t]+[^\n]+?)?[ \t]*$/gm; // ::: details Title
            private static readonly RE_DETAILS_CLOSE = /^([ \t]*):::[ \t]*$/gm; // :::

            // 恢复占位符
            private static readonly RE_RESTORE_CODE = /\x00BLOCK_(\d+)\x00/g; // \x00BLOCK_0\x00

            /*====-------------- Members --------------====*/

            private blocks: string[] = [];

            /*====-------------- Process --------------====*/

            async process(markdown: string): Promise<string> {
                let result = this.protect(markdown);

                result = this.injectDetailsDirectives(result);
                result = this.injectCalloutDirectives(result);
                result = this.injectImageCaptions(result);
                result = this.injectTableCaptions(result);
                result = this.injectListDirectives(result);
                result = this.fixInlineDelimiters(result);

                return this.restore(result);
            }

            private injectDetailsDirectives(markdown: string): string {
                MarkdownProcessor.RE_DETAILS_OPEN.lastIndex = 0;
                MarkdownProcessor.RE_DETAILS_CLOSE.lastIndex = 0;
                markdown = markdown.replace(MarkdownProcessor.RE_DETAILS_OPEN, (_, prefix: String | undefined, titlePart: string | undefined) => {
                    let raw = (titlePart ?? '').trim();
                    let expanded = false;
                    if (/^open(?:\s|$)/i.test(raw)) {
                        expanded = true;
                        raw = raw.replace(/^open\s*/i, '');
                    }
                    const escaped = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                    const expandedAttr = expanded ? ' data-details-expanded' : '';
                    return `${prefix}<span data-details-open="${escaped}"${expandedAttr}></span>`;
                });
                markdown = markdown.replace(MarkdownProcessor.RE_DETAILS_CLOSE, (_, prefix) => {
                    return `${prefix}<span data-details-close=""></span>`;
                });
                return markdown;
            }

            private fixInlineDelimiters(markdown: string): string {
                // When ** or == delimiters border non-ASCII characters (CJK / fullwidth
                // punctuation etc.), many parsers fail the flanking-delimiter check.
                // Convert such spans to their HTML equivalents to ensure correct output.
                markdown = markdown.replace(/\*\*([^*\n]+?)\*\*/g, (match, content) => {
                    if (/^[^\x00-\x7F]|[^\x00-\x7F]$/.test(content)) {
                        return `<strong>${content}</strong>`;
                    }
                    return match;
                });
                markdown = markdown.replace(/==([^=\n]+?)==/g, (match, content) => {
                    if (/^[^\x00-\x7F]|[^\x00-\x7F]$/.test(content)) {
                        return `<mark>${content}</mark>`;
                    }
                    return match;
                });
                markdown = markdown.replace(/~~([^~\n]+?)~~/g, (match, content) => {
                    if (/^[^\x00-\x7F]|[^\x00-\x7F]$/.test(content)) {
                        return `<s>${content}</s>`;
                    }
                    return match;
                });
                return markdown;
            }

            private injectCalloutDirectives(markdown: string): string {
                MarkdownProcessor.RE_CALLOUT_DIRECTIVE.lastIndex = 0;
                return markdown.replace(MarkdownProcessor.RE_CALLOUT_DIRECTIVE, (_, prefix, mark) => {
                    const escaped = mark.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                    return `${prefix}<span data-co="${escaped}"></span>`;
                });
            }

            private injectImageCaptions(markdown: string): string {
                MarkdownProcessor.RE_IMAGE.lastIndex = 0;
                return markdown.replace(MarkdownProcessor.RE_IMAGE, (match, title: string, url: string, attrs: string | undefined) => {
                    const trimmed = title.trim();
                    if (!trimmed) return match;
                    const escaped = trimmed.replace(/"/g, '&quot;');
                    if (attrs) {
                        // 插入到已有 {} 内
                        return `![${title}](${url}){${attrs.slice(1, -1)} image-title="${escaped}"}`;
                    } else {
                        return `![${title}](${url}){image-title="${escaped}"}`;
                    }
                });
            }

            private injectListDirectives(markdown: string): string {
                MarkdownProcessor.RE_LIST_DIRECTIVE.lastIndex = 0;
                return markdown.replace(MarkdownProcessor.RE_LIST_DIRECTIVE, (_, indent: string, attrs: string) => {
                    const RE_KV = /([\w-]+)(?:="([^"]*)")? *;?/g;
                    const parts: string[] = [];
                    let m: RegExpExecArray | null;
                    while ((m = RE_KV.exec(attrs)) !== null) {
                        const key = m[1]!.toLowerCase();
                        const val = m[2] ?? '';
                        parts.push(`data-list-${key}="${val}"`);
                    }
                    if (parts.length === 0) return '';
                    return `${indent}<span ${parts.join(' ')}></span>\n`;
                });
            }

            private injectTableCaptions(markdown: string): string {
                MarkdownProcessor.RE_TABLE_DIRECTIVE.lastIndex = 0;
                return markdown.replace(MarkdownProcessor.RE_TABLE_DIRECTIVE, (_, indent: string, attrs: string) => {
                    const RE_KV = /([\w-]+)(?:="([^"]*)")? *;?/g;
                    const parts: string[] = [];
                    let m: RegExpExecArray | null;
                    while ((m = RE_KV.exec(attrs)) !== null) {
                        const key = m[1]!.toLowerCase();
                        const val = m[2] ?? '';
                        parts.push(`data-table-${key}="${val}"`);
                    }
                    if (parts.length === 0) return '';
                    return `${indent}<span ${parts.join(' ')}></span>\n`;
                });
            }

            /* Protect */

            private protect(markdown: string): string {
                this.blocks = [];
                // 先保护围栏代码块（多行），再保护行内代码；同样先块级公式再行内公式
                MarkdownProcessor.RE_BLOCK_CODE.lastIndex = 0;
                MarkdownProcessor.RE_INLINE_CODE.lastIndex = 0;
                MarkdownProcessor.RE_BLOCK_MATH.lastIndex = 0;
                MarkdownProcessor.RE_INLINE_MATH.lastIndex = 0;
                return markdown
                    .replace(MarkdownProcessor.RE_BLOCK_CODE, (match) => {
                        this.blocks.push(match);
                        return `\x00BLOCK_${this.blocks.length - 1}\x00`;
                    })
                    .replace(MarkdownProcessor.RE_BLOCK_MATH, (match) => {
                        this.blocks.push(match);
                        return `\x00BLOCK_${this.blocks.length - 1}\x00`;
                    })
                    .replace(MarkdownProcessor.RE_INLINE_CODE, (match) => {
                        this.blocks.push(match);
                        return `\x00BLOCK_${this.blocks.length - 1}\x00`;
                    })
                    .replace(MarkdownProcessor.RE_INLINE_MATH, (match) => {
                        this.blocks.push(match);
                        return `\x00BLOCK_${this.blocks.length - 1}\x00`;
                    });
            }

            private restore(markdown: string): string {
                MarkdownProcessor.RE_RESTORE_CODE.lastIndex = 0;
                return markdown.replace(MarkdownProcessor.RE_RESTORE_CODE, (_, i) => this.blocks[parseInt(i)]!);
            }
        }

        const processor = new MarkdownProcessor();
        return processor.process(markdown);
    },

    /**
     * Hook to modify the HTML output of the parser.
     *
     * @param {String} html The HTML code returned by the parser.
     * @returns {String} The modified HTML code.
     */
    onDidParseMarkdown: async function (html: string): Promise<string> {
        class HtmlProcessor {
            private static readonly RE_IMG_ANY = /<img([^>]*)>/g;
            private static readonly RE_P_FIGURE = /<p>(<div class=img>(?:[\s\S]*?)<\/div>)<\/p>/g;
            private static readonly RE_TABLE_SPAN = /<p([^>]*)>([\s\S]*?)<span([^>]*)><\/span><\/p>\s*\n?(<table[\s\S]*?<\/table>)/g;
            private static readonly RE_CALLOUT_MARK = /(<blockquote[^>]*>)((?:(?!<\/blockquote>)[\s\S])*?<p[^>]*>)<span data-co="([^"]+)"><\/span>(?:<br[\t ]*\/?>[ \t]*\n?)?/g;
            private static readonly RE_PLAIN_BLOCKQUOTE = /(<blockquote(?![^>]*data-callout)[^>]*>)((?:(?!<\/blockquote>)[\s\S])*?<p[^>]*>)/g;
            private static readonly RE_LIST_TABLE = /<p([^>]*)>([\s\S]*?)<span([^>]*)><\/span><\/p>\s*\n?(<ul[\s\S]*?<\/ul>|<ol[\s\S]*?<\/ol>)/g;
            private static readonly RE_HEADER_LIST_RUN = /(<h[56][^>]*>[\s\S]*?)(?=<h[1-4][^>]*>|$)/g;
            // Open sentinel may be:
            //   1. alone in <p>                           → <p...><span data-details-open/></p>
            //   2. inline at start (Case B, all adjacent) → <p...><span data-details-open/><br>…
            //   3. preceded by content in same <p>        → <p...>STUFF<br><span data-details-open/>
            //   4. not wrapped in <p> at all
            //   5. both sentinels in the same <p>         → <p...><span data-details-open/>...<span data-details-close/></p>
            // Close sentinel: <span data-details-close/> followed by optional </p>
            private static readonly RE_DETAILS_SAME_P = /<p([^>]*)><span data-details-open="([^"]*)"([^>]*)><\/span>([\s\S]*?)<span data-details-close=""[^>]*><\/span><\/p>/g;
            private static readonly RE_DETAILS_BLOCK = /(?:<p([^>]*)>([\s\S]*?)<br[^>]*>\n?|(?:<p[^>]*>)?)<span data-details-open="([^"]*)"([^>]*)><\/span>([\s\S]*?)<span data-details-close=""[^>]*><\/span>(?:\s*<\/p>)?/g;

            // Copy from github
            private static readonly BLOCKQUOTE_NOTE_SVG = `<svg class="octicon octicon-info mr-2" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>`;
            private static readonly BLOCKQUOTE_TIP_SVG = `<svg class="octicon octicon-light-bulb mr-2" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"></path></svg>`;
            private static readonly BLOCKQUOTE_IMPORTANT_SVG = `<svg class="octicon octicon-report mr-2" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path></svg>`;
            private static readonly BLOCKQUOTE_WARNING_SVG = `<svg class="octicon octicon-alert mr-2" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path></svg>`;
            private static readonly BLOCKQUOTE_CAUTION_SVG = `<svg class="octicon octicon-stop mr-2" viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true"><path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>`;

            async process(html: string): Promise<string> {

                // reverse the order of injection to ensure captions are correctly nested
                html = this.injectTableCaptions(html);
                html = this.injectListTables(html);
                html = this.injectImageCaptions(html);
                html = this.injectCalloutBlocks(html);
                html = this.injectHeaderList(html);
                html = this.injectDetailsBlocks(html);

                return html;
            }

            private injectDetailsBlocks(html: string): string {
                // Case 5: both sentinels inside the same <p> — handle first to avoid conflicts
                HtmlProcessor.RE_DETAILS_BLOCK.lastIndex = 0;
                html = html.replace(HtmlProcessor.RE_DETAILS_BLOCK, (_, pAttrs: string | undefined, preceding: string | undefined, title: string, extraAttrs: string, rawContent: string) => {
                    const open = extraAttrs.includes('data-details-expanded') ? ' open' : '';
                    // If a preceding paragraph was merged with the open sentinel, close it first
                    const prefix = preceding
                        ? `<p${pAttrs ?? ''}>${preceding}</p>\n`
                        : '';
                    const content = rawContent
                        .replace(/^<br[^>]*>\n?/, '')   // strip leading <br> (Case B / preceding)
                        .replace(/^<\/p>\s*/, '')        // strip leading </p> (Case A / preceding)
                        .replace(/\s*<p[^>]*>$/, '')     // strip trailing <p...> (Case A)
                        .replace(/<br[^>]*>\n?$/, '');   // strip trailing <br> (Case B)
                    return `${prefix}<details${open}><summary>${title}</summary>${content}</details>`;
                });
                HtmlProcessor.RE_DETAILS_SAME_P.lastIndex = 0;
                return html.replace(HtmlProcessor.RE_DETAILS_SAME_P, (_, _pAttrs: string, title: string, extraAttrs: string, rawContent: string) => {
                    const open = extraAttrs.includes('data-details-expanded') ? ' open' : '';
                    const content = rawContent
                        .replace(/^<br[^>]*>\n?/, '')   // strip leading <br>
                        .replace(/<br[^>]*>\n?$/, '');  // strip trailing <br>
                    return `<details${open}><summary>${title}</summary>${content}</details>`;
                });
            }

            private injectImageCaptions(html: string): string {
                // 将所有 <img> 包装为 <div class=img>，有 image-title 的额外添加 <figcaption>
                HtmlProcessor.RE_IMG_ANY.lastIndex = 0;
                html = html.replace(HtmlProcessor.RE_IMG_ANY, (_, attrs: string) => {
                    const m = / image-title="([^"]*)"/.exec(attrs);
                    if (m) {
                        const title = m[1]!;
                        const cleanAttrs = attrs.replace(/ image-title="[^"]*"/, '');
                        return `<div class=img><img${cleanAttrs}><figcaption>${title}</figcaption></div>`;
                    }
                    return `<div class=img><img${attrs}></div>`;
                });
                // 解除 <p><div class=img>...</div></p> 的多余包装
                HtmlProcessor.RE_P_FIGURE.lastIndex = 0;
                html = html.replace(HtmlProcessor.RE_P_FIGURE, '$1');
                return html;
            }

            private injectTableCaptions(html: string): string {
                // 从 <span data-table-*> 读取属性注入到后续 <table>
                HtmlProcessor.RE_TABLE_SPAN.lastIndex = 0;
                return html.replace(HtmlProcessor.RE_TABLE_SPAN, (match, pAttrs: string, preceding: string, spanAttrs: string, table: string) => {
                    if (!spanAttrs.includes('data-table-')) return match;
                    const RE_DATA_ATTR = /\sdata-table-([\w-]+)="([^"]*)"/g;
                    let title: string | null = null;
                    const tableAttrs: Array<[string, string]> = [];
                    let m: RegExpExecArray | null;
                    while ((m = RE_DATA_ATTR.exec(spanAttrs)) !== null) {
                        const key = m[1]!;
                        const val = m[2]!;
                        if (key === 'title') {
                            title = val;
                        } else {
                            tableAttrs.push([key, val]);
                        }
                    }
                    let result = table;
                    if (title !== null) {
                        result = result.replace(/^(<table[^>]*>)/, `$1<caption>${title}</caption>`);
                    }
                    if (tableAttrs.length > 0) {
                        const attrsStr = tableAttrs.map(([k, v]) => v === '' ? ` data-${k}` : ` data-${k}="${v}"`).join('');
                        result = `<div class=table${attrsStr}>\n${result}\n</div>`;
                    }
                    const trimmedPreceding = preceding.replace(/<br[^>]*>\s*$/, '').trim();
                    const prefix = trimmedPreceding ? `<p${pAttrs}>${trimmedPreceding}</p>\n` : '';
                    return `${prefix}${result}`;
                });
            }

            private injectListTables(html: string): string {
                HtmlProcessor.RE_LIST_TABLE.lastIndex = 0;
                return html.replace(HtmlProcessor.RE_LIST_TABLE, (match, pAttrs: string, preceding: string, spanAttrs: string, list: string) => {
                    if (!spanAttrs.includes('data-list-style="table"')) return match;

                    const isOrdered = /^<ol/.test(list);

                    // 收集 style 以外的属性
                    const RE_DATA_ATTR = /\sdata-list-([\w-]+)="([^"]*)"/g;
                    const wrapperAttrs: Array<[string, string]> = [];
                    let m: RegExpExecArray | null;
                    while ((m = RE_DATA_ATTR.exec(spanAttrs)) !== null) {
                        if (m[1] !== 'style') {
                            wrapperAttrs.push([m[1]!, m[2]!]);
                        }
                    }

                    // 解析每个 <li>
                    const RE_LI = /<li[^>]*>([\s\S]*?)<\/li>/g;
                    const items: Array<{ title: string; body: string }> = [];
                    let li: RegExpExecArray | null;
                    while ((li = RE_LI.exec(list)) !== null) {
                        const raw = li[1]!.trim();
                        const pMatch = /^<p[^>]*>([\s\S]*?)<\/p>/.exec(raw);
                        if (pMatch) {
                            const title = pMatch[1]!;
                            const body = raw.slice(pMatch[0].length).trim()
                                .replace(/^<p[^>]*>/, '').replace(/<\/p>$/, '')
                                .replace(/<\/p>\s*<p[^>]*>/g, '<br>');
                            items.push({ title, body });
                        } else {
                            items.push({ title: raw, body: '' });
                        }
                    }

                    if (items.length === 0) return match;

                    // 构建表格
                    const hasBody = items.some(item => item.body !== '');
                    let thead: string;
                    let rows: string;
                    if (isOrdered) {
                        thead = `<thead><tr><th>a</th><th>b</th>${hasBody ? '<th>c</th>' : ''}</tr></thead>`;
                        rows = items.map((item, i) => {
                            const cells = `<td>${i + 1}</td><td>${item.title}</td>${hasBody ? `<td>${item.body}</td>` : ''}`;
                            return `<tr>${cells}</tr>`;
                        }).join('\n');
                    } else {
                        thead = `<thead><tr><th>a</th>${hasBody ? '<th>b</th>' : ''}</tr></thead>`;
                        rows = items.map(item => {
                            const cells = `<td>${item.title}</td>${hasBody ? `<td>${item.body}</td>` : ''}`;
                            return `<tr>${cells}</tr>`;
                        }).join('\n');
                    }

                    const table = `<table>${thead}\n<tbody>\n${rows}\n</tbody></table>`;
                    const hasLayout = wrapperAttrs.some(([k]) => k === 'layout');
                    if (isOrdered && !hasLayout) {
                        wrapperAttrs.unshift(['layout', 'step']);
                    }
                    const attrsStr = wrapperAttrs.map(([k, v]) => v === '' ? ` data-${k}` : ` data-${k}="${v}"`).join('');
                    const trimmedPreceding = preceding.replace(/<br[^>]*>\s*$/, '').trim();
                    const prefix = trimmedPreceding ? `<p${pAttrs}>${trimmedPreceding}</p>\n` : '';
                    return `${prefix}<div class=table${attrsStr}>\n${table}\n</div>`;
                });
            }

            private static readonly CALLOUT_SVG_MAP: Record<string, string> = {
                'NOTE': HtmlProcessor.BLOCKQUOTE_NOTE_SVG,
                'TIP': HtmlProcessor.BLOCKQUOTE_TIP_SVG,
                'IMPORTANT': HtmlProcessor.BLOCKQUOTE_IMPORTANT_SVG,
                'WARNING': HtmlProcessor.BLOCKQUOTE_WARNING_SVG,
                'CAUTION': HtmlProcessor.BLOCKQUOTE_CAUTION_SVG,
            };

            private injectCalloutBlocks(html: string): string {
                // 将 blockquote 首段的 <span data-co> 提升为 data-callout 并注入 callout-title
                HtmlProcessor.RE_CALLOUT_MARK.lastIndex = 0;
                html = html.replace(HtmlProcessor.RE_CALLOUT_MARK, (_, bqOpenTag, before, mark) => {
                    const escaped = mark.replace(/"/g, '&quot;');
                    const svg = HtmlProcessor.CALLOUT_SVG_MAP[mark.toUpperCase()] ?? '';
                    const newBqTag = bqOpenTag.replace(/^<blockquote/, `<blockquote data-callout="${escaped}"`);
                    return `${newBqTag}<div class="callout-title">${svg}${mark}</div>${before}`;
                });
                // 对未指定样式的 blockquote，自动注入 NOTE
                HtmlProcessor.RE_PLAIN_BLOCKQUOTE.lastIndex = 0;
                html = html.replace(HtmlProcessor.RE_PLAIN_BLOCKQUOTE, (_, bqOpenTag, before) => {
                    const newBqTag = bqOpenTag.replace(/^<blockquote/, `<blockquote data-callout="NOTE"`);
                    return `${newBqTag}<div class="callout-title">${HtmlProcessor.BLOCKQUOTE_NOTE_SVG}NOTE</div>${before}`;
                });
                return html;
            }

            private injectHeaderList(html: string): string {
                // 将连续的 h5/h6 段（含其后续内容）合并包裹为 <div class="header-list">
                HtmlProcessor.RE_HEADER_LIST_RUN.lastIndex = 0;
                return html.replace(HtmlProcessor.RE_HEADER_LIST_RUN, (match) => {
                    return `<div class="header-list">${match}</div>`;
                });
            }
        }

        const processor = new HtmlProcessor();
        return processor.process(html);
    },
});
