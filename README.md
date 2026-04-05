# Elegant Markdown Style

A self-use Markdown style (suitable for study notes, documents), used with [VSCode](https://code.visualstudio.com/) + [Markdown Preview Enhanced plug-in](https://github.com/shd101wyy/markdown-preview-enhanced).

The inspiration for the style comes mainly from the following websites:
- [Google Protocol Buffers Doc](https://developers.google.com/protocol-buffers)
- [MSDN Doc](https://learn.microsoft.com/en-us/dotnet/api/system?view=net-7.0)
- [LearnOpenGL CN](https://learnopengl-cn.github.io/)

p.s. This repository will update occasionally, and the pic below may not be updated in time.

p.s. As a developer (and user), I personally use notes mixed with Chinese and English, and use it under different resolutions and ppi. I personally think it performs well in most situations.


## Install

### Install Fonts
Search "font-family" in [Thin-Style.less](CSS/Thin-Style-MacOS.less) and download it from the Internet by yourself. Some of these fonts may be found on Github or [Google Fonts](https://fonts.google.com/).

### Install Style
Please make sure you have installed **Markdown-Preview-Enhanced Plugin** on vscode.

Install CSS Style:
1. <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> (or <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> on mac)
1. Enter "Customize CSS" and select the first option, it would open a file called `style.less`
1. Delete **everything** in `style.less`
1. Copy **everything** in [Thin-Style-Windows.less](CSS/Thin-Style-Windows.less) (or [Thin-Style-MacOS.less](CSS/Thin-Style-MacOS.less) on macOS)
1. Paste into `style.less` and save.

Install parser hook:
1. <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> (or <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd> on mac)
1. Enter "Extend Parser (Global)"
1. Copy **everything** in [parser.js](Parser/dist/parser.js) and paste into the opened file, then save.

> [!CAUTION]
> parser.js is the build result of parser.ts, which may have some extra code inside. You need to remove those extra code to make it work in Markdown-Preview-Enhanced.











<br>
<br>
<br>
<br>
<br>
<br>
---End---
