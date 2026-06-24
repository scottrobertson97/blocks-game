import * as THREE from "three";
import { BlockId, PLACEABLE_BLOCKS, getBlockName, isSolidBlock } from "../world/Block";
import { World } from "../world/World";
import { Hud } from "../ui/Hud";

type Vec3 = {
  x: number;
  y: number;
  z: number;
};

export type BlockTarget = {
  block: Vec3;
  normal: Vec3;
  blockId: BlockId;
  distance: number;
};

type BlockInteractorOptions = {
  camera: THREE.Camera;
  domElement: HTMLElement;
  hud: Hud;
  isBlockInsidePlayer?: (x: number, y: number, z: number) => boolean;
  maxReach: number;
  onWorldEdited: (chunkKeys: string[]) => void;
  scene: THREE.Scene;
  world: World;
};

export class BlockInteractor {
  currentTarget: BlockTarget | null = null;

  private readonly camera: THREE.Camera;
  private readonly direction = new THREE.Vector3();
  private readonly domElement: HTMLElement;
  private readonly highlight: THREE.LineSegments;
  private readonly hud: Hud;
  private readonly isBlockInsidePlayer: (x: number, y: number, z: number) => boolean;
  private readonly maxReach: number;
  private readonly onWorldEdited: (chunkKeys: string[]) => void;
  private selectedIndex = 0;
  private readonly world: World;

  get placeableBlocks(): readonly BlockId[] {
    return PLACEABLE_BLOCKS;
  }

  get selectedBlock(): BlockId {
    return PLACEABLE_BLOCKS[this.selectedIndex];
  }

  constructor(options: BlockInteractorOptions) {
    this.camera = options.camera;
    this.domElement = options.domElement;
    this.hud = options.hud;
    this.isBlockInsidePlayer = options.isBlockInsidePlayer ?? (() => false);
    this.maxReach = options.maxReach;
    this.onWorldEdited = options.onWorldEdited;
    this.world = options.world;
    this.highlight = this.createHighlight();
    options.scene.add(this.highlight);

    this.domElement.addEventListener("mousedown", this.handleMouseDown);
    this.domElement.addEventListener("contextmenu", this.preventContextMenu);
    this.domElement.addEventListener("wheel", this.handleWheel, { passive: false });
    document.addEventListener("keydown", this.handleKeyDown);
  }

  update(): void {
    this.camera.getWorldDirection(this.direction);
    this.currentTarget = raycastVoxels(
      this.world,
      this.camera.position,
      this.direction,
      this.maxReach,
    );

    if (!this.currentTarget) {
      this.highlight.visible = false;
      return;
    }

    const { block } = this.currentTarget;
    this.highlight.position.set(block.x + 0.5, block.y + 0.5, block.z + 0.5);
    this.highlight.visible = true;
  }

  private readonly handleMouseDown = (event: MouseEvent): void => {
    if (document.pointerLockElement !== this.domElement || !this.currentTarget) {
      return;
    }

    if (event.button === 0) {
      const { block } = this.currentTarget;
      const affected = this.world.setBlock(block.x, block.y, block.z, BlockId.Air);
      this.onWorldEdited(affected);
      return;
    }

    if (event.button === 2) {
      const { block, normal } = this.currentTarget;
      const placeAt = {
        x: block.x + normal.x,
        y: block.y + normal.y,
        z: block.z + normal.z,
      };

      if (this.isBlockInsidePlayer(placeAt.x, placeAt.y, placeAt.z)) {
        this.hud.flashPrompt("Too close to place");
        return;
      }

      const affected = this.world.setBlock(placeAt.x, placeAt.y, placeAt.z, this.selectedBlock);
      this.onWorldEdited(affected);
    }
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const index = Number.parseInt(event.key, 10) - 1;

    if (Number.isNaN(index) || !PLACEABLE_BLOCKS[index]) {
      return;
    }

    this.selectIndex(index);
  };

  private readonly handleWheel = (event: WheelEvent): void => {
    if (document.pointerLockElement !== this.domElement || event.deltaY === 0) {
      return;
    }

    event.preventDefault();
    this.selectIndex(this.selectedIndex + (event.deltaY > 0 ? 1 : -1));
  };

  private selectIndex(index: number): void {
    this.selectedIndex = modulo(index, PLACEABLE_BLOCKS.length);
    this.hud.flashPrompt(`Selected ${getBlockName(this.selectedBlock)}`);
  }

  private readonly preventContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private createHighlight(): THREE.LineSegments {
    const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01));
    const material = new THREE.LineBasicMaterial({
      color: "#f8fbff",
      depthTest: false,
      transparent: true,
      opacity: 0.85,
    });
    const highlight = new THREE.LineSegments(geometry, material);
    highlight.renderOrder = 10;
    highlight.visible = false;
    return highlight;
  }
}

function raycastVoxels(
  world: World,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  maxDistance: number,
): BlockTarget | null {
  const rayDirection = direction.clone().normalize();
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);

  const stepX = Math.sign(rayDirection.x);
  const stepY = Math.sign(rayDirection.y);
  const stepZ = Math.sign(rayDirection.z);
  let normal: Vec3 = { x: 0, y: 0, z: 0 };
  let distance = 0;

  let tMaxX = intBound(origin.x, rayDirection.x);
  let tMaxY = intBound(origin.y, rayDirection.y);
  let tMaxZ = intBound(origin.z, rayDirection.z);
  const tDeltaX = stepX === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / rayDirection.x);
  const tDeltaY = stepY === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / rayDirection.y);
  const tDeltaZ = stepZ === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / rayDirection.z);

  for (let step = 0; step < 128 && distance <= maxDistance; step += 1) {
    const blockId = world.getBlock(x, y, z);

    if (isSolidBlock(blockId)) {
      return {
        block: { x, y, z },
        blockId,
        distance,
        normal,
      };
    }

    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        x += stepX;
        distance = tMaxX;
        tMaxX += tDeltaX;
        normal = { x: -stepX, y: 0, z: 0 };
      } else {
        z += stepZ;
        distance = tMaxZ;
        tMaxZ += tDeltaZ;
        normal = { x: 0, y: 0, z: -stepZ };
      }
    } else if (tMaxY < tMaxZ) {
      y += stepY;
      distance = tMaxY;
      tMaxY += tDeltaY;
      normal = { x: 0, y: -stepY, z: 0 };
    } else {
      z += stepZ;
      distance = tMaxZ;
      tMaxZ += tDeltaZ;
      normal = { x: 0, y: 0, z: -stepZ };
    }
  }

  return null;
}

function intBound(start: number, direction: number): number {
  if (direction > 0) {
    return (Math.floor(start + 1) - start) / direction;
  }

  if (direction < 0) {
    return (start - Math.floor(start)) / -direction;
  }

  return Number.POSITIVE_INFINITY;
}

function modulo(value: number, size: number): number {
  return ((value % size) + size) % size;
}
