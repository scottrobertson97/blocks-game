# Threecraft

A small browser-based Minecraft-style voxel sandbox built with Three.js, TypeScript, and Vite.

## Local Development

```bash
npm install
npm run dev
```

Click the game view to lock the pointer, then use `WASD` to move, mouse look to aim, `Space` and `Ctrl` to fly up and down, left click to break blocks, and right click to place the selected block.

## Build

```bash
npm run build
```

The production build is emitted to `dist`.

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

