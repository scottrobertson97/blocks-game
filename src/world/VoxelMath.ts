import { CHUNK_SIZE } from "../game/constants";

export type ChunkCoord = {
  x: number;
  z: number;
};

export type LocalBlockCoord = {
  chunkX: number;
  chunkZ: number;
  localX: number;
  localZ: number;
};

export function createChunkKey(chunkX: number, chunkZ: number): string {
  return `${chunkX},${chunkZ}`;
}

export function parseChunkKey(key: string): ChunkCoord {
  const [x, z] = key.split(",").map(Number);
  return { x, z };
}

export function worldToLocalBlock(worldX: number, worldZ: number): LocalBlockCoord {
  const chunkX = Math.floor(worldX / CHUNK_SIZE);
  const chunkZ = Math.floor(worldZ / CHUNK_SIZE);

  return {
    chunkX,
    chunkZ,
    localX: modulo(worldX, CHUNK_SIZE),
    localZ: modulo(worldZ, CHUNK_SIZE),
  };
}

function modulo(value: number, size: number): number {
  return ((value % size) + size) % size;
}

