/**
 * Field-name normalization for tree, graph, matrix, and pair structures.
 *
 * Why this lives in its own file: shapeAnalyzer should answer
 * "given normalized data, what shape is this?", not "what are all the
 * ways people might represent a tree?". Future field-name additions
 * (nodeValue, payload, key, etc.) land here, not in the analyzer.
 */

import { MAX_TREE_NODES } from "./constants";

type TreeNodeShape = { val: unknown; left: unknown; right: unknown };

function readRecordKey(o: object, ...keys: string[]): unknown {
  const obj = o as Record<string, unknown>;
  for (const k of keys) {
    if (k in obj) return obj[k];
  }
  return undefined;
}

function hasTreeShape(o: unknown): boolean {
  if (typeof o !== "object" || o === null) return false;
  const obj = o as Record<string, unknown>;
  return (
    "val" in obj || "value" in obj || "data" in obj
  );
}

/**
 * Detects a tree root. Accepts any of {val|value|data, left, right}.
 * Returns a normalized structure or null if no recognizable value field.
 *
 * The returned object always has `val`, `left`, `right` keys, possibly
 * null for missing children. Use `countTreeNodes` to walk the structure.
 */
export function getTreeNode(o: unknown): TreeNodeShape | null {
  if (typeof o !== "object" || o === null) return null;
  const obj = o as Record<string, unknown>;
  const val = readRecordKey(obj, "val", "value", "data");
  if (val === undefined) return null;
  return {
    val,
    left: "left" in obj ? obj.left : null,
    right: "right" in obj ? obj.right : null,
  };
}

/**
 * Counts nodes in a tree, iteratively, with a defensive cap to prevent
 * runaway resource use on pathological inputs.
 *
 * Backlog: emit a "truncated" flag when the cap is hit so the renderer
 * can adjust its language. For now, returns the count at the cap.
 */
export function countTreeNodes(root: TreeNodeShape | null): number {
  if (!root) return 0;
  let count = 0;
  const stack: unknown[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!hasTreeShape(node)) continue;
    count++;
    if (count >= MAX_TREE_NODES) return count;
    const obj = node as Record<string, unknown>;
    if (hasTreeShape(obj.left)) stack.push(obj.left);
    if (hasTreeShape(obj.right)) stack.push(obj.right);
  }
  return count;
}

/**
 * Detects a graph descriptor. Accepts any of {nodes|vertices, edges}.
 * Returns normalized counts or null.
 */
export function getGraph(o: unknown): { nodes: number; edges: number } | null {
  if (typeof o !== "object" || o === null) return null;
  const obj = o as Record<string, unknown>;
  const nodesField = readRecordKey(obj, "nodes", "vertices");
  if (typeof nodesField !== "number" || !Number.isFinite(nodesField)) return null;
  if (typeof obj.edges !== "number" || !Number.isFinite(obj.edges)) return null;
  return { nodes: nodesField, edges: obj.edges };
}

/**
 * Type guard for a 2D array where every row has the same column count.
 * Treats the first row's length as authoritative.
 */
export function isMatrix(parsed: unknown): parsed is unknown[][] {
  if (!Array.isArray(parsed) || parsed.length === 0) return false;
  const first = parsed[0];
  if (!Array.isArray(first) || first.length === 0) return false;
  const cols = first.length;
  return parsed.every((row) => Array.isArray(row) && row.length === cols);
}

/**
 * Detects an array of 2-element arrays (pairs).
 */
export function isListOfPairs(parsed: unknown): boolean {
  if (!Array.isArray(parsed) || parsed.length === 0) return false;
  return parsed.every(
    (item) => Array.isArray(item) && item.length === 2
  );
}
