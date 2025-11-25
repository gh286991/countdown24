import { MongoClient, Db, Collection } from 'mongodb';
import { MONGODB_URI, DB_NAME } from '../config/index';

let client: MongoClient | null = null;
let database: Db | null = null;

export let Users: Collection | null = null;
export let Countdowns: Collection | null = null;
export let Assignments: Collection | null = null;
export let Tokens: Collection | null = null;
export let CountdownDays: Collection | null = null;

export async function connectDatabase(): Promise<void> {
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  database = client.db(DB_NAME);
  
  Users = database.collection('users');
  Countdowns = database.collection('countdowns');
  Assignments = database.collection('assignments');
  Tokens = database.collection('tokens');
  CountdownDays = database.collection('countdownDays');

  await Users.createIndex({ email: 1 }, { unique: true });
  await Users.createIndex({ id: 1 }, { unique: true });
  await Countdowns.createIndex({ id: 1 }, { unique: true });
  await Assignments.createIndex({ id: 1 }, { unique: true });
  await Assignments.createIndex({ countdownId: 1, receiverId: 1 }, { unique: true });
  await Tokens.createIndex({ token: 1 }, { unique: true });
  await CountdownDays.createIndex({ id: 1 }, { unique: true });
  await CountdownDays.createIndex({ countdownId: 1, day: 1 }, { unique: true });
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    database = null;
  }
}

