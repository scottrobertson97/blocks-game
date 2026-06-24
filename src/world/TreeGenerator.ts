import { CHUNK_HEIGHT, CHUNK_RADIUS, CHUNK_SIZE } from "../game/constants";
import { BlockId } from "./Block";
import { getTerrainHeight } from "./TerrainGenerator";
import type { World } from "./World";

type TreePosition = {
  x: number;
  z: number;
};

const CANOPY_RADIUS = 2;
const TREE_EDGE_MARGIN = CANOPY_RADIUS + 1;
const TREE_SPACING = 7;
const PLAYER_CLEAR_RADIUS = 12;
const TRIES_PER_CHUNK = 7;

export class TreeGenerator {
  placeTrees(world: World): void {
    const placed: TreePosition[] = [];

    for (let chunkZ = -CHUNK_RADIUS; chunkZ <= CHUNK_RADIUS; chunkZ += 1) {
      for (let chunkX = -CHUNK_RADIUS; chunkX <= CHUNK_RADIUS; chunkX += 1) {
        for (let attempt = 0; attempt < TRIES_PER_CHUNK; attempt += 1) {
          const tree = this.createCandidate(chunkX, chunkZ, attempt);

          if (!this.canPlaceTree(world, tree, placed)) {
            continue;
          }

          this.placeTree(world, tree);
          placed.push(tree);
        }
      }
    }
  }

  private createCandidate(chunkX: number, chunkZ: number, attempt: number): TreePosition {
    const localSeed = hash3(chunkX, chunkZ, attempt);
    const x = chunkX * CHUNK_SIZE + 1 + (localSeed % (CHUNK_SIZE - 2));
    const z =
      chunkZ * CHUNK_SIZE +
      1 +
      (hash3(chunkX + 17, chunkZ - 31, attempt + 5) % (CHUNK_SIZE - 2));

    return { x, z };
  }

  private canPlaceTree(world: World, tree: TreePosition, placed: TreePosition[]): boolean {
    const height = getTerrainHeight(tree.x, tree.z);
    const trunkHeight = getTrunkHeight(tree);

    if (height + trunkHeight + CANOPY_RADIUS >= CHUNK_HEIGHT) {
      return false;
    }

    if (!this.isInsideTreeBounds(tree)) {
      return false;
    }

    if (distanceSquared(tree, { x: 8, z: 8 }) < PLAYER_CLEAR_RADIUS * PLAYER_CLEAR_RADIUS) {
      return false;
    }

    if (world.getBlock(tree.x, height, tree.z) !== BlockId.Grass) {
      return false;
    }

    return placed.every((other) => distanceSquared(tree, other) >= TREE_SPACING * TREE_SPACING);
  }

  private isInsideTreeBounds(tree: TreePosition): boolean {
    const min = -CHUNK_RADIUS * CHUNK_SIZE + TREE_EDGE_MARGIN;
    const max = (CHUNK_RADIUS + 1) * CHUNK_SIZE - TREE_EDGE_MARGIN - 1;
    return tree.x >= min && tree.x <= max && tree.z >= min && tree.z <= max;
  }

  private placeTree(world: World, tree: TreePosition): void {
    const groundY = getTerrainHeight(tree.x, tree.z);
    const trunkHeight = getTrunkHeight(tree);
    const canopyCenterY = groundY + trunkHeight;

    for (let y = groundY + 1; y <= groundY + trunkHeight; y += 1) {
      world.setBlock(tree.x, y, tree.z, BlockId.Wood);
    }

    for (let y = canopyCenterY - 1; y <= canopyCenterY + CANOPY_RADIUS; y += 1) {
      for (let z = tree.z - CANOPY_RADIUS; z <= tree.z + CANOPY_RADIUS; z += 1) {
        for (let x = tree.x - CANOPY_RADIUS; x <= tree.x + CANOPY_RADIUS; x += 1) {
          if (!isInCanopy(tree, x, y, z, canopyCenterY)) {
            continue;
          }

          if (world.getBlock(x, y, z) === BlockId.Air) {
            world.setBlock(x, y, z, BlockId.Leaves);
          }
        }
      }
    }
  }
}

function getTrunkHeight(tree: TreePosition): number {
  return 4 + (hash3(tree.x, tree.z, 97) % 2);
}

function isInCanopy(
  tree: TreePosition,
  x: number,
  y: number,
  z: number,
  canopyCenterY: number,
): boolean {
  const dx = Math.abs(x - tree.x);
  const dy = Math.abs(y - canopyCenterY);
  const dz = Math.abs(z - tree.z);
  const distance = dx + dy + dz;

  if (dx === CANOPY_RADIUS && dz === CANOPY_RADIUS && dy > 0) {
    return false;
  }

  return distance <= CANOPY_RADIUS + 2;
}

function distanceSquared(a: TreePosition, b: TreePosition): number {
  return (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
}

function hash3(a: number, b: number, c: number): number {
  let hash = a * 374761393 + b * 668265263 + c * 2147483647;
  hash = (hash ^ (hash >> 13)) * 1274126177;
  return Math.abs(hash ^ (hash >> 16));
}
