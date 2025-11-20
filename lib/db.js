import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const file = join(__dirname, '../db.json');

const adapter = new JSONFile(file);
const defaultData = { videoQueue: [] };
const db = new Low(adapter, defaultData);

async function initDatabase() {
  await db.read();
  await db.write();
}

async function isUrlInQueue(url) {
  await db.read();
  return db.data.videoQueue.some(video => video.url === url);
}

async function addVideoToQueue(url) {
  await db.read();
  db.data.videoQueue.push({ url, addedAt: new Date().toISOString() });
  await db.write();
}

async function getNextVideo() {
  await db.read();
  return db.data.videoQueue.length > 0 ? db.data.videoQueue[0] : null;
}

async function removeVideoFromQueue() {
  await db.read();
  if (db.data.videoQueue.length > 0) {
    db.data.videoQueue.shift();
    await db.write();
  }
}

export { initDatabase, addVideoToQueue, getNextVideo, removeVideoFromQueue, isUrlInQueue };
