export const BlockId = {
  Air: 0,
  Grass: 1,
  Dirt: 2,
  Stone: 3,
  Wood: 4,
  Leaves: 5,
} as const;

export type BlockId = (typeof BlockId)[keyof typeof BlockId];

type BlockDefinition = {
  color: string;
  name: string;
  solid: boolean;
};

export const BLOCK_DEFINITIONS: Record<BlockId, BlockDefinition> = {
  [BlockId.Air]: { color: "#000000", name: "Air", solid: false },
  [BlockId.Grass]: { color: "#62b552", name: "Grass", solid: true },
  [BlockId.Dirt]: { color: "#8b6542", name: "Dirt", solid: true },
  [BlockId.Stone]: { color: "#7f8792", name: "Stone", solid: true },
  [BlockId.Wood]: { color: "#9b6b3d", name: "Wood", solid: true },
  [BlockId.Leaves]: { color: "#4b9f56", name: "Leaves", solid: true },
};

export function isSolidBlock(blockId: BlockId): boolean {
  return BLOCK_DEFINITIONS[blockId].solid;
}

export function getBlockName(blockId: BlockId): string {
  return BLOCK_DEFINITIONS[blockId].name;
}

export function getBlockColor(blockId: BlockId): string {
  return BLOCK_DEFINITIONS[blockId].color;
}

