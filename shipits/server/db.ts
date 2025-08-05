import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

// *** DNS configuration to allow SRV resolution if default DNS fails ***
// You can adjust or remove if not needed
dns.setServers(['8.8.8.8', '8.8.4.4']);
// On Node 18+, ensure IPv4 results first (optional)
if (dns.setDefaultResultOrder) {
  (dns.setDefaultResultOrder as unknown as (order: string) => void)('ipv4first');
}

// Compute __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from parent directory (one level above this file)
dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

// Require MongoDB URI from environment
const MONGODB_URI = process.env.MONGODB_URI;
// Optional local fallback URI (used only if primary fails)
const LOCAL_MONGODB_URI =
  process.env.LOCAL_MONGODB_URI || 'mongodb://localhost:27017/shipits-forum';

if (!MONGODB_URI) {
  throw new Error('Environment variable MONGODB_URI must be set');
}

// Helper to mask credentials in logs
function maskUri(uri: string): string {
  try {
    const url = new URL(uri);
    if (url.username || url.password) {
      url.username = '***';
      url.password = '***';
    }
    return url.toString();
  } catch {
    return uri;
  }
}

console.log(
  '🔍 Connecting to MongoDB:',
  MONGODB_URI.includes('.mongodb.net') ? 'Atlas' : 'Primary',
  '\nURI:',
  maskUri(MONGODB_URI)
);

class Database {
  private static instance: Database;
  private connectPromise?: Promise<void>;

  private constructor() {
    // Handle process termination
    process.on('SIGINT', () => this.disconnect().then(() => process.exit(0)));
    process.on('SIGTERM', () => this.disconnect().then(() => process.exit(0)));

    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    mongoose.connection.on('disconnected', () => {
      console.log('📡 MongoDB disconnected');
    });
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected');
    });
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async connect(): Promise<void> {
    if (mongoose.connection.readyState === 1) {
      return;
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = mongoose
      .connect(MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      })
      .then(() => {
        console.log('✅ Connected to primary MongoDB');
      })
      .catch(async (primaryError) => {
        console.error('❌ Primary MongoDB connection failed:', primaryError.message);
        console.log('🔄 Falling back to local MongoDB...');
        await mongoose.connect(LOCAL_MONGODB_URI, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 30000,
        });
        console.log('✅ Connected to fallback Local MongoDB');
      })
      .finally(() => {
        this.connectPromise = undefined;
      });

    return this.connectPromise;
  }

  async disconnect(): Promise<void> {
    if (mongoose.connection.readyState === 0) {
      return;
    }
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }

  isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  getConnection() {
    return mongoose.connection;
  }
}

export const db = Database.getInstance();
export { mongoose };
