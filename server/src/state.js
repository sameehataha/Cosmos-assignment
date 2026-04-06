import crypto from 'node:crypto';

import { config } from './config.js';
import { findSafeSpawnPosition, resolveMapCollision } from './mapCollision.js';
import { markSessionDisconnected, syncSession } from './persistence/sessionStore.js';
import {
  createPairRoomId,
  createSpawnPosition,
  distanceBetween,
  pickColor,
  sanitizeName,
} from './utils.js';

const MAX_MESSAGE_LENGTH = 240;
const MAX_ROOM_HISTORY = 40;

export const createCosmosState = (io) => {
  const users = new Map();
  const activeRooms = new Map();
  const messagesByRoom = new Map();

  const serializeUser = (user) => ({
    userId: user.userId,
    name: user.name,
    color: user.color,
    position: user.position,
    activeConnections: [...user.activeConnections],
  });

  const serializeRoom = (room) => ({
    roomId: room.roomId,
    members: [...room.userIds],
  });

  const getSnapshot = () => ({
    users: [...users.values()].map(serializeUser),
    activeRooms: [...activeRooms.values()].map(serializeRoom),
  });

  const getPartnerPayload = (room, socketId) => {
    const currentUser = users.get(socketId);
    const partnerId = room.userIds.find((userId) => userId !== currentUser?.userId);
    const partner = [...users.values()].find((user) => user.userId === partnerId);

    return {
      roomId: room.roomId,
      partnerId: partner?.userId ?? '',
      partnerName: partner?.name ?? 'Explorer',
      partnerColor: partner?.color ?? '#F8FAFC',
      at: new Date().toISOString(),
      messages: messagesByRoom.get(room.roomId) ?? [],
    };
  };

  const emitRoomJoined = (room) => {
    room.socketIds.forEach((socketId) => {
      const socket = io.sockets.sockets.get(socketId);
      socket?.join(room.roomId);
      io.to(socketId).emit('proximity:connected', getPartnerPayload(room, socketId));
    });
  };

  const emitRoomLeft = (room) => {
    room.socketIds.forEach((socketId) => {
      const socket = io.sockets.sockets.get(socketId);
      socket?.leave(room.roomId);
      io.to(socketId).emit('proximity:disconnected', getPartnerPayload(room, socketId));
    });
  };

  const recalculateProximity = async () => {
    const nextRooms = new Map();
    const userList = [...users.values()];

    userList.forEach((user) => {
      user.activeConnections = [];
    });

    for (let index = 0; index < userList.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < userList.length; otherIndex += 1) {
        const first = userList[index];
        const second = userList[otherIndex];
        const distance = distanceBetween(first.position, second.position);

        if (distance > config.proximityRadius) {
          continue;
        }

        const roomId = createPairRoomId(first.userId, second.userId);
        nextRooms.set(roomId, {
          roomId,
          socketIds: [first.socketId, second.socketId],
          userIds: [first.userId, second.userId],
        });

        first.activeConnections.push(second.userId);
        second.activeConnections.push(first.userId);
      }
    }

    activeRooms.forEach((room, roomId) => {
      if (!nextRooms.has(roomId)) {
        emitRoomLeft(room);
      }
    });

    nextRooms.forEach((room, roomId) => {
      if (!activeRooms.has(roomId)) {
        emitRoomJoined(room);
      }
    });

    activeRooms.clear();
    nextRooms.forEach((room, roomId) => {
      activeRooms.set(roomId, room);
    });

    userList.forEach((user) => {
      void syncSession(user);
    });

    const snapshot = getSnapshot();
    io.emit('world:update', snapshot);
    return snapshot;
  };

  const addUser = async (socket, payload = {}) => {
    const fallbackName = `Explorer ${String(users.size + 1).padStart(2, '0')}`;
    const user = {
      socketId: socket.id,
      userId: crypto.randomUUID(),
      name: sanitizeName(payload.name, config.maxNameLength, fallbackName),
      color: pickColor(users.size),
      position: findSafeSpawnPosition(
        createSpawnPosition(users.size, config.worldWidth, config.worldHeight),
      ),
      activeConnections: [],
    };

    users.set(socket.id, user);
    await syncSession(user);
    const snapshot = await recalculateProximity();

    return {
      self: serializeUser(user),
      world: {
        width: config.worldWidth,
        height: config.worldHeight,
        proximityRadius: config.proximityRadius,
        maxNameLength: config.maxNameLength,
      },
      ...snapshot,
    };
  };

  const updateUserPosition = async (socketId, position = {}) => {
    const user = users.get(socketId);

    if (!user) {
      return null;
    }

    user.position = resolveMapCollision(user.position, {
      x: Number(position.x) || user.position.x,
      y: Number(position.y) || user.position.y,
    });

    await recalculateProximity();
    return serializeUser(user);
  };

  const removeUser = async (socketId) => {
    const user = users.get(socketId);

    if (!user) {
      return;
    }

    users.delete(socketId);
    await markSessionDisconnected(user);
    await recalculateProximity();
  };

  const sendChatMessage = (socketId, payload = {}) => {
    const user = users.get(socketId);
    const roomId = typeof payload.roomId === 'string' ? payload.roomId : '';
    const text = typeof payload.text === 'string' ? payload.text.trim() : '';

    if (!user || !roomId || !text) {
      return;
    }

    const room = activeRooms.get(roomId);

    if (!room || !room.userIds.includes(user.userId)) {
      return;
    }

    const message = {
      id: crypto.randomUUID(),
      roomId,
      senderId: user.userId,
      senderName: user.name,
      text: text.slice(0, MAX_MESSAGE_LENGTH),
      createdAt: new Date().toISOString(),
    };

    const nextHistory = [...(messagesByRoom.get(roomId) ?? []), message].slice(
      -MAX_ROOM_HISTORY,
    );
    messagesByRoom.set(roomId, nextHistory);
    io.to(roomId).emit('chat:message', message);
  };

  return {
    addUser,
    updateUserPosition,
    removeUser,
    sendChatMessage,
    getSnapshot,
  };
};
