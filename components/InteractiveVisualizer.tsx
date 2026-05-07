/**
 * Interactive Visualization Component
 *
 * Renders DSA algorithm visualizations with interactive controls
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';

export type VisualizationType =
  | 'array'
  | 'two_pointer'
  | 'sliding_window'
  | 'binary_search'
  | 'stack'
  | 'queue'
  | 'tree'
  | 'graph'
  | 'dp_table'
  | 'recursion_tree'
  | 'heap'
  | 'hash_map'
  | 'linked_list';

export interface VisualizationData {
  nodes?: Array<{
    id: string;
    label: string;
    value?: string | number;
    x?: number;
    y?: number;
    color?: string;
    size?: number;
    highlighted?: boolean;
  }>;
  edges?: Array<{
    from: string;
    to: string;
    label?: string;
    color?: string;
  }>;
  arrays?: Array<{
    values: (string | number | null)[];
    pointers?: Array<{ index: number; label: string; color: string }>;
    highlights?: Array<{ start: number; end: number; color: string }>;
  }>;
  pointers?: Array<{ index: number; label: string; color: string }>;
  highlights?: Array<{ start: number; end: number; color: string }>;
  annotations?: Array<{ x: number; y: number; text: string }>;
}

export interface VisualizationConfig {
  speed: number; // 1-10
  showLabels: boolean;
  showValues: boolean;
  animate: boolean;
  theme: 'light' | 'dark';
}

export interface Visualization {
  id: string;
  type: VisualizationType;
  title: string;
  data: VisualizationData;
  config: VisualizationConfig;
  state: any;
  interactions: any[];
}

interface InteractiveVisualizerProps {
  visualization: Visualization;
  onClose?: () => void;
}

export function InteractiveVisualizer({ visualization, onClose }: InteractiveVisualizerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeed] = useState(visualization.config.speed);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderVisualization(canvasRef.current, visualization, currentStep);
    }
  }, [visualization, currentStep]);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleStepForward = () => setCurrentStep(prev => prev + 1);
  const handleStepBack = () => setCurrentStep(prev => Math.max(0, prev - 1));
  const handleReset = () => setCurrentStep(0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {visualization.title}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          )}
        </div>

        {/* Canvas */}
        <div className="relative bg-gray-50 dark:bg-gray-800" style={{ height: '400px' }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
            >
              ⏮ Reset
            </button>
            <button
              onClick={handleStepBack}
              className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
            >
              ◀ Step
            </button>
            <button
              onClick={isPlaying ? handlePause : handlePlay}
              className="px-4 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              onClick={handleStepForward}
              className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
            >
              Step ▶
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Speed:</label>
              <input
                type="range"
                min="1"
                max="10"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-24"
              />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Step: {currentStep}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderVisualization(
  canvas: HTMLCanvasElement,
  visualization: Visualization,
  step: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Set canvas size
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  // Clear canvas
  ctx.clearRect(0, 0, rect.width, rect.height);

  // Render based on type
  switch (visualization.type) {
    case 'array':
    case 'two_pointer':
    case 'sliding_window':
      renderArrayVisualization(ctx, visualization, rect.width, rect.height, step);
      break;
    case 'tree':
      renderTreeVisualization(ctx, visualization, rect.width, rect.height, step);
      break;
    case 'graph':
      renderGraphVisualization(ctx, visualization, rect.width, rect.height, step);
      break;
    case 'stack':
      renderStackVisualization(ctx, visualization, rect.width, rect.height, step);
      break;
    case 'queue':
      renderQueueVisualization(ctx, visualization, rect.width, rect.height, step);
      break;
    default:
      renderDefaultVisualization(ctx, visualization, rect.width, rect.height, step);
  }
}

function renderArrayVisualization(
  ctx: CanvasRenderingContext2D,
  visualization: Visualization,
  width: number,
  height: number,
  step: number
) {
  const array = visualization.data.arrays?.[0];
  if (!array) return;

  const cellSize = 60;
  const gap = 10;
  const startX = (width - (array.values.length * (cellSize + gap))) / 2;
  const startY = height / 2 - cellSize / 2;

  // Draw array cells
  array.values.forEach((value, index) => {
    const x = startX + index * (cellSize + gap);
    const y = startY;

    // Check if highlighted
    const isHighlighted = array.highlights?.some(
      h => index >= h.start && index <= h.end
    );

    // Draw cell
    ctx.fillStyle = isHighlighted ? '#3B82F6' : '#E5E7EB';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(x, y, cellSize, cellSize, 8);
    ctx.fill();
    ctx.stroke();

    // Draw value
    ctx.fillStyle = isHighlighted ? '#FFFFFF' : '#111827';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value ?? 'null'), x + cellSize / 2, y + cellSize / 2);

    // Draw index
    ctx.fillStyle = '#6B7280';
    ctx.font = '12px sans-serif';
    ctx.fillText(String(index), x + cellSize / 2, y + cellSize + 20);
  });

  // Draw pointers
  array.pointers?.forEach(pointer => {
    const x = startX + pointer.index * (cellSize + gap) + cellSize / 2;
    const y = startY - 30;

    ctx.fillStyle = pointer.color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 8, y - 15);
    ctx.lineTo(x + 8, y - 15);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = pointer.color;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(pointer.label, x, y - 20);
  });
}

function renderTreeVisualization(
  ctx: CanvasRenderingContext2D,
  visualization: Visualization,
  width: number,
  height: number,
  step: number
) {
  const nodes = visualization.data.nodes || [];
  const edges = visualization.data.edges || [];

  // Draw edges first
  edges.forEach(edge => {
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);

    if (fromNode && toNode) {
      ctx.strokeStyle = edge.color || '#9CA3AF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fromNode.x || 0, fromNode.y || 0);
      ctx.lineTo(toNode.x || 0, toNode.y || 0);
      ctx.stroke();
    }
  });

  // Draw nodes
  nodes.forEach(node => {
    const x = node.x || 0;
    const y = node.y || 0;
    const radius = node.size || 30;

    ctx.fillStyle = node.highlighted ? '#3B82F6' : '#F3F4F6';
    ctx.strokeStyle = node.color || '#374151';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw value
    ctx.fillStyle = node.highlighted ? '#FFFFFF' : '#111827';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(node.value ?? node.label), x, y);
  });
}

function renderGraphVisualization(
  ctx: CanvasRenderingContext2D,
  visualization: Visualization,
  width: number,
  height: number,
  step: number
) {
  renderTreeVisualization(ctx, visualization, width, height, step);
}

function renderStackVisualization(
  ctx: CanvasRenderingContext2D,
  visualization: Visualization,
  width: number,
  height: number,
  step: number
) {
  const array = visualization.data.arrays?.[0];
  if (!array) return;

  const cellWidth = 80;
  const cellHeight = 50;
  const gap = 5;
  const startX = width / 2 - cellWidth / 2;
  const startY = height - 100;

  // Draw stack container
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 3;
  ctx.strokeRect(startX - 5, startY - 5, cellWidth + 10, (cellHeight + gap) * array.values.length + 10);

  // Draw stack elements (from bottom to top)
  array.values.forEach((value, index) => {
    const x = startX;
    const y = startY + (array.values.length - 1 - index) * (cellHeight + gap);

    ctx.fillStyle = '#3B82F6';
    ctx.strokeStyle = '#1D4ED8';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(x, y, cellWidth, cellHeight, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value ?? 'null'), x + cellWidth / 2, y + cellHeight / 2);
  });

  // Draw "TOP" label
  ctx.fillStyle = '#6B7280';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TOP', startX + cellWidth / 2, startY - 15);
}

function renderQueueVisualization(
  ctx: CanvasRenderingContext2D,
  visualization: Visualization,
  width: number,
  height: number,
  step: number
) {
  const array = visualization.data.arrays?.[0];
  if (!array) return;

  const cellWidth = 60;
  const cellHeight = 50;
  const gap = 5;
  const startX = (width - (array.values.length * (cellWidth + gap))) / 2;
  const startY = height / 2 - cellHeight / 2;

  // Draw queue elements
  array.values.forEach((value, index) => {
    const x = startX + index * (cellWidth + gap);
    const y = startY;

    ctx.fillStyle = '#10B981';
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(x, y, cellWidth, cellHeight, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value ?? 'null'), x + cellWidth / 2, y + cellHeight / 2);
  });

  // Draw "FRONT" and "REAR" labels
  ctx.fillStyle = '#6B7280';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FRONT', startX + cellWidth / 2, startY - 15);
  ctx.fillText('REAR', startX + (array.values.length - 1) * (cellWidth + gap) + cellWidth / 2, startY - 15);
}

function renderDefaultVisualization(
  ctx: CanvasRenderingContext2D,
  visualization: Visualization,
  width: number,
  height: number,
  step: number
) {
  ctx.fillStyle = '#6B7280';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Visualization for ${visualization.type}`, width / 2, height / 2);
  ctx.fillText('(Coming soon)', width / 2, height / 2 + 30);
}