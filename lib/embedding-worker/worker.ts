import { parentPort } from 'worker_threads';

let pipeline: any = null;
let pipelineLoadPromise: Promise<any> | null = null;

async function getPipeline(): Promise<any> {
  if (pipeline) return pipeline;
  if (pipelineLoadPromise) return pipelineLoadPromise;

  pipelineLoadPromise = (async () => {
    const { pipeline: loadPipeline } = await import('@xenova/transformers').catch((e) => {
      throw new Error(`@xenova/transformers not available: ${e.message}`);
    });

    const modelName = process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';
    pipeline = await loadPipeline('feature-extraction', modelName);
    return pipeline;
  })();

  return pipelineLoadPromise;
}

if (!parentPort) {
  throw new Error('embedding-worker must be run as a worker thread');
}

parentPort.on('message', async (msg: { id: number; text: string }) => {
  try {
    const pipe = await getPipeline();
    const result = await pipe(msg.text, { pooling: 'mean', normalize: true });

    let tensor: Float32Array;
    if (result && typeof result === 'object' && 'embeddings' in result) {
      tensor = (result as any).embeddings as Float32Array;
    } else if (result && typeof result === 'object' && 'last_hidden_state' in result) {
      tensor = (result as any).last_hidden_state.data;
    } else if (result && typeof result === 'object') {
      tensor = (result as any).data;
    } else {
      throw new Error('Unexpected pipeline output');
    }

    const embedding = Array.from(tensor);
    parentPort!.postMessage({ id: msg.id, embedding, error: null });
  } catch (err) {
    parentPort!.postMessage({
      id: msg.id,
      embedding: null,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
