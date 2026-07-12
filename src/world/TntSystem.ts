import * as THREE from "three";
import { BlockId } from "./Block";
import type { World } from "./World";

type PrimedTnt = {
  elapsed: number;
  material: THREE.MeshLambertMaterial;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
};

type TntSystemOptions = {
  getPlayerPosition: () => THREE.Vector3;
  onExplosion: (damage: number) => void;
  onWorldEdited: (chunkKeys: string[]) => void;
  scene: THREE.Scene;
  world: World;
};

const FUSE_SECONDS = 2.5;
const EXPLOSION_RADIUS = 3;
const DAMAGE_RADIUS = 6;

export class TntSystem {
  private readonly geometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
  private readonly getPlayerPosition: () => THREE.Vector3;
  private readonly onExplosion: (damage: number) => void;
  private readonly onWorldEdited: (chunkKeys: string[]) => void;
  private readonly primed: PrimedTnt[] = [];
  private readonly scene: THREE.Scene;
  private readonly world: World;

  constructor(options: TntSystemOptions) {
    this.getPlayerPosition = options.getPlayerPosition;
    this.onExplosion = options.onExplosion;
    this.onWorldEdited = options.onWorldEdited;
    this.scene = options.scene;
    this.world = options.world;
  }

  ignite(x: number, y: number, z: number): boolean {
    if (this.world.getBlock(x, y, z) !== BlockId.TNT) {
      return false;
    }

    const affected = this.world.setBlock(x, y, z, BlockId.Air);
    this.onWorldEdited(affected);
    this.prime(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5), 0);
    return true;
  }

  update(deltaSeconds: number): void {
    for (let index = this.primed.length - 1; index >= 0; index -= 1) {
      const tnt = this.primed[index];
      tnt.elapsed += deltaSeconds;
      const pulse = Math.sin(tnt.elapsed * 18) > 0;
      const scale = 1 + Math.max(0, tnt.elapsed - 1.6) * 0.08;
      tnt.mesh.scale.setScalar(scale);
      tnt.material.color.set(pulse ? "#fff4d5" : "#d94b3f");
      tnt.material.emissiveIntensity = pulse ? 0.35 : 0.08;

      if (tnt.elapsed < FUSE_SECONDS) {
        continue;
      }

      this.scene.remove(tnt.mesh);
      tnt.material.dispose();
      this.primed.splice(index, 1);
      this.explode(tnt.position);
    }
  }

  private prime(position: THREE.Vector3, elapsed: number): void {
    const material = new THREE.MeshLambertMaterial({
      color: "#d94b3f",
      emissive: "#7a1814",
      emissiveIntensity: 0.08,
    });
    const mesh = new THREE.Mesh(this.geometry, material);
    mesh.position.copy(position);
    this.scene.add(mesh);
    this.primed.push({ elapsed, material, mesh, position });
  }

  private explode(center: THREE.Vector3): void {
    const affected = new Set<string>();
    const chainedTnt: THREE.Vector3[] = [];

    for (let dz = -EXPLOSION_RADIUS; dz <= EXPLOSION_RADIUS; dz += 1) {
      for (let dy = -EXPLOSION_RADIUS; dy <= EXPLOSION_RADIUS; dy += 1) {
        for (let dx = -EXPLOSION_RADIUS; dx <= EXPLOSION_RADIUS; dx += 1) {
          const distanceSquared = dx * dx + dy * dy + dz * dz;
          const irregularRadius = EXPLOSION_RADIUS * EXPLOSION_RADIUS *
            (0.78 + hash(dx, dy, dz) * 0.3);

          if (distanceSquared > irregularRadius) {
            continue;
          }

          const x = Math.floor(center.x) + dx;
          const y = Math.floor(center.y) + dy;
          const z = Math.floor(center.z) + dz;
          const blockId = this.world.getBlock(x, y, z);

          if (blockId === BlockId.Air || blockId === BlockId.Water) {
            continue;
          }

          if (blockId === BlockId.TNT) {
            chainedTnt.push(new THREE.Vector3(x + 0.5, y + 0.5, z + 0.5));
          }

          this.world.setBlock(x, y, z, BlockId.Air).forEach((key) => affected.add(key));
        }
      }
    }

    if (affected.size > 0) {
      this.onWorldEdited([...affected]);
    }

    chainedTnt.forEach((position) => this.prime(position, 1.3));
    const playerDistance = center.distanceTo(this.getPlayerPosition());
    const damage = playerDistance < DAMAGE_RADIUS
      ? Math.ceil((DAMAGE_RADIUS - playerDistance) * 3)
      : 0;
    this.onExplosion(damage);
  }
}

function hash(x: number, y: number, z: number): number {
  const value = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return value - Math.floor(value);
}
