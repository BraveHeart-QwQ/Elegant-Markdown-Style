# Sample

p.s. The following content is from wikipedia or MSDN


## What is Markdown  [⇱](https://en.wikipedia.org/wiki/Markdown)

<ref>

Markdown is a lightweight markup language for creating formatted text using a plain-text editor. John Gruber and Aaron Swartz created Markdown in 2004 as a markup language that is appealing to human readers in its source code form. Markdown is widely used in blogging, instant messaging, online forums, collaborative software, documentation pages, and readme files.

The initial description of Markdown contained ambiguities and raised unanswered questions, causing implementations to both intentionally and accidentally diverge from the original version. This was addressed in 2014, when long-standing Markdown contributors released CommonMark, an unambiguous specification and test suite for Markdown.
[Wikipedia](https://en.wikipedia.org/wiki/Markdown)

</ref>

### History
<def>Markdown</def> was inspired by **pre-existing** conventions for marking up plain text in email and usenet posts, such as the earlier markup languages setext (c. 1992), Textile (c. 2002), and reStructuredText (c. 2002).

<div align=center class=img><img src=".Image/2023-02-09-19-34-11.png" style="zoom:90%"><br><fig>Markdown Logo</fig></div>

### Variants

#### GitHub Flavored Markdown
GitHub had been using its own variant of Markdown since as early as 2009, adding support for additional formatting such as tables and nesting block content inside list elements, as well as GitHub-specific features such as auto-linking references to commits, issues, usernames, etc. In 2017, GitHub released a formal specification of its GitHub Flavored Markdown (GFM) that is based on CommonMark. It is a strict superset of CommonMark, following its specification exactly except for tables, strikethrough, autolinks and task lists, which GFM adds as extensions. GitHub also changed the parser used on their sites accordingly, which required that some documents be changed. For instance, GFM now requires that the hash symbol that creates a heading be separated from the heading text by a space character.



## Introduction of Nerium Oleander [⇱](https://en.wikipedia.org/wiki/Nerium)

<def>Nerium oleander</def> (/ˈnɪəriəm ... / NEER-ee-əm), most commonly known as oleander or nerium, is a shrub or small tree cultivated worldwide in temperate and subtropical areas as an ornamental and landscaping plant. It is the only species currently classified in the genus Nerium, belonging to subfamily Apocynoideae of the dogbane family Apocynaceae. It is so widely cultivated that no precise region of origin has been identified, though it is usually associated with the Mediterranean Basin.

<div align=center class=img><img src=".Image/2023-02-09-19-39-47.png" style="zoom:10%"><br></div>

> Nerium oleander is the **only** species currently classified in the genus Nerium.

### Toxicity
Toxicity studies of animals administered oleander extract concluded that birds and rodents were observed to be relatively insensitive to oleander cardiac glycosides. Other mammals, however, such as dogs and humans, are relatively sensitive to the effects of cardiac glycosides and the clinical manifestations of "glycoside intoxication".

<warning>

Ingestion of this plant can affect the gastrointestinal system, the heart, and the central nervous system. The gastrointestinal effects can consist of nausea and vomiting, excess salivation, abdominal pain, diarrhea that may contain blood, and especially in horses, colic.

</warning>



## About .NET
.NET (pronounced as "dot net"; previously named .NET Core) is a free and open-source, managed computer software framework for Windows, Linux, and macOS operating systems. It is a cross-platform successor to .NET Framework. The project is primarily developed by Microsoft employees by way of the .NET Foundation, and released under the MIT License.

#### Version & History

<htable>

Version       | Release Date
--------------|--------------------
.NET Core 1.0 | 2016-06-27
.NET Core 2.0 | 2017-08-14
.NET Core 3.0 | 2019-09-23
.NET 5        | 2020-11-10
.NET 6        | 2021-11-08
.NET 7        | 2022-11-08
.NET 8        | 2023-11 (projected)
</htable>

### Print "Hello World!"

Console Method:
```csharp
public static void WriteLine(string? value);
```

<details><summary>Example | Hello World Program</summary>

```csharp
using System;

public static void Main(string[] args)
{
    Console.WriteLine("Hello World!");
}
```
</details>

#### Overloads of Console.WriteLine()
a                                 | b
----------------------------------|-----------------
WriteLine(String, Object, Object) | Writes the text representation of the specified objects, followed by the current line terminator, to the standard output stream using the specified format information.
WriteLine(String)                 | Writes the specified string value, followed by the current line terminator, to the standard output stream.
WriteLine(Char[], Int32, Int32)   | Writes the specified subarray of Unicode characters, followed by the current line terminator, to the standard output stream.
WriteLine(String, Object[])       | Writes the text representation of the specified array of objects, followed by the current line terminator, to the standard output stream using the specified format information.

















<br>
<br>
<br>
<br>
<br>
<br>
---End---
