import { startTransition, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { getRandomGuestName, mergeMessages } from '../lib/cosmos';
import { getCollisionWorld } from '../lib/mapCollision';
import type {
  ActiveRoom,
  ChatMessage,
  ConnectionEvent,
  CosmosUser,
  NearbyConnection,
  Position,
  ProximityPayload,
  SessionStatus,
  WorldConfig,
} from '../types';

const STORAGE_KEY = 'virtual-cosmos-name';
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:4000';
const MAX_FEED_ITEMS = 6;

const DEFAULT_WORLD: WorldConfig = getCollisionWorld();

const readStoredName = () =>
  typeof window === 'undefined'
    ? getRandomGuestName()
    : window.localStorage.getItem(STORAGE_KEY) ?? getRandomGuestName();

const appendFeedEvent = (
  previousFeed: ConnectionEvent[],
  nextEvent: Omit<ConnectionEvent, 'id'>,
) => [{ id: crypto.randomUUID(), ...nextEvent }, ...previousFeed].slice(0, MAX_FEED_ITEMS);

export const useCosmosSession = () => {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [world, setWorld] = useState<WorldConfig>(DEFAULT_WORLD);
  const [users, setUsers] = useState<CosmosUser[]>([]);
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([]);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, ChatMessage[]>>({});
  const [eventFeed, setEventFeed] = useState<ConnectionEvent[]>([]);
  const [optimisticPosition, setOptimisticPosition] = useState<Position | null>(null);
  const [initialName] = useState(readStoredName);
  const [socket, setSocket] = useState<Socket | null>(null);
  const selfIdRef = useRef<string | null>(null);

  const clearSessionState = (nextStatus: SessionStatus, nextError: string | null) => {
    selfIdRef.current = null;
    setStatus(nextStatus);
    setError(nextError);
    setWorld(DEFAULT_WORLD);
    setUsers([]);
    setActiveRooms([]);
    setSelfId(null);
    setSelectedRoomId(null);
    setMessagesByRoom({});
    setEventFeed([]);
    setOptimisticPosition(null);
  };

  const leaveCosmos = () => {
    socket?.disconnect();
    setSocket(null);
    clearSessionState('idle', null);
  };

  const joinCosmos = (rawName: string) => {
    const nextName = rawName.trim() || getRandomGuestName();

    socket?.disconnect();
    setSocket(null);
    clearSessionState('connecting', null);

    const nextSocket = io(SERVER_URL, {
      transports: ['websocket'],
    });

    setSocket(nextSocket);

    nextSocket.on('connect', () => {
      window.localStorage.setItem(STORAGE_KEY, nextName);
      nextSocket.emit('user:join', { name: nextName });
    });

    nextSocket.on('session:init', (payload) => {
      const nextUsers = (payload.users ?? []) as CosmosUser[];
      const nextRooms = (payload.activeRooms ?? []) as ActiveRoom[];
      const nextSelf = payload.self as CosmosUser;
      selfIdRef.current = nextSelf.userId;

      startTransition(() => {
        setWorld((payload.world ?? DEFAULT_WORLD) as WorldConfig);
        setUsers(nextUsers);
        setActiveRooms(nextRooms);
        setSelfId(nextSelf.userId);
        setOptimisticPosition(nextSelf.position);
        setStatus('connected');
        setError(null);
      });
    });

    nextSocket.on('world:update', (payload) => {
      const nextUsers = (payload.users ?? []) as CosmosUser[];
      const nextRooms = (payload.activeRooms ?? []) as ActiveRoom[];
      const nextSelf = nextUsers.find((user) => user.userId === selfIdRef.current);

      startTransition(() => {
        setUsers(nextUsers);
        setActiveRooms(nextRooms);

        if (nextSelf) {
          setOptimisticPosition(nextSelf.position);
        }
      });
    });

    nextSocket.on('proximity:connected', (payload: ProximityPayload) => {
      startTransition(() => {
        setMessagesByRoom((previousState) => ({
          ...previousState,
          [payload.roomId]: mergeMessages(
            previousState[payload.roomId] ?? [],
            payload.messages ?? [],
          ),
        }));
        setEventFeed((previousFeed) =>
          appendFeedEvent(previousFeed, {
            type: 'connected',
            roomId: payload.roomId,
            partnerId: payload.partnerId,
            partnerName: payload.partnerName,
            at: payload.at,
          }),
        );
        setSelectedRoomId((currentRoomId) => currentRoomId ?? payload.roomId);
      });
    });

    nextSocket.on('proximity:disconnected', (payload: ProximityPayload) => {
      startTransition(() => {
        setEventFeed((previousFeed) =>
          appendFeedEvent(previousFeed, {
            type: 'disconnected',
            roomId: payload.roomId,
            partnerId: payload.partnerId,
            partnerName: payload.partnerName,
            at: payload.at,
          }),
        );
      });
    });

    nextSocket.on('chat:message', (message: ChatMessage) => {
      startTransition(() => {
        setMessagesByRoom((previousState) => ({
          ...previousState,
          [message.roomId]: mergeMessages(previousState[message.roomId] ?? [], [message]),
        }));
      });
    });

    nextSocket.on('session:error', (payload) => {
      nextSocket.disconnect();
      setSocket(null);
      clearSessionState('idle', payload.message ?? 'Unable to enter the cosmos.');
    });

    nextSocket.on('connect_error', (connectionError) => {
      nextSocket.disconnect();
      setSocket(null);
      clearSessionState(
        'idle',
        connectionError.message || 'Unable to reach the server.',
      );
    });

    nextSocket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') {
        return;
      }

      setSocket(null);
      clearSessionState('idle', 'Connection lost. Rejoin the cosmos to continue.');
    });
  };

  const moveSelf = (position: Position) => {
    if (!socket || !selfIdRef.current) {
      return;
    }

    setOptimisticPosition(position);
    socket.emit('user:move', position);
  };

  const sendMessage = (text: string) => {
    if (!socket || !selectedRoomId) {
      return;
    }

    socket.emit('chat:send', {
      roomId: selectedRoomId,
      text,
    });
  };

  useEffect(
    () => () => {
      socket?.disconnect();
    },
    [socket],
  );

  const displayUsers = selfId
    ? users.map((user) =>
        user.userId === selfId && optimisticPosition
          ? {
              ...user,
              position: optimisticPosition,
            }
          : user,
      )
    : users;

  const self = displayUsers.find((user) => user.userId === selfId) ?? null;

  const activeConnections: NearbyConnection[] = self
    ? activeRooms
        .filter((room) => room.members.includes(self.userId))
        .map((room) => {
          const partnerId = room.members.find((member) => member !== self.userId) ?? '';
          const partner = displayUsers.find((user) => user.userId === partnerId);

          return {
            roomId: room.roomId,
            partnerId,
            partnerName: partner?.name ?? 'Explorer',
            partnerColor: partner?.color ?? '#F8FAFC',
          };
        })
    : [];

  useEffect(() => {
    if (activeConnections.length === 0) {
      setSelectedRoomId(null);
      return;
    }

    if (!selectedRoomId || !activeConnections.some((room) => room.roomId === selectedRoomId)) {
      setSelectedRoomId(activeConnections[0].roomId);
    }
  }, [activeConnections, selectedRoomId]);

  return {
    status,
    error,
    world,
    users: displayUsers,
    self,
    activeRooms,
    activeConnections,
    selectedRoomId,
    selectedMessages: selectedRoomId ? messagesByRoom[selectedRoomId] ?? [] : [],
    eventFeed,
    joinCosmos,
    leaveCosmos,
    moveSelf,
    sendMessage,
    setSelectedRoomId,
    initialName,
  };
};
