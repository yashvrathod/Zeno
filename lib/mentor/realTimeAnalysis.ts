/**
 * Real-time Code Analysis
 *
 * Provides real-time feedback and analysis as students type code.
 * Integrates with the existing pattern recognition and debugging systems.
 */

import { detectPatternsStatically } from '../mentor/patternTracker';
import { features } from '../features';

// ─────────────────────────────────────────────────────────────────────────────
// REAL-TIME ANALYSIS TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type AnalysisResult = {
  issues: CodeIssue[];
  suggestions: Suggestion[];
  patterns: DetectedPattern[];
  executionContext?: ExecutionContext;
};

export type CodeIssue = {
  type: 'error' | 'warning' | 'info';
  line: number;
  column: number;
  message: string;
  code: string;
  fix?: string;
};

export type Suggestion = {
  type: 'fix' | 'improvement' | 'refactor';
  message: string;
  priority: 'high' | 'medium' | 'low';
  line?: number;
};

export type DetectedPattern = {
  name: string;
  confidence: number;
  location: { line: number; column: number };
};

export type ExecutionContext = {
  variables: Map<string, any>;
  scope: string[];
  callStack: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// REAL-TIME ANALYSIS FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyze code in real-time and provide immediate feedback
 * @param code The code to analyze
 * @param language The programming language
 * @returns Analysis results with issues and suggestions
 */
export async function analyzeCodeRealTime(
  code: string,
  language: string
): Promise<AnalysisResult> {
  const result: AnalysisResult = {
    issues: [],
    suggestions: [],
    patterns: [],
  };

  // Skip if real-time analysis is disabled
  if (!features.realTimeAnalysis) {
    return result;
  }

  try {
    // Detect patterns in real-time
    const detectedPatterns = detectPatternsStatically(code, language as any);

    // Convert patterns to suggestions
    const patternSuggestions = detectedPatterns.map(pattern => ({
      type: 'improvement' as const,
      message: `Potential ${pattern} pattern detected`,
      priority: 'medium' as const,
    }));

    result.suggestions.push(...patternSuggestions);

    // Add pattern information
    detectedPatterns.forEach(pattern => {
      result.patterns.push({
        name: pattern,
        confidence: 0.8,
        location: { line: 1, column: 1 }
      });
    });

    // Static analysis for common issues
    const issues = await analyzeCodeIssues(code, language);
    result.issues.push(...issues);

    return result;
  } catch (error) {
    console.error('Real-time analysis failed:', error);
    return result;
  }
}

/**
 * Analyze code for common issues
 */
async function analyzeCodeIssues(
  code: string,
  language: string
): Promise<CodeIssue[]> {
  const issues: CodeIssue[] = [];

  // Check for common syntax issues
  const lines = code.split('\n');

  // (JavaScript/TypeScript missing-semicolon check was removed in PR 2b;
  // the platform no longer supports those languages.)

  // Check for potential infinite loops
  if (code.includes('while (true)') || code.includes('for (;;)')) {
    issues.push({
      type: 'warning',
      line: 1,
      column: 1,
      message: 'Potential infinite loop detected',
      code: 'infinite-loop'
    });
  }

  return issues;
}

/**
 * Get real-time feedback for code as it's being typed
 * @param code Current code content
 * @param cursorPosition Current cursor position
 * @returns Immediate feedback and suggestions
 */
export async function getRealTimeFeedback(
  code: string,
  cursorPosition: number
): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = [];

  // Analyze the current line where cursor is positioned
  const lines = code.split('\n');
  const currentLineIndex = code.substring(0, cursorPosition).split('\n').length - 1;
  const currentLine = lines[currentLineIndex] || '';

  // Suggest common completions
  if (currentLine.trim().endsWith('.')) {
    suggestions.push({
      type: 'improvement',
      message: 'Consider using auto-completion for faster coding',
      priority: 'low'
    });
  }

  // Suggest pattern-based improvements
  if (currentLine.includes('for') && currentLine.includes('let')) {
    suggestions.push({
      type: 'improvement',
      message: 'Consider using const/let consistently for better performance',
      priority: 'medium'
    });
  }

  return suggestions;
}