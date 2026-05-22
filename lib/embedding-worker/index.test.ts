describe('embedding-worker', () => {
  it('exports expected API', async () => {
    const mod = await import('./index');
    expect(mod.getEmbedding).toBeDefined();
    expect(typeof mod.getEmbedding).toBe('function');
    expect(mod.terminateWorker).toBeDefined();
    expect(typeof mod.terminateWorker).toBe('function');
  });
});
