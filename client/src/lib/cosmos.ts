import type { ChatMessage, Position, WorldConfig } from '../types';

const guestPrefixes = ['Solar', 'Nova', 'Echo', 'Atlas', 'Orbit', 'Comet', 'Luma'];
const guestSuffixes = ['Walker', 'Drifter', 'Pilot', 'Dreamer', 'Seeker', 'Signal', 'Rider'];

export const clampPosition = (position: Position, world: WorldConfig): Position => ({
  x: Math.min(Math.max(position.x, 0), world.width),
  y: Math.min(Math.max(position.y, 0), world.height),
});

export const getRandomGuestName = () => {
  const first = guestPrefixes[Math.floor(Math.random() * guestPrefixes.length)];
  const second = guestSuffixes[Math.floor(Math.random() * guestSuffixes.length)];
  return `${first} ${second}`;
};

export const formatClock = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

export const mergeMessages = (
  currentMessages: ChatMessage[],
  incomingMessages: ChatMessage[],
) => {
  const deduped = new Map<string, ChatMessage>();

  [...currentMessages, ...incomingMessages].forEach((message) => {
    deduped.set(message.id, message);
  });

  return [...deduped.values()].sort((first, second) =>
    first.createdAt.localeCompare(second.createdAt),
  );
};
