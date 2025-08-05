import mongoose from 'mongoose';

// Primary MongoDB URI from environment, fallback to local
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipits-forum';
const LOCAL_MONGODB_URI = 'mongodb://localhost:27017/shipits-forum';

console.log('🔍 Attempting to connect to:', MONGODB_URI.includes('mongodb.net') ? 'MongoDB Atlas' : 'Local MongoDB');

console.log('🔍 Using MongoDB URI:', MONGODB_URI.replace(/\/\/[^@]+@/, '//***:***@')); // Masks credentials

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI must be set in environment variables');
}

class Database {
  private static instance: Database;
  private isConnected = false;

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    // Try Atlas first, then fallback to local MongoDB
    if (MONGODB_URI.includes('mongodb.net')) {
      try {
        console.log('🔄 Attempting MongoDB Atlas connection...');
        await mongoose.connect(MONGODB_URI, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        });
        this.isConnected = true;
        console.log('✅ Connected to MongoDB Atlas successfully');
        
        this.setupConnectionHandlers();
        return;
        
      } catch (error) {
        console.error('❌ Failed to connect to MongoDB Atlas:', error.message);
        console.log('🔄 Falling back to local MongoDB...');
        
        try {
          await mongoose.connect(LOCAL_MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
          });
          this.isConnected = true;
          console.log('✅ Connected to Local MongoDB successfully (fallback)');
          
          this.setupConnectionHandlers();
          return;
          
        } catch (localError) {
          console.error('❌ Failed to connect to Local MongoDB:', localError.message);
          throw new Error('Both Atlas and Local MongoDB connections failed');
        }
      }
    } else {
      // Direct local connection
      try {
        await mongoose.connect(MONGODB_URI, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        });
        this.isConnected = true;
        console.log('✅ Connected to MongoDB successfully');
        
        this.setupConnectionHandlers();
        
      } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        throw error;
      }
    }
  }

  private setupConnectionHandlers(): void {
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('📡 MongoDB disconnected');
      this.isConnected = false;
    });
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('📡 Disconnected from MongoDB');
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  getConnection() {
    return mongoose.connection;
  }

  isDbConnected(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

export const db = Database.getInstance();
export { mongoose };