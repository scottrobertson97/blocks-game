import * as THREE from "three";
import { BlockTarget } from "../interaction/BlockInteractor";
import { BlockId, getBlockName } from "../world/Block";

type HudUpdate = {
  fps: number;
  playerPosition: THREE.Vector3;
  pointerLocked: boolean;
  selectedBlock: BlockId;
  target: BlockTarget | null;
};

export class Hud {
  private readonly debugText: HTMLDivElement;
  private readonly prompt: HTMLDivElement;
  private readonly selectedText: HTMLSpanElement;
  private hasShownControlsPrompt = false;
  private promptTimeout = 0;

  constructor(container: HTMLElement) {
    const root = document.createElement("div");
    root.className = "hud";
    root.innerHTML = `
      <div class="hud__objective">
        <strong>Threecraft</strong>
        <span>Shape the terrain block by block</span>
      </div>
      <div class="hud__status">
        <span>Selected</span>
        <strong data-selected-block>Grass</strong>
      </div>
      <div class="hud__crosshair" aria-hidden="true"></div>
      <div class="hud__prompt" data-prompt>Click to play</div>
      <div class="hud__debug" data-debug></div>
    `;
    container.appendChild(root);

    const debugText = root.querySelector<HTMLDivElement>("[data-debug]");
    const prompt = root.querySelector<HTMLDivElement>("[data-prompt]");
    const selectedText = root.querySelector<HTMLSpanElement>("[data-selected-block]");

    if (!debugText || !prompt || !selectedText) {
      throw new Error("HUD failed to initialize.");
    }

    this.debugText = debugText;
    this.prompt = prompt;
    this.selectedText = selectedText;
  }

  flashPrompt(message: string): void {
    this.clearPromptTimer();
    this.prompt.textContent = message;
    this.prompt.classList.remove("hud__prompt--hidden");
    this.promptTimeout = window.setTimeout(() => {
      this.prompt.classList.add("hud__prompt--hidden");
      this.promptTimeout = 0;
    }, 1400);
  }

  update(update: HudUpdate): void {
    this.selectedText.textContent = getBlockName(update.selectedBlock);

    if (!update.pointerLocked && this.promptTimeout === 0) {
      this.hasShownControlsPrompt = false;
      this.prompt.textContent = "Click to play";
      this.prompt.classList.remove("hud__prompt--hidden");
    } else if (update.pointerLocked && !this.hasShownControlsPrompt && this.promptTimeout === 0) {
      this.hasShownControlsPrompt = true;
      this.prompt.textContent = "Left break / right place";
      this.prompt.classList.remove("hud__prompt--hidden");
      this.promptTimeout = window.setTimeout(() => {
        this.prompt.classList.add("hud__prompt--hidden");
        this.promptTimeout = 0;
      }, 2400);
    }

    const position = update.playerPosition;
    const target = update.target
      ? `${getBlockName(update.target.blockId)} @ ${update.target.block.x},${update.target.block.y},${update.target.block.z}`
      : "none";
    this.debugText.textContent = [
      `FPS ${update.fps}`,
      `Pos ${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}`,
      `Target ${target}`,
      "1-5 swap blocks",
    ].join(" | ");
  }

  private clearPromptTimer(): void {
    if (this.promptTimeout === 0) {
      return;
    }

    window.clearTimeout(this.promptTimeout);
    this.promptTimeout = 0;
  }
}
