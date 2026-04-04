({
    // NOTE: 
    // - Do not add new lines to markdown, as this will break the scroll synchronization in the preview.
    // - Inserting HTML code may cause parsing errors in adjacent Markdown line.
    // - HTML comments are stripped after onWillParseMarkdown and cannot be passed to onDidParseMarkdown.
    // - VSCode Preview may inject the data-source-line attribute into HTML tags. Regex matching should be permissive regarding attributes.

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
            private static readonly RE_IMAGE = /!\[([^\]\n]+)\]\(([^)\n]+)\)(\{[^}]*\})?/g; // ![title](url){attrs}
            private static readonly RE_TABLE_DIRECTIVE = /^\[table:([^\]\n]+)\][ \t]*\n/gm; // [table: title="..."; align="..."; disabled; ...]

            // 恢复占位符
            private static readonly RE_RESTORE_CODE = /\x00BLOCK_(\d+)\x00/g; // \x00BLOCK_0\x00

            /*====-------------- Members --------------====*/

            private blocks: string[] = [];

            /*====-------------- Process --------------====*/

            async process(markdown: string): Promise<string> {
                let result = this.protect(markdown);

                result = this.injectImageCaptions(result);
                result = this.injectTableCaptions(result);

                return this.restore(result);
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

            private injectTableCaptions(markdown: string): string {
                MarkdownProcessor.RE_TABLE_DIRECTIVE.lastIndex = 0;
                return markdown.replace(MarkdownProcessor.RE_TABLE_DIRECTIVE, (_, attrs: string) => {
                    const RE_KV = /([\w-]+)(?:="([^"]*)")? *;?/g;
                    const parts: string[] = [];
                    let m: RegExpExecArray | null;
                    while ((m = RE_KV.exec(attrs)) !== null) {
                        const key = m[1]!.toLowerCase();
                        const val = m[2] ?? '';
                        parts.push(`data-table-${key}="${val}"`);
                    }
                    if (parts.length === 0) return '';
                    return `<span ${parts.join(' ')}></span>\n`;
                });
            }

            /* Protect */

            private protect(markdown: string): string {
                this.blocks = [];
                // 先保护围栏代码块（多行），再保护行内代码
                MarkdownProcessor.RE_BLOCK_CODE.lastIndex = 0;
                MarkdownProcessor.RE_INLINE_CODE.lastIndex = 0;
                return markdown
                    .replace(MarkdownProcessor.RE_BLOCK_CODE, (match) => {
                        this.blocks.push(match);
                        return `\x00BLOCK_${this.blocks.length - 1}\x00`;
                    })
                    .replace(MarkdownProcessor.RE_INLINE_CODE, (match) => {
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
            private static readonly RE_IMG_CAPTION = /<img([^>]*)\simage-title="([^"]*)"([^>]*)>/g;
            private static readonly RE_P_FIGURE = /<p>(<figure>(?:[\s\S]*?)<\/figure>)<\/p>/g;
            private static readonly RE_TABLE_SPAN = /<p[^>]*><span([^>]*)><\/span><\/p>\s*\n?(<table[\s\S]*?<\/table>)/g;
            private static readonly RE_BLOCKQUOTE_MARK = /(<blockquote[^>]*>)([\s\S]*?<p[^>]*>)!\[([^\]]+)\](?:<br[\t ]*\/?>[ \t]*\n?)?/g;
            private static readonly RE_HEADER_LIST_RUN = /(<h[56][^>]*>[\s\S]*?)(?=<h[1-4][^>]*>|$)/g;

            async process(html: string): Promise<string> {

                // reverse the order of injection to ensure captions are correctly nested
                html = this.injectTableCaptions(html);
                html = this.injectImageCaptions(html);
                html = this.injectBlockquoteMarks(html);
                html = this.injectHeaderList(html);

                return html;
            }

            private injectImageCaptions(html: string): string {
                // 将带 image-title 的 <img> 包装为 <figure><figcaption>
                HtmlProcessor.RE_IMG_CAPTION.lastIndex = 0;
                html = html.replace(HtmlProcessor.RE_IMG_CAPTION, (_, before, title, after) => {
                    return `<figure><img${before}${after}><figcaption>${title}</figcaption></figure>`;
                });
                // 解除 <p><figure>...</figure></p> 的多余包装
                HtmlProcessor.RE_P_FIGURE.lastIndex = 0;
                html = html.replace(HtmlProcessor.RE_P_FIGURE, '$1');
                return html;
            }

            private injectTableCaptions(html: string): string {
                // 从 <span data-table-*> 读取属性注入到后续 <table>
                HtmlProcessor.RE_TABLE_SPAN.lastIndex = 0;
                return html.replace(HtmlProcessor.RE_TABLE_SPAN, (match, spanAttrs: string, table: string) => {
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
                    if (tableAttrs.length > 0) {
                        const attrsStr = tableAttrs.map(([k, v]) => v === '' ? ` ${k}` : ` ${k}="${v}"`).join('');
                        result = result.replace(/^(<table)([^>]*>)/, `$1${attrsStr}$2`);
                    }
                    if (title !== null) {
                        result = result.replace(/^(<table[^>]*>)/, `$1<caption>${title}</caption>`);
                    }
                    return result;
                });
            }

            private injectBlockquoteMarks(html: string): string {
                // 将 blockquote 首行的 ![Mark] 提升为 data-mark attribute
                HtmlProcessor.RE_BLOCKQUOTE_MARK.lastIndex = 0;
                return html.replace(HtmlProcessor.RE_BLOCKQUOTE_MARK, (_, bqOpenTag, before, mark) => {
                    const escaped = mark.replace(/"/g, '&quot;');
                    const newBqTag = bqOpenTag.replace(/^<blockquote/, `<blockquote data-mark="${escaped}"`);
                    return `${newBqTag}${before}`;
                });
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
