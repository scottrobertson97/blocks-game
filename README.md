# Threecraft

Threecraft is a small browser-based Minecraft-style voxel sandbox built with Three.js, TypeScript, and Vite.

The goal is a clean playable foundation: chunked voxel terrain, visible-face rendering, first-person movement, grounded collision, block breaking and placing, generated trees, and a compact creative hotbar.

## Play

```bash
npm install
npm run dev
```

Open the local Vite URL, then click the game view to lock the pointer.

Controls:

- `WASD`: Move
- Mouse: Look around
- `Space`: Jump
- `Shift`: Move faster
- Left click: Break the targeted block
- Right click: Place the selected block
- Mouse wheel: Cycle selected block
- `1`-`5`: Select a hotbar block
- `Esc`: Release pointer lock

## Build

```bash
npm run build
```

The production build is emitted to `dist`.

Preview the production build locally:

```bash
npm run preview
```

## Project Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Gameplay Systems](docs/GAMEPLAY_SYSTEMS.md)
- [Deployment](docs/DEPLOYMENT.md)

## GitHub Pages Deployment

This project is configured for normal repository-based GitHub Pages deployment at:

```txt
https://scottrobertson97.github.io/blocks-game/
```

The Vite base path is set to `/blocks-game/`, and `.github/workflows/deploy.yml` builds and deploys the static `dist` folder through GitHub Actions.

To enable Pages:

1. Push the repo to GitHub.
2. Go to repository **Settings -> Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push to `main`.
5. Open the deployed Pages URL after the workflow completes.

## Development Notes

This is a static frontend app. Do not add an Express server, backend API, or server-side runtime for version 1.

Important implementation boundaries:

- World state lives in `src/world`.
- Three.js rendering adapters live in `src/rendering`.
- Movement and browser input live in `src/player`.
- Block targeting/editing lives in `src/interaction`.
- DOM HUD and hotbar rendering live in `src/ui` and `src/styles`.

