const palette = [
  '#F97316',
  '#22C55E',
  '#06B6D4',
  '#FACC15',
  '#FB7185',
  '#A78BFA',
  '#38BDF8',
  '#FB923C',
];

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const distanceBetween = (first, second) =>
  Math.hypot(first.x - second.x, first.y - second.y);

export const createPairRoomId = (firstUserId, secondUserId) => {
  const [first, second] = [firstUserId, secondUserId].sort();
  return `pair:${first}:${second}`;
};

export const sanitizeName = (value, maxLength, fallback) => {
  const trimmed = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

  if (!trimmed) {
    return fallback;
  }

  return trimmed.slice(0, maxLength);
};

export const createSpawnPosition = (index, width, height) => {
  const angle = index * 0.9;
  const radius = Math.min(260, 80 + index * 30);

  return {
    x: clamp(width / 2 + Math.cos(angle) * radius, 70, width - 70),
    y: clamp(height / 2 + Math.sin(angle) * radius, 70, height - 70),
  };
};

export const pickColor = (index) => palette[index % palette.length];
