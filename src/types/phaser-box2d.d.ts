declare module 'phaser-box2d' {
  export function SetWorldScale(scale: number): void;
  export function GetWorldScale(): number;
  export function mpx(meters: number): number;
  export function pxm(pixels: number): number;
  export function pxmVec2(x: number, y: number): b2Vec2;
  export function RotFromRad(radians: number): b2Rot;

  export function CreateWorld(data: { worldDef?: any }): { worldId: any };
  export function WorldStep(data: { worldId: any; deltaTime: number; fixedTimeStep?: number; subStepCount?: number }): number;

  export function CreateBoxPolygon(data: {
    worldId: any;
    type?: number;
    position?: any;
    size?: any;
    density?: number;
    friction?: number;
    restitution?: number;
    fixedRotation?: boolean;
    linearDamping?: number;
    angularDamping?: number;
    bodyDef?: any;
    shapeDef?: any;
    bodyId?: any;
    isSensor?: boolean;
    preSolve?: boolean;
    color?: number;
    userData?: any;
    categoryBits?: number;
    maskBits?: number;
    groupIndex?: number;
  }): { bodyId: any; shapeId: any; object: any };

  export function CreateCircle(data: any): { bodyId: any; shapeId: any; object: any };
  export function CreateCapsule(data: any): { bodyId: any; shapeId: any; object: any };

  export function AddSpriteToWorld(worldId: any, sprite: any, body: { bodyId: any }): void;
  export function RemoveSpriteFromWorld(worldId: any, sprite: any, destroyBody?: boolean): void;
  export function ClearWorldSprites(worldId: any): void;
  export function GetBodyFromSprite(worldId: any, sprite: any): any;
  export function UpdateWorldSprites(worldId: any): void;
  export function BodyToSprite(body: any, sprite: any): void;
  export function SpriteToBox(worldId: any, sprite: any, data: any): { bodyId: any; shapeId: any; object: any };

  export function b2Body_SetLinearVelocity(bodyId: any, velocity: b2Vec2): void;
  export function b2Body_GetLinearVelocity(bodyId: any): b2Vec2;
  export function b2Body_SetAngularVelocity(bodyId: any, angularVelocity: number): void;
  export function b2Body_GetAngularVelocity(bodyId: any): number;
  export function b2Body_SetTransform(bodyId: any, position: b2Vec2, rotation?: b2Rot): void;
  export function b2Body_GetTransform(bodyId: any): { p: b2Vec2; q: b2Rot };
  export function b2Body_GetPosition(bodyId: any): b2Vec2;
  export function b2Body_GetRotation(bodyId: any): b2Rot;
  export function b2Body_ApplyForce(bodyId: any, force: b2Vec2, point: b2Vec2): void;
  export function b2Body_ApplyLinearImpulse(bodyId: any, impulse: b2Vec2, point: b2Vec2): void;
  export function b2Body_ApplyLinearImpulseToCenter(bodyId: any, impulse: b2Vec2): void;
  export function b2Body_SetUserData(bodyId: any, userData: any): void;
  export function b2Body_GetUserData(bodyId: any): any;
  export function b2Body_GetMass(bodyId: any): number;
  export function b2Body_SetFixedRotation(bodyId: any, fixed: boolean): void;
  export function b2Body_SetGravityScale(bodyId: any, scale: number): void;
  export function b2Body_SetAwake(bodyId: any, awake: boolean): void;
  export function b2Body_GetType(bodyId: any): number;
  export function b2Body_SetType(bodyId: any, type: number): void;
  export function b2Body_Enable(bodyId: any): void;
  export function b2Body_Disable(bodyId: any): void;

  export function b2DestroyBody(bodyId: any): void;
  export function b2DestroyWorld(worldId: any): void;

  export function b2Shape_GetBody(shapeId: any): any;
  export function b2Shape_IsSensor(shapeId: any): boolean;
  export function b2Shape_EnableContactEvents(shapeId: any, enabled: boolean): void;
  export function b2Shape_EnableSensorEvents(shapeId: any, enabled: boolean): void;

  export function b2World_GetContactEvents(worldId: any): {
    beginEvents: Array<{ shapeIdA: any; shapeIdB: any; manifold: any }>;
    endEvents: Array<{ shapeIdA: any; shapeIdB: any }>;
    hitEvents: Array<{ shapeIdA: any; shapeIdB: any; approachSpeed: number }>;
    beginCount: number;
    endCount: number;
    hitCount: number;
  };

  export function b2World_GetSensorEvents(worldId: any): {
    beginEvents: Array<{ sensorShapeId: any; visitorShapeId: any }>;
    endEvents: Array<{ sensorShapeId: any; visitorShapeId: any }>;
    beginCount: number;
    endCount: number;
  };

  export function b2World_SetPreSolveCallback(worldId: any, callback: (shapeIdA: any, shapeIdB: any, manifold: any, context: any) => boolean, context: any): void;
  export function b2World_SetCustomFilterCallback(worldId: any, callback: any, context: any): void;
  export function b2World_SetGravity(worldId: any, gravity: b2Vec2): void;
  export function b2World_GetGravity(worldId: any): b2Vec2;

  export function b2DefaultWorldDef(): any;
  export function b2DefaultBodyDef(): any;
  export function b2DefaultShapeDef(): any;

  export class b2Vec2 {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    clone(): b2Vec2;
  }

  export class b2Rot {
    c: number;
    s: number;
    constructor(c?: number, s?: number);
    clone(): b2Rot;
  }

  export const STATIC: number;
  export const KINEMATIC: number;
  export const DYNAMIC: number;
}
