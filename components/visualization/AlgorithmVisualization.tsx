"use client";

import React from "react";
import { StackVisualization } from "./StackVisualization";
import { QueueVisualization } from "./QueueVisualization";
import { TreeVisualization } from "./TreeVisualization";
import { GraphVisualization } from "./GraphVisualization";
import { DPTableVisualization } from "./DPTableVisualization";
import { RecursionTreeVisualization } from "./RecursionTreeVisualization";
import { HeapVisualization } from "./HeapVisualization";

export type AlgorithmVisualizationType =
  | "stack"
  | "queue"
  | "tree"
  | "graph"
  | "dp_table"
  | "recursion_tree"
  | "heap";

export interface AlgorithmVisualizationProps {
  type: AlgorithmVisualizationType;
  data: any;
  label?: string;
}

export function AlgorithmVisualization({ type, data, label }: AlgorithmVisualizationProps) {
  if (!data) return null;

  switch (type) {
    case "stack":
      return <StackVisualization elements={data.elements || data} label={label} />;
    case "queue":
      return <QueueVisualization elements={data.elements || data} label={label} />;
    case "tree":
      return <TreeVisualization root={data.root || data} label={label} />;
    case "graph":
      return (
        <GraphVisualization
          nodes={data.nodes || []}
          edges={data.edges || []}
          label={label}
        />
      );
    case "dp_table":
      return (
        <DPTableVisualization
          table={data.table || []}
          rows={data.rows || []}
          cols={data.cols || []}
          highlight={data.highlight}
          label={label}
        />
      );
    case "recursion_tree":
      return <RecursionTreeVisualization root={data.root || data} label={label} />;
    case "heap":
      return (
        <HeapVisualization
          elements={data.elements || data}
          heapType={data.heapType || "min"}
          label={label}
        />
      );
    default:
      return null;
  }
}
