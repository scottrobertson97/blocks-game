# Architecture

Threecraft is a static browser game. `Game` coordinates input, player simulation, voxel systems, rendering, persistence, and the DOM HUD while each subsystem owns its own state and rules.

```mermaid
flowchart TD
  Main["src/main.ts"] --> Game["Game orchestration"]
  Game --> Input["Input"]
  Game --> Player["PlayerController"]
  Game --> World["World + Chunk"]
  Game --> Inventory["Inventory"]
  Game --> Crafting["Crafting recipes"]
  Game --> Save["SaveSystem"]
  Game --> Clock["DayNightCycle"]
  Game --> Water["WaterSystem"]
  Game --> TNT["TntSystem"]
  Game --> Interactor["BlockInteractor"]
  Game --> Hud["Hud"]
  Game --> ChunkRenderer["ChunkRenderer"]

  World --> Terrain["TerrainGenerator"]
  World --> Trees["TreeGenerator"]
  ChunkRenderer --> Mesher["ChunkMesher"]
  Mesher --> Atlas["TextureAtlas + Materials"]
  Interactor --> World
  Interactor --> Inventory
  Water --> World
  TNT --> World
  Player --> World
  Save --> World
```

## Main Boundaries

- `src/game`: top-level orchestration, day/night simulation, and shared tuning constants.
- `src/world`: block metadata, chunk storage, terrain/trees, voxel math, water, TNT, and world lookup/edit APIs.
- `src/inventory`: finite block stack ownership and serialization.
- `src/crafting`: immutable recipe definitions and inventory transactions.
- `src/persistence`: versioned save types, chunk encoding, restore, and reset.
- `src/rendering`: renderer, scene/camera creation, texture atlas, materials, chunk mesh lifecycle, and geometry generation.
- `src/player`: pointer-lock input, first-person movement, health, fall damage, and collision.
- `src/interaction`: voxel DDA targeting plus break, place, crafting-table, and TNT interactions.
- `src/ui`: DOM HUD, health display, hotbar, crafting dialog, and feedback.
- `src/styles`: global page and HUD styling.
- `scripts`: deterministic system smoke coverage run through Vite's TypeScript loader.

## Frame Data Flow

```mermaid
sequenceDiagram
  participant Browser
  participant Game
  participant Clock
  participant Player
  participant Water
  participant TNT
  participant Interactor
  participant World
  participant HUD
  participant Renderer

  Browser->>Game: animation frame
  Game->>Clock: update(delta)
  Game->>Player: update(delta)
  Player->>World: query collision blocks
  Game->>Water: process queued flow
  Water->>World: place water blocks
  Game->>TNT: advance active fuses
  TNT->>World: remove explosion blocks
  Game->>Interactor: update target ray
  Interactor->>World: query targetable blocks
  Game->>HUD: health, stacks, time, target, FPS
  Game->>Renderer: render scene
```

## World Mutation Flow

Every persistent edit goes through `World.setBlock`. It returns the edited chunk key and any horizontal neighbor key that needs a boundary remesh.

```mermaid
flowchart LR
  Verb["Break, place, water, or TNT"] --> Set["World.setBlock"]
  Set --> Keys["Affected chunk keys"]
  Keys --> Remesh["ChunkRenderer.remeshMany"]
  Keys --> Dirty["Mark save dirty"]
  Dirty --> Autosave["Save world + inventory + player + clock"]
```

## Rendering Model

Each chunk stores block IDs in a flat `Uint8Array`. `ChunkMesher` emits only visible faces, writes atlas UVs, and places solid and water indices into separate material groups. `ChunkRenderer` owns one mesh per chunk and replaces that mesh after an edit.

```mermaid
flowchart LR
  Blocks["Chunk Uint8Array"] --> Scan["Scan renderable blocks"]
  Scan --> Neighbors["Check six neighbors"]
  Neighbors --> Visible{"Face visible?"}
  Visible -- No --> Skip["Skip face"]
  Visible -- Yes --> Face["Emit position, normal, shade, UV"]
  Face --> Bucket{"Liquid?"}
  Bucket -- No --> Solid["Opaque index group"]
  Bucket -- Yes --> Water["Transparent index group"]
  Solid --> Geometry["BufferGeometry"]
  Water --> Geometry
  Atlas["Generated 4x4 pixel atlas"] --> Geometry
  Geometry --> Mesh["One mesh per chunk"]
```

## Persistence

`SaveSystem` stores a versioned JSON document under `threecraft-save-v2`. Each 8 KB chunk byte array is base64 encoded; inventory counts, player health/position, and day/time remain structured JSON.

```mermaid
flowchart TD
  Runtime["Runtime state"] --> Snapshot["GameSave v2"]
  Snapshot --> Chunks["Base64 chunk arrays"]
  Snapshot --> Counts["Inventory counts"]
  Snapshot --> Player["Health + position"]
  Snapshot --> Time["Day + timeOfDay"]
  Chunks --> Local["browser localStorage"]
  Counts --> Local
  Player --> Local
  Time --> Local
  Local --> Restore["Restore after generated defaults"]
```

## Extension Points

- Add blocks in `Block.ts`, provide atlas pixels in `TextureAtlas.ts`, and decide whether they belong in `PLACEABLE_BLOCKS`.
- Add world features in `TerrainGenerator` or as a post-generation pass before chunk meshes are built.
- Add persistent state by updating `SaveTypes`, `SaveSystem`, and the save version together.
- Add deterministic system assertions in `scripts/system-smoke.mjs` for simulation changes.
- Keep HUD additions DOM-based and verify both desktop and narrow viewports.
