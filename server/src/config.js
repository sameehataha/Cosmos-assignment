import dotenv from 'dotenv';
import collisionMap from '../../shared/mapCollision.json' with { type: 'json' };

dotenv.config({ quiet: true });

const readNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: readNumber(process.env.PORT, 4000),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI ?? '',
  worldWidth: readNumber(process.env.WORLD_WIDTH, collisionMap.worldWidth),
  worldHeight: readNumber(process.env.WORLD_HEIGHT, collisionMap.worldHeight),
  proximityRadius: readNumber(process.env.PROXIMITY_RADIUS, 220),
  maxNameLength: readNumber(process.env.MAX_NAME_LENGTH, 20),
};
