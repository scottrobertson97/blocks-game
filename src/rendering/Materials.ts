import * as THREE from "three";
import { createBlockAtlasTexture } from "./TextureAtlas";

export function createChunkMaterials(): [THREE.MeshLambertMaterial, THREE.MeshLambertMaterial] {
  const atlas = createBlockAtlasTexture();
  const solid = new THREE.MeshLambertMaterial({
    map: atlas,
    vertexColors: true,
  });
  const water = new THREE.MeshLambertMaterial({
    depthWrite: false,
    map: atlas,
    opacity: 0.72,
    side: THREE.DoubleSide,
    transparent: true,
    vertexColors: true,
  });

  return [solid, water];
}
