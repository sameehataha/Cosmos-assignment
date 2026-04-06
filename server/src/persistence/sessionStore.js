import mongoose from 'mongoose';

let mongoReady = false;

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    socketId: {
      type: String,
      default: null,
    },
    position: {
      x: {
        type: Number,
        required: true,
      },
      y: {
        type: Number,
        required: true,
      },
    },
    activeConnections: {
      type: [String],
      default: [],
    },
    connected: {
      type: Boolean,
      default: true,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

const LiveSession =
  mongoose.models.LiveSession ?? mongoose.model('LiveSession', sessionSchema);

export const connectToMongo = async (mongoUri) => {
  if (!mongoUri) {
    console.log('MongoDB URI not provided. Running with in-memory live state only.');
    return false;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    mongoReady = true;
    console.log('MongoDB connected.');
    return true;
  } catch (error) {
    console.warn(`MongoDB unavailable: ${error.message}`);
    mongoReady = false;
    return false;
  }
};

export const isMongoEnabled = () => mongoReady;

export const syncSession = async (user) => {
  if (!mongoReady) {
    return;
  }

  try {
    await LiveSession.findOneAndUpdate(
      { userId: user.userId },
      {
        userId: user.userId,
        name: user.name,
        color: user.color,
        socketId: user.socketId,
        position: user.position,
        activeConnections: user.activeConnections,
        connected: true,
        lastSeenAt: new Date(),
      },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
      },
    );
  } catch (error) {
    console.warn(`Session sync failed for ${user.userId}: ${error.message}`);
  }
};

export const markSessionDisconnected = async (user) => {
  if (!mongoReady) {
    return;
  }

  try {
    await LiveSession.findOneAndUpdate(
      { userId: user.userId },
      {
        socketId: null,
        activeConnections: [],
        connected: false,
        lastSeenAt: new Date(),
      },
      { returnDocument: 'after' },
    );
  } catch (error) {
    console.warn(`Disconnect sync failed for ${user.userId}: ${error.message}`);
  }
};
