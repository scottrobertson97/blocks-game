import * as THREE from "three";
import type { DayNightSaveState } from "../persistence/SaveTypes";
import type { SceneEnvironment } from "../rendering/SceneFactory";

const DAY_LENGTH_SECONDS = 240;
const DEFAULT_TIME_OF_DAY = 0.35;
const NIGHT_SKY = new THREE.Color("#07111f");
const TWILIGHT_SKY = new THREE.Color("#c57d67");
const DAY_SKY = new THREE.Color("#8fc7e8");
const NIGHT_HEMISPHERE = new THREE.Color("#7893c8");
const DAY_HEMISPHERE = new THREE.Color("#f7fbff");

export class DayNightCycle {
  private day = 1;
  private readonly skyColor = new THREE.Color();
  private readonly stars: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private timeOfDay = DEFAULT_TIME_OF_DAY;

  constructor(
    private readonly environment: SceneEnvironment,
    savedState?: DayNightSaveState,
  ) {
    if (savedState) {
      this.day = Math.max(1, Math.floor(savedState.day));
      this.timeOfDay = moduloOne(savedState.timeOfDay);
    }

    this.stars = createStars();
    this.environment.scene.add(this.stars);
    this.applyLighting();
  }

  update(deltaSeconds: number): void {
    const previousTime = this.timeOfDay;
    this.timeOfDay = moduloOne(this.timeOfDay + deltaSeconds / DAY_LENGTH_SECONDS);

    if (this.timeOfDay < previousTime) {
      this.day += 1;
    }

    this.applyLighting();
  }

  getLabel(): string {
    const totalMinutes = Math.floor(this.timeOfDay * 24 * 60);
    const hours = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
    const minutes = (totalMinutes % 60).toString().padStart(2, "0");
    return `Day ${this.day}  ${hours}:${minutes}`;
  }

  serialize(): DayNightSaveState {
    return {
      day: this.day,
      timeOfDay: this.timeOfDay,
    };
  }

  private applyLighting(): void {
    const angle = this.timeOfDay * Math.PI * 2;
    const sunHeight = -Math.cos(angle);
    const daylight = THREE.MathUtils.smoothstep(sunHeight, -0.12, 0.22);
    const twilight = Math.max(0, 1 - Math.abs(sunHeight) / 0.28) * (1 - daylight * 0.35);

    this.skyColor.copy(NIGHT_SKY).lerp(DAY_SKY, daylight);
    this.skyColor.lerp(TWILIGHT_SKY, twilight * 0.55);
    this.environment.scene.background = this.skyColor;

    if (this.environment.scene.fog instanceof THREE.Fog) {
      this.environment.scene.fog.color.copy(this.skyColor);
    }

    this.environment.hemisphere.color.copy(NIGHT_HEMISPHERE).lerp(DAY_HEMISPHERE, daylight);
    this.environment.hemisphere.intensity = 0.22 + daylight * 1.48;
    this.environment.sunlight.intensity = 0.04 + daylight * 1.38;
    this.environment.sunlight.color.set(daylight > 0.45 ? "#fff2ca" : "#e9a06f");
    this.environment.sunlight.position.set(
      Math.sin(angle) * 55,
      sunHeight * 55,
      Math.cos(angle) * 35,
    );

    this.stars.material.opacity = THREE.MathUtils.clamp(1 - daylight * 1.25, 0, 0.9);
    this.stars.visible = this.stars.material.opacity > 0.02;
  }
}

function createStars(): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
  const positions: number[] = [];

  for (let index = 0; index < 180; index += 1) {
    const angle = index * 2.399963;
    const radius = 70 + hash(index, 17) * 55;
    const height = 32 + hash(index, 29) * 75;
    positions.push(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: "#eef5ff",
    depthWrite: false,
    opacity: 0,
    size: 0.75,
    transparent: true,
  });
  return new THREE.Points(geometry, material);
}

function hash(value: number, seed: number): number {
  const noise = Math.sin(value * 12.9898 + seed * 78.233) * 43758.5453;
  return noise - Math.floor(noise);
}

function moduloOne(value: number): number {
  return ((value % 1) + 1) % 1;
}
