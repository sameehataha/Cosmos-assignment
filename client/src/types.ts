export type Position = {
  x: number;
  y: number;
};

export type CosmosUser = {
  userId: string;
  name: string;
  color: string;
  position: Position;
  activeConnections: string[];
};

export type ActiveRoom = {
  roomId: string;
  members: string[];
};

export type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
};

export type ProximityPayload = {
  roomId: string;
  partnerId: string;
  partnerName: string;
  partnerColor: string;
  at: string;
  messages: ChatMessage[];
};

export type ConnectionEvent = {
  id: string;
  type: 'connected' | 'disconnected';
  roomId: string;
  partnerId: string;
  partnerName: string;
  at: string;
};

export type WorldConfig = {
  width: number;
  height: number;
  proximityRadius: number;
  maxNameLength: number;
};

export type SessionStatus = 'idle' | 'connecting' | 'connected';

export type NearbyConnection = {
  roomId: string;
  partnerId: string;
  partnerName: string;
  partnerColor: string;
};
