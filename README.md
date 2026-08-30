# BOOKED! Ringside Empire

A wrestling promotion management game, built with Vite + React.

## Structure

- `app/` — the Vite + React source project (`src/App.jsx` is the game).
- `index.html` (repo root) — the built, self-contained game (single HTML file,
  no separate JS bundle), served directly by GitHub Pages from `main` / root.

## Developing

```
cd app
npm install
npm run dev
```

## Building & deploying

```
cd app
npm run deploy
```

This runs `vite build` (bundling everything, including CSS and JS, into one
file via `vite-plugin-singlefile`) and copies the result to `../index.html`.
Commit and push that file to deploy — GitHub Pages is configured to serve
`main` from the repository root.

## Saves

The game persists to the browser's `localStorage` via a small shim
(`app/src/storage-shim.js`) that replaces the `window.storage` API the game
was originally written against (a Claude-artifact-only API). Saves are
per-browser and never leave the device.
