import * as THREE from "three";
import {
  MOUSE_SENSITIVITY,
  PLAYER_FAST_SPEED,
  PLAYER_MOVE_SPEED,
  PLAYER_START_HEIGHT,
  PLAYER_VERTICAL_SPEED,
} from "../game/constants";
import { Input } from "./Input";

export class PlayerController {
  private pitch = -0.75;
  private yaw = Math.PI * 0.75;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly input: Input,
  ) {
    this.camera.rotation.order = "YXZ";
    this.camera.position.set(8, PLAYER_START_HEIGHT, 8);
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
    const move = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, this.camera.up).normalize();

    if (this.input.isKeyDown("KeyW")) {
      move.add(forward);
    }
    if (this.input.isKeyDown("KeyS")) {
      move.sub(forward);
    }
    if (this.input.isKeyDown("KeyD")) {
      move.add(right);
    }
    if (this.input.isKeyDown("KeyA")) {
      move.sub(right);
    }
    if (this.input.isKeyDown("Space")) {
      move.y += PLAYER_VERTICAL_SPEED / PLAYER_MOVE_SPEED;
    }
    if (this.input.isKeyDown("ControlLeft") || this.input.isKeyDown("ControlRight")) {
      move.y -= PLAYER_VERTICAL_SPEED / PLAYER_MOVE_SPEED;
    }

    if (move.lengthSq() === 0) {
      return;
    }

    move.normalize();
    const speed = this.input.isKeyDown("ShiftLeft") || this.input.isKeyDown("ShiftRight")
      ? PLAYER_FAST_SPEED
      : PLAYER_MOVE_SPEED;
    this.camera.position.addScaledVector(move, speed * deltaSeconds);
  }

  private applyLookRotation(): void {
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }
}
