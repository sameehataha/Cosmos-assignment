import { useEffect, useRef } from 'react';
import {
  Application,
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
} from 'pixi.js';

import { resolveMapCollision } from '../lib/mapCollision';
import type { ActiveRoom, CosmosUser, Position, WorldConfig } from '../types';

type CosmosCanvasProps = {
  users: CosmosUser[];
  activeRooms: ActiveRoom[];
  selfId: string | null;
  world: WorldConfig;
  onMove: (position: Position) => void;
};

type SceneState = {
  users: CosmosUser[];
  activeRooms: ActiveRoom[];
  selfId: string | null;
  world: WorldConfig;
};

const MOVE_SPEED = 230;
const EMIT_INTERVAL_MS = 40;
const WORLD_PADDING = 12;
const MAP_ASSET_PATH = '/cosmos-map.png';

const toPixiColor = (value: string) => Number.parseInt(value.replace('#', ''), 16);

const getViewport = (width: number, height: number, world: WorldConfig) => {
  const usableWidth = Math.max(width - WORLD_PADDING * 2, 120);
  const usableHeight = Math.max(height - WORLD_PADDING * 2, 120);
  const scale = Math.min(usableWidth / world.width, usableHeight / world.height);
  const renderWidth = world.width * scale;
  const renderHeight = world.height * scale;

  return {
    offsetX: (width - renderWidth) / 2,
    offsetY: (height - renderHeight) / 2,
    renderWidth,
    renderHeight,
    scale,
  };
};

const projectPoint = (
  position: Position,
  width: number,
  height: number,
  world: WorldConfig,
) => {
  const viewport = getViewport(width, height, world);

  return {
    x: viewport.offsetX + position.x * viewport.scale,
    y: viewport.offsetY + position.y * viewport.scale,
    scale: viewport.scale,
  };
};

const getMovementVector = (pressedKeys: Set<string>) => {
  let x = 0;
  let y = 0;

  if (pressedKeys.has('arrowleft') || pressedKeys.has('a')) {
    x -= 1;
  }

  if (pressedKeys.has('arrowright') || pressedKeys.has('d')) {
    x += 1;
  }

  if (pressedKeys.has('arrowup') || pressedKeys.has('w')) {
    y -= 1;
  }

  if (pressedKeys.has('arrowdown') || pressedKeys.has('s')) {
    y += 1;
  }

  return { x, y };
};

const drawScene = (
  app: Application,
  host: HTMLDivElement,
  scene: SceneState,
  backgroundTexture: Texture | null,
) => {
  const width = host.clientWidth;
  const height = host.clientHeight;
  const viewport = getViewport(width, height, scene.world);

  const staleChildren = app.stage.removeChildren();
  staleChildren.forEach((child) => child.destroy({ children: true }));

  const root = new Container();
  app.stage.addChild(root);

  const frame = new Graphics()
    .roundRect(0, 0, width, height, 32)
    .fill({ color: 0x04111f, alpha: 0.96 });
  root.addChild(frame);

  if (backgroundTexture) {
    const mapSprite = new Sprite(backgroundTexture);
    mapSprite.x = viewport.offsetX;
    mapSprite.y = viewport.offsetY;
    mapSprite.width = viewport.renderWidth;
    mapSprite.height = viewport.renderHeight;
    root.addChild(mapSprite);
  }

  const mapFrame = new Graphics()
    .roundRect(
      viewport.offsetX,
      viewport.offsetY,
      viewport.renderWidth,
      viewport.renderHeight,
      26,
    )
    .stroke({ color: 0x6b7280, alpha: 0.18, width: 1.5 });
  root.addChild(mapFrame);

  scene.activeRooms.forEach((room) => {
    const [firstId, secondId] = room.members;
    const firstUser = scene.users.find((user) => user.userId === firstId);
    const secondUser = scene.users.find((user) => user.userId === secondId);

    if (!firstUser || !secondUser) {
      return;
    }

    const from = projectPoint(firstUser.position, width, height, scene.world);
    const to = projectPoint(secondUser.position, width, height, scene.world);
    const beam = new Graphics()
      .moveTo(from.x, from.y)
      .lineTo(to.x, to.y)
      .stroke({ color: 0x22d3ee, alpha: 0.28, width: 2.2 });

    root.addChild(beam);
  });

  scene.users.forEach((user) => {
    const point = projectPoint(user.position, width, height, scene.world);
    const isSelf = user.userId === scene.selfId;
    const color = toPixiColor(user.color);
    const ringAlpha = user.activeConnections.length > 0 ? 0.26 : isSelf ? 0.18 : 0.08;
    const avatarRadius = Math.max(10, 12 + point.scale * 4);

    const proximityRing = new Graphics()
      .circle(point.x, point.y, scene.world.proximityRadius * point.scale)
      .stroke({
        color,
        alpha: ringAlpha,
        width: isSelf ? 2.4 : 1.2,
      });
    root.addChild(proximityRing);

    const glow = new Graphics().circle(point.x, point.y, avatarRadius * 2.3).fill({
      color,
      alpha: user.activeConnections.length > 0 ? 0.18 : 0.08,
    });
    root.addChild(glow);

    const avatar = new Graphics().circle(point.x, point.y, avatarRadius).fill({ color });
    root.addChild(avatar);

    if (isSelf) {
      const selfRing = new Graphics()
        .circle(point.x, point.y, avatarRadius + 5)
        .stroke({ color: 0xf8fafc, alpha: 0.72, width: 2 });
      root.addChild(selfRing);
    }

    const label = new Text({
      text: user.name,
      style: {
        fill: isSelf ? '#F8FAFC' : '#D6E2F0',
        fontFamily: 'Space Grotesk',
        fontSize: 14,
        fontWeight: '600',
      },
    });
    label.anchor.set(0.5, 0);
    label.x = point.x;
    label.y = point.y + avatarRadius + 10;
    root.addChild(label);
  });
};

export const CosmosCanvas = ({
  users,
  activeRooms,
  selfId,
  world,
  onMove,
}: CosmosCanvasProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const backgroundTextureRef = useRef<Texture | null>(null);
  const pressedKeysRef = useRef(new Set<string>());
  const lastEmitRef = useRef(0);
  const sceneRef = useRef<SceneState>({
    users,
    activeRooms,
    selfId,
    world,
  });

  useEffect(() => {
    sceneRef.current = {
      users,
      activeRooms,
      selfId,
      world,
    };

    if (appRef.current && hostRef.current) {
      drawScene(
        appRef.current,
        hostRef.current,
        sceneRef.current,
        backgroundTextureRef.current,
      );
    }
  }, [users, activeRooms, selfId, world]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      if (!['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd'].includes(key)) {
        return;
      }

      event.preventDefault();
      pressedKeysRef.current.add(key);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeysRef.current.delete(event.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    let animationFrameId = 0;
    let previousTime = performance.now();

    const tick = (time: number) => {
      const delta = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;

      const movement = getMovementVector(pressedKeysRef.current);
      const { users: currentUsers, selfId: currentSelfId } = sceneRef.current;
      const selfUser = currentUsers.find((user) => user.userId === currentSelfId);

      if (
        selfUser &&
        (movement.x !== 0 || movement.y !== 0) &&
        time - lastEmitRef.current > EMIT_INTERVAL_MS
      ) {
        const magnitude = Math.hypot(movement.x, movement.y) || 1;
        const nextPosition = resolveMapCollision(
          selfUser.position,
          {
            x: selfUser.position.x + (movement.x / magnitude) * MOVE_SPEED * delta,
            y: selfUser.position.y + (movement.y / magnitude) * MOVE_SPEED * delta,
          },
        );

        lastEmitRef.current = time;
        onMove(nextPosition);
      }

      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [onMove]);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const mountCanvas = async () => {
      const host = hostRef.current;

      if (!host) {
        return;
      }

      const app = new Application();
      await app.init({
        antialias: true,
        backgroundAlpha: 0,
        resizeTo: host,
        resolution: window.devicePixelRatio || 1,
      });
      backgroundTextureRef.current = await Assets.load(MAP_ASSET_PATH);

      if (cancelled) {
        app.destroy(true);
        return;
      }

      host.innerHTML = '';
      host.appendChild(app.canvas);
      appRef.current = app;
      drawScene(app, host, sceneRef.current, backgroundTextureRef.current);

      resizeObserver = new ResizeObserver(() => {
        if (!appRef.current || !hostRef.current) {
          return;
        }

        drawScene(
          appRef.current,
          hostRef.current,
          sceneRef.current,
          backgroundTextureRef.current,
        );
      });

      resizeObserver.observe(host);
    };

    void mountCanvas();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      appRef.current?.destroy(true);
      appRef.current = null;
      backgroundTextureRef.current = null;
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-black/20 shadow-panel">
      <div ref={hostRef} className="h-[420px] w-full md:h-[620px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
        <div className="rounded-full border border-white/10 bg-slate-950/[0.55] px-4 py-2 text-[11px] uppercase tracking-[0.35em] text-slate-200/[0.85] backdrop-blur">
          Pixi-rendered cosmos
        </div>
        <div className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-cyan-100/90 backdrop-blur">
          Radius-triggered chat links
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.3em] text-slate-200/70">
        <span className="rounded-full border border-white/10 bg-slate-950/[0.55] px-3 py-2 backdrop-blur">
          Move with WASD or arrow keys
        </span>
        <span className="rounded-full border border-white/10 bg-slate-950/[0.55] px-3 py-2 backdrop-blur">
          World {world.width} x {world.height}
        </span>
        <span className="rounded-full border border-white/10 bg-slate-950/[0.55] px-3 py-2 backdrop-blur">
          Proximity {world.proximityRadius}px
        </span>
      </div>
    </div>
  );
};
