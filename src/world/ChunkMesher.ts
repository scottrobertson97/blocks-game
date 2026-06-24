import * as THREE from "three";
import { CHUNK_SIZE } from "../game/constants";
import { BlockId, getBlockColor, isSolidBlock } from "./Block";
import { Chunk } from "./Chunk";
import { World } from "./World";

type Face = {
  corners: [number, number, number][];
  normal: [number, number, number];
  shade: number;
};

const faces: Face[] = [
  {
    normal: [1, 0, 0],
    corners: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
    shade: 0.82,
  },
  {
    normal: [-1, 0, 0],
    corners: [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
      [0, 0, 0],
    ],
    shade: 0.72,
  },
  {
    normal: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
    shade: 1,
  },
  {
    normal: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    shade: 0.55,
  },
  {
    normal: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    shade: 0.9,
  },
  {
    normal: [0, 0, -1],
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
    shade: 0.66,
  },
];

export function buildChunkGeometry(world: World, chunk: Chunk): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  for (let y = 0; y < world.height; y += 1) {
    for (let z = 0; z < CHUNK_SIZE; z += 1) {
      for (let x = 0; x < CHUNK_SIZE; x += 1) {
        const blockId = chunk.getBlock(x, y, z);

        if (!isSolidBlock(blockId)) {
          continue;
        }

        emitVisibleFaces({
          blockId,
          chunk,
          colors,
          indices,
          normals,
          positions,
          world,
          x,
          y,
          z,
        });
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function emitVisibleFaces(options: {
  blockId: BlockId;
  chunk: Chunk;
  colors: number[];
  indices: number[];
  normals: number[];
  positions: number[];
  world: World;
  x: number;
  y: number;
  z: number;
}): void {
  const { blockId, chunk, colors, indices, normals, positions, world, x, y, z } = options;
  const worldX = chunk.originX + x;
  const worldZ = chunk.originZ + z;

  faces.forEach((face) => {
    const neighbor = world.getBlock(
      worldX + face.normal[0],
      y + face.normal[1],
      worldZ + face.normal[2],
    );

    if (isSolidBlock(neighbor)) {
      return;
    }

    const vertexOffset = positions.length / 3;
    const baseColor = new THREE.Color(getBlockColor(blockId)).multiplyScalar(face.shade);

    face.corners.forEach((corner) => {
      positions.push(x + corner[0], y + corner[1], z + corner[2]);
      normals.push(...face.normal);
      colors.push(baseColor.r, baseColor.g, baseColor.b);
    });

    indices.push(
      vertexOffset,
      vertexOffset + 1,
      vertexOffset + 2,
      vertexOffset,
      vertexOffset + 2,
      vertexOffset + 3,
    );
  });
}

