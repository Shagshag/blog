---
publish: true
title: The code I never wrote
description: When we say AI writes 70% or 90% of the code, which code are we talking about? A look at the boundaries that have already moved since the Amstrad CPC 464.
lang: en
created: 2026-10-11T23:55:00
modified: 2026-10-12T09:13
tags:
  - ai
  - claude-code
  - retour-d-experience
---

_disponible aussi en [[Le code que je n'ai jamais écrit|Français]]._

At my company's annual seminar, my manager said AI wrote about 70% of the code. I replied that for me it was closer to 90%. The other developers agreed with me. Afterwards, they pointed out that it might not have been very wise to say it like that, and my manager and the director seemed surprised.

I thought about it afterwards. My number is an estimate based on my practice with Claude Code, I haven't measured anything. But more than that, we probably weren't talking about the same thing. I was talking about the code that ends up in the files. He was perhaps talking about the share of the development work that AI takes on.

That conversation made me realize that a percentage of code written means nothing until you say where you draw the line. And that line has already moved several times since I started programming.

## Cut my teeth on an Amstrad

I'm not old enough to have known punch cards, but I started in the late 1980s on an Amstrad CPC 464. You switched the machine on and landed directly on the command prompt. You could type `PRINT 1` and it answered. Programming was a normal experience, not a separate activity.

My father had computer magazines that published programs to copy in BASIC. I remember spending hours on the listings of Cherry-Paint, a drawing program published by [CPC Revue in 1986](https://cpcrulez.fr/GamesTest//applications_graphic-cherry-paint_CC.htm) (in French). According to the site, the program's code was spread over five issues, and the first one had about 20 KB of code to type in (we were motivated). Part of it was BASIC, and the animation was machine code given as hexadecimal numbers. In the second installment (CPC Revue no. 6), the author provided a BASIC loader for this that asked for eight hexadecimal numbers per line, followed by a checksum. If the computed total didn't match, it asked for the line again. I didn't understand what I was copying, but the computer could tell me when I had made a mistake.

![Screenshot of Cherry-Paint on Amstrad CPC](medias/2026/10/cherry-paint.png)

![Revue CPC no. 8 (1986) - CHERRY PAINT](medias/2026/10/magazine-cpc.jpg)

The Amstrad's machine language is the binary instructions executed directly by the processor. Assembly is its symbolic representation, easier for a human to read. I reread the beginning of the book _Le Langage Machine pour l'Amstrad CPC_ (in French). In the section "[Le premier programme machine](https://archive.org/details/07-le-langage-machine-pour-l-amstrad-cpc-1985acme/page/n15/mode/2up)" (the first machine program), it puts a BASIC program that fills the screen memory next to the same job in machine code. The BASIC takes about a minute and the machine code about a tenth of a second. That is a ratio of 600, going by its own figures. The chapter's argument is that you have every reason to learn machine language.

Few people did, and I understand why. BASIC wasn't very sophisticated but it was much easier to understand.

## What I stopped writing

In the 1990s, I was definitely a geek. I played around with [Visual Basic](https://en.wikipedia.org/wiki/Visual_Basic_\(classic\)) and [Delphi](https://en.wikipedia.org/wiki/Delphi_\(software\)). I did Windows assembly programming, C++, a bit of shell scripting on [Mandrake Linux](https://en.wikipedia.org/wiki/Mandriva_Linux), and then wrote a Pac-Man clone in assembly for a [TI-89](https://en.wikipedia.org/wiki/TI-89_series) during my engineering school prep classes (can you get any nerdier?). In the early 2000s, I discovered PHP 3, an interpreted language. Then JavaScript, object-oriented programming, frameworks, patterns, Java, Node.

[![Electric Dreams 1984, A really geek movie and the first AI I remember](medias/2026/10/electric-dreams.png)](https://en.wikipedia.org/wiki/Electric_Dreams_\(film\))

At each stage, there was a part of the code that I stopped writing. With Delphi, I no longer wrote the window display. With PHP, I no longer managed memory by hand or went through a compilation step. With Symfony, I don't write the HTTP kernel, the service container or the database access layer. On one of the company's projects, I counted the lines of PHP, blank lines and comments included, tests excluded. The `src/` folder contains 198,702 and `vendor/` 1,910,041 (development dependencies included, so it's an order of magnitude). That means about nine lines out of ten are not in our code. And `src/` already contains code written or rewritten by AI, so the share I wrote myself is even smaller. I have never written most of the code that runs when someone opens a page.

> [!note]
> It's funny because those 90% land almost exactly on my estimate from the seminar, but it means nothing, they don't measure the same thing.

Nobody disputes that, because it doesn't show. If you had asked a Symfony developer ten years ago "how much of the code do you write yourself", the answer would have been low too, with a different line.

By the way, my job has never been to write code. A taxi driver's job isn't to know how to read a map or to burn fuel: it's to choose the route, handle the unexpected and answer for the condition of the vehicle. Mine is to understand the need behind the request, to decide how (and sometimes whether) to build it, then to take responsibility for the consequences long after the code has been written.

## One more layer

With Claude Code, I describe what I want in French. The agent produces PHP, which the PHP interpreter runs, itself compiled to machine code. Natural language has become one more layer in a stack that already had many.

DHH says it in his own way. In his [opening keynote at Rails World 2026](https://youtu.be/vDjW_dRyKXY?t=2287), on September 23, he states at around the 38-minute mark that "English is a better programming language than Ruby", adding that it's "a little more vague". He explains there that 37signals (the company behind Basecamp and HEY) has stopped writing code by hand. On one point, he goes further than I do: the Rust code his agents produce, he says he doesn't look at, he judges the result from the outside. He also explains why abstractions were chosen in the first place: a programmer's time was expensive. If a machine writes the low-level code, he says in essence, you can have programs 30 to 100 times faster. It's the same speed argument as in the book of my childhood.

Natural language is also the first layer that isn't a formal language. A line of PHP has one meaning and only one. A sentence in French can have several, and the same agent can produce two different results from the same sentence.

## Why I still read

At each layer, I first stopped writing the code it produced, then I no longer needed to read it. With the agent, I'm at the first stage: I write very little PHP, but I still read it, and even more than before. I don't know whether that's temporary. I'm writing this in October 2026 and practice is changing fast.

Some are already further along. [Simon Willison](https://simonwillison.net/2026/May/6/vibe-coding-and-agentic-engineering/) no longer reviews every line his agents write, even for production, and treats them like another team whose service he uses without reading the code. He is uneasy about it himself. A human team has a reputation to defend and answers for its work, whereas Claude Code has no professional reputation. He also worries that, as it keeps succeeding, he will end up trusting it at the wrong moment. He relies on his 25 years of experience to keep that bet reasonable.

I don't read the assembly the compiler produces. I don't read Symfony's code either, except when something doesn't work. I trust those layers because they always behave the same way, millions of people use them and a problem eventually gets fixed for everyone.

An agent's output is work done for me, at that moment, from a description that can be understood in several ways. The result can be correct, or correct with one change too many, or unrelated to what I wanted. I can't yet treat it the way I treat a compiler. If I ever do, it won't be because it became fashionable, but because I will have checked it often enough to trust it.

DHH has already made up his mind about Rust, he doesn't read it. I haven't made up my mind about PHP yet.

## Back to 70 and 90%

My manager was perhaps counting the work, and I was counting the code. Both numbers can coexist, they don't draw the line in the same place. I could have given the same kind of answer in the 2000s when talking about the framework, with a different number.

What strikes me is that we keep judging a developer's work by what they write, even though the share they write themselves has been shrinking at every stage since I started programming, without anyone worrying about it. AI moves the line much faster than usual, and it shows. That's what made the conversation at the seminar a bit odd. Whether AI writes 70 or 90% of the code interests me less than knowing from what point a layer you no longer read stops being a bet.
