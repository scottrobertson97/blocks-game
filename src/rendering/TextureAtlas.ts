import * as THREE from "three";
import { TextureTile } from "../world/Block";

const TILE_SIZE = 16;
const ATLAS_COLUMNS = 4;
const ATLAS_ROWS = 4;
const ATLAS_WIDTH = TILE_SIZE * ATLAS_COLUMNS;
const ATLAS_HEIGHT = TILE_SIZE * ATLAS_ROWS;

export function createBlockAtlasTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_WIDTH;
  canvas.height = ATLAS_HEIGHT;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Block texture atlas could not be created.");
  }

  context.imageSmoothingEnabled = false;
  drawAtlas(context);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.flipY = true;
  texture.needsUpdate = true;
  return texture;
}

export function getAtlasUv(tile: TextureTile, u: number, v: number): [number, number] {
  const column = tile % ATLAS_COLUMNS;
  const row = Math.floor(tile / ATLAS_COLUMNS);
  const inset = 0.02;
  const pixelU = column * TILE_SIZE + inset + u * (TILE_SIZE - inset * 2);
  const pixelV = row * TILE_SIZE + inset + v * (TILE_SIZE - inset * 2);
  return [pixelU / ATLAS_WIDTH, 1 - pixelV / ATLAS_HEIGHT];
}

function drawAtlas(context: CanvasRenderingContext2D): void {
  drawNoisyTile(context, TextureTile.GrassTop, "#62ad4d", ["#4b963f", "#77c45b"], 3);
  drawNoisyTile(context, TextureTile.GrassSide, "#8b6542", ["#795538", "#9e7650"], 7);
  drawGrassEdge(context, TextureTile.GrassSide);
  drawNoisyTile(context, TextureTile.Dirt, "#8b6542", ["#6f4f36", "#a27a54"], 11);
  drawNoisyTile(context, TextureTile.Stone, "#858b91", ["#6f757b", "#9ba0a5"], 17);
  drawWoodSide(context, TextureTile.WoodSide);
  drawWoodTop(context, TextureTile.WoodTop);
  drawLeaves(context, TextureTile.Leaves);
  drawNoisyTile(context, TextureTile.Sand, "#dfcc83", ["#c8b46c", "#f0df9a"], 23);
  drawOre(context, TextureTile.CoalOre, "#34373b", 29);
  drawOre(context, TextureTile.IronOre, "#b47755", 31);
  drawPlanks(context, TextureTile.Planks);
  drawCraftingSide(context, TextureTile.CraftingSide);
  drawCraftingTop(context, TextureTile.CraftingTop);
  drawWater(context, TextureTile.Water);
  drawTnt(context, TextureTile.TNT);
}

function getOrigin(tile: TextureTile): { x: number; y: number } {
  return {
    x: (tile % ATLAS_COLUMNS) * TILE_SIZE,
    y: Math.floor(tile / ATLAS_COLUMNS) * TILE_SIZE,
  };
}

function drawNoisyTile(
  context: CanvasRenderingContext2D,
  tile: TextureTile,
  base: string,
  accents: [string, string],
  seed: number,
): void {
  const origin = getOrigin(tile);
  context.fillStyle = base;
  context.fillRect(origin.x, origin.y, TILE_SIZE, TILE_SIZE);

  for (let y = 0; y < TILE_SIZE; y += 1) {
    for (let x = 0; x < TILE_SIZE; x += 1) {
      const noise = pixelNoise(x, y, seed);

      if (noise > 0.83) {
        context.fillStyle = accents[0];
        context.fillRect(origin.x + x, origin.y + y, 1, 1);
      } else if (noise < 0.15) {
        context.fillStyle = accents[1];
        context.fillRect(origin.x + x, origin.y + y, 1, 1);
      }
    }
  }
}

function drawGrassEdge(context: CanvasRenderingContext2D, tile: TextureTile): void {
  const origin = getOrigin(tile);
  context.fillStyle = "#5ca84a";
  context.fillRect(origin.x, origin.y, TILE_SIZE, 3);

  for (let x = 0; x < TILE_SIZE; x += 1) {
    const depth = 1 + Math.floor(pixelNoise(x, 0, 37) * 3);
    context.fillRect(origin.x + x, origin.y + 3, 1, depth);
  }
}

function drawWoodSide(context: CanvasRenderingContext2D, tile: TextureTile): void {
  const origin = getOrigin(tile);
  context.fillStyle = "#936238";
  context.fillRect(origin.x, origin.y, TILE_SIZE, TILE_SIZE);

  for (let x = 1; x < TILE_SIZE; x += 4) {
    context.fillStyle = x % 8 === 1 ? "#70492f" : "#b17b47";
    context.fillRect(origin.x + x, origin.y, 2, TILE_SIZE);
  }

  context.fillStyle = "#5c3e2a";
  context.fillRect(origin.x + 10, origin.y + 5, 2, 4);
}

function drawWoodTop(context: CanvasRenderingContext2D, tile: TextureTile): void {
  const origin = getOrigin(tile);
  context.fillStyle = "#b6824d";
  context.fillRect(origin.x, origin.y, TILE_SIZE, TILE_SIZE);
  context.strokeStyle = "#79502f";
  context.strokeRect(origin.x + 2.5, origin.y + 2.5, 10, 10);
  context.strokeRect(origin.x + 5.5, origin.y + 5.5, 4, 4);
}

function drawLeaves(context: CanvasRenderingContext2D, tile: TextureTile): void {
  drawNoisyTile(context, tile, "#438f49", ["#2f7439", "#69ad55"], 41);
  const origin = getOrigin(tile);
  context.fillStyle = "#79bf62";
  for (let index = 0; index < 14; index += 1) {
    const x = Math.floor(pixelNoise(index, 2, 43) * TILE_SIZE);
    const y = Math.floor(pixelNoise(3, index, 47) * TILE_SIZE);
    context.fillRect(origin.x + x, origin.y + y, 1, 1);
  }
}

function drawOre(
  context: CanvasRenderingContext2D,
  tile: TextureTile,
  oreColor: string,
  seed: number,
): void {
  drawNoisyTile(context, tile, "#858b91", ["#6f757b", "#9ba0a5"], seed);
  const origin = getOrigin(tile);
  context.fillStyle = oreColor;

  for (let index = 0; index < 11; index += 1) {
    const x = Math.floor(pixelNoise(index, seed, 53) * 14);
    const y = Math.floor(pixelNoise(seed, index, 59) * 14);
    context.fillRect(origin.x + x, origin.y + y, 2, 2);
  }
}

function drawPlanks(context: CanvasRenderingContext2D, tile: TextureTile): void {
  const origin = getOrigin(tile);
  context.fillStyle = "#b9824b";
  context.fillRect(origin.x, origin.y, TILE_SIZE, TILE_SIZE);
  context.fillStyle = "#76502f";

  for (let y = 3; y < TILE_SIZE; y += 4) {
    context.fillRect(origin.x, origin.y + y, TILE_SIZE, 1);
  }

  context.fillRect(origin.x + 6, origin.y, 1, 4);
  context.fillRect(origin.x + 11, origin.y + 4, 1, 4);
  context.fillRect(origin.x + 4, origin.y + 8, 1, 4);
  context.fillRect(origin.x + 9, origin.y + 12, 1, 4);
}

function drawCraftingSide(context: CanvasRenderingContext2D, tile: TextureTile): void {
  drawPlanks(context, tile);
  const origin = getOrigin(tile);
  context.fillStyle = "#503622";
  context.fillRect(origin.x + 3, origin.y + 3, 10, 2);
  context.fillRect(origin.x + 5, origin.y + 5, 2, 8);
  context.fillStyle = "#c6c9c7";
  context.fillRect(origin.x + 9, origin.y + 6, 3, 5);
}

function drawCraftingTop(context: CanvasRenderingContext2D, tile: TextureTile): void {
  const origin = getOrigin(tile);
  context.fillStyle = "#9b6338";
  context.fillRect(origin.x, origin.y, TILE_SIZE, TILE_SIZE);
  context.fillStyle = "#d19b5a";
  context.fillRect(origin.x + 2, origin.y + 2, 12, 12);
  context.fillStyle = "#67452c";
  context.fillRect(origin.x + 7, origin.y + 2, 2, 12);
  context.fillRect(origin.x + 2, origin.y + 7, 12, 2);
}

function drawWater(context: CanvasRenderingContext2D, tile: TextureTile): void {
  const origin = getOrigin(tile);
  context.fillStyle = "#3f91d0";
  context.fillRect(origin.x, origin.y, TILE_SIZE, TILE_SIZE);
  context.fillStyle = "#76c5eb";
  context.fillRect(origin.x + 1, origin.y + 3, 6, 1);
  context.fillRect(origin.x + 9, origin.y + 8, 6, 1);
  context.fillRect(origin.x + 3, origin.y + 13, 7, 1);
  context.fillStyle = "#2f75b1";
  context.fillRect(origin.x + 6, origin.y + 5, 7, 1);
  context.fillRect(origin.x, origin.y + 10, 5, 1);
}

function drawTnt(context: CanvasRenderingContext2D, tile: TextureTile): void {
  const origin = getOrigin(tile);
  context.fillStyle = "#d7473d";
  context.fillRect(origin.x, origin.y, TILE_SIZE, TILE_SIZE);
  context.fillStyle = "#a92f2a";
  context.fillRect(origin.x, origin.y, TILE_SIZE, 3);
  context.fillRect(origin.x, origin.y + 13, TILE_SIZE, 3);
  context.fillStyle = "#f2e7d4";
  context.fillRect(origin.x, origin.y + 5, TILE_SIZE, 6);
  context.fillStyle = "#2d2927";
  context.fillRect(origin.x + 3, origin.y + 7, 2, 2);
  context.fillRect(origin.x + 7, origin.y + 7, 2, 2);
  context.fillRect(origin.x + 11, origin.y + 7, 2, 2);
}

function pixelNoise(x: number, y: number, seed: number): number {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
}
