# DSA Mentor AI Enhancement Integration Guide

This guide details how to integrate the new AI intelligence and UX enhancements into the existing mentor system.

## Overview

The enhanced system adds 4 major components:

1. **Enhanced Intent Classification** - Conversation-aware intent detection
2. **Personalization Engine** - Student knowledge graph and adaptive learning
3. **Enhanced Debugging Assistant** - AI-powered bug analysis and test generation
4. **Interactive Visualization System** - Rich visual learning aids

## Architecture

```
┌─────────────────────────┐
│   User Interaction      │
└─────────┬───────────────┘
          │
┌─────────▼───────────────┐
│  Intent Classification  │
│  (enhancedIntent.ts)    │
└─────────┬───────────────┘
          │
┌─────────▼───────────────┐
│  Personalization Engine │
│  (personalization.ts)   │
└─────────┬───────────────┘
          │
┌─────────▼─────────────────┐
│  Stage Controller         │
│  (stageController.ts)     │
└─────────┬─────────────────┘
          │
┌─────────▼─────────────────┐
│  AI Handler               │
│  (aiHandler.ts)           │
└─────────┬─────────────────┘
          │
┌─────────▼─────────────────┐
│  Debugging Assistant      │
│  (debugAssistant.ts)      │
└─────────┬─────────────────┘
          │
┌─────────▼─────────────────┐
│  Visualization System     │
│  (interactiveVisual.ts)   │
└─────────┬─────────────────┘
          │
┌─────────▼─────────────────┐
│   Response Generation     │
└───────────────────────────┘
```

## Integration Steps

### Step 1: Enhanced Intent Classification

#### Update `mentorService.ts`

Replace the basic intent classification with enhanced version:

```typescript
// Add import
import {
  classifyIntentWithContext,
  makeRoutingDecision,
  detectInterventionNeed
} from './enhancedIntentClassifier';

// Update execute function in mentorService.ts
export async function execute(params: {
  body: MentorRequest;
  userId: string;
}): Promise<MentorResponse> {
  // ... existing code ...

  // ── 4. ENHANCED INTENT CLASSIFICATION ──
  const context = {
    stage: mentorSession.stage as TeachingStage,
    previousIntents: history.map(h => ({
      intent: h.role === 'user' ? 
        (await classifyIntentWithContext(h.content)).primaryIntent :
        'assistant_response',
      confidence: 'medium',
      shouldEnforceStage: true,
      requiresValidation: true,
      reason: 'from_history',
      keywords: [],
      metadata: {}
    })).filter(h => h.intent !== 'assistant_response'),
    userFrustrationLevel: detectFrustrationLevel(body.userMessage),
    attemptCount: stats?.submitCount || 0
  };

  const conversationIntent = classifyIntentWithContext(body.userMessage, context);
  const routingDecision = makeRoutingDecision(conversationIntent, context);
  
  // Check for intervention needs
  const intervention = detectInterventionNeed(
    conversationIntent,
    context.previousIntents,
    {
      frustrationLevel: context.userFrustrationLevel,
      attemptCount: context.attemptCount
    }
  );

  if (intervention) {
    // Apply intervention (e.g., more empathetic response)
    return handleIntervention(intervention, body, mentorSession);
  }

  // ── 5. ROUTE INTERACTION ──
  const decision = await routeInteraction(body.userMessage, mentorSession, problemForRouter);

  // Use enhanced routing decision
  if (!routingDecision.shouldUseCache) {
    // Force AI path for personalized responses
    decision.type = "AI_NEEDED" as any;
  }

  // ... rest of existing code ...
}

function detectFrustrationLevel(message: string): number {
  const frustrationWords = [
    'frustrated', 'stuck', 'hate', 'confused', 'lost',
    'impossible', 'give up', 'ugh', 'wtf', 'screw this'
  ];
  const lower = message.toLowerCase();
  const count = frustrationWords.filter(word => lower.includes(word)).length;
  return Math.min(count / frustrationWords.length, 1);
}

async function handleIntervention(
  intervention: any,
  body: MentorRequest,
  session: any
): Promise<MentorResponse> {
  switch (intervention.type) {
    case 'frustration':
      return {
        ok: true,
        message: `I can see you're feeling frustrated, and that's completely okay. 
Let's take a step back. ${intervention.suggestedAction}`,
        metadata: { interventionType: 'frustration_support' }
      };
    
    case 'confusion':
      return {
        ok: true,
        message: `It sounds like we're going in circles. Let me try a different approach.
${intervention.suggestedAction}`,
        metadata: { interventionType: 'confusion_break' }
      };
    
    default:
      return {
        ok: true,
        message: intervention.suggestedAction,
        metadata: { interventionType: intervention.type }
      };
  }
}
```

### Step 2: Integrate Personalization Engine

#### Update `mentorService.ts` with Knowledge Graph

```typescript
import {
  getStudentKnowledgeGraph,
  updateConceptMastery,
  recordProblemAttempt,
  calculateOverallMastery,
  getWeakestConcepts
} from './personalizationEngine';

// In execute function, after getting user data:
const knowledgeGraph = await getStudentKnowledgeGraph(userId);

// Get student's weakest concepts
const weakestConcepts = knowledgeGraph ? 
  getWeakestConcepts(knowledgeGraph, 3) : [];

// Add to contextual guidance
const personalizationContext = knowledgeGraph ? {
  weakestConcepts: weakestConcepts.map(c => c.concept),
  overallMastery: calculateOverallMastery(knowledgeGraph),
  learningStyle: knowledgeGraph.learningStyle
} : null;

// After problem completion, update concept mastery
async function updateStudentProgress(
  userId: string,
  problemId: string,
  body: MentorRequest,
  solved: boolean,
  timeSpent: number,
  hintsUsed: number
) {
  // Record problem attempt
  await recordProblemAttempt({
    problemId,
    problemSlug: body.problemTitle || 'unknown',
    concepts: extractConceptsFromProblem(body), // Implement this
    patterns: extractPatternsFromProblem(body), // Implement this
    attempts: hintsUsed + 1,
    solved,
    timeSpent,
    firstAttemptSuccess: hintsUsed === 0,
    hintCount: hintsUsed,
    stageReached: 'REFLECT', // Or actual stage
    rungReached: 6, // If solved
    date: new Date(),
    errors: [] // Extract from error logs
  });

  // Update concept mastery
  const concepts = extractConceptsFromProblem(body);
  for (const concept of concepts) {
    const current = knowledgeGraph?.concepts.get(concept);
    const newMastery = calculateNewMastery(current, solved, hintsUsed);
    
    await updateConceptMastery(userId, concept, {
      mastery: newMastery,
      practiceCount: (current?.practiceCount || 0) + 1,
      lastPracticed: new Date(),
      successRate: calculateNewSuccessRate(current, solved),
      averageTimeToSolve: updateAverageTime(current, timeSpent),
      commonErrors: updateErrorPatterns(current, body),
      prerequisites: [],
      dependents: [],
      nextReviewDue: calculateNextReview({ mastery: newMastery } as any, solved ? 1 : 0),
      difficultyRating: current?.difficultyRating || 3,
      confidenceRating: updateConfidence(current, solved)
    });
  }
}

function calculateNewMastery(
  current: any,
  solved: boolean,
  hintsUsed: number
): number {
  const baseMastery = current?.mastery || 0;
  const improvement = solved ? (10 - hintsUsed) : -5;
  return Math.max(0, Math.min(100, baseMastery + improvement));
}

function calculateNewSuccessRate(current: any, solved: boolean): number {
  const attempts = (current?.practiceCount || 0) + 1;
  const successes = Math.floor((current?.successRate || 0) * (attempts - 1)) + (solved ? 1 : 0);
  return successes / attempts;
}
```

#### Update `aiHandler.ts` for Personalized Hints

```typescript
import {
  generatePersonalizedHint,
  type PersonalizedHint
} from './personalizationEngine';

// In handleAiNeeded function:
if (stage === 'STUCK' || shouldProvideHint(body, history)) {
  const personalizedHint = generatePersonalizedHint(
    {
      problemId,
      concepts: extractConcepts(problemTitle, problemStatementMd),
      patterns: extractPatterns(problemStatementMd),
      currentStage: stage
    },
    knowledgeGraph!,
    rung as LearningRung
  );

  if (personalizedHint) {
    // Inject personalized hint into system prompt
    enhancedGuidance += `\n\nPERSONALIZED HINT (for internal use): ${
      personalizedHint.rationale
    }\n`;
    
    // Optionally include in response
    if (shouldIncludeHintInResponse(conversationIntent)) {
      assistantMessage = formatHintResponse(assistantMessage, personalizedHint);
    }
  }
}

function formatHintResponse(
  message: string,
  hint: PersonalizedHint
): string {
  const modalityLabels = {
    text: '',
    visual: '📊 Visual: ',
    interactive: '🎯 Interactive: ',
    analogy: '💡 Analogy: '
  };

  return `${message}\n\n───\n${
    modalityLabels[hint.modality]
  }${hint.content}`;
}
```

### Step 3: Integrate Enhanced Debugging Assistant

#### Update `aiHandler.ts` for Debug Analysis

```typescript
import {
  analyzeCodeForDebugging,
  type DebugAnalysis
} from './enhancedDebuggingAssistant';

// In handleAiNeeded function, for DEBUG stage:
if (stage === 'DEBUG' && body.userCode && (body.syntaxError || stats?.wrongAnswerCount > 0)) {
  const debugAnalysis = await analyzeCodeForDebugging(
    body.userCode,
    body.language,
    {
      errorMessage: body.syntaxError,
      failingTestCase: body.publicTestCases?.[0]?.input,
      expectedOutput: body.publicTestCases?.[0]?.expected
    },
    knowledgeGraph?.problemHistory
  );

  // Integrate bug hypotheses into guidance
  if (debugAnalysis.bugHypotheses.length > 0) {
    const topBug = debugAnalysis.bugHypotheses[0];
    debuggerContext = `\n\n🔍 BUG ANALYSIS: ${topBug.description}\n` +
      `Confidence: ${Math.round(topBug.confidence * 100)}%\n` +
      `Fix: ${topBug.fix}\n` +
      `Test cases to verify: ${debugAnalysis.testCases
        .slice(0, 2)
        .map(tc => tc.description)
        .join(', ')}`;
  }

  // Add fix suggestions to response
  if (debugAnalysis.fixSuggestions.length > 0) {
    const fix = debugAnalysis.fixSuggestions[0];
    assistantMessage += `\n\n───\n💡 **Suggested Fix:**\n${
      fix.code
    }\n\n*Explanation:* ${fix.explanation}`;
  }

  // Generate execution trace if helpful
  if (debugAnalysis.executionTraces.length > 0 && body.userFrustrationLevel < 0.5) {
    const trace = debugAnalysis.executionTraces[0];
    assistantMessage += formatExecutionTrace(trace);
  }
}

function formatExecutionTrace(trace: ExecutionTrace): string {
  let output = `\n\n───\n📊 **Execution Trace:**\n`;
  
  trace.variables.forEach(v => {
    output += `- ${v.name} = ${v.value}`;
    if (v.changed) output += ' ← changed';
    output += '\n';
  });

  return output;
}
```

#### Update Response Generation

```typescript
// In handleAiNeeded, after generating response:
if (debugAnalysis?.codeSmells.length > 0) {
  assistantMessage += '\n\n───\n⚠️ **Code Smells Detected:**\n';
  debugAnalysis.codeSmells.slice(0, 3).forEach(smell => {
    assistantMessage += `- ${smell.description}\n`;
  });
}

if (debugAnalysis?.rootCause) {
  assistantMessage += '\n\n───\n🔍 **Root Cause Analysis:**\n' +
    `${debugAnalysis.rootCause.whyItHappened}\n` +
    `\n**Prevention:**\n` +
    debugAnalysis.rootCause.preventionStrategies
      .slice(0, 3)
      .map(s => `• ${s}`)
      .join('\n');
}
```

### Step 4: Integrate Interactive Visualization

#### Add Visualization Endpoint

```typescript
// app/api/mentor/visualize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  generateVisualizationFromTrace,
  Visualizer,
  type VisualizationType
} from '@/lib/mentor/interactiveVisualization';

export async function POST(req: NextRequest) {
  const {
    executionTrace,
    type,
    problemContext,
    interactions
  } = await req.json();

  try {
    const visualization = generateVisualizationFromTrace(
      executionTrace,
      type as VisualizationType,
      problemContext
    );

    const visualizer = new Visualizer(visualization);

    // Apply stored interactions
    if (interactions) {
      interactions.forEach((interaction: any) => {
        visualizer.triggerInteraction(interaction.type, interaction.details);
      });
    }

    return NextResponse.json({
      ok: true,
      visualization: visualizer.getVisualization(),
      config: visualizer.getConfig()
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Failed to generate visualization' },
      { status: 500 }
    );
  }
}
```

#### Add Visualization to Frontend Response

```typescript
// In aiHandler.ts handleAiNeeded function:
if (shouldTriggerVisualization(body, stage, knowledgeGraph)) {
  const visualizationType = detectVisualizationType(
    body.problemTitle,
    body.problemStatementMd,
    body.userCode
  );

  if (visualizationType) {
    // Create execution trace for visualization
    const executionTrace = createExecutionTrace(
      body.userCode,
      body.language,
      stats?.lastError
    );

    assistantMessage += `\n\n${generateVisualizationMarker(
      visualizationType,
      executionTrace
    )}`;

    // Add to metadata
    metadata.hasVisualization = true;
    metadata.visualizationType = visualizationType;
  }
}

function shouldTriggerVisualization(
  body: MentorRequest,
  stage: TeachingStage,
  graph: any
): boolean {
  if (stage !== 'STRATEGIZE' && stage !== 'EXPLORE') return false;
  if (!graph?.learningStyle.prefersVisual) return false;
  
  const visualConcepts = [
    'two pointer', 'sliding window', 'binary search',
    'tree', 'graph', 'dp', 'heap', 'stack'
  ];

  return visualConcepts.some(concept =>
    (body.problemTitle + ' ' + (body.problemStatementMd || ''))
      .toLowerCase()
      .includes(concept)
  );
}

function generateVisualizationMarker(
  type: string,
  trace: any
): string {
  return `{{VISUALIZATION:${type}:${JSON.stringify(trace)}}}`;
}
```

### Step 5: Update Database Schema

#### Add Prisma Models

```prisma
// prisma/schema.prisma

model UserKnowledgeGraph {
  id          String   @id @default(cuid())
  userId      String   @unique
  learningStyle Json
  strengths   String[]
  weaknesses  String[]
  learningTrajectory Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  conceptMasteries ConceptMastery[]
  learningPatterns LearningPattern[]
  problemAttempts  ProblemAttempt[]
  misconceptions   Misconception[]
}

model ConceptMastery {
  id          String   @id @default(cuid())
  userId      String
  conceptId   String
  mastery     Float
  lastPracticed DateTime?
  practiceCount Int
  successRate Float
  averageTimeToSolve Float?
  commonErrors Json
  prerequisites String[]
  dependents  String[]
  nextReviewDue DateTime?
  difficultyRating Int
  confidenceRating Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user UserKnowledgeGraph @relation(fields: [userId], references: [id])

  @@unique([userId, conceptId])
}

model LearningPattern {
  id          String   @id @default(cuid())
  userId      String
  patternType String
  strength    Float
  lastUsed    DateTime?
  successRate Float
  preferredContext String[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user UserKnowledgeGraph @relation(fields: [userId], references: [id])
}

model ProblemAttempt {
  id          String   @id @default(cuid())
  userId      String
  problemId   String
  problemSlug String
  concepts    String[]
  patterns    String[]
  attempts    Int
  solved      Boolean
  timeSpent   Int
  firstAttemptSuccess Boolean
  hintCount   Int
  stageReached String
  rungReached  Int
  date        DateTime
  errors      Json

  user UserKnowledgeGraph @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}

model Misconception {
  id          String   @id @default(cuid())
  userId      String
  conceptId   String
  description String
  detectedDate DateTime
  corrected   Boolean
  correctionDate DateTime?
  relatedProblems String[]

  user UserKnowledgeGraph @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}
```

### Step 6: Frontend Integration

#### Update Mentor Chat Component

```typescript
// components/MentorChat.tsx
import { useState, useEffect } from 'react';
import { Visualizer } from '@/lib/mentor/interactiveVisualization';

export function MentorChat() {
  const [visualization, setVisualization] = useState<any>(null);
  const [engagementScore, setEngagementScore] = useState(0);

  const handleMessage = async (message: string) => {
    const response = await fetch('/api/mentor', {
      method: 'POST',
      body: JSON.stringify({ userMessage: message })
    });

    const data = await response.json();

    // Handle visualization
    if (data.visualization) {
      setVisualization(data.visualization);
    }

    // Update engagement metrics
    updateEngagementMetrics(data);
  };

  const updateEngagementMetrics = (response: any) => {
    if (response.metadata?.hasVisualization) {
      setEngagementScore(prev => Math.min(100, prev + 5));
    }
  };

  return (
    <div className="mentor-chat">
      {/* Chat messages */}
      
      {/* Visualization Panel */}
      {visualization && (
        <div className="visualization-panel">
          <InteractiveVisualizer visualization={visualization} />
        </div>
      )}

      {/* Progress Tracker */}
      <ProgressTracker />
    </div>
  );
}
```

## Configuration

### Environment Variables

```bash
# Enable enhanced features
ENABLE_PERSONALIZATION=true
ENABLE_DEBUG_ANALYSIS=true
ENABLE_VISUALIZATION=true

# Spaced repetition settings
REVIEW_INTERVAL_1=1
REVIEW_INTERVAL_2=3
REVIEW_INTERVAL_3=7
```

### Feature Flags

```typescript
// lib/features.ts
export const features = {
  personalization: process.env.ENABLE_PERSONALIZATION === 'true',
  debugAnalysis: process.env.ENABLE_DEBUG_ANALYSIS === 'true',
  visualization: process.env.ENABLE_VISUALIZATION === 'true',
  enhancedIntent: true // Always enabled
};
```

## Testing

### Unit Tests

```typescript
// __tests__/enhancedIntentClassifier.test.ts
describe('Enhanced Intent Classification', () => {
  it('detects confusion loops', async () => {
    const intents = [
      await classifyIntentWithContext('What does this mean?'),
      await classifyIntentWithContext('Can you clarify?'),
      await classifyIntentWithContext('I still don\'t understand')
    ];

    const analysis = analyzeIntentPattern(intents, intents[2]);
    expect(analysis.isConfusionLoop).toBe(true);
  });
});
```

### Integration Tests

```typescript
// __tests__/mentorIntegration.test.ts
describe('Mentor Integration', () => {
  it('personalizes response based on student history', async () => {
    const response = await executeMentorRequest({
      userId: 'test-user',
      problemId: 'test-problem',
      userMessage: 'How do I solve this?'
    });

    expect(response.metadata?.personalized).toBe(true);
  });
});
```

## Performance Considerations

1. **Caching**: Cache knowledge graph reads with Redis (5-minute TTL)
2. **Lazy Loading**: Load personalization data only when needed
3. **Batch Updates**: Queue concept mastery updates for bulk processing
4. **Async Processing**: Run debug analysis in background job
5. **CDN**: Serve visualization assets via CDN

## Migration Strategy

### Phase 1: Enhanced Intent (Week 1)
- Deploy intent classification
- Monitor classification accuracy
- A/B test routing decisions

### Phase 2: Personalization (Week 2-3)
- Add knowledge graph schema
- Migrate existing user data
- Enable concept tracking

### Phase 3: Debugging Assistant (Week 4)
- Deploy debug analysis
- Gradually enable for users
- Monitor performance impact

### Phase 4: Visualization (Week 5-6)
- Add visualization endpoints
- Update frontend components
- Roll out to all users

## Monitoring

### Key Metrics

```typescript
const metrics = {
  // Intent classification
  intentAccuracy: trackIntentAccuracy(),
  confusionLoopDetection: trackConfusionLoops(),
  
  // Personalization
  conceptMasteryGains: trackMasteryImprovement(),
  engagementScore: trackEngagement(),
  
  // Debugging
  bugDetectionRate: trackBugDetection(),
  fixSuccessRate: trackFixSuccess(),
  
  // Visualization
  visualizationUsage: trackVizUsage(),
  learningVelocity: trackLearningSpeed()
};
```

## Rollback Plan

If issues arise:

1. **Feature flags**: Disable enhanced features instantly
2. **Database**: Knowledge graph is additive, no data loss
3. **API**: Fall back to original intent classification
4. **Frontend**: Hide visualization panel if errors occur

## Support

For questions or issues:
- Check logs: `DEBUG=mentor:* npm run dev`
- Monitor metrics: Dashboard at `/admin/metrics`
- Review errors: `npm run logs --tail`