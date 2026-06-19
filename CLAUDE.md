# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page React 19 + Vite + TypeScript app with two tools, deployed to GitHub Pages:

- **iframe tester** — render an arbitrary URL in an `<iframe>`, tweak its size and HTML attributes live, and inspect `postMessage` events it sends back.
- **script iframe tester** — inject a third-party `<script>` that builds an iframe (e.g. an embed loader), then surface the iframe it generated.

The README is stale Vite/Vue boilerplate — ignore it; this app is React, not Vue.

## Commands

```sh
yarn dev          # Vite dev server
yarn build        # type-check (tsc --noEmit) + production build, runs both in parallel
yarn type-check   # tsc --noEmit only
yarn preview      # serve the production build locally
yarn generate     # regenerate src/data/element-attrs.ts (see below)
yarn deploy       # gh-pages -d dist (CI does this; rarely run by hand)
```

There is no test runner and no linter configured. `yarn build` (via `type-check`) is the correctness gate.

## Architecture

- [src/App.tsx](src/App.tsx) is the entry component. It reads **all initial state from URL query params** on load and picks the active tab (`?mode=script` → script tab, otherwise iframe tab). Each tab is a self-contained component:
  - [src/components/IframeRenderer.tsx](src/components/IframeRenderer.tsx)
  - [src/components/ScriptIframeRenderer.tsx](src/components/ScriptIframeRenderer.tsx)

- **State ⇄ URL is the core pattern.** Each renderer mirrors its current config back into the address bar via a 300ms-debounced `history.replaceState`, so any configuration is a shareable link. App.tsx's param parsing and the `URLSearchParams` writer in each component must stay in sync — if you add a control, wire it through both the param read (App.tsx) and the param write (the component's debounce effect). JSON-encoded params: `otherAttributes`, `scriptAttrs`.

- **Events sidebar.** Both components register a `window` `"message"` listener to capture `postMessage` traffic from the embedded content. Shared behaviour: suppress `TIMER_TICK`/`TIMER_SYNC` messages, drop anything whose `data.source` matches `/devtools/i`, and optionally filter to only messages from the iframe's own origin. The two listeners are deliberate near-duplicates — change both together. Sidebar open/closed state persists in `localStorage` under `eventsSidebarOpen`.

- [src/data/element-attrs.ts](src/data/element-attrs.ts) is **auto-generated — do not edit by hand.** It is produced by [scripts/generate-element-attrs.mjs](scripts/generate-element-attrs.mjs), which parses real iframe/script attribute names out of `@webref/idl`'s `html.idl` and merges in hand-written descriptions, token lists (e.g. `sandbox`), and enumerated option sets (rendered as chip pickers / `<select>` / plain inputs respectively). To change which attributes or descriptions appear, edit the generator and run `yarn generate`.

- Styling is plain CSS ([src/App.css](src/App.css), [src/components/IframeRenderer.css](src/components/IframeRenderer.css)) — both renderers share `IframeRenderer.css`. No CSS framework.

## Conventions

- Prettier config lives in [package.json](package.json): **no semicolons, no trailing commas, always-parens arrow functions, printWidth 140.**
- Package manager is **yarn** (v1, classic). There is a `@` → `src` path alias in [vite.config.ts](vite.config.ts).

## Deployment

Pushing to `main` triggers [.github/workflows/deploy.yml](.github/workflows/deploy.yml), which builds and publishes `dist/` to the `gh-pages` branch. The Vite `base` is set to `/iframe-tester` only when `CI` is set (so the GitHub Pages subpath works in prod but local dev stays at root).
