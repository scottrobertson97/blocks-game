# Agent Guide

This repository contains Threecraft, a Vite + TypeScript + Three.js voxel sandbox. Keep changes playable, static-host compatible, and aligned with the existing module boundaries.

## Commands

- Install: `npm install`
- Dev server: `npm run dev`
- System smoke tests: `npm run test:systems`
- Production build: `npm run build`
- Production preview: `npm run preview`

Run both `npm run test:systems` and `npm run build` after gameplay or world changes. For visible rendering, HUD, or input changes, also preview `/blocks-game/` and perform a browser smoke check.

## Architecture Rules

- Keep `World` and `Chunk` as the source of truth for placed blocks.
- Keep transient simulations such as flowing-water queues and primed TNT outside Three.js meshes.
- Render blocks through chunk meshes; never create one mesh per stored block.
- Keep opaque and water faces grouped in `ChunkMesher` so transparency remains isolated.
- Define block properties and face texture tiles in `src/world/Block.ts`.
- Draw atlas pixels in `src/rendering/TextureAtlas.ts`; do not add interpolated texture filtering.
- Keep player movement, health, fall damage, and collision in `PlayerController`.
- Keep voxel raycast and break/place/use behavior in `BlockInteractor`.
- Keep stack accounting in `Inventory` and recipes in `Crafting`.
- Keep DOM HUD and crafting surfaces out of WebGL.
- Preserve save compatibility deliberately. Increment the save version when changing its shape or block-ID meaning.

## Current Gameplay

- The world is a fixed 5x5 chunk area using `CHUNK_RADIUS = 2`.
- Terrain generation creates surface layers, caves, ore veins, sand beaches, and lakes before trees are placed.
- Water is renderable and targetable but non-solid. Player-placed sources flow down and spread four blocks sideways.
- The player has 20 health, gravity, jumping, AABB collision, fall damage, and respawn.
- Breaking blocks adds one matching block to the finite inventory; placing consumes one.
- `PLACEABLE_BLOCKS` is the shared order for inventory stacks, hotbar slots, wheel selection, and number-key selection.
- Crafting tables open the recipe panel. TNT is ignited with right click and can trigger nearby TNT.
- The day/night cycle updates scene lighting, sky, fog, stars, and the HUD clock.
- `SaveSystem` stores all chunks, inventory counts, player state, and clock state in browser `localStorage`.

## Editing Guidance

- Prefer focused additions over unrelated refactors.
- Keep gameplay tuning constants in `src/game/constants.ts` or next to a narrowly owned simulation.
- New blocks require a unique numeric ID, a complete block definition, an atlas tile, and a deliberate hotbar decision.
- Non-solid renderable blocks need explicit meshing, raycast, collision, and explosion behavior.
- Route block mutations through `World.setBlock` and remesh every returned chunk key.
- Route persistent mutations through `Game.handleWorldEdited` or mark the save dirty explicitly.
- Update docs when controls, recipes, save behavior, architecture, or gameplay systems change.
- Avoid heavy dependencies unless a feature clearly needs them.
- Preserve GitHub Pages deployment and the `/blocks-game/` Vite base path.

## Verification Checklist

For gameplay or UI changes:

1. Run `npm run test:systems`.
2. Run `npm run build`.
3. Preview the built app and open `/blocks-game/`.
4. Confirm the WebGL canvas is nonblank and textured.
5. Check desktop and narrow HUD layouts for overlap.
6. Exercise the changed verb where browser capabilities allow it.
7. Confirm an inventory/crafting change survives a reload when persistence is affected.

The Vite build currently reports a non-fatal bundle-size warning because Three.js is included in the main static bundle.
