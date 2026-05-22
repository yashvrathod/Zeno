import { Worker } from 'worker_threads';
import path from 'path';

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, { resolve: (val: number[]) => void; reject: (err: Error) => void }>();

function getWorkerPath(): string {
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  return isDev
    ? path.join(__dirname, 'worker.ts')
    : path.join(__dirname, 'worker.js');
}

function getWorker(): Worker {
  if (worker) return worker;

  const workerPath = getWorkerPath();

  worker = new Worker(workerPath, {
    execArgv: process.env.NODE_ENV === 'development' || !process.env.NODE_ENV
      ? ['--import', 'tsx']
      : [],
  });

  worker.on('message', (msg: { id: number; embedding: number[] | null; error: string | null }) => {
    const call = pending.get(msg.id);
    if (!call) return;
    pending.delete(msg.id);

    if (msg.error) {
      call.reject(new Error(msg.error));
    } else {
      call.resolve(msg.embedding!);
    }
  });

  worker.on('error', (err) => {
    console.error('[embed-worker] Worker error:', err);
    for (const [, call] of pending) call.reject(new Error('Worker crashed'));
    pending.clear();
    worker = null;
  });

  worker.on('exit', (code) => {
    if (code !== 0) console.warn(`[embed-worker] Exited with code ${code}`);
    for (const [, call] of pending) call.reject(new Error('Worker exited'));
    pending.clear();
    worker = null;
  });

  return worker;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ').slice(0, 512);
  const w = getWorker();
  const id = nextId++;

  return new Promise<number[]>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, text: normalized });
  });
}

export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  pending.clear();
}
