import collisionMap from '../../shared/mapCollision.json' with { type: 'json' };

const MAP_WIDTH = collisionMap.worldWidth;
const MAP_HEIGHT = collisionMap.worldHeight;
const PLAYER_RADIUS = collisionMap.playerRadius;
const OBSTACLES = collisionMap.obstacles;

const clampToBounds = (position) => ({
  x: Math.min(Math.max(position.x, PLAYER_RADIUS), MAP_WIDTH - PLAYER_RADIUS),
  y: Math.min(Math.max(position.y, PLAYER_RADIUS), MAP_HEIGHT - PLAYER_RADIUS),
});

const intersectsObstacle = (position, obstacle) => {
  const nearestX = Math.max(obstacle.x, Math.min(position.x, obstacle.x + obstacle.width));
  const nearestY = Math.max(obstacle.y, Math.min(position.y, obstacle.y + obstacle.height));
  const deltaX = position.x - nearestX;
  const deltaY = position.y - nearestY;

  return deltaX * deltaX + deltaY * deltaY < PLAYER_RADIUS * PLAYER_RADIUS;
};

export const collidesWithMap = (position) =>
  OBSTACLES.some((obstacle) => intersectsObstacle(position, obstacle));

export const resolveMapCollision = (current, next) => {
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

export const findSafeSpawnPosition = (position) => {
  const candidate = clampToBounds(position);

  if (!collidesWithMap(candidate)) {
    return candidate;
  }

  for (let radius = PLAYER_RADIUS; radius <= 240; radius += PLAYER_RADIUS) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 10) {
      const nextPosition = clampToBounds({
        x: candidate.x + Math.cos(angle) * radius,
        y: candidate.y + Math.sin(angle) * radius,
      });

      if (!collidesWithMap(nextPosition)) {
        return nextPosition;
      }
    }
  }

  return {
    x: MAP_WIDTH / 2,
    y: MAP_HEIGHT / 2,
  };
};
