/**
 * Physics helpers for CoinRunner Box2D integration.
 */
import { pxm, b2DefaultShapeDef } from 'phaser-box2d';

export const WORLD_SCALE = 30;

export type EntityKind =
  | 'player' | 'ground' | 'platform'
  | 'enemy' | 'coin' | 'pipe_body' | 'pipe_top'
  | 'piranha' | 'qblock' | 'mushroom' | 'poison' | 'bullet';

export interface PhysicsUserData {
  kind: EntityKind;
  ref?: any;
}

/** ShapeDef with contact events enabled (for solid collisions) */
export function contactShapeDef(density = 1, friction = 0.5, restitution = 0) {
  const sd = b2DefaultShapeDef();
  sd.density = density;
  sd.friction = friction;
  sd.restitution = restitution;
  sd.enableContactEvents = true;
  return sd;
}

/** ShapeDef for sensors (coins, mushrooms, qblocks — overlap only) */
export function sensorShapeDef() {
  const sd = b2DefaultShapeDef();
  sd.isSensor = true;
  sd.enableSensorEvents = true;
  return sd;
}

/** ShapeDef for one-way platforms (needs preSolve) */
export function platformShapeDef(friction = 0.5) {
  const sd = b2DefaultShapeDef();
  sd.friction = friction;
  sd.enableContactEvents = true;
  sd.enablePreSolveEvents = true;
  return sd;
}

/** Convert px/frame to m/s at 60fps */
export function pxFrameToMs(pxPerFrame: number): number {
  return pxm(pxPerFrame * 60);
}

/** Convert Phaser Y (down) to Box2D Y (up) in meters */
export function toB2Y(phaserY: number): number {
  return -pxm(phaserY);
}

/** Convert Phaser position to Box2D Vec2 {x in meters, y flipped} */
export function toB2Pos(phaserX: number, phaserY: number): { x: number; y: number } {
  return { x: pxm(phaserX), y: -pxm(phaserY) };
}
