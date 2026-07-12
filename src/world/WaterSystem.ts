import { BlockId } from "./Block";
import type { World } from "./World";

type FlowNode = {
  distance: number;
  x: number;
  y: number;
  z: number;
};

const FLOW_INTERVAL = 0.1;
const FLOW_RADIUS = 4;
const NODES_PER_TICK = 8;
const HORIZONTAL_DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

export class WaterSystem {
  private accumulator = 0;
  private readonly bestDistance = new Map<string, number>();
  private readonly queue: FlowNode[] = [];

  constructor(
    private readonly world: World,
    private readonly onWorldEdited: (chunkKeys: string[]) => void,
  ) {}

  addSource(x: number, y: number, z: number): void {
    this.enqueue({ distance: 0, x, y, z });
  }

  update(deltaSeconds: number): void {
    this.accumulator += deltaSeconds;

    while (this.accumulator >= FLOW_INTERVAL && this.queue.length > 0) {
      this.accumulator -= FLOW_INTERVAL;
      const affected = new Set<string>();

      for (let index = 0; index < NODES_PER_TICK; index += 1) {
        const node = this.queue.shift();
        if (!node) {
          break;
        }
        this.flowFrom(node, affected);
      }

      if (affected.size > 0) {
        this.onWorldEdited([...affected]);
      }
    }

    if (this.queue.length === 0) {
      this.bestDistance.clear();
      this.accumulator = 0;
    }
  }

  private flowFrom(node: FlowNode, affected: Set<string>): void {
    if (this.world.getBlock(node.x, node.y, node.z) !== BlockId.Water) {
      return;
    }

    if (node.y > 0 && this.world.getBlock(node.x, node.y - 1, node.z) === BlockId.Air) {
      if (this.placeWater(node.x, node.y - 1, node.z, affected)) {
        this.enqueue({ ...node, y: node.y - 1 });
      }
      return;
    }

    if (node.distance >= FLOW_RADIUS) {
      return;
    }

    HORIZONTAL_DIRECTIONS.forEach(([dx, dz]) => {
      const x = node.x + dx;
      const z = node.z + dz;

      if (this.world.getBlock(x, node.y, z) !== BlockId.Air) {
        return;
      }

      if (this.placeWater(x, node.y, z, affected)) {
        this.enqueue({ distance: node.distance + 1, x, y: node.y, z });
      }
    });
  }

  private placeWater(x: number, y: number, z: number, affected: Set<string>): boolean {
    const chunkKeys = this.world.setBlock(x, y, z, BlockId.Water);
    chunkKeys.forEach((key) => affected.add(key));
    return chunkKeys.length > 0;
  }

  private enqueue(node: FlowNode): void {
    const key = `${node.x},${node.y},${node.z}`;
    const previousDistance = this.bestDistance.get(key);

    if (previousDistance !== undefined && previousDistance <= node.distance) {
      return;
    }

    this.bestDistance.set(key, node.distance);
    this.queue.push(node);
  }
}
