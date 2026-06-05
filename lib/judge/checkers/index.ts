export type CheckerFn = (actual: unknown, expected: unknown) => boolean;

const registry = new Map<string, CheckerFn>();

export function registerChecker(slug: string, fn: CheckerFn): void {
  registry.set(slug, fn);
}

export function getChecker(slug: string): CheckerFn | undefined {
  return registry.get(slug);
}

export function hasChecker(slug: string): boolean {
  return registry.has(slug);
}

export function listCheckers(): readonly string[] {
  return Array.from(registry.keys());
}

export function clearCheckers(): void {
  registry.clear();
}
