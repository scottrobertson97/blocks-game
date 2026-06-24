import { CHUNK_HEIGHT, CHUNK_RADIUS, CHUNK_SIZE } from "../game/constants";
import { BlockId, isSolidBlock } from "./Block";
import { Chunk } from "./Chunk";
import { TerrainGenerator } from "./TerrainGenerator";
import { TreeGenerator } from "./TreeGenerator";
import { createChunkKey, worldToLocalBlock } from "./VoxelMath";

export class World {
  readonly height = CHUNK_HEIGHT;
  private readonly chunks = new Map<string, Chunk>();

  static createDefault(): World {
    const world = new World();
    const generator = new TerrainGenerator();

    for (let chunkZ = -CHUNK_RADIUS; chunkZ <= CHUNK_RADIUS; chunkZ += 1) {
      for (let chunkX = -CHUNK_RADIUS; chunkX <= CHUNK_RADIUS; chunkX += 1) {
        const chunk = new Chunk(chunkX, chunkZ);
        generator.fillChunk(chunk);
        world.addChunk(chunk);
      }
    }

    new TreeGenerator().placeTrees(world);

    return world;
  }

  addChunk(chunk: Chunk): void {
    this.chunks.set(chunk.key, chunk);
  }

  forEachChunk(callback: (chunk: Chunk) => void): void {
    this.chunks.forEach(callback);
  }

  getChunk(chunkX: number, chunkZ: number): Chunk | undefined {
    return this.chunks.get(createChunkKey(chunkX, chunkZ));
  }

  getBlock(worldX: number, y: number, worldZ: number): BlockId {
    if (y < 0 || y >= CHUNK_HEIGHT) {
      return BlockId.Air;
    }

    const local = worldToLocalBlock(worldX, worldZ);
    const chunk = this.getChunk(local.chunkX, local.chunkZ);
    return chunk?.getBlock(local.localX, y, local.localZ) ?? BlockId.Air;
  }

  findHighestSolidY(worldX: number, worldZ: number): number | null {
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y -= 1) {
      if (isSolidBlock(this.getBlock(worldX, y, worldZ))) {
        return y;
      }
    }

    return null;
  }

  setBlock(worldX: number, y: number, worldZ: number, blockId: BlockId): string[] {
    if (y < 0 || y >= CHUNK_HEIGHT) {
      return [];
    }

    const local = worldToLocalBlock(worldX, worldZ);
    const chunk = this.getChunk(local.chunkX, local.chunkZ);

    if (!chunk) {
      return [];
    }

    chunk.setBlock(local.localX, y, local.localZ, blockId);
    return this.getAffectedChunkKeys(local.chunkX, local.chunkZ, local.localX, local.localZ);
  }

  private getAffectedChunkKeys(
    chunkX: number,
    chunkZ: number,
    localX: number,
    localZ: number,
  ): string[] {
    const keys = new Set<string>();
    keys.add(createChunkKey(chunkX, chunkZ));

    if (localX === 0) {
      keys.add(createChunkKey(chunkX - 1, chunkZ));
    } else if (localX === CHUNK_SIZE - 1) {
      keys.add(createChunkKey(chunkX + 1, chunkZ));
    }

    if (localZ === 0) {
      keys.add(createChunkKey(chunkX, chunkZ - 1));
    } else if (localZ === CHUNK_SIZE - 1) {
      keys.add(createChunkKey(chunkX, chunkZ + 1));
    }

    return [...keys].filter((key) => this.chunks.has(key));
  }
}
