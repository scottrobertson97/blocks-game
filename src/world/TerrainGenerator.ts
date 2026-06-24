import { CHUNK_HEIGHT, CHUNK_SIZE } from "../game/constants";
import { BlockId } from "./Block";
import { Chunk } from "./Chunk";

export class TerrainGenerator {
  fillChunk(chunk: Chunk): void {
    for (let z = 0; z < CHUNK_SIZE; z += 1) {
      for (let x = 0; x < CHUNK_SIZE; x += 1) {
        const worldX = chunk.originX + x;
        const worldZ = chunk.originZ + z;
        const height = getTerrainHeight(worldX, worldZ);

        for (let y = 0; y <= height; y += 1) {
          chunk.setBlock(x, y, z, getLayerBlock(y, height));
        }
      }
    }
  }
}

function getTerrainHeight(worldX: number, worldZ: number): number {
  const rolling =
    Math.sin(worldX * 0.15) * 2.4 +
    Math.cos(worldZ * 0.15) * 2.1 +
    Math.sin((worldX + worldZ) * 0.06) * 1.5;

  return Math.max(4, Math.min(CHUNK_HEIGHT - 4, 9 + Math.floor(rolling)));
}

function getLayerBlock(y: number, height: number): BlockId {
  if (y === height) {
    return BlockId.Grass;
  }

  if (y >= height - 3) {
    return BlockId.Dirt;
  }

  return BlockId.Stone;
}

