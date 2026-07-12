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
import type { PlayerSaveState } from "../persistence/SaveTypes";
import { isSolidBlock } from "../world/Block";
import { World } from "../world/World";
import { Input } from "./Input";

type BlockCoord = {
  x: number;
  y: number;
  z: number;
};

type PlayerControllerOptions = {
  onDamage?: (amount: number, reason: string) => void;
  onDeath?: (reason: string) => void;
  onStateChanged?: () => void;
};

const START_X = 8;
const START_Z = 8;
const GROUND_EPSILON = 0.001;
const BODY_EPSILON = 0.0001;
const COLLISION_STEP = 0.05;
const MAX_HEALTH = 20;
const SAFE_FALL_DISTANCE = 3;

export class PlayerController {
  private fallDistance = 0;
  private grounded = false;
  private health = MAX_HEALTH;
  private readonly onDamage: (amount: number, reason: string) => void;
  private readonly onDeath: (reason: string) => void;
  private readonly onStateChanged: () => void;
  private pitch = -0.75;
  private verticalVelocity = 0;
  private wasJumpPressed = false;
  private yaw = Math.PI * 0.75;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly input: Input,
    private readonly world: World,
    options: PlayerControllerOptions = {},
  ) {
    this.onDamage = options.onDamage ?? (() => undefined);
    this.onDeath = options.onDeath ?? (() => undefined);
    this.onStateChanged = options.onStateChanged ?? (() => undefined);
    this.camera.rotation.order = "YXZ";
    this.resetToStartPosition();
    this.applyLookRotation();
  }

  update(deltaSeconds: number): void {
    this.updateLook();
    this.updateMovement(deltaSeconds);
  }

  getHealth(): number {
    return this.health;
  }

  getMaxHealth(): number {
    return MAX_HEALTH;
  }

  serialize(): PlayerSaveState {
    return {
      health: this.health,
      position: [this.camera.position.x, this.camera.position.y, this.camera.position.z],
    };
  }

  restore(state: PlayerSaveState): void {
    this.health = THREE.MathUtils.clamp(Math.floor(state.health), 1, MAX_HEALTH);
    const [x, y, z] = state.position;

    if (y <= PLAYER_RESPAWN_Y || ![x, y, z].every(Number.isFinite)) {
      return;
    }

    const savedPosition = new THREE.Vector3(x, y, z);
    if (!this.collidesAt(savedPosition)) {
      this.camera.position.copy(savedPosition);
      this.verticalVelocity = 0;
      this.grounded = false;
    }
  }

  takeDamage(amount: number, reason = "Player hurt"): void {
    const damage = Math.max(0, Math.floor(amount));

    if (damage === 0) {
      return;
    }

    this.health = Math.max(0, this.health - damage);
    this.onDamage(damage, reason);
    this.onStateChanged();

    if (this.health === 0) {
      this.onDeath(reason);
      this.health = MAX_HEALTH;
      this.resetToStartPosition();
    }
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

  private updateLook(): void {
    const mouse = this.input.consumeMouseDelta();
    this.yaw -= mouse.x * MOUSE_SENSITIVITY;
    this.pitch -= mouse.y * MOUSE_SENSITIVITY;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
    this.applyLookRotation();
  }

  private updateMovement(deltaSeconds: number): void {
    if (this.input.isPointerLocked()) {
      this.applyHorizontalMovement(deltaSeconds);
    }

    const jumpPressed = this.input.isPointerLocked() && this.input.isKeyDown("Space");
    if (jumpPressed && !this.wasJumpPressed && this.grounded) {
      this.verticalVelocity = PLAYER_JUMP_SPEED;
      this.grounded = false;
      this.fallDistance = 0;
    }
    this.wasJumpPressed = jumpPressed;

    const wasGrounded = this.grounded;
    this.verticalVelocity -= PLAYER_GRAVITY * deltaSeconds;
    const verticalDelta = this.verticalVelocity * deltaSeconds;
    const collided = this.moveAxis("y", verticalDelta);

    if (verticalDelta < 0) {
      if (collided) {
        if (!wasGrounded) {
          this.applyFallDamage(this.fallDistance + Math.abs(verticalDelta));
        }
        this.fallDistance = 0;
      } else if (!wasGrounded) {
        this.fallDistance += Math.abs(verticalDelta);
      }
    }

    if (this.camera.position.y < PLAYER_RESPAWN_Y) {
      this.takeDamage(this.health, "Fell out of the world");
    }
  }

  private applyHorizontalMovement(deltaSeconds: number): void {
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

    if (horizontalMove.lengthSq() === 0) {
      return;
    }

    horizontalMove.normalize();
    const speed = this.input.isKeyDown("ShiftLeft") || this.input.isKeyDown("ShiftRight")
      ? PLAYER_FAST_SPEED
      : PLAYER_MOVE_SPEED;
    horizontalMove.multiplyScalar(speed * deltaSeconds);
    this.moveAxis("x", horizontalMove.x);
    this.moveAxis("z", horizontalMove.z);
  }

  private applyFallDamage(distance: number): void {
    const damage = Math.floor(distance - SAFE_FALL_DISTANCE);
    if (damage > 0) {
      this.takeDamage(damage, `Fell ${Math.floor(distance)} blocks`);
    }
  }

  private applyLookRotation(): void {
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  private moveAxis(axis: "x" | "y" | "z", delta: number): boolean {
    if (delta === 0) {
      return false;
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

      return true;
    }

    return false;
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
    this.fallDistance = 0;
    this.grounded = false;
    this.wasJumpPressed = false;
    this.onStateChanged();
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
