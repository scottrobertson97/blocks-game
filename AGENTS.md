# Agent Guide

This repository contains Threecraft, a Vite + TypeScript + Three.js voxel sandbox. Keep changes small, playable, and consistent with the existing module boundaries.

## Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Production build: `npm run build`
- Production preview: `npm run preview`

Always run `npm run build` after TypeScript or gameplay changes. For visible rendering, HUD, or input changes, also run a local preview and perform a browser smoke check.

## Architecture Rules

- Keep simulation state out of Three.js meshes.
- Use `World` and `Chunk` as the source of truth for blocks.
- Render blocks through chunk meshes; do not create one mesh per block.
- Use visible-face meshing in `ChunkMesher`.
- Keep player movement in `PlayerController`.
- Keep block raycast/edit behavior in `BlockInteractor`.
- Keep HUD rendering in DOM, not WebGL.

## Current Gameplay

- The world is a fixed 5x5 chunk area using `CHUNK_RADIUS = 2`.
- Terrain is generated first, then trees are placed as a second pass so leaves and trunks can cross chunk boundaries.
- Player movement is grounded with gravity, jump, AABB collision, and respawn if falling below the world.
- Placeable blocks are defined by `PLACEABLE_BLOCKS` in `src/world/Block.ts`.
- The hotbar and placement selection must share the same block list.

## Editing Guidance

- Prefer focused changes over broad refactors.
- Keep constants in `src/game/constants.ts` when they affect gameplay tuning.
- Update docs when controls, deployment, architecture, or gameplay systems change.
- Avoid adding heavy dependencies unless a feature clearly needs them.
- Preserve GitHub Pages static deployment. Do not add a backend for version 1.

## Verification Checklist

For gameplay/UI changes:

1. Run `npm run build`.
2. Preview the built app.
3. Confirm `/blocks-game/` loads because Vite uses the GitHub Pages base path.
4. Check the WebGL canvas is nonblank.
5. Check HUD elements do not overlap the crosshair or each other.
6. Exercise the changed verb, such as movement, jump, block placement, or hotbar selection.

