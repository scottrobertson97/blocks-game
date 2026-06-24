# Architecture

Threecraft is a static browser game. The game loop coordinates browser input, world simulation, chunk mesh rendering, block interaction, and DOM HUD updates.

```mermaid
flowchart TD
  Main["src/main.ts"] --> Game["Game"]
  Game --> Input["Input"]
  Game --> Player["PlayerController"]
  Game --> World["World"]
  Game --> Renderer["Renderer + SceneFactory"]
  Game --> ChunkRenderer["ChunkRenderer"]
  Game --> Interactor["BlockInteractor"]
  Game --> Hud["Hud"]

  World --> Chunk["Chunk"]
  World --> Terrain["TerrainGenerator"]
  World --> Trees["TreeGenerator"]
  ChunkRenderer --> Mesher["ChunkMesher"]
  Mesher --> World
  Interactor --> World
  Player --> World
  Hud --> Blocks["Block definitions"]
```

## Main Boundaries

- `src/game`: top-level orchestration and gameplay constants.
- `src/world`: block IDs, chunk data, terrain generation, tree generation, voxel math, and world lookup/edit APIs.
- `src/rendering`: Three.js renderer, scene/camera creation, chunk mesh lifecycle, and materials.
- `src/player`: keyboard/mouse input and first-person movement/collision.
- `src/interaction`: voxel raycast targeting plus block break/place behavior.
- `src/ui`: DOM HUD and hotbar rendering.
- `src/styles`: global page and HUD styling.

## Data Flow

```mermaid
sequenceDiagram
  participant Browser
  participant Game
  participant Player
  participant Interactor
  participant World
  participant Chunks
  participant HUD
  participant Renderer

  Browser->>Game: animation frame
  Game->>Player: update(delta)
  Player->>World: query solid blocks for collision
  Game->>Interactor: update target
  Interactor->>World: voxel raycast block lookups
  Game->>HUD: selected block, target, FPS, position
  Game->>Renderer: render scene

  Browser->>Interactor: mouse click
  Interactor->>World: setBlock(...)
  World-->>Interactor: affected chunk keys
  Interactor->>Chunks: remesh affected chunks
```

## Rendering Model

Each chunk stores block IDs in a flat typed array. `ChunkMesher` emits only faces whose neighboring block is air or outside the world. `ChunkRenderer` owns one Three.js mesh per chunk and replaces that mesh when a chunk is remeshed.

```mermaid
flowchart LR
  Blocks["Chunk Uint8Array"] --> Scan["Scan blocks"]
  Scan --> Solid{"Solid?"}
  Solid -- No --> Skip["Skip"]
  Solid -- Yes --> Neighbors["Check 6 neighbors"]
  Neighbors --> Visible{"Neighbor air?"}
  Visible -- No --> Hidden["No face"]
  Visible -- Yes --> Face["Emit face vertices, normals, colors"]
  Face --> Geometry["BufferGeometry"]
  Geometry --> Mesh["One mesh per chunk"]
```

## Extension Points

- Add new block types in `Block.ts`, then include placeable blocks in `PLACEABLE_BLOCKS` if players should be able to place them.
- Add terrain features as world-data generation passes before chunk meshes are built.
- Add HUD surfaces in DOM and keep them edge-aligned or compact so the 3D view remains playable.

