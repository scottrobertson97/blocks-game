import assert from "node:assert/strict";
import { createServer } from "vite";
import * as THREE from "three";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const [{ World }, blockModule, terrainModule, inventoryModule, craftingModule] = await Promise.all([
    server.ssrLoadModule("/src/world/World.ts"),
    server.ssrLoadModule("/src/world/Block.ts"),
    server.ssrLoadModule("/src/world/TerrainGenerator.ts"),
    server.ssrLoadModule("/src/inventory/Inventory.ts"),
    server.ssrLoadModule("/src/crafting/Crafting.ts"),
  ]);
  const { BlockId } = blockModule;
  const { getTerrainHeight } = terrainModule;
  const { Inventory } = inventoryModule;
  const { CRAFTING_RECIPES, craft } = craftingModule;

  const generatedWorld = World.createDefault();
  const blockCounts = new Map();
  generatedWorld.forEachChunk((chunk) => {
    chunk.blocks.forEach((blockId) => {
      blockCounts.set(blockId, (blockCounts.get(blockId) ?? 0) + 1);
    });
  });

  for (const requiredBlock of [
    BlockId.Wood,
    BlockId.Leaves,
    BlockId.Sand,
    BlockId.Water,
    BlockId.CoalOre,
    BlockId.IronOre,
  ]) {
    assert.ok((blockCounts.get(requiredBlock) ?? 0) > 0, `Expected generated block ${requiredBlock}`);
  }

  let undergroundAir = 0;
  for (let z = -32; z < 48; z += 1) {
    for (let x = -32; x < 48; x += 1) {
      const height = getTerrainHeight(x, z);
      for (let y = 2; y < height - 2; y += 1) {
        if (generatedWorld.getBlock(x, y, z) === BlockId.Air) {
          undergroundAir += 1;
        }
      }
    }
  }
  assert.ok(undergroundAir > 100, "Expected carved cave air below the terrain surface");

  const inventory = new Inventory();
  const planksRecipe = CRAFTING_RECIPES.find((recipe) => recipe.id === "planks");
  assert.ok(planksRecipe, "Expected the planks recipe");
  assert.equal(craft(inventory, planksRecipe), true);
  assert.equal(inventory.getCount(BlockId.Wood), 9);
  assert.equal(inventory.getCount(BlockId.Planks), 4);

  const { WaterSystem } = await server.ssrLoadModule("/src/world/WaterSystem.ts");
  const waterWorld = World.createDefault();
  const waterGround = waterWorld.findHighestSolidY(8, 8);
  assert.notEqual(waterGround, null);
  const sourceY = waterGround + 4;
  waterWorld.setBlock(8, sourceY, 8, BlockId.Water);
  const waterSystem = new WaterSystem(waterWorld, () => undefined);
  waterSystem.addSource(8, sourceY, 8);
  for (let index = 0; index < 80; index += 1) {
    waterSystem.update(0.1);
  }
  assert.equal(waterWorld.getBlock(8, waterGround + 1, 8), BlockId.Water);
  assert.equal(waterWorld.getBlock(9, waterGround + 1, 8), BlockId.Water);

  const { TntSystem } = await server.ssrLoadModule("/src/world/TntSystem.ts");
  const tntWorld = World.createDefault();
  const tntGround = tntWorld.findHighestSolidY(8, 8);
  assert.notEqual(tntGround, null);
  tntWorld.setBlock(8, tntGround + 1, 8, BlockId.TNT);
  const tntScene = new THREE.Scene();
  let explosionDamage = -1;
  const tntSystem = new TntSystem({
    getPlayerPosition: () => new THREE.Vector3(100, 100, 100),
    onExplosion: (damage) => {
      explosionDamage = damage;
    },
    onWorldEdited: () => undefined,
    scene: tntScene,
    world: tntWorld,
  });
  assert.equal(tntSystem.ignite(8, tntGround + 1, 8), true);
  tntSystem.update(2.6);
  assert.equal(tntWorld.getBlock(8, tntGround, 8), BlockId.Air);
  assert.equal(explosionDamage, 0);

  const [{ PlayerController }, { createSceneEnvironment }, { DayNightCycle }] = await Promise.all([
    server.ssrLoadModule("/src/player/PlayerController.ts"),
    server.ssrLoadModule("/src/rendering/SceneFactory.ts"),
    server.ssrLoadModule("/src/game/DayNightCycle.ts"),
  ]);
  const playerWorld = World.createDefault();
  const playerGround = playerWorld.findHighestSolidY(8, 8);
  assert.notEqual(playerGround, null);
  const camera = new THREE.PerspectiveCamera();
  const idleInput = {
    consumeMouseDelta: () => ({ x: 0, y: 0 }),
    isKeyDown: () => false,
    isPointerLocked: () => false,
  };
  let fallDamage = 0;
  const player = new PlayerController(camera, idleInput, playerWorld, {
    onDamage: (amount) => {
      fallDamage += amount;
    },
  });
  player.restore({ health: 20, position: [8, playerGround + 12, 8] });
  for (let index = 0; index < 300; index += 1) {
    player.update(1 / 60);
  }
  assert.ok(fallDamage > 0, "Expected a high fall to damage the player");
  assert.ok(player.getHealth() < player.getMaxHealth());

  const cycle = new DayNightCycle(createSceneEnvironment());
  const initialTime = cycle.getLabel();
  cycle.update(2);
  assert.notEqual(cycle.getLabel(), initialTime);

  process.stdout.write(
    `System smoke passed: ${undergroundAir} cave cells, crafting, fall damage, water flow, TNT, and day/night.\n`,
  );
} finally {
  await server.close();
}
