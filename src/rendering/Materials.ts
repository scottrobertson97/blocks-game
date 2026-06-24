import * as THREE from "three";

export function createChunkMaterial(): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({
    vertexColors: true,
  });
}

