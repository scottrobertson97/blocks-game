import type { InventorySnapshot } from "../inventory/Inventory";
import { BlockId } from "../world/Block";
import type { World } from "../world/World";
import type { DayNightSaveState, GameSave, PlayerSaveState } from "./SaveTypes";

const SAVE_KEY = "threecraft-save-v2";
const SAVE_VERSION = 2;
const HIGHEST_BLOCK_ID = BlockId.TNT;

export class SaveSystem {
  load(): GameSave | null {
    const rawSave = window.localStorage.getItem(SAVE_KEY);

    if (!rawSave) {
      return null;
    }

    try {
      const parsed: unknown = JSON.parse(rawSave);
      return isGameSave(parsed) ? parsed : null;
    } catch (error) {
      console.warn("Threecraft save data could not be read.", error);
      return null;
    }
  }

  save(options: {
    inventory: InventorySnapshot;
    player: PlayerSaveState;
    time: DayNightSaveState;
    world: World;
  }): boolean {
    const save: GameSave = {
      inventory: options.inventory,
      player: options.player,
      time: options.time,
      version: SAVE_VERSION,
      world: this.captureWorld(options.world),
    };

    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
      return true;
    } catch (error) {
      console.warn("Threecraft could not save the current world.", error);
      return false;
    }
  }

  restoreWorld(world: World, snapshot: Record<string, string>): boolean {
    let restoredChunks = 0;

    Object.entries(snapshot).forEach(([chunkKey, encodedBlocks]) => {
      const [chunkX, chunkZ] = chunkKey.split(",").map(Number);
      const chunk = world.getChunk(chunkX, chunkZ);

      if (!chunk || !Number.isInteger(chunkX) || !Number.isInteger(chunkZ)) {
        return;
      }

      const blocks = decodeBytes(encodedBlocks);
      if (
        !blocks ||
        blocks.length !== chunk.blocks.length ||
        blocks.some((blockId) => blockId > HIGHEST_BLOCK_ID)
      ) {
        return;
      }

      if (chunk.replaceBlocks(blocks)) {
        restoredChunks += 1;
      }
    });

    return restoredChunks > 0;
  }

  clear(): void {
    window.localStorage.removeItem(SAVE_KEY);
  }

  private captureWorld(world: World): Record<string, string> {
    const snapshot: Record<string, string> = {};
    world.forEachChunk((chunk) => {
      snapshot[chunk.key] = encodeBytes(chunk.blocks);
    });
    return snapshot;
  }
}

function encodeBytes(bytes: Uint8Array): string {
  let binary = "";
  const batchSize = 4096;

  for (let offset = 0; offset < bytes.length; offset += batchSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + batchSize));
  }

  return window.btoa(binary);
}

function decodeBytes(encoded: string): Uint8Array | null {
  try {
    const binary = window.atob(encoded);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch {
    return null;
  }
}

function isGameSave(value: unknown): value is GameSave {
  if (!isRecord(value) || value.version !== SAVE_VERSION) {
    return false;
  }

  return (
    isRecord(value.world) &&
    isRecord(value.inventory) &&
    isPlayerSaveState(value.player) &&
    isDayNightSaveState(value.time)
  );
}

function isPlayerSaveState(value: unknown): value is PlayerSaveState {
  return (
    isRecord(value) &&
    typeof value.health === "number" &&
    Array.isArray(value.position) &&
    value.position.length === 3 &&
    value.position.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate))
  );
}

function isDayNightSaveState(value: unknown): value is DayNightSaveState {
  return (
    isRecord(value) &&
    typeof value.day === "number" &&
    typeof value.timeOfDay === "number"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
