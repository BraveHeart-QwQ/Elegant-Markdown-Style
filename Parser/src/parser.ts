({
    /**
     * Hook to modify the Markdown code before it is parsed.
     *
     * @param {String} markdown The original Markdown code.
     * @returns {String} The modified Markdown code.
     */
    onWillParseMarkdown: async function (markdown: string): Promise<string> {
        return markdown;
    },

    /**
     * Hook to modify the HTML output of the parser.
     *
     * @param {String} html The HTML code returned by the parser.
     * @returns {String} The modified HTML code.
     */
    onDidParseMarkdown: async function (html: string): Promise<string> {
        return html;
    },
});
