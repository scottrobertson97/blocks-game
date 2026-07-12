import * as THREE from "three";
import { CHUNK_SIZE } from "../game/constants";
import { getAtlasUv } from "../rendering/TextureAtlas";
import {
  BlockId,
  getBlockTextureTile,
  isLiquidBlock,
  isOpaqueBlock,
  isRenderableBlock,
} from "./Block";
import { Chunk } from "./Chunk";
import { World } from "./World";

type Face = {
  corners: [number, number, number][];
  normal: [number, number, number];
  shade: number;
};

type GeometryBucket = {
  colors: number[];
  indices: number[];
  normals: number[];
  positions: number[];
  uvs: number[];
};

const faces: Face[] = [
  {
    normal: [1, 0, 0],
    corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]],
    shade: 0.82,
  },
  {
    normal: [-1, 0, 0],
    corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]],
    shade: 0.72,
  },
  {
    normal: [0, 1, 0],
    corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
    shade: 1,
  },
  {
    normal: [0, -1, 0],
    corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
    shade: 0.55,
  },
  {
    normal: [0, 0, 1],
    corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
    shade: 0.9,
  },
  {
    normal: [0, 0, -1],
    corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]],
    shade: 0.66,
  },
];

const faceUvs: [number, number][] = [[0, 1], [0, 0], [1, 0], [1, 1]];

export function buildChunkGeometry(world: World, chunk: Chunk): THREE.BufferGeometry {
  const solid = createBucket();
  const water = createBucket();

  for (let y = 0; y < world.height; y += 1) {
    for (let z = 0; z < CHUNK_SIZE; z += 1) {
      for (let x = 0; x < CHUNK_SIZE; x += 1) {
        const blockId = chunk.getBlock(x, y, z);

        if (!isRenderableBlock(blockId)) {
          continue;
        }

        emitVisibleFaces({
          blockId,
          bucket: isLiquidBlock(blockId) ? water : solid,
          chunk,
          world,
          x,
          y,
          z,
        });
      }
    }
  }

  return combineBuckets(solid, water);
}

function emitVisibleFaces(options: {
  blockId: BlockId;
  bucket: GeometryBucket;
  chunk: Chunk;
  world: World;
  x: number;
  y: number;
  z: number;
}): void {
  const { blockId, bucket, chunk, world, x, y, z } = options;
  const worldX = chunk.originX + x;
  const worldZ = chunk.originZ + z;

  faces.forEach((face) => {
    const neighbor = world.getBlock(
      worldX + face.normal[0],
      y + face.normal[1],
      worldZ + face.normal[2],
    );

    if (!shouldEmitFace(blockId, neighbor)) {
      return;
    }

    const vertexOffset = bucket.positions.length / 3;
    const tile = getBlockTextureTile(blockId, face.normal[1]);

    face.corners.forEach((corner, cornerIndex) => {
      const cornerY = isLiquidBlock(blockId) && corner[1] === 1 ? 0.86 : corner[1];
      bucket.positions.push(x + corner[0], y + cornerY, z + corner[2]);
      bucket.normals.push(...face.normal);
      bucket.colors.push(face.shade, face.shade, face.shade);
      bucket.uvs.push(...getAtlasUv(tile, faceUvs[cornerIndex][0], faceUvs[cornerIndex][1]));
    });

    bucket.indices.push(
      vertexOffset,
      vertexOffset + 1,
      vertexOffset + 2,
      vertexOffset,
      vertexOffset + 2,
      vertexOffset + 3,
    );
  });
}

function shouldEmitFace(blockId: BlockId, neighbor: BlockId): boolean {
  if (isLiquidBlock(blockId)) {
    return !isRenderableBlock(neighbor);
  }

  return !isOpaqueBlock(neighbor);
}

function createBucket(): GeometryBucket {
  return {
    colors: [],
    indices: [],
    normals: [],
    positions: [],
    uvs: [],
  };
}

function combineBuckets(solid: GeometryBucket, water: GeometryBucket): THREE.BufferGeometry {
  const solidVertexCount = solid.positions.length / 3;
  const positions = [...solid.positions, ...water.positions];
  const normals = [...solid.normals, ...water.normals];
  const colors = [...solid.colors, ...water.colors];
  const uvs = [...solid.uvs, ...water.uvs];
  const indices = [
    ...solid.indices,
    ...water.indices.map((index) => index + solidVertexCount),
  ];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  if (solid.indices.length > 0) {
    geometry.addGroup(0, solid.indices.length, 0);
  }

  if (water.indices.length > 0) {
    geometry.addGroup(solid.indices.length, water.indices.length, 1);
  }

  geometry.computeBoundingSphere();
  return geometry;
}
