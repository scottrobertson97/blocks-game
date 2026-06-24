import { CHUNK_HEIGHT, CHUNK_SIZE } from "../game/constants";
import { BlockId } from "./Block";
import { createChunkKey } from "./VoxelMath";

export class Chunk {
  readonly blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT);
  readonly key: string;
  readonly originX: number;
  readonly originZ: number;

  constructor(
    readonly coordX: number,
    readonly coordZ: number,
  ) {
    this.key = createChunkKey(coordX, coordZ);
    this.originX = coordX * CHUNK_SIZE;
    this.originZ = coordZ * CHUNK_SIZE;
  }

  getBlock(x: number, y: number, z: number): BlockId {
    if (!this.contains(x, y, z)) {
      return BlockId.Air;
    }

    return this.blocks[this.getIndex(x, y, z)] as BlockId;
  }

  setBlock(x: number, y: number, z: number, blockId: BlockId): void {
    if (!this.contains(x, y, z)) {
      return;
    }

    this.blocks[this.getIndex(x, y, z)] = blockId;
  }

  contains(x: number, y: number, z: number): boolean {
    return (
      x >= 0 &&
      x < CHUNK_SIZE &&
      y >= 0 &&
      y < CHUNK_HEIGHT &&
      z >= 0 &&
      z < CHUNK_SIZE
    );
  }

  private getIndex(x: number, y: number, z: number): number {
    return x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
  }
}

