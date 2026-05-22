import { parseArrayRepresentation, extractRangeFromDescription, getColorForVariable } from '../utils';

describe('parseArrayRepresentation', () => {
  it('parses standard array string', () => {
    expect(parseArrayRepresentation('[1, 2, 3]')).toEqual([1, 2, 3]);
  });

  it('parses mixed array with strings', () => {
    expect(parseArrayRepresentation('[a, b, c]')).toEqual(['a', 'b', 'c']);
  });

  it('returns empty for no match', () => {
    expect(parseArrayRepresentation('hello')).toEqual([]);
  });

  it('handles empty brackets', () => {
    expect(parseArrayRepresentation('[]')).toEqual([]);
  });
});

describe('extractRangeFromDescription', () => {
  it('extracts range from description', () => {
    expect(extractRangeFromDescription('range [0, 3]')).toEqual([0, 3]);
    expect(extractRangeFromDescription('window [1, 5]')).toEqual([1, 5]);
  });

  it('returns null when no range', () => {
    expect(extractRangeFromDescription('no range here')).toBeNull();
  });
});

describe('getColorForVariable', () => {
  it('returns expected colors for known variables', () => {
    expect(getColorForVariable('left')).toBe('#3B82F6');
    expect(getColorForVariable('right')).toBe('#EF4444');
    expect(getColorForVariable('mid')).toBe('#10B981');
    expect(getColorForVariable('i')).toBe('#F59E0B');
  });

  it('returns default gray for unknown', () => {
    expect(getColorForVariable('unknown')).toBe('#6B7280');
  });
});
