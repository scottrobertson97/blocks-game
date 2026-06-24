import * as THREE from "three";
import { MAX_BLOCK_REACH } from "./constants";
import { BlockInteractor } from "../interaction/BlockInteractor";
import { PlayerController } from "../player/PlayerController";
import { Input } from "../player/Input";
import { ChunkRenderer } from "../rendering/ChunkRenderer";
import { createRenderer } from "../rendering/Renderer";
import { createCamera, createScene } from "../rendering/SceneFactory";
import { Hud } from "../ui/Hud";
import { World } from "../world/World";

export class Game {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly clock = new THREE.Clock();
  private readonly chunkRenderer: ChunkRenderer;
  private readonly hud: Hud;
  private readonly input: Input;
  private readonly interactor: BlockInteractor;
  private readonly player: PlayerController;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly world: World;
  private frameAccumulator = 0;
  private frameCount = 0;
  private fps = 0;

  constructor(container: HTMLElement) {
    this.renderer = createRenderer(container);
    this.scene = createScene();
    this.camera = createCamera();
    this.input = new Input(this.renderer.domElement);
    this.hud = new Hud(container);
    this.world = World.createDefault();
    this.chunkRenderer = new ChunkRenderer(this.scene, this.world);
    this.player = new PlayerController(this.camera, this.input);
    this.interactor = new BlockInteractor({
      camera: this.camera,
      domElement: this.renderer.domElement,
      hud: this.hud,
      maxReach: MAX_BLOCK_REACH,
      scene: this.scene,
      world: this.world,
      onWorldEdited: (chunkKeys) => this.chunkRenderer.remeshMany(chunkKeys),
    });

    this.chunkRenderer.buildAll();
    window.addEventListener("resize", this.resize);
    this.resize();
  }

  start(): void {
    this.renderer.setAnimationLoop(this.update);
  }

  private readonly update = (): void => {
    const deltaSeconds = Math.min(this.clock.getDelta(), 0.05);

    this.player.update(deltaSeconds);
    this.interactor.update();
    this.updateFps(deltaSeconds);
    this.hud.update({
      fps: this.fps,
      playerPosition: this.camera.position,
      pointerLocked: this.input.isPointerLocked(),
      selectedBlock: this.interactor.selectedBlock,
      target: this.interactor.currentTarget,
    });

    this.renderer.render(this.scene, this.camera);
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

