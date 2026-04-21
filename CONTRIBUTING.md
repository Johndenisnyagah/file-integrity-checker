# Contributing

Thanks for your interest! Here's everything you need to get up and running.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Windows | 10 / 11 | App targets Windows only |
| Node.js | 20+ | |
| Python | 3.x | `pip install setuptools` required |
| Visual Studio 2022 | — | **Desktop development with C++** workload |
| Windows SDK | 11 (10.0.28000+) | Required by better-sqlite3 |

---

## Local setup

```bash
git clone https://github.com/Johndenisnyagah/file-integrity-checker.git
cd file-integrity-checker
npm install
npm run dev
```

`npm install` runs a `postinstall` script that:
1. Installs the Electron binary
2. Downloads a prebuilt `better-sqlite3` native module targeting Electron 31.7.7 via `prebuild-install`

No manual native compilation should be needed. If it fails, see the troubleshooting section below.

---

## Project structure

```
src/main/       Node.js main process — all file system, DB, and IPC logic
src/preload/    contextBridge — the only bridge between main and renderer
src/renderer/   React app — UI only, no direct Node.js access
scripts/        Build helpers (postinstall, icon generation)
assets/         App icons
```

---

## Useful commands

```bash
npm run dev          # Start dev server + Electron
npm run build        # Production build (electron-vite)
npm run package      # Build + create NSIS installer
node scripts/generate-icons.js   # Regenerate assets/icon.png + icon.ico
```

---

## Code style

- **Main process**: ESM (`import`/`export`), no CJS `require` for local files
- **Renderer**: React functional components, hooks only (no class components)
- **Styling**: CSS custom properties in `globals.css` — no Tailwind, no CSS-in-JS
- **IPC**: all handlers live in `src/main/handlers.js`; renderer calls via `window.api.*`

---

## Making changes

1. Fork the repo and create a branch: `git checkout -b feat/my-change`
2. Make your changes
3. Test in dev: `npm run dev`
4. Verify the production build: `npm run build`
5. Open a pull request with a clear description of what changed and why

---

## Troubleshooting

**`better-sqlite3` fails to load**
- Make sure the prebuilt binary was downloaded: check `node_modules/better-sqlite3/build/Release/better_sqlite3.node`
- Re-run: `node scripts/postinstall.js`

**App crashes with `ERR_REQUIRE_ESM`**
- A dependency added to `src/main/` is ESM-only. Use a dynamic `import()` or replace with a CJS-compatible alternative.

**Blank white window on startup**
- Check that `ELECTRON_RENDERER_URL` is set in dev (electron-vite handles this automatically)
- Verify the renderer dev server is running on the port shown in terminal output
