import collisionMap from '../../../shared/mapCollision.json';

import type { Position, WorldConfig } from '../types';

type Obstacle = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MAP_WIDTH = collisionMap.worldWidth;
const MAP_HEIGHT = collisionMap.worldHeight;
const PLAYER_RADIUS = collisionMap.playerRadius;
const OBSTACLES = collisionMap.obstacles as Obstacle[];

const clampToBounds = (position: Position) => ({
  x: Math.min(Math.max(position.x, PLAYER_RADIUS), MAP_WIDTH - PLAYER_RADIUS),
  y: Math.min(Math.max(position.y, PLAYER_RADIUS), MAP_HEIGHT - PLAYER_RADIUS),
});

const intersectsObstacle = (position: Position, obstacle: Obstacle) => {
  const nearestX = Math.max(obstacle.x, Math.min(position.x, obstacle.x + obstacle.width));
  const nearestY = Math.max(obstacle.y, Math.min(position.y, obstacle.y + obstacle.height));
  const deltaX = position.x - nearestX;
  const deltaY = position.y - nearestY;

  return deltaX * deltaX + deltaY * deltaY < PLAYER_RADIUS * PLAYER_RADIUS;
};

export const getCollisionWorld = (): WorldConfig => ({
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  proximityRadius: 220,
  maxNameLength: 20,
});

export const collidesWithMap = (position: Position) =>
  OBSTACLES.some((obstacle) => intersectsObstacle(position, obstacle));

export const resolveMapCollision = (current: Position, next: Position): Position => {
  const clampedNext = clampToBounds(next);

  if (!collidesWithMap(clampedNext)) {
    return clampedNext;
  }

  const slideX = clampToBounds({
    x: clampedNext.x,
    y: current.y,
  });

  if (!collidesWithMap(slideX)) {
    return slideX;
  }

  const slideY = clampToBounds({
    x: current.x,
    y: clampedNext.y,
  });

  if (!collidesWithMap(slideY)) {
    return slideY;
  }

  return clampToBounds(current);
};
