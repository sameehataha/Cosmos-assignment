import { useState, type FormEvent } from 'react';
import {
  Compass,
  MessageCircle,
  Orbit,
  RadioTower,
  SendHorizontal,
  Sparkles,
  Users,
} from 'lucide-react';

import { CosmosCanvas } from './components/CosmosCanvas';
import { formatClock } from './lib/cosmos';
import { useCosmosSession } from './hooks/useCosmosSession';

const statusClassNames = {
  idle: 'border-white/10 bg-white/[0.08] text-slate-100',
  connecting: 'border-cyan-300/25 bg-cyan-400/10 text-cyan-100',
  connected: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
};

const statCardClassName =
  'rounded-[28px] border border-white/10 bg-[rgba(7,25,46,0.72)] p-5 backdrop-blur';

function App() {
  const {
    status,
    error,
    world,
    users,
    self,
    activeRooms,
    activeConnections,
    selectedRoomId,
    selectedMessages,
    eventFeed,
    joinCosmos,
    leaveCosmos,
    moveSelf,
    sendMessage,
    setSelectedRoomId,
    initialName,
  } = useCosmosSession();
  const [name, setName] = useState(initialName);
  const [draftMessage, setDraftMessage] = useState('');

  const selectedConnection =
    activeConnections.find((connection) => connection.roomId === selectedRoomId) ??
    activeConnections[0] ??
    null;

  const handleJoin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    joinCosmos(name);
  };

  const handleSendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = draftMessage.trim();

    if (!trimmed) {
      return;
    }

    sendMessage(trimmed);
    setDraftMessage('');
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="grid gap-4 rounded-[32px] border border-white/10 bg-[rgba(5,16,31,0.72)] p-5 shadow-panel backdrop-blur xl:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.35em] text-slate-200/80">
              <Orbit className="h-4 w-4" />
              Virtual Cosmos
            </div>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                A 2D multiplayer world where conversation appears only when people are truly nearby.
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Move through a PixiJS-rendered cosmos, watch other explorers update in real
                time, and let Socket.IO create or remove chat rooms automatically as proximity
                changes.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-slate-300/70">
                <Users className="h-4 w-4" />
                Online
              </div>
              <div className="text-3xl font-semibold text-white">{users.length}</div>
              <p className="mt-2 text-sm text-slate-300/70">Open two tabs to test multiplayer.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-slate-300/70">
                <RadioTower className="h-4 w-4" />
                Active Links
              </div>
              <div className="text-3xl font-semibold text-white">{activeRooms.length}</div>
              <p className="mt-2 text-sm text-slate-300/70">
                Pair rooms are created and removed by server-side distance checks.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-slate-300/70">
                <Compass className="h-4 w-4" />
                Radius
              </div>
              <div className="text-3xl font-semibold text-white">{world.proximityRadius}</div>
              <p className="mt-2 text-sm text-slate-300/70">
                The chat unlocks when another user enters this zone.
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_380px]">
          <main className="space-y-6">
            <section className="grid gap-4 md:grid-cols-3">
              <div className={statCardClassName}>
                <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-slate-300/70">
                  <Sparkles className="h-4 w-4" />
                  Session
                </div>
                <div
                  className={`inline-flex rounded-full border px-3 py-2 text-xs uppercase tracking-[0.26em] ${statusClassNames[status]}`}
                >
                  {status}
                </div>
                <p className="mt-4 text-sm text-slate-300/80">
                  {self ? `Logged in as ${self.name}.` : 'Join the cosmos to begin moving.'}
                </p>
              </div>

              <div className={statCardClassName}>
                <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-slate-300/70">
                  <MessageCircle className="h-4 w-4" />
                  Chat Access
                </div>
                <div className="text-2xl font-semibold text-white">
                  {activeConnections.length > 0 ? 'Unlocked' : 'Standby'}
                </div>
                <p className="mt-4 text-sm text-slate-300/80">
                  {activeConnections.length > 0
                    ? `Connected to ${activeConnections.length} nearby explorer${activeConnections.length === 1 ? '' : 's'}.`
                    : 'Move closer to someone to activate the panel.'}
                </p>
              </div>

              <div className={statCardClassName}>
                <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-slate-300/70">
                  <Orbit className="h-4 w-4" />
                  Controls
                </div>
                <div className="text-2xl font-semibold text-white">WASD / Arrows</div>
                <p className="mt-4 text-sm text-slate-300/80">
                  Position updates are pushed to the server in real time.
                </p>
              </div>
            </section>

            <CosmosCanvas
              users={users}
              activeRooms={activeRooms}
              selfId={self?.userId ?? null}
              world={world}
              onMove={moveSelf}
            />

            <section className="grid gap-4 md:grid-cols-3">
              <div className={statCardClassName}>
                <div className="mb-3 text-[11px] uppercase tracking-[0.32em] text-slate-300/70">
                  How It Works
                </div>
                <p className="text-sm leading-7 text-slate-300/80">
                  The backend compares every pair of users using Euclidean distance. If they
                  cross the radius threshold, both sockets join a private chat room.
                </p>
              </div>
              <div className={statCardClassName}>
                <div className="mb-3 text-[11px] uppercase tracking-[0.32em] text-slate-300/70">
                  Disconnect Logic
                </div>
                <p className="text-sm leading-7 text-slate-300/80">
                  As soon as distance grows beyond the radius, the server removes both users
                  from that room and the UI hides the live chat controls.
                </p>
              </div>
              <div className={statCardClassName}>
                <div className="mb-3 text-[11px] uppercase tracking-[0.32em] text-slate-300/70">
                  Persistence
                </div>
                <p className="text-sm leading-7 text-slate-300/80">
                  MongoDB Atlas is connected for live session snapshots, so active user state is
                  being persisted through Mongoose in this setup.
                </p>
              </div>
            </section>
          </main>

          <aside className="space-y-6">
            <section className={statCardClassName}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.32em] text-slate-300/70">
                    Nearby Connections
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Live proximity links</h2>
                </div>
                <div className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs uppercase tracking-[0.24em] text-cyan-100">
                  {activeConnections.length}
                </div>
              </div>

              <div className="space-y-3">
                {activeConnections.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-white/12 bg-white/[0.03] p-4 text-sm leading-7 text-slate-300/75">
                    No one is close enough yet. Walk toward another avatar and the room will
                    appear automatically.
                  </div>
                ) : (
                  activeConnections.map((connection) => (
                    <button
                      key={connection.roomId}
                      type="button"
                      onClick={() => setSelectedRoomId(connection.roomId)}
                      className={`w-full rounded-[22px] border p-4 text-left transition ${
                        selectedRoomId === connection.roomId
                          ? 'border-cyan-300/35 bg-cyan-400/10'
                          : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: connection.partnerColor }}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-base font-semibold text-white">
                            {connection.partnerName}
                          </div>
                          <div className="text-xs uppercase tracking-[0.24em] text-slate-300/60">
                            Pair room active
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>

            {selectedConnection ? (
              <section className={`${statCardClassName} flex min-h-[420px] flex-col`}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.32em] text-slate-300/70">
                      Chat Panel
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-white">
                      Connected with {selectedConnection.partnerName}
                    </h2>
                  </div>
                  <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs uppercase tracking-[0.24em] text-emerald-100">
                    Live
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto rounded-[24px] border border-white/10 bg-black/[0.15] p-4">
                  {selectedMessages.length === 0 ? (
                    <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-slate-300/75">
                      Your room is open. Send the first message while you stay within range.
                    </div>
                  ) : (
                    selectedMessages.map((message) => {
                      const isOwnMessage = message.senderId === self?.userId;

                      return (
                        <div
                          key={message.id}
                          className={`max-w-[88%] rounded-[20px] px-4 py-3 ${
                            isOwnMessage
                              ? 'ml-auto bg-cyan-400/15 text-cyan-50'
                              : 'bg-white/[0.06] text-slate-100'
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.22em] text-slate-300/65">
                            <span>{isOwnMessage ? 'You' : message.senderName}</span>
                            <span>{formatClock(message.createdAt)}</span>
                          </div>
                          <p className="text-sm leading-7">{message.text}</p>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="mt-4 flex gap-3">
                  <input
                    value={draftMessage}
                    onChange={(event) => setDraftMessage(event.target.value)}
                    placeholder={`Message ${selectedConnection.partnerName}`}
                    className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-300/35 focus:bg-white/[0.06]"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/[0.12] px-5 py-3 text-sm font-medium text-cyan-50 transition hover:bg-cyan-400/[0.18]"
                  >
                    <SendHorizontal className="h-4 w-4" />
                    Send
                  </button>
                </form>
              </section>
            ) : (
              <section className={statCardClassName}>
                <p className="text-[11px] uppercase tracking-[0.32em] text-slate-300/70">
                  Chat Panel
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">Waiting for proximity</h2>
                <p className="mt-4 text-sm leading-7 text-slate-300/80">
                  The assignment requires chat to appear only when users are near each other, so
                  the live composer stays hidden until a pair room exists.
                </p>
              </section>
            )}

            <section className={statCardClassName}>
              <div className="mb-4">
                <p className="text-[11px] uppercase tracking-[0.32em] text-slate-300/70">Roster</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Everyone in the cosmos</h2>
              </div>

              <div className="space-y-3">
                {users.length === 0 ? (
                  <div className="text-sm text-slate-300/70">No explorers online yet.</div>
                ) : (
                  users
                    .slice()
                    .sort((first, second) => first.name.localeCompare(second.name))
                    .map((user) => (
                      <div
                        key={user.userId}
                        className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: user.color }}
                          />
                          <div>
                            <div className="font-medium text-white">
                              {user.name}
                              {user.userId === self?.userId ? ' (you)' : ''}
                            </div>
                            <div className="text-xs uppercase tracking-[0.22em] text-slate-300/55">
                              {user.activeConnections.length} active link
                              {user.activeConnections.length === 1 ? '' : 's'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </section>

            <section className={statCardClassName}>
              <div className="mb-4">
                <p className="text-[11px] uppercase tracking-[0.32em] text-slate-300/70">Activity</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Connection events</h2>
              </div>

              <div className="space-y-3">
                {eventFeed.length === 0 ? (
                  <div className="text-sm leading-7 text-slate-300/75">
                    Walk around to trigger connect and disconnect events.
                  </div>
                ) : (
                  eventFeed.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3"
                    >
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-300/60">
                        {formatClock(event.at)}
                      </div>
                      <div className="mt-2 text-sm text-slate-100">
                        {event.type === 'connected' ? 'Connected to ' : 'Disconnected from '}
                        <span className="font-semibold">{event.partnerName}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {(status === 'idle' || status === 'connecting') && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <form
            onSubmit={handleJoin}
            className="w-full max-w-xl rounded-[32px] border border-white/10 bg-[rgba(5,16,31,0.88)] p-6 shadow-panel sm:p-8"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.35em] text-slate-200/80">
              <Sparkles className="h-4 w-4" />
              Enter Cosmos
            </div>
            <h2 className="mt-5 text-3xl font-semibold text-white sm:text-4xl">
              Join the world and test proximity chat in real time.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300/80">
              Pick a display name, open another browser tab or window, and move the avatars close
              together to watch the chat panel appear automatically.
            </p>

            <label className="mt-6 block text-[11px] uppercase tracking-[0.3em] text-slate-300/70">
              Display Name
            </label>
            <input
              value={name}
              maxLength={world.maxNameLength}
              onChange={(event) => setName(event.target.value)}
              className="mt-3 w-full rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 text-base text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-300/35 focus:bg-white/[0.06]"
              placeholder="Nova Walker"
            />

            {error ? (
              <div className="mt-4 rounded-[20px] border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={status === 'connecting'}
                className="inline-flex items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-400/[0.12] px-5 py-3 text-sm font-medium text-cyan-50 transition hover:bg-cyan-400/[0.18] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === 'connecting' ? 'Syncing...' : 'Enter the cosmos'}
              </button>
              {users.length > 0 && (
                <button
                  type="button"
                  onClick={leaveCosmos}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-slate-100 transition hover:bg-white/[0.08]"
                >
                  Reset session
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
