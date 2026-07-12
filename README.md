# Threecraft

Threecraft is a browser-based voxel survival sandbox built with Three.js, TypeScript, and Vite. It renders a chunked block world with pixel textures, first-person collision, finite block stacks, crafting, hazards, and automatic local saves.

## Features

- Procedural terrain with lakes, beaches, caves, coal, iron, and trees
- Visible-face chunk meshing with a generated pixel-art texture atlas
- First-person movement, gravity, jumping, collision, health, and fall damage
- Center raycast targeting with a block outline
- Block breaking, collectible drops, finite placement stacks, and a 12-block hotbar
- Crafting recipes for planks, crafting tables, grass blocks, and TNT
- A four-block-radius water spread simulation
- Primed TNT, terrain explosions, chain reactions, and blast damage
- A four-minute day/night cycle with changing sky, light, fog, and stars
- Automatic local saving for the world, inventory, player, and clock

## Play

```bash
npm install
npm run dev
```

Open the local Vite URL and click the game view to lock the pointer.

Controls:

- `WASD`: Move
- Mouse: Look around
- `Space`: Jump
- `Shift`: Move faster
- Left click: Break and collect the targeted block
- Right click: Place the selected block
- Mouse wheel: Cycle all hotbar blocks
- `1`-`9`: Select the first nine hotbar slots
- `E`: Open or close crafting
- Right click a crafting table: Open crafting
- Right click TNT: Ignite it
- `Shift` + right click: Place beside a crafting table or TNT instead of using it
- `Esc`: Release pointer lock or close crafting

The game autosaves in browser `localStorage`. Use **Reset world** in the crafting panel to delete that save and regenerate the world.

## Build And Test

```bash
npm run test:systems
npm run build
```

`test:systems` checks generation, caves, ores, crafting, fall damage, water flow, TNT, and the day/night clock. The production build is emitted to `dist`.

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

The Vite base path is `/blocks-game/`. The workflow at `.github/workflows/deploy.yml` builds and deploys the static `dist` folder through GitHub Actions.

To enable Pages:

1. Push the repo to GitHub.
2. Go to repository **Settings -> Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Push to `main`.
5. Open the deployed Pages URL after the workflow completes.

## Development Notes

This remains a static frontend app. World and player data persist locally; there is no backend or account system.

- World simulation lives in `src/world`.
- Inventory and recipes live in `src/inventory` and `src/crafting`.
- Save serialization lives in `src/persistence`.
- Three.js rendering adapters live in `src/rendering`.
- Movement and browser input live in `src/player`.
- Block targeting/editing lives in `src/interaction`.
- DOM HUD and crafting UI live in `src/ui` and `src/styles`.
