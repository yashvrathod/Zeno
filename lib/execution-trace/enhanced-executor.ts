import type { EnhancedTraceEvent, EnhancedTraceResult, HeapObject, CallStackFrame, Reference } from './enhanced-types';

class TraceSession {
  heapIdCounter = 0;
  heap = new Map<string, HeapObject>();
  references: Reference[] = [];
  callStack: CallStackFrame[] = [];
  events: EnhancedTraceEvent[] = [];
  logs: string[] = [];
  stepCount = 0;
  totalLines = 0;
  varSnapshot: Record<string, unknown> = {};
  sourceLines: string[] = [];

  heapId(): string {
    return `h${++this.heapIdCounter}`;
  }

  snapshotVars(): Record<string, unknown> {
    return { ...this.varSnapshot };
  }

  markReferenced(heapObjId: string, byVar: string) {
    const obj = this.heap.get(heapObjId);
    if (obj && !obj.referencedBy.includes(byVar)) {
      obj.referencedBy.push(byVar);
    }
  }

  emitEvent(line: number, type: string, changedVars: string[], action: string) {
    this.stepCount++;
    this.events.push({
      step: this.stepCount,
      line,
      type,
      callStack: this.callStack.map(f => ({ ...f })),
      heap: Array.from(this.heap.values()).map(h => ({ ...h })),
      references: this.references.map(r => ({ ...r })),
      variables: this.snapshotVars(),
      changedVars,
      code: this.sourceLines[line - 1] || '',
      action,
    });
  }

  trackValue(val: unknown, context: string, line: number): unknown {
    if (val === null || val === undefined) return val;
    if (typeof val !== 'object') return val;

    const id = this.heapId();
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
      createdAt: this.stepCount,
    };

    this.heap.set(id, obj);

    if (context) {
      this.references.push({ from: context, to: id, kind: 'variable\u2192heap', label: type });
    }

    if (type === 'object' || type === 'array') {
      return this.createProxy(val, id, line);
    }
    return val;
  }

  createProxy(target: any, id: string, _line: number): any {
    const self = this;
    return new Proxy(target, {
      set(obj, prop, value) {
        const oldVal = obj[prop];
        obj[prop] = value;
        const heapObj = self.heap.get(id);
        if (heapObj) {
          heapObj.value = String(obj);
          heapObj.preview = Array.isArray(obj)
            ? `[${obj.slice(0, 3).map(String).join(', ')}${obj.length > 3 ? '...' : ''}]`
            : `{${Object.keys(obj).slice(0, 3).join(', ')}${Object.keys(obj).length > 3 ? '...' : ''}}`;
          heapObj.size = Array.isArray(obj) ? obj.length : Object.keys(obj).length;
        }
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const tracked = self.trackValue(value, id, _line);
          if (tracked !== value) {
            self.references.push({ from: id, to: (tracked as any).__heapId || id, kind: 'heap\u2192heap', label: String(prop) });
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
}

function extractVarNames(code: string, lineNum: number): string[] {
  const lines = code.split('\n');
  const line = lines[lineNum - 1] || '';
  const matches = [...line.matchAll(/(\w+)\s*=/g)];
  return matches.map(m => m[1]).filter(Boolean);
}

export function enhancedClientTrace(code: string, input?: string): EnhancedTraceResult {
  const session = new TraceSession();

  const cleanCode = code
    .replace(/^export\s+default\s+(function|class|async\s+function)\s+/gm, '$1 ')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+/gm, '')
    .replace(/^import\s+.*?;?\s*$/gm, '')
    .replace(/^import\s*[\s\S]*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    .trim();

  session.sourceLines = cleanCode.split('\n');
  session.totalLines = session.sourceLines.length;
  session.callStack = [{ functionName: '<global>', line: 1, variables: {}, depth: 0, parameters: [] }];

  const logs: string[] = [];
  const mockConsole = {
    log: (...args: unknown[]) => {
      logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
    },
  };

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

    var _Array = Array;
    var _Object = Object;
    var _console = console;
  `;

  const wrappedLines: string[] = [];
  for (let i = 0; i < session.sourceLines.length; i++) {
    const raw = session.sourceLines[i];
    const trimmed = raw.trim();
    const lineNum = i + 1;

    wrappedLines.push(raw);

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

  // Validate code — block dangerous globals
  const dangerous = ["process", "require", "import(", "globalThis", "fetch", "XMLHttpRequest", "WebSocket", "localStorage"];
  for (const pattern of dangerous) {
    if (fullCode.includes(pattern)) {
      return {
        events: [],
        finalOutput: '',
        error: `Execution blocked: use of \`${pattern}\` is not allowed in trace execution`,
        totalLines: session.totalLines,
        heapHistory: [],
        callStackHistory: [],
      };
    }
  }

  try {
    const fn = new Function('console', fullCode);
    fn(mockConsole);

    const stdout = logs.join('\n');

    for (const line of stdout.split('\n')) {
      if (line.includes('[EVENT]')) {
        try {
          const jsonMatch = line.match(/\{.*\}/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            const vars = data.vars || {};
            for (const [k, v] of Object.entries(vars)) {
              session.varSnapshot[k] = v;
            }
            const changed = Object.keys(vars);
            session.emitEvent(data.line, 'step', changed, data.line ? `Line ${data.line}: execution` : '');
          }
        } catch (e) {
          console.warn("Trace step parsing failed:", e);
        }
      }
    }

    session.callStack = [{ functionName: '<global>', line: 1, variables: { ...session.varSnapshot }, depth: 0, parameters: [] }];

    const finalEvents = session.events;
    const heapHistory = finalEvents.map(e => e.heap);
    const callStackHistory = finalEvents.map(e => e.callStack);

    for (const [, obj] of session.heap) {
      obj.isOrphaned = obj.referencedBy.length === 0;
    }

    return {
      events: finalEvents,
      finalOutput: stdout.split('\n').filter(l => !l.includes('[EVENT]')).join('\n').trim(),
      totalLines: session.totalLines,
      heapHistory,
      callStackHistory,
    };
  } catch (err) {
    return {
      events: [],
      finalOutput: '',
      error: err instanceof Error ? err.message : 'Execution failed',
      totalLines: session.totalLines,
      heapHistory: [],
      callStackHistory: [],
    };
  }
}
