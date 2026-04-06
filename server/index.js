import http from 'node:http';

import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';

import { config } from './src/config.js';
import { connectToMongo, isMongoEnabled } from './src/persistence/sessionStore.js';
import { createCosmosState } from './src/state.js';

const bootstrap = async () => {
  await connectToMongo(config.mongoUri);

  const app = express();
  app.use(
    cors({
      origin: config.clientUrl,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get('/api/health', (_request, response) => {
    response.json({
      status: 'ok',
      mongoEnabled: isMongoEnabled(),
      world: {
        width: config.worldWidth,
        height: config.worldHeight,
        proximityRadius: config.proximityRadius,
      },
    });
  });

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: config.clientUrl,
      methods: ['GET', 'POST'],
    },
  });

  const cosmosState = createCosmosState(io);

  io.on('connection', (socket) => {
    socket.on('user:join', async (payload) => {
      try {
        const session = await cosmosState.addUser(socket, payload);
        socket.emit('session:init', session);
      } catch (error) {
        socket.emit('session:error', {
          message: 'Unable to join the cosmos right now.',
        });
        console.error(`Join failed for ${socket.id}:`, error);
      }
    });

    socket.on('user:move', async (payload) => {
      try {
        await cosmosState.updateUserPosition(socket.id, payload);
      } catch (error) {
        console.error(`Movement failed for ${socket.id}:`, error);
      }
    });

    socket.on('chat:send', (payload) => {
      cosmosState.sendChatMessage(socket.id, payload);
    });

    socket.on('disconnect', async () => {
      try {
        await cosmosState.removeUser(socket.id);
      } catch (error) {
        console.error(`Disconnect cleanup failed for ${socket.id}:`, error);
      }
    });
  });

  server.listen(config.port, () => {
    console.log(
      `Virtual Cosmos server listening on http://localhost:${config.port} (MongoDB ${
        isMongoEnabled() ? 'connected' : 'optional/off'
      })`,
    );
  });
};

bootstrap().catch((error) => {
  console.error('Server bootstrap failed:', error);
  process.exit(1);
});
