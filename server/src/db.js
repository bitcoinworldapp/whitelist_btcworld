import mongoose from 'mongoose';
import 'dotenv/config';

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ordinals_whitelist';

export async function connectDB() {
  await mongoose.connect(uri); // si tu URI NO trae dbName, añade “/mi_bd” al final del URI
  const c = mongoose.connection;
  console.log('[Mongo] connected', {
    host: c.host,
    port: c.port,
    db: c.name,
  });
}
