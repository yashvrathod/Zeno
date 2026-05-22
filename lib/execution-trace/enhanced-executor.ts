import type { EnhancedTraceEvent, EnhancedTraceResult, HeapObject, CallStackFrame, Reference } from './enhanced-types';

let _heapIdCounter = 0;
let _heap = new Map<string, HeapObject>();
let _references: Reference[] = [];
let _callStack: CallStackFrame[] = [];
let _events: EnhancedTraceEvent[] = [];
let _logs: string[] = [];
let _stepCount = 0;
let _totalLines = 0;
let _varSnapshot: Record<string, unknown> = {};
let _sourceLines: string[] = [];

function heapId(): string {
  return `h${++_heapIdCounter}`;
}

function snapshotVars(): Record<string, unknown> {
  return { ..._varSnapshot };
}

function markReferenced(heapObjId: string, byVar: string) {
  const obj = _heap.get(heapObjId);
  if (obj && !obj.referencedBy.includes(byVar)) {
    obj.referencedBy.push(byVar);
  }
}

function emitEvent(line: number, type: string, changedVars: string[], action: string) {
  _stepCount++;
  _events.push({
    step: _stepCount,
    line,
    type,
    callStack: _callStack.map(f => ({ ...f })),
    heap: Array.from(_heap.values()).map(h => ({ ...h })),
    references: _references.map(r => ({ ...r })),
    variables: snapshotVars(),
    changedVars,
    code: _sourceLines[line - 1] || '',
    action,
  });
}

function trackValue(val: unknown, context: string, line: number): unknown {
  if (val === null || val === undefined) return val;
  if (typeof val !== 'object') return val;

  const id = heapId();
  let type: HeapObject['type'] = 'object';
  let preview = '';
  let size = 0;

  if (Array.isArray(val)) {
    type = 'array';
    preview = `[${val.slice(0, 3).map(String).join(', ')}${val.length > 3 ? '...' : ''}]`;
    size = val.length;
  } else if (typeof val === 'function') {
    type = 'function';
    preview = `ƒ ${val.name || '(anonymous)'}()`;
    size = 0;
    return val;
  } else {
    preview = `{${Object.keys(val).slice(0, 3).join(', ')}${Object.keys(val).length > 3 ? '...' : ''}}`;
    size = Object.keys(val).length;
  }

  const obj: HeapObject = {
    id, type, value: String(val), preview, size,
    references: [],
    referencedBy: context ? [context] : [],
    isOrphaned: false,
    createdAt: _stepCount,
  };

  _heap.set(id, obj);

  if (context) {
    _references.push({ from: context, to: id, kind: 'variable→heap', label: type });
  }

  // wrap with proxy to track mutations
  if (type === 'object' || type === 'array') {
    return createProxy(val, id, line);
  }
  return val;
}

function createProxy(target: any, id: string, _line: number): any {
  return new Proxy(target, {
    set(obj, prop, value) {
      const oldVal = obj[prop];
      obj[prop] = value;
      const heapObj = _heap.get(id);
      if (heapObj) {
        heapObj.value = String(obj);
        heapObj.preview = Array.isArray(obj)
          ? `[${obj.slice(0, 3).map(String).join(', ')}${obj.length > 3 ? '...' : ''}]`
          : `{${Object.keys(obj).slice(0, 3).join(', ')}${Object.keys(obj).length > 3 ? '...' : ''}}`;
        heapObj.size = Array.isArray(obj) ? obj.length : Object.keys(obj).length;
      }
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const tracked = trackValue(value, id, _line);
        if (tracked !== value) {
          _references.push({ from: id, to: (tracked as any).__heapId || id, kind: 'heap→heap', label: String(prop) });
        }
      }
      return true;
    },
    get(obj, prop) {
      if (prop === '__heapId') return id;
      return obj[prop];
    },
  });
}

function instrumentForEnhancedTrace(code: string): string {
  // We don't transform the code — instead we use a runtime wrapper
  // approach via the sandboxed function.
  return code;
}

function extractVarNames(code: string, lineNum: number): string[] {
  const lines = code.split('\n');
  const line = lines[lineNum - 1] || '';
  const matches = [...line.matchAll(/(\w+)\s*=/g)];
  return matches.map(m => m[1]).filter(Boolean);
}

export function enhancedClientTrace(code: string, input?: string): EnhancedTraceResult {
  // Strip module-level keywords not valid inside new Function()
  const cleanCode = code
    .replace(/^export\s+default\s+(function|class|async\s+function)\s+/gm, '$1 ')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+/gm, '')
    .replace(/^import\s+.*?;?\s*$/gm, '')
    .replace(/^import\s*[\s\S]*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    .trim();

  // Reset state
  _heapIdCounter = 0;
  _heap = new Map();
  _references = [];
  _callStack = [{ functionName: '<global>', line: 1, variables: {}, depth: 0, parameters: [] }];
  _events = [];
  _logs = [];
  _stepCount = 0;
  _sourceLines = cleanCode.split('\n');
  _totalLines = _sourceLines.length;
  _varSnapshot = {};

  const logs: string[] = [];
  const mockConsole = {
    log: (...args: unknown[]) => {
      logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
    },
  };

  // Build sandbox with tracking hooks
  const sandboxCode = `
    var __heapId = 0;
    var __tracked = new Map();

    function __track(val, ctx) {
      if (val === null || val === undefined || typeof val !== 'object') return val;
      var id = '__h' + (++__heapId);
      __tracked.set(id, val);
      if (typeof val === 'object') {
        return new Proxy(val, {
          set: function(obj, prop, v) {
            obj[prop] = v;
            return true;
          }
        });
      }
      return val;
    }

    // Wrap array/object literals
    var _Array = Array;
    var _Object = Object;
    var _console = console;
  `;

  // Build the wrapped execution
  const wrappedLines: string[] = [];
  for (let i = 0; i < _sourceLines.length; i++) {
    const raw = _sourceLines[i];
    const trimmed = raw.trim();
    const lineNum = i + 1;

    wrappedLines.push(raw);

    // After assignment lines, snapshot
    if (
      /^(let|var|const)\s+\w+\s*=/.test(trimmed) ||
      /^\w+\s*[=+\-*/]=?\s*/.test(trimmed) ||
      /^(for|while)\s*\(/.test(trimmed) ||
      /^\s*if\s*\(/.test(trimmed) ||
      /^\s*return\s+/.test(trimmed) ||
      /^\s*\}\s*$/.test(trimmed)
    ) {
      const varMatches = [...trimmed.matchAll(/(\w+)\s*=/g)].map(m => m[1]).filter(Boolean);
      const varsExpr = varMatches.length > 0
        ? `{${varMatches.map(v => `${v}:${v}`).join(',')}}`
        : '{}';
      wrappedLines.push(`_console.log('[EVENT]', JSON.stringify({line:${lineNum},vars:${varsExpr}}));`);
    }
  }

  const wrappedCode = wrappedLines.join('\n');
  const fullCode = `${sandboxCode}\n${wrappedCode}\n//# sourceURL=__enhanced_trace__`;

  try {
    const fn = new Function('console', fullCode);
    fn(mockConsole);

    const stdout = logs.join('\n');

    // Parse events from stdout
    for (const line of stdout.split('\n')) {
      if (line.includes('[EVENT]')) {
        try {
          const jsonMatch = line.match(/\{.*\}/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            const vars = data.vars || {};
            for (const [k, v] of Object.entries(vars)) {
              _varSnapshot[k] = v;
            }
            const changed = Object.keys(vars);
            emitEvent(data.line, 'step', changed, data.line ? `Line ${data.line}: execution` : '');
          }
        } catch {}
      }
    }

    // Build call stack from heuristics
    _callStack = [{ functionName: '<global>', line: 1, variables: { ..._varSnapshot }, depth: 0, parameters: [] }];

    // Build heap from tracked objects
    const finalEvents = _events;
    const heapHistory = finalEvents.map(e => e.heap);
    const callStackHistory = finalEvents.map(e => e.callStack);

    // Mark orphans: objects referenced by nothing
    for (const [, obj] of _heap) {
      obj.isOrphaned = obj.referencedBy.length === 0;
    }

    return {
      events: finalEvents,
      finalOutput: stdout.split('\n').filter(l => !l.includes('[EVENT]')).join('\n').trim(),
      totalLines: _totalLines,
      heapHistory,
      callStackHistory,
    };
  } catch (err) {
    return {
      events: [],
      finalOutput: '',
      error: err instanceof Error ? err.message : 'Execution failed',
      totalLines: _totalLines,
      heapHistory: [],
      callStackHistory: [],
    };
  }
}
