import { Inventory } from "../inventory/Inventory";
import { BlockId } from "../world/Block";

export type RecipeIngredient = {
  blockId: BlockId;
  count: number;
};

export type CraftingRecipe = {
  id: string;
  ingredients: RecipeIngredient[];
  name: string;
  output: RecipeIngredient;
};

export const CRAFTING_RECIPES: readonly CraftingRecipe[] = [
  {
    id: "planks",
    ingredients: [{ blockId: BlockId.Wood, count: 1 }],
    name: "Saw Planks",
    output: { blockId: BlockId.Planks, count: 4 },
  },
  {
    id: "crafting-table",
    ingredients: [{ blockId: BlockId.Planks, count: 4 }],
    name: "Crafting Table",
    output: { blockId: BlockId.CraftingTable, count: 1 },
  },
  {
    id: "grass",
    ingredients: [
      { blockId: BlockId.Dirt, count: 1 },
      { blockId: BlockId.Leaves, count: 1 },
    ],
    name: "Grass Block",
    output: { blockId: BlockId.Grass, count: 1 },
  },
  {
    id: "tnt",
    ingredients: [
      { blockId: BlockId.Sand, count: 4 },
      { blockId: BlockId.CoalOre, count: 1 },
    ],
    name: "TNT",
    output: { blockId: BlockId.TNT, count: 1 },
  },
] as const;

export function canCraft(inventory: Inventory, recipe: CraftingRecipe): boolean {
  return recipe.ingredients.every((ingredient) =>
    inventory.has(ingredient.blockId, ingredient.count),
  );
}

export function craft(inventory: Inventory, recipe: CraftingRecipe): boolean {
  if (!canCraft(inventory, recipe)) {
    return false;
  }

  recipe.ingredients.forEach((ingredient) => {
    inventory.remove(ingredient.blockId, ingredient.count);
  });
  inventory.add(recipe.output.blockId, recipe.output.count);
  return true;
}
