import { CHUNK_HEIGHT, CHUNK_SIZE } from "../game/constants";
import { BlockId } from "./Block";
import { Chunk } from "./Chunk";

export const SEA_LEVEL = 7;

export class TerrainGenerator {
  fillChunk(chunk: Chunk): void {
    for (let z = 0; z < CHUNK_SIZE; z += 1) {
      for (let x = 0; x < CHUNK_SIZE; x += 1) {
        const worldX = chunk.originX + x;
        const worldZ = chunk.originZ + z;
        const height = getTerrainHeight(worldX, worldZ);

        for (let y = 0; y <= height; y += 1) {
          if (isCave(worldX, y, worldZ, height)) {
            continue;
          }

          chunk.setBlock(x, y, z, getLayerBlock(worldX, y, worldZ, height));
        }

        for (let y = height + 1; y <= SEA_LEVEL; y += 1) {
          chunk.setBlock(x, y, z, BlockId.Water);
        }
      }
    }
  }
}

export function getTerrainHeight(worldX: number, worldZ: number): number {
  const rolling =
    Math.sin(worldX * 0.15) * 2.4 +
    Math.cos(worldZ * 0.15) * 2.1 +
    Math.sin((worldX + worldZ) * 0.06) * 1.5;

  return Math.max(4, Math.min(CHUNK_HEIGHT - 4, 9 + Math.floor(rolling)));
}

function getLayerBlock(worldX: number, y: number, worldZ: number, height: number): BlockId {
  const sandy = height <= SEA_LEVEL + 1;

  if (sandy && y >= height - 2) {
    return BlockId.Sand;
  }

  if (y === height) {
    return BlockId.Grass;
  }

  if (y >= height - 3) {
    return BlockId.Dirt;
  }

  const ore = getOreBlock(worldX, y, worldZ, height);
  return ore ?? BlockId.Stone;
}

function isCave(worldX: number, y: number, worldZ: number, height: number): boolean {
  if (y <= 1 || y >= height - 2) {
    return false;
  }

  const spawnDx = worldX - 8;
  const spawnDz = worldZ - 8;
  if (spawnDx * spawnDx + spawnDz * spawnDz < 36) {
    return false;
  }

  const caveField =
    Math.sin(worldX * 0.19 + y * 0.47) +
    Math.sin(worldZ * 0.21 - y * 0.41) +
    Math.sin((worldX + worldZ) * 0.11 + y * 0.31) +
    Math.sin(worldX * 0.47 + worldZ * 0.37 + y * 0.53) * 0.55;

  return caveField > 2.22;
}

function getOreBlock(worldX: number, y: number, worldZ: number, height: number): BlockId | null {
  if (y <= 1 || y >= height - 3) {
    return null;
  }

  const vein = hashNoise(Math.floor(worldX / 2), Math.floor(y / 2), Math.floor(worldZ / 2));
  const detail = hashNoise(worldX, y, worldZ);

  if (y <= 8 && vein < 0.09 && detail < 0.78) {
    return BlockId.IronOre;
  }

  if (vein > 0.83 && detail > 0.22) {
    return BlockId.CoalOre;
  }

  return null;
}

function hashNoise(x: number, y: number, z: number): number {
  const value = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return value - Math.floor(value);
}
