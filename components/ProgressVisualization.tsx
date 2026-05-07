/**
 * Progress Visualization Component
 *
 * Displays student learning progress, concept mastery, and engagement metrics
 */

'use client';

import React from 'react';

export interface ProgressData {
  overallMastery: number; // 0-100
  conceptProgress: Array<{
    concept: string;
    mastery: number;
    lastPracticed: Date;
  }>;
  learningVelocity: number; // problems per week
  streak: number;
  totalSolved: number;
}

interface ProgressVisualizationProps {
  data: ProgressData;
}

export function ProgressVisualization({ data }: ProgressVisualizationProps) {
  const topConcepts = data.conceptProgress
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 6);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Learning Progress
      </h3>

      {/* Overall Mastery */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Overall Mastery
          </span>
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
            {data.overallMastery}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="bg-blue-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${data.overallMastery}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {data.totalSolved}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Problems Solved
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {data.streak}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Day Streak
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {data.learningVelocity}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            / Week
          </div>
        </div>
      </div>

      {/* Concept Progress */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Concept Mastery
        </h4>
        <div className="space-y-3">
          {topConcepts.map((concept) => (
            <div key={concept.concept}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                  {concept.concept.replace('_', ' ')}
                </span>
                <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                  {Math.round(concept.mastery)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    concept.mastery >= 80
                      ? 'bg-green-500'
                      : concept.mastery >= 50
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${concept.mastery}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}