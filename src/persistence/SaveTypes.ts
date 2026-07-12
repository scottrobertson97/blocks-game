import type { InventorySnapshot } from "../inventory/Inventory";

export type PlayerSaveState = {
  health: number;
  position: [number, number, number];
};

export type DayNightSaveState = {
  day: number;
  timeOfDay: number;
};

export type GameSave = {
  inventory: InventorySnapshot;
  player: PlayerSaveState;
  time: DayNightSaveState;
  version: 2;
  world: Record<string, string>;
};
