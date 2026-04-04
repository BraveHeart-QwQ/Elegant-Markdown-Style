({
    // NOTE: 
    // - Do not add new lines to markdown, as this will break the scroll synchronization in the preview.
    // - Inserting HTML code may cause parsing errors in adjacent Markdown line.
    // - HTML comments are stripped after onWillParseMarkdown and cannot be passed to onDidParseMarkdown.

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
            private static readonly RE_TABLE_CAPTION = /^\[table-caption:[ \t]*(.+?)\][ \t]*\n/gm; // [table-caption: caption]

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
                        return `![${title}](${url}){${attrs.slice(1, -1)} data-caption="${escaped}"}`;
                    } else {
                        return `![${title}](${url}){data-caption="${escaped}"}`;
                    }
                });
            }

            private injectTableCaptions(markdown: string): string {
                MarkdownProcessor.RE_TABLE_CAPTION.lastIndex = 0;
                return markdown.replace(MarkdownProcessor.RE_TABLE_CAPTION, (_, caption: string) => {
                    const escaped = caption.trim().replace(/"/g, '&quot;');
                    return `<span data-table-caption="${escaped}"></span>\n`;
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
            private static readonly RE_IMG_CAPTION = /<img([^>]*)\sdata-caption="([^"]*)"([^>]*)>/g;
            private static readonly RE_P_FIGURE = /<p>(<figure>(?:[\s\S]*?)<\/figure>)<\/p>/g;
            private static readonly RE_TABLE_CAPTION = /<p[^>]*><span data-table-caption="([^"]*)"><\/span><\/p>\s*\n?(<table[\s\S]*?<\/table>)/g;

            async process(html: string): Promise<string> {

                // reverse the order of injection to ensure captions are correctly nested
                html = this.injectTableCaptions(html);
                html = this.injectImageCaptions(html);

                return html;
            }

            private injectImageCaptions(html: string): string {
                // 将带 data-caption 的 <img> 包装为 <figure><figcaption>
                HtmlProcessor.RE_IMG_CAPTION.lastIndex = 0;
                html = html.replace(HtmlProcessor.RE_IMG_CAPTION, (_, before, caption, after) => {
                    return `<figure><img${before}${after}><figcaption>${caption}</figcaption></figure>`;
                });
                // 解除 <p><figure>...</figure></p> 的多余包装
                HtmlProcessor.RE_P_FIGURE.lastIndex = 0;
                html = html.replace(HtmlProcessor.RE_P_FIGURE, '$1');
                return html;
            }

            private injectTableCaptions(html: string): string {
                // 为表格注入 <caption>
                HtmlProcessor.RE_TABLE_CAPTION.lastIndex = 0;
                html = html.replace(HtmlProcessor.RE_TABLE_CAPTION, (_, caption, table) => {
                    return table.replace(/^(<table[^>]*>)/, `$1<caption>${caption}</caption>`);
                });
                return html;
            }
        }

        const processor = new HtmlProcessor();
        return processor.process(html);
    },
});
