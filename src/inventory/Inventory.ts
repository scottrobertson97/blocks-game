import { BlockId, PLACEABLE_BLOCKS } from "../world/Block";

export type InventorySnapshot = Record<string, number>;

const STARTING_COUNTS: Partial<Record<BlockId, number>> = {
  [BlockId.Grass]: 12,
  [BlockId.Dirt]: 24,
  [BlockId.Stone]: 24,
  [BlockId.Wood]: 10,
  [BlockId.Leaves]: 10,
  [BlockId.Sand]: 8,
  [BlockId.Water]: 3,
};

export class Inventory {
  private readonly counts = new Map<BlockId, number>();

  constructor(snapshot?: InventorySnapshot) {
    PLACEABLE_BLOCKS.forEach((blockId) => {
      const savedCount = snapshot?.[String(blockId)];
      const count = snapshot
        ? normalizeCount(savedCount)
        : STARTING_COUNTS[blockId] ?? 0;
      this.counts.set(blockId, count);
    });
  }

  getCount(blockId: BlockId): number {
    return this.counts.get(blockId) ?? 0;
  }

  add(blockId: BlockId, amount = 1): void {
    if (amount <= 0 || blockId === BlockId.Air) {
      return;
    }

    this.counts.set(blockId, this.getCount(blockId) + Math.floor(amount));
  }

  remove(blockId: BlockId, amount = 1): boolean {
    const normalizedAmount = Math.max(0, Math.floor(amount));
    const current = this.getCount(blockId);

    if (normalizedAmount === 0 || current < normalizedAmount) {
      return false;
    }

    this.counts.set(blockId, current - normalizedAmount);
    return true;
  }

  has(blockId: BlockId, amount = 1): boolean {
    return this.getCount(blockId) >= amount;
  }

  serialize(): InventorySnapshot {
    const snapshot: InventorySnapshot = {};
    PLACEABLE_BLOCKS.forEach((blockId) => {
      snapshot[String(blockId)] = this.getCount(blockId);
    });
    return snapshot;
  }
}

function normalizeCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}
