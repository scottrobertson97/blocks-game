import * as THREE from "three";
import { BlockTarget } from "../interaction/BlockInteractor";
import { BlockId, getBlockColor, getBlockName } from "../world/Block";

type HudUpdate = {
  fps: number;
  placeableBlocks: readonly BlockId[];
  playerPosition: THREE.Vector3;
  pointerLocked: boolean;
  selectedBlock: BlockId;
  target: BlockTarget | null;
};

export class Hud {
  private readonly debugText: HTMLDivElement;
  private readonly inventory: HTMLDivElement;
  private readonly prompt: HTMLDivElement;
  private inventoryBlocks: readonly BlockId[] = [];
  private inventorySlots: HTMLDivElement[] = [];
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
      <div class="hud__crosshair" aria-hidden="true"></div>
      <div class="hud__inventory" data-inventory aria-label="Block inventory"></div>
      <div class="hud__prompt" data-prompt>Click to play</div>
      <div class="hud__debug" data-debug></div>
    `;
    container.appendChild(root);

    const debugText = root.querySelector<HTMLDivElement>("[data-debug]");
    const inventory = root.querySelector<HTMLDivElement>("[data-inventory]");
    const prompt = root.querySelector<HTMLDivElement>("[data-prompt]");

    if (!debugText || !inventory || !prompt) {
      throw new Error("HUD failed to initialize.");
    }

    this.debugText = debugText;
    this.inventory = inventory;
    this.prompt = prompt;
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
    this.renderInventory(update.placeableBlocks);
    this.updateInventorySelection(update.selectedBlock);

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
      "Wheel / 1-5 swap blocks",
    ].join(" | ");
  }

  private renderInventory(placeableBlocks: readonly BlockId[]): void {
    if (this.hasSameInventory(placeableBlocks)) {
      return;
    }

    this.inventoryBlocks = [...placeableBlocks];
    this.inventory.replaceChildren();
    this.inventorySlots = placeableBlocks.map((blockId, index) => {
      const slot = document.createElement("div");
      slot.className = "hud__inventory-slot";
      slot.dataset.blockId = String(blockId);
      slot.innerHTML = `
        <span class="hud__inventory-key">${index + 1}</span>
        <span class="hud__inventory-swatch"></span>
        <span class="hud__inventory-name">${getBlockName(blockId)}</span>
      `;

      const swatch = slot.querySelector<HTMLSpanElement>(".hud__inventory-swatch");
      if (swatch) {
        swatch.style.backgroundColor = getBlockColor(blockId);
      }

      this.inventory.appendChild(slot);
      return slot;
    });
  }

  private updateInventorySelection(selectedBlock: BlockId): void {
    this.inventorySlots.forEach((slot) => {
      slot.classList.toggle("hud__inventory-slot--selected", slot.dataset.blockId === String(selectedBlock));
    });
  }

  private hasSameInventory(placeableBlocks: readonly BlockId[]): boolean {
    return (
      this.inventoryBlocks.length === placeableBlocks.length &&
      this.inventoryBlocks.every((blockId, index) => blockId === placeableBlocks[index])
    );
  }

  private clearPromptTimer(): void {
    if (this.promptTimeout === 0) {
      return;
    }

    window.clearTimeout(this.promptTimeout);
    this.promptTimeout = 0;
  }
}
