import { coalesce } from './request-coalesce';

describe('coalesce', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('returns true for first caller (executes fn)', async () => {
    const fn = jest.fn().mockResolvedValue('result');
    const result = await coalesce('key1', fn);
    expect(result).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('returns false for duplicate caller (deduped)', async () => {
    const fn = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('result'), 50)));
    const [r1, r2] = await Promise.all([coalesce('key2', fn), coalesce('key2', fn)]);
    expect(r1).toBe(true);
    expect(r2).toBe(false);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('handles different keys independently', async () => {
    const fn1 = jest.fn().mockResolvedValue('a');
    const fn2 = jest.fn().mockResolvedValue('b');
    const [r1, r2] = await Promise.all([coalesce('key3', fn1), coalesce('key4', fn2)]);
    expect(r1).toBe(true);
    expect(r2).toBe(true);
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('retries after TTL expiry', async () => {
    const fn = jest.fn().mockResolvedValue('result');
    await coalesce('key-ttl', fn);
    expect(fn).toHaveBeenCalledTimes(1);

    // Wait briefly and call again — key should be deleted after first completion
    await new Promise(r => setTimeout(r, 10));
    const r2 = await coalesce('key-ttl', fn);
    expect(r2).toBe(true);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('allows retry even without TTL expiry for different keys', async () => {
    const fn = jest.fn().mockResolvedValue('result');
    await coalesce('key-a', fn);
    await coalesce('key-b', fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
