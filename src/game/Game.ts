import * as THREE from "three";
import { CRAFTING_RECIPES, craft, type CraftingRecipe } from "../crafting/Crafting";
import { BlockInteractor } from "../interaction/BlockInteractor";
import { Inventory } from "../inventory/Inventory";
import { SaveSystem } from "../persistence/SaveSystem";
import { Input } from "../player/Input";
import { PlayerController } from "../player/PlayerController";
import { ChunkRenderer } from "../rendering/ChunkRenderer";
import { createRenderer } from "../rendering/Renderer";
import { createCamera, createSceneEnvironment } from "../rendering/SceneFactory";
import { Hud } from "../ui/Hud";
import { BlockId } from "../world/Block";
import { TntSystem } from "../world/TntSystem";
import { WaterSystem } from "../world/WaterSystem";
import { World } from "../world/World";
import { MAX_BLOCK_REACH } from "./constants";
import { DayNightCycle } from "./DayNightCycle";

const DIRTY_SAVE_DELAY = 1.5;
const PERIODIC_SAVE_INTERVAL = 15;

export class Game {
  private autosaveElapsed = 0;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly chunkRenderer: ChunkRenderer;
  private readonly clock = new THREE.Clock();
  private readonly dayNight: DayNightCycle;
  private frameAccumulator = 0;
  private frameCount = 0;
  private fps = 0;
  private readonly hud: Hud;
  private readonly input: Input;
  private readonly interactor: BlockInteractor;
  private readonly inventory: Inventory;
  private readonly player: PlayerController;
  private readonly renderer: THREE.WebGLRenderer;
  private saveDirty = false;
  private readonly saveSystem = new SaveSystem();
  private readonly scene: THREE.Scene;
  private readonly tntSystem: TntSystem;
  private readonly waterSystem: WaterSystem;
  private readonly world: World;

  constructor(container: HTMLElement) {
    this.renderer = createRenderer(container);
    const environment = createSceneEnvironment();
    this.scene = environment.scene;
    this.camera = createCamera();
    this.input = new Input(this.renderer.domElement);

    const savedGame = this.saveSystem.load();
    this.world = World.createDefault();
    if (savedGame) {
      this.saveSystem.restoreWorld(this.world, savedGame.world);
    }
    this.inventory = new Inventory(savedGame?.inventory);

    this.hud = new Hud(container, {
      onCraft: this.handleCraft,
      onResetWorld: this.resetWorld,
      recipes: CRAFTING_RECIPES,
    });
    this.chunkRenderer = new ChunkRenderer(this.scene, this.world);
    this.player = new PlayerController(this.camera, this.input, this.world, {
      onDamage: (amount, reason) => {
        this.hud.flashDamage();
        this.hud.flashPrompt(`${reason}  -${amount}`);
      },
      onDeath: () => this.hud.flashPrompt("Respawned"),
      onStateChanged: this.markSaveDirty,
    });
    if (savedGame) {
      this.player.restore(savedGame.player);
    }

    this.dayNight = new DayNightCycle(environment, savedGame?.time);
    this.waterSystem = new WaterSystem(this.world, this.handleWorldEdited);
    this.tntSystem = new TntSystem({
      getPlayerPosition: () => this.camera.position,
      onExplosion: (damage) => {
        if (damage > 0) {
          this.player.takeDamage(damage, "TNT explosion");
        } else {
          this.hud.flashPrompt("Boom");
        }
      },
      onWorldEdited: this.handleWorldEdited,
      scene: this.scene,
      world: this.world,
    });
    this.interactor = new BlockInteractor({
      camera: this.camera,
      domElement: this.renderer.domElement,
      hud: this.hud,
      inventory: this.inventory,
      isBlockInsidePlayer: (x, y, z) => this.player.intersectsBlock(x, y, z),
      maxReach: MAX_BLOCK_REACH,
      onBlockPlaced: (blockId, position) => {
        if (blockId === BlockId.Water) {
          this.waterSystem.addSource(position.x, position.y, position.z);
        }
      },
      onOpenCrafting: () => this.hud.openCrafting(),
      onTntIgnite: (x, y, z) => this.tntSystem.ignite(x, y, z),
      onWorldEdited: this.handleWorldEdited,
      scene: this.scene,
      world: this.world,
    });

    this.chunkRenderer.buildAll();
    this.saveDirty = !savedGame;
    document.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("beforeunload", this.flushSave);
    window.addEventListener("resize", this.resize);
    this.resize();
  }

  start(): void {
    this.renderer.setAnimationLoop(this.update);
  }

  private readonly update = (): void => {
    const deltaSeconds = Math.min(this.clock.getDelta(), 0.05);

    this.dayNight.update(deltaSeconds);
    this.player.update(deltaSeconds);
    this.waterSystem.update(deltaSeconds);
    this.tntSystem.update(deltaSeconds);
    this.interactor.update();
    this.updateFps(deltaSeconds);
    this.updateAutosave(deltaSeconds);
    this.hud.update({
      fps: this.fps,
      health: this.player.getHealth(),
      inventory: this.inventory,
      maxHealth: this.player.getMaxHealth(),
      placeableBlocks: this.interactor.placeableBlocks,
      playerPosition: this.camera.position,
      pointerLocked: this.input.isPointerLocked(),
      selectedBlock: this.interactor.selectedBlock,
      target: this.interactor.currentTarget,
      timeLabel: this.dayNight.getLabel(),
    });

    this.renderer.render(this.scene, this.camera);
  };

  private readonly handleCraft = (recipe: CraftingRecipe): boolean => {
    const crafted = craft(this.inventory, recipe);
    if (crafted) {
      this.markSaveDirty();
    }
    return crafted;
  };

  private readonly handleWorldEdited = (chunkKeys: string[]): void => {
    if (chunkKeys.length === 0) {
      return;
    }

    this.chunkRenderer.remeshMany(chunkKeys);
    this.markSaveDirty();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) {
      return;
    }

    if (event.code === "KeyE") {
      event.preventDefault();
      this.hud.toggleCrafting();
    } else if (event.code === "Escape" && this.hud.isCraftingOpen()) {
      this.hud.closeCrafting();
    }
  };

  private markSaveDirty = (): void => {
    this.saveDirty = true;
  };

  private updateAutosave(deltaSeconds: number): void {
    this.autosaveElapsed += deltaSeconds;
    const shouldSaveDirtyWorld = this.saveDirty && this.autosaveElapsed >= DIRTY_SAVE_DELAY;
    const shouldSavePeriodicState = this.autosaveElapsed >= PERIODIC_SAVE_INTERVAL;

    if (shouldSaveDirtyWorld || shouldSavePeriodicState) {
      this.flushSave();
    }
  }

  private readonly flushSave = (): void => {
    const saved = this.saveSystem.save({
      inventory: this.inventory.serialize(),
      player: this.player.serialize(),
      time: this.dayNight.serialize(),
      world: this.world,
    });

    if (saved) {
      this.saveDirty = false;
      this.autosaveElapsed = 0;
    }
  };

  private readonly resetWorld = (): void => {
    this.saveSystem.clear();
    window.location.reload();
  };

  private updateFps(deltaSeconds: number): void {
    this.frameAccumulator += deltaSeconds;
    this.frameCount += 1;

    if (this.frameAccumulator >= 0.5) {
      this.fps = Math.round(this.frameCount / this.frameAccumulator);
      this.frameAccumulator = 0;
      this.frameCount = 0;
    }
  }

  private readonly resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };
}
