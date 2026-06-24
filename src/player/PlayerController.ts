import * as THREE from "three";
import {
  MOUSE_SENSITIVITY,
  PLAYER_FAST_SPEED,
  PLAYER_EYE_HEIGHT,
  PLAYER_GRAVITY,
  PLAYER_HEIGHT,
  PLAYER_JUMP_SPEED,
  PLAYER_MOVE_SPEED,
  PLAYER_RADIUS,
  PLAYER_RESPAWN_Y,
} from "../game/constants";
import { isSolidBlock } from "../world/Block";
import { World } from "../world/World";
import { Input } from "./Input";

type BlockCoord = {
  x: number;
  y: number;
  z: number;
};

const START_X = 8;
const START_Z = 8;
const GROUND_EPSILON = 0.001;
const BODY_EPSILON = 0.0001;
const COLLISION_STEP = 0.05;

export class PlayerController {
  private pitch = -0.75;
  private verticalVelocity = 0;
  private wasJumpPressed = false;
  private yaw = Math.PI * 0.75;
  private grounded = false;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly input: Input,
    private readonly world: World,
  ) {
    this.camera.rotation.order = "YXZ";
    this.resetToStartPosition();
    this.applyLookRotation();
  }

  update(deltaSeconds: number): void {
    this.updateLook();
    this.updateMovement(deltaSeconds);
  }

  private updateLook(): void {
    const mouse = this.input.consumeMouseDelta();
    this.yaw -= mouse.x * MOUSE_SENSITIVITY;
    this.pitch -= mouse.y * MOUSE_SENSITIVITY;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
    this.applyLookRotation();
  }

  private updateMovement(deltaSeconds: number): void {
    const horizontalMove = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, this.camera.up).normalize();

    if (this.input.isKeyDown("KeyW")) {
      horizontalMove.add(forward);
    }
    if (this.input.isKeyDown("KeyS")) {
      horizontalMove.sub(forward);
    }
    if (this.input.isKeyDown("KeyD")) {
      horizontalMove.add(right);
    }
    if (this.input.isKeyDown("KeyA")) {
      horizontalMove.sub(right);
    }

    if (horizontalMove.lengthSq() > 0) {
      horizontalMove.normalize();
      const speed = this.input.isKeyDown("ShiftLeft") || this.input.isKeyDown("ShiftRight")
        ? PLAYER_FAST_SPEED
        : PLAYER_MOVE_SPEED;
      horizontalMove.multiplyScalar(speed * deltaSeconds);
      this.moveAxis("x", horizontalMove.x);
      this.moveAxis("z", horizontalMove.z);
    }

    const jumpPressed = this.input.isKeyDown("Space");
    if (jumpPressed && !this.wasJumpPressed && this.grounded) {
      this.verticalVelocity = PLAYER_JUMP_SPEED;
      this.grounded = false;
    }
    this.wasJumpPressed = jumpPressed;

    this.verticalVelocity -= PLAYER_GRAVITY * deltaSeconds;
    this.moveAxis("y", this.verticalVelocity * deltaSeconds);

    if (this.camera.position.y < PLAYER_RESPAWN_Y) {
      this.resetToStartPosition();
    }
  }

  private applyLookRotation(): void {
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  intersectsBlock(x: number, y: number, z: number): boolean {
    const body = getBodyBounds(this.camera.position);
    return (
      x < body.maxX &&
      x + 1 > body.minX &&
      y < body.maxY &&
      y + 1 > body.minY &&
      z < body.maxZ &&
      z + 1 > body.minZ
    );
  }

  private moveAxis(axis: "x" | "y" | "z", delta: number): void {
    if (delta === 0) {
      return;
    }

    const steps = Math.max(1, Math.ceil(Math.abs(delta) / COLLISION_STEP));
    const stepDelta = delta / steps;

    for (let step = 0; step < steps; step += 1) {
      this.camera.position[axis] += stepDelta;

      if (!this.collidesAt(this.camera.position)) {
        if (axis === "y" && stepDelta < 0) {
          this.grounded = false;
        }
        continue;
      }

      this.camera.position[axis] -= stepDelta;

      if (axis === "y") {
        if (stepDelta < 0) {
          this.grounded = true;
        }
        this.verticalVelocity = 0;
      }

      return;
    }
  }

  private collidesAt(position: THREE.Vector3): boolean {
    return this.getOverlappedBlocks(position).some((block) =>
      isSolidBlock(this.world.getBlock(block.x, block.y, block.z)),
    );
  }

  private getOverlappedBlocks(position: THREE.Vector3): BlockCoord[] {
    const body = getBodyBounds(position);
    const blocks: BlockCoord[] = [];

    for (let y = Math.floor(body.minY); y <= Math.floor(body.maxY - BODY_EPSILON); y += 1) {
      for (let z = Math.floor(body.minZ); z <= Math.floor(body.maxZ - BODY_EPSILON); z += 1) {
        for (let x = Math.floor(body.minX); x <= Math.floor(body.maxX - BODY_EPSILON); x += 1) {
          blocks.push({ x, y, z });
        }
      }
    }

    return blocks;
  }

  private resetToStartPosition(): void {
    const surfaceY = this.world.findHighestSolidY(START_X, START_Z) ?? 0;
    this.camera.position.set(
      START_X,
      surfaceY + 1 + PLAYER_EYE_HEIGHT + GROUND_EPSILON,
      START_Z,
    );
    this.verticalVelocity = 0;
    this.grounded = false;
    this.wasJumpPressed = false;
  }
}

function getBodyBounds(position: THREE.Vector3): {
  maxX: number;
  maxY: number;
  maxZ: number;
  minX: number;
  minY: number;
  minZ: number;
} {
  const feetY = position.y - PLAYER_EYE_HEIGHT;

  return {
    minX: position.x - PLAYER_RADIUS,
    maxX: position.x + PLAYER_RADIUS,
    minY: feetY,
    maxY: feetY + PLAYER_HEIGHT,
    minZ: position.z - PLAYER_RADIUS,
    maxZ: position.z + PLAYER_RADIUS,
  };
}
