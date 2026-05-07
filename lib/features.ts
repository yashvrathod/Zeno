/**
 * Feature Flags - Centralized configuration for all features
 *
 * Use this file to enable/disable features across the application.
 * Features can be toggled via environment variables or directly here.
 */

export const features = {
  // Enhanced intent classification (conversation-aware intent detection)
  enhancedIntent: process.env.ENABLE_ENHANCED_INTENT !== 'false',

  // Personalization engine (knowledge graph, SRS, adaptive hints) - NOW ENABLED
  personalization: process.env.ENABLE_PERSONALIZATION !== 'false',

  // Debug analysis integration
  debugAnalysis: process.env.ENABLE_DEBUG_ANALYSIS !== 'false',

  // Interactive visualization system
  visualization: process.env.ENABLE_VISUALIZATION !== 'false',

  // Cache hit soft-matching (semantic similarity routing)
  cacheSoftMatch: process.env.ENABLE_CACHE_SOFT_MATCH !== 'false',

  // Senior architect review for completed solutions
  architectReview: process.env.ENABLE_ARCHITECT_REVIEW !== 'false',
} as const;

export type FeatureFlags = typeof features;