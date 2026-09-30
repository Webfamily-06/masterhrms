# CleanAI Demo Project

A small TypeScript project with hidden dead code. Use it to see what CleanAI can do.

## What is this?

This looks like a normal "task manager" app — models, services, routes, utilities. But there's **dead code hiding everywhere**: unused files, forgotten functions, imports that do nothing, and more.

CleanAI will find all of it in seconds.

## How to try it

| Step | What to do |
|:----:|------------|
| 1 | **Open this folder** in Cursor or VS Code |
| 2 | **Install CleanAI** from the Extensions tab (search "CleanAI") |
| 3 | **Click the CleanAI icon** in the left sidebar |
| 4 | **Sign in** (free account, takes 10 seconds) |
| 5 | **Click "Analyze"** and watch it scan |
| 6 | **See the results** — CleanAI will find 15+ issues |

That's it. No terminal. No `npm install`. No config files. Just open and scan.

## After the scan

Once CleanAI finishes, you'll see a list of findings grouped by impact:

- **High impact** — Entire files that nothing in the project uses
- **Medium impact** — Functions and exports that exist but are never called
- **Low impact** — Unused imports and variables

You can click on any finding to jump to the exact line in the code. Try removing some of the dead code — the project will still work the same without it.

## Why this matters

This is the kind of code that builds up in real projects — especially when you're building fast with AI tools like Cursor, Copilot, or ChatGPT. You add things, refactor, move on, and dead code stays behind.

CleanAI catches what you miss.

## Project structure

```
src/
├── index.ts          ← Entry point
├── models/           ← Data models
├── services/         ← Business logic
├── utils/            ← Helper functions
├── api/              ← API routes
├── types/            ← TypeScript types
└── deprecated/       ← Old code
```

## Learn more

- [CleanAI website](https://cleanai.pro)
- [Install CleanAI](https://marketplace.visualstudio.com/items?itemName=cleanai.cleanai)
