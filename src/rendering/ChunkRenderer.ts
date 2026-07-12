import * as THREE from "three";
import { buildChunkGeometry } from "../world/ChunkMesher";
import { parseChunkKey } from "../world/VoxelMath";
import { World } from "../world/World";
import { createChunkMaterials } from "./Materials";

export class ChunkRenderer {
  private readonly materials = createChunkMaterials();
  private readonly meshes = new Map<string, THREE.Mesh>();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly world: World,
  ) {}

  buildAll(): void {
    this.world.forEachChunk((chunk) => {
      this.remesh(chunk.key);
    });
  }

  remeshMany(chunkKeys: string[]): void {
    const uniqueKeys = new Set(chunkKeys);
    uniqueKeys.forEach((key) => this.remesh(key));
  }

  remesh(chunkKey: string): void {
    const chunkCoord = parseChunkKey(chunkKey);
    const chunk = this.world.getChunk(chunkCoord.x, chunkCoord.z);

    this.removeMesh(chunkKey);

    if (!chunk) {
      return;
    }

    const geometry = buildChunkGeometry(this.world, chunk);

    if (!geometry.getAttribute("position") || geometry.getAttribute("position").count === 0) {
      geometry.dispose();
      return;
    }

    const mesh = new THREE.Mesh(geometry, this.materials);
    mesh.name = `chunk-${chunkKey}`;
    mesh.position.set(chunk.originX, 0, chunk.originZ);
    this.meshes.set(chunkKey, mesh);
    this.scene.add(mesh);
  }

  private removeMesh(chunkKey: string): void {
    const previous = this.meshes.get(chunkKey);

    if (!previous) {
      return;
    }

    this.scene.remove(previous);
    previous.geometry.dispose();
    this.meshes.delete(chunkKey);
  }
}
