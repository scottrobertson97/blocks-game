export const BlockId = {
  Air: 0,
  Grass: 1,
  Dirt: 2,
  Stone: 3,
  Wood: 4,
  Leaves: 5,
  Sand: 6,
  CoalOre: 7,
  IronOre: 8,
  Planks: 9,
  CraftingTable: 10,
  Water: 11,
  TNT: 12,
} as const;

export type BlockId = (typeof BlockId)[keyof typeof BlockId];

export const TextureTile = {
  GrassTop: 0,
  GrassSide: 1,
  Dirt: 2,
  Stone: 3,
  WoodSide: 4,
  WoodTop: 5,
  Leaves: 6,
  Sand: 7,
  CoalOre: 8,
  IronOre: 9,
  Planks: 10,
  CraftingSide: 11,
  CraftingTop: 12,
  Water: 13,
  TNT: 14,
} as const;

export type TextureTile = (typeof TextureTile)[keyof typeof TextureTile];

export const PLACEABLE_BLOCKS = [
  BlockId.Grass,
  BlockId.Dirt,
  BlockId.Stone,
  BlockId.Wood,
  BlockId.Leaves,
  BlockId.Sand,
  BlockId.CoalOre,
  BlockId.IronOre,
  BlockId.Planks,
  BlockId.CraftingTable,
  BlockId.Water,
  BlockId.TNT,
] as const;

type BlockTextures = {
  bottom: TextureTile;
  side: TextureTile;
  top: TextureTile;
};

type BlockDefinition = {
  color: string;
  name: string;
  opaque: boolean;
  renderable: boolean;
  solid: boolean;
  targetable: boolean;
  textures: BlockTextures;
};

const uniformTexture = (tile: TextureTile): BlockTextures => ({
  bottom: tile,
  side: tile,
  top: tile,
});

export const BLOCK_DEFINITIONS: Record<BlockId, BlockDefinition> = {
  [BlockId.Air]: {
    color: "#000000",
    name: "Air",
    opaque: false,
    renderable: false,
    solid: false,
    targetable: false,
    textures: uniformTexture(TextureTile.Dirt),
  },
  [BlockId.Grass]: {
    color: "#62b552",
    name: "Grass",
    opaque: true,
    renderable: true,
    solid: true,
    targetable: true,
    textures: {
      bottom: TextureTile.Dirt,
      side: TextureTile.GrassSide,
      top: TextureTile.GrassTop,
    },
  },
  [BlockId.Dirt]: {
    color: "#8b6542",
    name: "Dirt",
    opaque: true,
    renderable: true,
    solid: true,
    targetable: true,
    textures: uniformTexture(TextureTile.Dirt),
  },
  [BlockId.Stone]: {
    color: "#8b9096",
    name: "Stone",
    opaque: true,
    renderable: true,
    solid: true,
    targetable: true,
    textures: uniformTexture(TextureTile.Stone),
  },
  [BlockId.Wood]: {
    color: "#9b6b3d",
    name: "Wood",
    opaque: true,
    renderable: true,
    solid: true,
    targetable: true,
    textures: {
      bottom: TextureTile.WoodTop,
      side: TextureTile.WoodSide,
      top: TextureTile.WoodTop,
    },
  },
  [BlockId.Leaves]: {
    color: "#4b9f56",
    name: "Leaves",
    opaque: true,
    renderable: true,
    solid: true,
    targetable: true,
    textures: uniformTexture(TextureTile.Leaves),
  },
  [BlockId.Sand]: {
    color: "#dfcc83",
    name: "Sand",
    opaque: true,
    renderable: true,
    solid: true,
    targetable: true,
    textures: uniformTexture(TextureTile.Sand),
  },
  [BlockId.CoalOre]: {
    color: "#606369",
    name: "Coal Ore",
    opaque: true,
    renderable: true,
    solid: true,
    targetable: true,
    textures: uniformTexture(TextureTile.CoalOre),
  },
  [BlockId.IronOre]: {
    color: "#a98973",
    name: "Iron Ore",
    opaque: true,
    renderable: true,
    solid: true,
    targetable: true,
    textures: uniformTexture(TextureTile.IronOre),
  },
  [BlockId.Planks]: {
    color: "#bd8951",
    name: "Planks",
    opaque: true,
    renderable: true,
    solid: true,
    targetable: true,
    textures: uniformTexture(TextureTile.Planks),
  },
  [BlockId.CraftingTable]: {
    color: "#9a6338",
    name: "Crafting Table",
    opaque: true,
    renderable: true,
    solid: true,
    targetable: true,
    textures: {
      bottom: TextureTile.Planks,
      side: TextureTile.CraftingSide,
      top: TextureTile.CraftingTop,
    },
  },
  [BlockId.Water]: {
    color: "#4d9ddb",
    name: "Water",
    opaque: false,
    renderable: true,
    solid: false,
    targetable: true,
    textures: uniformTexture(TextureTile.Water),
  },
  [BlockId.TNT]: {
    color: "#d94b3f",
    name: "TNT",
    opaque: true,
    renderable: true,
    solid: true,
    targetable: true,
    textures: uniformTexture(TextureTile.TNT),
  },
};

export function isSolidBlock(blockId: BlockId): boolean {
  return BLOCK_DEFINITIONS[blockId].solid;
}

export function isOpaqueBlock(blockId: BlockId): boolean {
  return BLOCK_DEFINITIONS[blockId].opaque;
}

export function isRenderableBlock(blockId: BlockId): boolean {
  return BLOCK_DEFINITIONS[blockId].renderable;
}

export function isTargetableBlock(blockId: BlockId): boolean {
  return BLOCK_DEFINITIONS[blockId].targetable;
}

export function isLiquidBlock(blockId: BlockId): boolean {
  return blockId === BlockId.Water;
}

export function getBlockName(blockId: BlockId): string {
  return BLOCK_DEFINITIONS[blockId].name;
}

export function getBlockColor(blockId: BlockId): string {
  return BLOCK_DEFINITIONS[blockId].color;
}

export function getBlockTextureTile(blockId: BlockId, normalY: number): TextureTile {
  const textures = BLOCK_DEFINITIONS[blockId].textures;

  if (normalY > 0) {
    return textures.top;
  }

  if (normalY < 0) {
    return textures.bottom;
  }

  return textures.side;
}
