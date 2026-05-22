export function parseArrayRepresentation(representation: string): (string | number | null)[] {
  const match = representation.match(/\[(.*?)\]/);
  if (!match) return [];

  return match[1]
    .split(',')
    .map(s => s.trim())
    .filter(s => s)
    .map(s => {
      const num = parseFloat(s);
      return isNaN(num) ? s : num;
    });
}

export function extractRangeFromDescription(description: string): [number, number] | null {
  const rangeMatch = description.match(/\[(\d+),\s*(\d+)\]/);
  if (rangeMatch) {
    return [parseInt(rangeMatch[1]), parseInt(rangeMatch[2])];
  }
  return null;
}

export function getColorForVariable(name: string): string {
  const colors: Record<string, string> = {
    left: '#3B82F6',
    right: '#EF4444',
    mid: '#10B981',
    i: '#F59E0B',
    j: '#8B5CF6',
    start: '#3B82F6',
    end: '#EF4444',
    low: '#3B82F6',
    high: '#EF4444',
    slow: '#3B82F6',
    fast: '#EF4444',
  };
  return colors[name] || '#6B7280';
}
