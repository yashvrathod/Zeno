'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, SkipForward, SkipBack, RotateCcw, ChevronLeft, ChevronRight,
  Plus, Minus, Eye, EyeOff, Maximize2, Minimize2,
} from 'lucide-react';

type AnimationType = 'svg' | 'canvas';

interface AnimationPlayerProps {
  type: AnimationType;
  data: string;
  problemTitle?: string;
}

/**
 * Fully interactive visualization player for DSA problems.
 *
 * Features:
 *  - Play / pause / step forward / step backward / reset
 *  - Speed slider (0.25x → 3x)
 *  - Draggable progress bar
 *  - Custom user inputs (array size, elements, target)
 *  - Step-by-step with explanation text
 *  - Algorithm state display
 *  - Fullscreen toggle
 *
 * SVG mode: renders the SVG with a simplified control overlay
 * Canvas mode: full interactive simulation engine
 */
export default function AnimationPlayer({ type, data, problemTitle }: AnimationPlayerProps) {
  return (
    <div className="w-full rounded-2xl border border-white/5 overflow-hidden bg-[#0a0a0c] animate-in fade-in slide-in-from-bottom-3 duration-700">
      {type === 'svg' ? (
        <SVGViewer data={data} title={problemTitle} />
      ) : type === 'canvas' ? (
        <CanvasSimulation data={data} title={problemTitle} />
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────
// SVG VIEWER — lightweight display with overlay controls
// ─────────────────────────────────────────────────────

function SVGViewer({ data, title }: { data: string; title?: string }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [speed, setSpeed] = useState(1);

  return (
    <div className={fullscreen ? 'fixed inset-0 z-50 bg-black/90 flex flex-col' : ''}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#0d0d10]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase">
            {title || 'Visualization'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-2 py-1.5">
            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Speed</span>
            <input
              type="range"
              min="25"
              max="300"
              step="25"
              value={speed * 100}
              onChange={(e) => setSpeed(Number(e.target.value) / 100)}
              className="w-16 h-1 accent-purple-500 cursor-pointer"
            />
            <span className="text-[9px] text-white font-mono w-8">{speed.toFixed(1)}x</span>
          </div>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
          >
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* SVG Content */}
      <div className={fullscreen ? 'flex-1 flex items-center justify-center p-4' : ''}>
        <div
          className="w-full"
          style={{ animationDuration: `${4 / speed}s` }}
          dangerouslySetInnerHTML={{ __html: data }}
        />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// CANVAS SIMULATION — full interactive algorithm engine
// ──────────────────────────────────────────────────────

function CanvasSimulation({ data, title }: { data: string; title?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [stepIndex, setStepIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState<{ explain: string; state?: Record<string, string> }>({ explain: '' });
  const [showExplanation, setShowExplanation] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  // User inputs (for array-based problems)
  const [arraySize, setArraySize] = useState(6);
  const [arrayElements, setArrayElements] = useState([2, 7, 11, 15, 3, 6]);
  const [target, setTarget] = useState(8);

  // Animation data from admin
  const animRef = useRef<AnimationSpec | null>(null);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  interface AnimationSpec {
    name: string;
    totalSteps: number;
    computeStep: (params: ComputeParams) => StepResult;
    render: (ctx: CanvasRenderingContext2D, step: StepResult, canvasWidth: number, canvasHeight: number) => void;
    defaults: DefaultInputs;
  }

  interface ComputeParams {
    array: number[];
    target: number;
    stepIndex: number;
  }

  interface StepResult {
    explain: string;
    state?: Record<string, string>;
    leftIdx?: number;
    rightIdx?: number;
    pivotIdx?: number;
    highlightIndices?: number[];
    swapIndices?: [number, number];
    found?: { indices: number[] };
    done: boolean;
    array: number[]; // possibly modified (sorted, etc.)
  }

  interface DefaultInputs {
    array: number[];
    target: number;
  }

  // Parse and initialize
  useEffect(() => {
    if (!data || !canvasRef.current) return;

    try {
      const fn = new Function(
        'Math',
        `"use strict"; return (${data})`,
      )(Math);

      const spec = typeof fn === 'function' ? fn() : fn;
      animRef.current = spec as AnimationSpec;

      // Apply defaults from the animation spec
      if (spec.defaults) {
        setArrayElements(spec.defaults.array);
        setArraySize(spec.defaults.array.length);
        setTarget(spec.defaults.target);
      }
    } catch (e) {
      console.error('Failed to load animation:', e);
    }

    setStepIndex(0);
  }, [data]);

  // Compute and render current step
  const computeAndDraw = useCallback(
    (step: number, ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const spec = animRef.current;
      if (!spec) return;

      const result = spec.computeStep({
        array: arrayElements,
        target,
        stepIndex: step,
      });

      const effectiveH = canvasRef.current ? canvasRef.current.height : 300;

      // Clear
      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(0, 0, w, effectiveH);

      // Draw subtle grid
      drawGrid(ctx, w, effectiveH);

      // Let the animation render function draw on top
      spec.render(ctx, result, w, effectiveH);

      // Update UI state
      setCurrentStep({ explain: result.explain, state: result.state });
    },
    [arrayElements, target],
  );

  // Draw grid background
  function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  }

  // Playback engine
  useEffect(() => {
    if (!canvasRef.current || !animRef.current) return;

    if (!isPlaying) {
      cancelAnimationFrame(frameRef.current);
      return;
    }

    // Compute immediately, schedule next step
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    computeAndDraw(stepIndex, ctx, canvasRef.current.width, canvasRef.current.height);

    if (stepIndex < animRef.current.totalSteps) {
      const delay = 1200 / speed;
      const timer = setTimeout(() => {
        setStepIndex((s) => Math.min(s + 1, animRef.current!.totalSteps - 1));
      }, delay);

      return () => clearTimeout(timer);
    } else {
      setIsPlaying(false);
    }
  }, [isPlaying, stepIndex, speed, computeAndDraw]);

  // Re-render when stepIndex or inputs change
  useEffect(() => {
    if (!canvasRef.current || !animRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    computeAndDraw(stepIndex, ctx, canvasRef.current.width, canvasRef.current.height);
  }, [stepIndex, arrayElements, target, computeAndDraw]);

  // ─── Controls ──────────────────────────────────

  const handlePlayPause = () => {
    if (stepIndex >= (animRef.current?.totalSteps || 1)) {
      setStepIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setStepIndex((s) => Math.min(s + 1, (animRef.current?.totalSteps || 1) - 1));
  };

  const handleStepBackward = () => {
    setIsPlaying(false);
    setStepIndex((s) => Math.max(s - 1, 0));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setStepIndex(0);
  };

  const handleArraySizeChange = (delta: number) => {
    const newSize = Math.max(2, Math.min(20, arraySize + delta));
    setArraySize(newSize);
    if (newSize > arrayElements.length) {
      const newEls = [...arrayElements];
      while (newEls.length < newSize) newEls.push(Math.floor(Math.random() * 20) + 1);
      setArrayElements(newEls);
    } else {
      setArrayElements(arrayElements.slice(0, newSize));
    }
  };

  const handleEditElement = (index: number, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    const newEls = [...arrayElements];
    newEls[index] = num;
    setArrayElements(newEls);
  };

  const randomizeArray = () => {
    setArrayElements(Array.from({ length: arraySize }, () => Math.floor(Math.random() * 20) + 1));
  };

  // ─── Render ────────────────────────────────────

  const totalSteps = animRef.current?.totalSteps || 0;
  const progressPercent = totalSteps > 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0;

  const SimWrapper = ({ content }: { content: React.ReactNode }) => {
    if (fullscreen) {
      return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col animate-in zoom-in-95 duration-300">
          <div className="flex-1 flex flex-col">{content}</div>
        </div>
      );
    }
    return <div className="flex flex-col">{content}</div>;
  };

  return (
    <SimWrapper content={
      <>
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#0d0d10]">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            {isPlaying ? (
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ) : null}
            <span className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase">
              {title || 'Algorithm Visualization'}
            </span>
            {totalSteps > 0 && (
              <span className="text-[9px] text-zinc-600 font-mono">
                Step {stepIndex + 1}/{totalSteps}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Speed */}
            <div className="flex items-center gap-2 bg-white/[0.03] rounded-lg px-2 py-1.5">
              <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Speed</span>
              <input
                type="range"
                min="25"
                max="300"
                step="25"
                defaultValue={speed * 100}
                onChange={(e) => setSpeed(Number(e.target.value) / 100)}
                className="w-16 h-1 accent-purple-500 cursor-pointer"
              />
              <span className="text-[9px] text-white font-mono w-8 text-right">
                {speed.toFixed(1)}x
              </span>
            </div>
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
              title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={700}
          height={320}
          className="w-full flex-shrink-0"
        />

        {/* Progress Bar (clickable) */}
        <div className="px-5 pt-3 bg-[#0d0d10]">
          <div className="relative h-2 bg-white/5 rounded-full overflow-hidden cursor-pointer group">
            <div
              className="h-full bg-gradient-to-r from-purple-500/60 to-purple-400 transition-all duration-150"
              style={{ width: `${progressPercent}%` }}
            />
            {/* Scrubber handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg shadow-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${progressPercent}%`, transform: `translateX(-50%) translateY(-50%)` }}
            />
            {/* Clickable overlay for seeking */}
            <input
              type="range"
              min={0}
              max={Math.max(totalSteps - 1, 1)}
              value={stepIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setStepIndex(Number(e.target.value));
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Step Explanation */}
        {showExplanation && currentStep.explain && (
          <div className="px-5 py-4 bg-[#0d0d10] border-t border-white/5">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] text-purple-400 font-bold">
                  {stepIndex + 1}
                </span>
              </div>
              <p className="text-sm text-zinc-300 font-light leading-relaxed">
                {currentStep.explain}
              </p>
              <button
                onClick={() => setShowExplanation(false)}
                className="shrink-0 text-zinc-600 hover:text-white transition-colors"
                title="Hide explanation"
              >
                <EyeOff size={14} />
              </button>
            </div>
            {currentStep.state && Object.keys(currentStep.state).length > 0 && (
              <div className="flex flex-wrap gap-3 mt-3 pl-9">
                {Object.entries(currentStep.state).map(([key, val]) => (
                  <div key={key} className="bg-white/[0.03] rounded-lg px-3 py-1.5 border border-white/[0.04]">
                    <span className="text-[8px] text-zinc-600 uppercase tracking-wider font-bold">{key}</span>
                    <div className="text-xs text-purple-300 font-mono">{val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-3 px-5 py-4 border-t border-white/5 bg-[#0d0d10]">
          <button
            onClick={handleReset}
            className="p-2.5 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
            title="Reset"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={handleStepBackward}
            disabled={stepIndex === 0}
            className="p-2.5 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            title="Previous step"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={handlePlayPause}
            className="p-3 rounded-2xl bg-purple-500 text-white hover:bg-purple-400 transition-all shadow-lg shadow-purple-500/20 active:scale-95"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
          </button>
          <button
            onClick={handleStepForward}
            disabled={stepIndex >= totalSteps - 1}
            className="p-2.5 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            title="Next step"
          >
            <ChevronRight size={18} />
          </button>
          {!showExplanation && (
            <button
              onClick={() => setShowExplanation(true)}
              className="ml-2 p-2 rounded-lg text-zinc-600 hover:text-white hover:bg-white/5 transition-all"
              title="Show explanation"
            >
              <Eye size={14} />
            </button>
          )}
        </div>

        {/* Interactive Controls Section */}
        <div className="border-t border-white/5 bg-[#080809]">
          {/* Toggle */}
          <div className="px-5 py-3 border-b border-white/5">
            <input
              type="checkbox"
              id="advancedControls"
              className="sr-only peer"
              defaultChecked={false}
            />
            <label
              htmlFor="advancedControls"
              className="flex items-center justify-between cursor-pointer text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase select-none"
            >
              <span>Interactive Controls</span>
              <span className="peer-checked:text-white transition-colors">▼</span>
            </label>
          </div>

          {/* Collapsible content */}
          <div className="hidden peer-checked:block px-5 py-4 space-y-4">
            {/* Array elements */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-bold">
                  Array Elements
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleArraySizeChange(-1)}
                    className="p-1 rounded text-zinc-500 hover:text-white hover:bg-white/5"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-[10px] text-zinc-400 w-6 text-center font-mono">
                    {arraySize}
                  </span>
                  <button
                    onClick={() => handleArraySizeChange(1)}
                    className="p-1 rounded text-zinc-500 hover:text-white hover:bg-white/5"
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    onClick={randomizeArray}
                    className="ml-2 text-[9px] text-zinc-500 hover:text-purple-400 transition-colors uppercase tracking-wider font-bold"
                  >
                    Randomize
                  </button>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {arrayElements.map((val, i) => (
                  <input
                    key={i}
                    type="text"
                    value={val}
                    onChange={(e) => handleEditElement(i, e.target.value)}
                    className="w-12 h-9 text-center text-sm font-mono bg-white/[0.03] border border-white/5 rounded-lg text-white outline-none focus:border-purple-500/50 transition-colors"
                    maxLength={3}
                  />
                ))}
              </div>
            </div>

            {/* Target */}
            <div className="flex items-center gap-3">
              <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-bold">
                Target
              </span>
              <input
                type="text"
                value={target}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!isNaN(n)) setTarget(n);
                }}
                className="w-16 h-9 text-center text-sm font-mono bg-white/[0.03] border border-white/5 rounded-lg text-purple-300 outline-none focus:border-purple-500/50 transition-colors"
                maxLength={4}
              />
              <button
                onClick={() => {
                  setStepIndex(0);
                  setIsPlaying(false);
                }}
                className="ml-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-300 uppercase tracking-wider font-bold hover:bg-purple-500/20 transition-all"
              >
                Re-run with new inputs
              </button>
            </div>
          </div>
        </div>
      </>
    } />
  );
}
