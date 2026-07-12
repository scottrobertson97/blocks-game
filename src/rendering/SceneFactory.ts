import * as THREE from "three";

export type SceneEnvironment = {
  hemisphere: THREE.HemisphereLight;
  scene: THREE.Scene;
  sunlight: THREE.DirectionalLight;
};

export function createSceneEnvironment(): SceneEnvironment {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#8fc7e8");
  scene.fog = new THREE.Fog("#8fc7e8", 70, 150);

  const hemisphere = new THREE.HemisphereLight("#f7fbff", "#7f8b5c", 1.7);
  scene.add(hemisphere);

  const sunlight = new THREE.DirectionalLight("#fff2ca", 1.4);
  sunlight.position.set(30, 45, 20);
  scene.add(sunlight);

  return { hemisphere, scene, sunlight };
}

export function createCamera(): THREE.PerspectiveCamera {
  return new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 220);
}
