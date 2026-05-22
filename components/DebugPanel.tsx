'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, RotateCcw, Bug, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface DebugPanelProps {
  code: string;
  language: string;
  onDebugStart?: () => void;
  onDebugStop?: () => void;
  onBreakpointToggle?: (line: number, enabled: boolean) => void;
}

interface DebugState {
  line: number;
  variables: Record<string, any>;
  stack: string[];
}

interface Breakpoint {
  line: number;
  enabled: boolean;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  code,
  language,
  onDebugStart,
  onDebugStop,
  onBreakpointToggle
}) => {
  const [isDebugging, setIsDebugging] = useState(false);
  const [currentLine, setCurrentLine] = useState(0);
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
  const [variables, setVariables] = useState<Record<string, any>>({});
  const [callStack, setCallStack] = useState<string[]>([]);
  const [debugOutput, setDebugOutput] = useState<string>('');
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Parse code to extract variables and functions
  const parseCode = () => {
    const lines = code.split('\n');
    const variables: Record<string, any> = {};
    const functions: string[] = [];

    lines.forEach((line, index) => {
      // Extract variable declarations
      const varMatch = line.match(/(let|const|var)\s+(\w+)\s*=\s*([^;]*)/);
      if (varMatch) {
        const varName = varMatch[2];
        const varValue = varMatch[3];
        variables[varName] = varValue;
      }

      // Extract function declarations
      const funcMatch = line.match(/function\s+(\w+)/);
      if (funcMatch) {
        functions.push(funcMatch[1]);
      }
    });

    return { variables, functions };
  };

  const { variables: parsedVariables, functions } = parseCode();

  const toggleBreakpoint = (line: number) => {
    const newBreakpoints = [...breakpoints];
    const existingIndex = newBreakpoints.findIndex(bp => bp.line === line);

    if (existingIndex >= 0) {
      newBreakpoints.splice(existingIndex, 1);
    } else {
      newBreakpoints.push({ line, enabled: true });
    }

    setBreakpoints(newBreakpoints);
    onBreakpointToggle?.(line, existingIndex < 0);
  };

  const startDebugging = () => {
    setIsDebugging(true);
    onDebugStart?.();
  };

  const stopDebugging = () => {
    setIsDebugging(false);
    onDebugStop?.();
  };

  const stepOver = () => {
    // Implementation for stepping over
    setCurrentLine(prev => prev + 1);
  };

  const stepInto = () => {
    // Implementation for stepping into
    setCurrentLine(prev => prev + 1);
  };

  const stepOut = () => {
    // Implementation for stepping out
    setCurrentLine(prev => prev + 1);
  };

  const continueExecution = () => {
    // Implementation for continuing execution
    setCurrentLine(0);
  };

  const resetDebugging = () => {
    setCurrentLine(0);
    setVariables({});
    setCallStack([]);
    setDebugOutput('');
  };

  return (
    <div className="debug-panel bg-gray-900 border-l border-gray-700 w-80 flex flex-col">
      <div className="debug-header flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-white font-semibold">Debug Panel</h3>
        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className="text-gray-400 hover:text-white"
        >
          {isPanelOpen ? <X size={16} /> : <X size={16} />}
        </button>
      </div>

      {isPanelOpen && (
        <div className="flex-1 flex flex-col">
          {/* Debug Controls */}
          <div className="debug-controls p-4 border-b border-gray-700">
            <div className="flex gap-2 mb-4">
              <button
                onClick={startDebugging}
                disabled={isDebugging}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded text-sm font-medium disabled:opacity-50"
              >
                <Play size={16} className="inline mr-1" />
                Start
              </button>
              <button
                onClick={stopDebugging}
                disabled={!isDebugging}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded text-sm font-medium disabled:opacity-50"
              >
                <Square size={16} className="inline mr-1" />
                Stop
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={stepOver}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm font-medium"
                disabled={!isDebugging}
              >
                <Play size={14} className="inline mr-1" />
                Step Over
              </button>
              <button
                onClick={stepInto}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded text-sm font-medium"
                disabled={!isDebugging}
              >
                <Play size={14} className="inline mr-1" />
                Step Into
              </button>
              <button
                onClick={stepOut}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-3 rounded text-sm font-medium"
                disabled={!isDebugging}
              >
                <Play size={14} className="inline mr-1" />
                Step Out
              </button>
            </div>
          </div>

          {/* Variables Panel */}
          <div className="variables-panel flex-1 overflow-y-auto">
            <div className="p-4 border-b border-gray-700">
              <h4 className="text-gray-300 text-sm font-medium mb-2">Variables</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {Object.entries(parsedVariables).map(([name, value]) => (
                  <div key={name} className="flex justify-between text-sm">
                    <span className="text-gray-400">{name}:</span>
                    <span className="text-gray-200">{String(value)}</span>
                  </div>
                ))}
                {Object.keys(parsedVariables).length === 0 && (
                  <div className="text-gray-500 text-sm">No variables in current scope</div>
                )}
              </div>
            </div>

            {/* Call Stack */}
            <div className="call-stack p-4 border-b border-gray-700">
              <h4 className="text-gray-300 text-sm font-medium mb-2">Call Stack</h4>
              <div className="space-y-1">
                {callStack.map((func, index) => (
                  <div key={index} className="text-sm text-gray-300 py-1">
                    {func}
                  </div>
                ))}
                {callStack.length === 0 && (
                  <div className="text-gray-500 text-sm">Empty call stack</div>
                )}
              </div>
            </div>

            {/* Breakpoints */}
            <div className="breakpoints p-4">
              <h4 className="text-gray-300 text-sm font-medium mb-2">Breakpoints</h4>
              <div className="space-y-1">
                {breakpoints.map((bp) => (
                  <div key={bp.line} className="flex items-center text-sm">
                    <button
                      onClick={() => toggleBreakpoint(bp.line)}
                      className="mr-2"
                    >
                      <div className={`w-3 h-3 rounded-full ${bp.enabled ? 'bg-red-500' : 'bg-gray-600'}`} />
                    </button>
                    <span className="text-gray-300">Line {bp.line}</span>
                  </div>
                ))}
                {breakpoints.length === 0 && (
                  <div className="text-gray-500 text-sm">No breakpoints set</div>
                )}
              </div>
            </div>
          </div>

          {/* Debug Output */}
          <div className="debug-output p-4 border-t border-gray-700">
            <h4 className="text-gray-300 text-sm font-medium mb-2">Debug Output</h4>
            <div className="bg-black p-3 rounded text-xs text-gray-400 font-mono h-24 overflow-y-auto">
              {debugOutput || "No debug output"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;