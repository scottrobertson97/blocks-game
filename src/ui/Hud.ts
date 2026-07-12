import * as THREE from "three";
import { canCraft, type CraftingRecipe } from "../crafting/Crafting";
import type { BlockTarget } from "../interaction/BlockInteractor";
import { Inventory } from "../inventory/Inventory";
import { BlockId, getBlockColor, getBlockName } from "../world/Block";

type HudUpdate = {
  fps: number;
  health: number;
  inventory: Inventory;
  maxHealth: number;
  placeableBlocks: readonly BlockId[];
  playerPosition: THREE.Vector3;
  pointerLocked: boolean;
  selectedBlock: BlockId;
  target: BlockTarget | null;
  timeLabel: string;
};

type HudOptions = {
  onCraft: (recipe: CraftingRecipe) => boolean;
  onResetWorld: () => void;
  recipes: readonly CraftingRecipe[];
};

type InventorySlotView = {
  count: HTMLSpanElement;
  root: HTMLDivElement;
};

type RecipeView = {
  button: HTMLButtonElement;
  ingredients: HTMLDivElement;
};

export class Hud {
  private readonly crafting: HTMLDivElement;
  private readonly craftingFeedback: HTMLDivElement;
  private readonly damageOverlay: HTMLDivElement;
  private readonly debugText: HTMLDivElement;
  private damageTimeout = 0;
  private readonly healthPips: HTMLSpanElement[];
  private readonly healthText: HTMLSpanElement;
  private readonly inventory: HTMLDivElement;
  private inventoryBlocks: readonly BlockId[] = [];
  private inventorySlots: InventorySlotView[] = [];
  private lastSelectedBlock: BlockId | null = null;
  private readonly onCraft: (recipe: CraftingRecipe) => boolean;
  private readonly prompt: HTMLDivElement;
  private promptTimeout = 0;
  private readonly recipeViews = new Map<string, RecipeView>();
  private readonly recipes: readonly CraftingRecipe[];
  private readonly timeText: HTMLSpanElement;

  constructor(container: HTMLElement, options: HudOptions) {
    this.onCraft = options.onCraft;
    this.recipes = options.recipes;
    const root = document.createElement("div");
    root.className = "hud";
    root.innerHTML = `
      <div class="hud__objective">
        <strong>Threecraft</strong>
        <span>Survive, build, and reshape the world</span>
      </div>
      <div class="hud__status">
        <div class="hud__status-row">
          <span>Health</span>
          <span data-health-text>20 / 20</span>
        </div>
        <div class="hud__health" data-health aria-label="Player health"></div>
        <span class="hud__time" data-time></span>
      </div>
      <div class="hud__crosshair" aria-hidden="true"></div>
      <div class="hud__inventory" data-inventory aria-label="Block inventory"></div>
      <div class="hud__prompt" data-prompt>Click to play</div>
      <div class="hud__debug" data-debug></div>
      <div class="hud__damage" data-damage aria-hidden="true"></div>
      <div class="hud__crafting" data-crafting hidden>
        <section class="hud__crafting-panel" role="dialog" aria-modal="true" aria-labelledby="crafting-title">
          <header class="hud__crafting-header">
            <div>
              <span class="hud__crafting-kicker">Inventory</span>
              <h2 id="crafting-title">Crafting</h2>
            </div>
            <button class="hud__icon-button" type="button" data-close-crafting aria-label="Close crafting" title="Close">X</button>
          </header>
          <div class="hud__recipes" data-recipes></div>
          <div class="hud__crafting-feedback" data-crafting-feedback aria-live="polite"></div>
          <footer class="hud__crafting-footer">
            <button class="hud__reset-button" type="button" data-reset-world>Reset world</button>
          </footer>
        </section>
      </div>
    `;
    container.appendChild(root);

    const crafting = root.querySelector<HTMLDivElement>("[data-crafting]");
    const craftingFeedback = root.querySelector<HTMLDivElement>("[data-crafting-feedback]");
    const damageOverlay = root.querySelector<HTMLDivElement>("[data-damage]");
    const debugText = root.querySelector<HTMLDivElement>("[data-debug]");
    const health = root.querySelector<HTMLDivElement>("[data-health]");
    const healthText = root.querySelector<HTMLSpanElement>("[data-health-text]");
    const inventory = root.querySelector<HTMLDivElement>("[data-inventory]");
    const prompt = root.querySelector<HTMLDivElement>("[data-prompt]");
    const recipes = root.querySelector<HTMLDivElement>("[data-recipes]");
    const timeText = root.querySelector<HTMLSpanElement>("[data-time]");

    if (
      !crafting ||
      !craftingFeedback ||
      !damageOverlay ||
      !debugText ||
      !health ||
      !healthText ||
      !inventory ||
      !prompt ||
      !recipes ||
      !timeText
    ) {
      throw new Error("HUD failed to initialize.");
    }

    this.crafting = crafting;
    this.craftingFeedback = craftingFeedback;
    this.damageOverlay = damageOverlay;
    this.debugText = debugText;
    this.healthText = healthText;
    this.inventory = inventory;
    this.prompt = prompt;
    this.timeText = timeText;
    this.healthPips = Array.from({ length: 10 }, () => {
      const pip = document.createElement("span");
      pip.className = "hud__health-pip";
      health.appendChild(pip);
      return pip;
    });

    this.renderRecipes(recipes);
    root.querySelector<HTMLButtonElement>("[data-close-crafting]")?.addEventListener("click", () => {
      this.setCraftingOpen(false);
    });
    root.querySelector<HTMLButtonElement>("[data-reset-world]")?.addEventListener("click", () => {
      if (window.confirm("Delete the saved world and start again?")) {
        options.onResetWorld();
      }
    });
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

  flashDamage(): void {
    if (this.damageTimeout !== 0) {
      window.clearTimeout(this.damageTimeout);
    }

    this.damageOverlay.classList.remove("hud__damage--active");
    void this.damageOverlay.offsetWidth;
    this.damageOverlay.classList.add("hud__damage--active");
    this.damageTimeout = window.setTimeout(() => {
      this.damageOverlay.classList.remove("hud__damage--active");
      this.damageTimeout = 0;
    }, 420);
  }

  openCrafting(): void {
    this.setCraftingOpen(true);
  }

  toggleCrafting(): void {
    this.setCraftingOpen(this.crafting.hidden !== false);
  }

  closeCrafting(): void {
    this.setCraftingOpen(false);
  }

  isCraftingOpen(): boolean {
    return this.crafting.hidden === false;
  }

  update(update: HudUpdate): void {
    this.renderInventory(update.placeableBlocks);
    this.updateInventory(update.inventory, update.selectedBlock);
    this.updateHealth(update.health, update.maxHealth);
    this.updateRecipes(update.inventory);
    this.timeText.textContent = update.timeLabel;

    if (!update.pointerLocked && !this.isCraftingOpen() && this.promptTimeout === 0) {
      this.prompt.textContent = "Click to play";
      this.prompt.classList.remove("hud__prompt--hidden");
    } else if (update.pointerLocked && this.promptTimeout === 0) {
      this.prompt.classList.add("hud__prompt--hidden");
    }

    const position = update.playerPosition;
    const target = update.target
      ? `${getBlockName(update.target.blockId)} @ ${update.target.block.x},${update.target.block.y},${update.target.block.z}`
      : "none";
    this.debugText.textContent = [
      `FPS ${update.fps}`,
      `Pos ${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}`,
      `Target ${target}`,
    ].join(" | ");
  }

  private setCraftingOpen(open: boolean): void {
    this.crafting.hidden = !open;
    this.craftingFeedback.textContent = "";

    if (open && document.pointerLockElement) {
      document.exitPointerLock();
    }
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
        <span class="hud__inventory-key">${index < 9 ? index + 1 : "W"}</span>
        <span class="hud__inventory-swatch"></span>
        <span class="hud__inventory-count">0</span>
        <span class="hud__inventory-name">${getBlockName(blockId)}</span>
      `;

      const swatch = slot.querySelector<HTMLSpanElement>(".hud__inventory-swatch");
      const count = slot.querySelector<HTMLSpanElement>(".hud__inventory-count");
      if (!swatch || !count) {
        throw new Error("Inventory slot failed to initialize.");
      }
      swatch.style.backgroundColor = getBlockColor(blockId);

      this.inventory.appendChild(slot);
      return { count, root: slot };
    });
  }

  private updateInventory(inventory: Inventory, selectedBlock: BlockId): void {
    this.inventorySlots.forEach((slot, index) => {
      const blockId = this.inventoryBlocks[index];
      const count = inventory.getCount(blockId);
      slot.count.textContent = String(count);
      slot.root.classList.toggle("hud__inventory-slot--empty", count === 0);
      slot.root.classList.toggle("hud__inventory-slot--selected", blockId === selectedBlock);
    });

    if (this.lastSelectedBlock === selectedBlock) {
      return;
    }

    this.lastSelectedBlock = selectedBlock;
    const selectedSlot = this.inventorySlots.find(
      (slot) => slot.root.dataset.blockId === String(selectedBlock),
    );

    if (selectedSlot) {
      const centeredLeft =
        selectedSlot.root.offsetLeft - this.inventory.clientWidth / 2 + selectedSlot.root.clientWidth / 2;
      this.inventory.scrollTo({ behavior: "smooth", left: Math.max(0, centeredLeft) });
    }
  }

  private updateHealth(health: number, maxHealth: number): void {
    this.healthText.textContent = `${health} / ${maxHealth}`;
    this.healthPips.forEach((pip, index) => {
      const pipHealth = THREE.MathUtils.clamp(health - index * 2, 0, 2);
      pip.style.setProperty("--health-fill", `${pipHealth * 50}%`);
    });
  }

  private renderRecipes(container: HTMLDivElement): void {
    this.recipes.forEach((recipe) => {
      const row = document.createElement("div");
      row.className = "hud__recipe";
      row.innerHTML = `
        <span class="hud__recipe-swatch"></span>
        <div class="hud__recipe-copy">
          <strong>${recipe.name}</strong>
          <div class="hud__recipe-ingredients"></div>
          <span>Makes ${recipe.output.count} ${getBlockName(recipe.output.blockId)}</span>
        </div>
        <button type="button">Craft</button>
      `;

      const swatch = row.querySelector<HTMLSpanElement>(".hud__recipe-swatch");
      const ingredients = row.querySelector<HTMLDivElement>(".hud__recipe-ingredients");
      const button = row.querySelector<HTMLButtonElement>("button");
      if (!swatch || !ingredients || !button) {
        throw new Error("Crafting recipe failed to initialize.");
      }

      swatch.style.backgroundColor = getBlockColor(recipe.output.blockId);
      button.addEventListener("click", () => {
        const crafted = this.onCraft(recipe);
        this.craftingFeedback.textContent = crafted
          ? `Crafted ${recipe.output.count} ${getBlockName(recipe.output.blockId)}`
          : "Missing materials";
      });
      container.appendChild(row);
      this.recipeViews.set(recipe.id, { button, ingredients });
    });
  }

  private updateRecipes(inventory: Inventory): void {
    this.recipes.forEach((recipe) => {
      const view = this.recipeViews.get(recipe.id);
      if (!view) {
        return;
      }

      view.button.disabled = !canCraft(inventory, recipe);
      view.ingredients.textContent = recipe.ingredients
        .map((ingredient) =>
          `${ingredient.count} ${getBlockName(ingredient.blockId)} (${inventory.getCount(ingredient.blockId)})`,
        )
        .join(" + ");
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
