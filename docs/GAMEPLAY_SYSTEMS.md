# Gameplay Systems

This document describes the current playable systems and the intended ownership boundaries for future changes.

## Core Loop

```mermaid
flowchart TD
  Spawn["Spawn on terrain"] --> Explore["Move, look, jump"]
  Explore --> Aim["Aim with crosshair"]
  Aim --> Break["Left click breaks target"]
  Aim --> Select["Wheel or 1-5 selects hotbar block"]
  Select --> Place["Right click places selected block"]
  Break --> Remesh["Remesh affected chunks"]
  Place --> Remesh
  Remesh --> Explore
```

## World Generation

The default world is generated in two passes:

1. Terrain generation fills all chunks with grass, dirt, and stone.
2. Tree generation places wood trunks and leaf canopies into the already-created world.

Trees are world-data blocks, not separate meshes. This means they are targeted, broken, placed against, and rendered exactly like terrain blocks.

```mermaid
flowchart LR
  CreateWorld["World.createDefault"] --> Chunks["Create chunks"]
  Chunks --> Terrain["fillChunk terrain"]
  Terrain --> Add["addChunk"]
  Add --> Complete{"All chunks created?"}
  Complete -- No --> Chunks
  Complete -- Yes --> Trees["TreeGenerator.placeTrees"]
  Trees --> Render["ChunkRenderer.buildAll"]
```

## Player Movement

The player camera is treated as the eye position of a simple collision body. `PlayerController` applies horizontal movement, gravity, jump velocity, and axis-separated AABB collision against solid blocks.

```mermaid
flowchart TD
  Input["Read WASD, Shift, Space"] --> Look["Apply mouse look"]
  Look --> Horizontal["Resolve X/Z movement"]
  Horizontal --> Jump{"Space pressed and grounded?"}
  Jump -- Yes --> JumpVelocity["Set upward velocity"]
  Jump -- No --> Gravity["Apply gravity"]
  JumpVelocity --> Gravity
  Gravity --> Vertical["Resolve Y movement"]
  Vertical --> Grounded{"Hit ground?"}
  Grounded -- Yes --> StopFall["verticalVelocity = 0"]
  Grounded -- No --> Continue["Keep falling/rising"]
```

Movement controls:

- `WASD`: move
- Mouse: look
- `Space`: jump
- `Shift`: faster movement
- `Esc`: release pointer lock

## Block Interaction

`BlockInteractor` raycasts through voxel coordinates from the camera center. The selected hotbar block is placed on the face adjacent to the target block. Placement is rejected if it would intersect the player's collision body.

Editing behavior:

- Left click sets the targeted block to `Air`.
- Right click sets the adjacent block to the selected hotbar block.
- Edited chunks are remeshed.
- If an edit touches a chunk boundary, the neighboring chunk is also remeshed.

## Inventory Hotbar

The creative hotbar is backed by `PLACEABLE_BLOCKS` in `Block.ts`.

Current placeable blocks:

- Grass
- Dirt
- Stone
- Wood
- Leaves

Selection controls:

- Mouse wheel cycles through the hotbar while pointer lock is active.
- `1`-`5` selects a specific slot.
- The selected slot controls right-click placement.

