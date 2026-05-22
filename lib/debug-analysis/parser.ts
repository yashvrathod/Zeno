import type { ParsedCode, FunctionInfo, LoopInfo, VariableInfo } from './types';

let tsParser: any = null;
let linter: any = null;
let acorn: any = null;

function loadDeps() {
  if (!tsParser) {
    try { tsParser = require('@typescript-eslint/parser'); } catch { tsParser = null; }
  }
  if (!linter) {
    try {
      const { Linter } = require('eslint');
      linter = new Linter();
      if (tsParser) linter.defineParser('@typescript-eslint/parser', tsParser);
    } catch { linter = null; }
  }
  if (!acorn) {
    try { acorn = require('acorn'); } catch { acorn = null; }
  }
}

export function getLinter(): any | null { loadDeps(); return linter; }

function parseWithTSESTree(code: string): any | null {
  if (!tsParser) return null;
  try {
    return tsParser.parse(code, {
      loc: true, range: true, tokens: true, ecmaVersion: 'latest', sourceType: 'module',
    });
  } catch { return null; }
}

function parseWithAcorn(code: string): any | null {
  if (!acorn) return null;
  try {
    return acorn.parse(code, {
      ecmaVersion: 'latest', sourceType: 'module', locations: true, ranges: true,
    });
  } catch { return null; }
}

export function getAST(code: string, language: string): any {
  loadDeps();
  if (language === 'typescript' || language === 'javascript') {
    const ast = parseWithTSESTree(code);
    if (ast) return ast;
  }
  return parseWithAcorn(code);
}

export function extractFunctionsFromAST(body: any[]): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  function walk(nodes: any[], parentDepth: number) {
    if (!nodes) return;
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      const depth = parentDepth;
      if (node.type === 'FunctionDeclaration' && node.id) {
        functions.push({ name: node.id.name, line: node.loc?.start?.line || 0, lines: (node.loc?.end?.line || 0) - (node.loc?.start?.line || 0), nestingDepth: depth });
      }
      if ((node.type === 'VariableDeclarator' && node.init?.type === 'ArrowFunctionExpression') ||
          (node.type === 'VariableDeclarator' && node.init?.type === 'FunctionExpression')) {
        if (node.id) {
          functions.push({ name: node.id.name || 'anonymous', line: node.loc?.start?.line || 0, lines: (node.loc?.end?.line || 0) - (node.loc?.start?.line || 0), nestingDepth: depth });
        }
      }
      if (node.body && typeof node.body === 'object') {
        walk(Array.isArray(node.body) ? node.body : node.body.body ? node.body.body : [node.body], depth);
      }
      if (node.consequent) walk(Array.isArray(node.consequent) ? node.consequent : [node.consequent], depth + 1);
      if (node.alternate) walk(Array.isArray(node.alternate) ? node.alternate : [node.alternate], depth + 1);
      if (node.handler?.body) walk(node.handler.body.body || [node.handler.body], depth + 1);
    }
  }
  walk(body, 0);
  return functions;
}

export function extractLoopsFromAST(body: any[]): LoopInfo[] {
  const loops: LoopInfo[] = [];
  let currentFunc = '';
  function walk(nodes: any[]) {
    if (!nodes) return;
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      if (node.type === 'FunctionDeclaration' && node.id) currentFunc = node.id.name;
      if (node.type === 'ForStatement') {
        const testStr = node.test ? codeSlice(node.test) : '';
        loops.push({ line: node.loc?.start?.line || 0, function: currentFunc || undefined, type: 'for', condition: testStr });
      }
      if (node.type === 'WhileStatement') {
        const testStr = node.test ? codeSlice(node.test) : '';
        loops.push({ line: node.loc?.start?.line || 0, function: currentFunc || undefined, type: 'while', condition: testStr });
      }
      if (node.type === 'DoWhileStatement') {
        const testStr = node.test ? codeSlice(node.test) : '';
        loops.push({ line: node.loc?.start?.line || 0, function: currentFunc || undefined, type: 'while', condition: testStr });
      }
      if (node.body && typeof node.body === 'object') {
        walk(Array.isArray(node.body) ? node.body : node.body.body ? node.body.body : [node.body]);
      }
      if (node.consequent) walk(Array.isArray(node.consequent) ? node.consequent : [node.consequent]);
      if (node.alternate) walk(Array.isArray(node.alternate) ? node.alternate : [node.alternate]);
      if (node.handler?.body) walk(node.handler.body.body || [node.handler.body]);
    }
  }
  walk(body);
  return loops;
}

export function extractVariablesFromAST(body: any[]): VariableInfo[] {
  const variables: VariableInfo[] = [];
  function walk(nodes: any[]) {
    if (!nodes) return;
    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;
      if (node.type === 'VariableDeclaration') {
        for (const decl of node.declarations || []) {
          variables.push({
            name: decl.id?.name || '',
            line: decl.loc?.start?.line || 0,
            type: decl.id?.typeAnnotation ? codeSlice(decl.id.typeAnnotation) : undefined,
            initialized: !!decl.init,
          });
        }
      }
      if (node.body && typeof node.body === 'object') {
        walk(Array.isArray(node.body) ? node.body : node.body.body ? node.body.body : [node.body]);
      }
      if (node.consequent) walk(Array.isArray(node.consequent) ? node.consequent : [node.consequent]);
      if (node.alternate) walk(Array.isArray(node.alternate) ? node.alternate : [node.alternate]);
      if (node.handler?.body) walk(node.handler.body.body || [node.handler.body]);
    }
  }
  walk(body);
  return variables;
}

let _codeSliceSource = '';
export function codeSlice(node: any): string {
  if (!node || !node.range) return '';
  return _codeSliceSource.slice(node.range[0], node.range[1]);
}

export function parseCode(code: string, language: string): ParsedCode {
  _codeSliceSource = code;
  const ast = getAST(code, language);
  if (!ast) return { code, functions: [], loops: [], variables: [] };
  const body = ast.body || ast.program?.body || [];
  return {
    code,
    functions: extractFunctionsFromAST(body),
    loops: extractLoopsFromAST(body),
    variables: extractVariablesFromAST(body),
  };
}
