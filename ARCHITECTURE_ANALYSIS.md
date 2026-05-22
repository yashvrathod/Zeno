# Code.zone Architecture Analysis

## High-Level Architecture Overview

Code.zone is a Next.js-based DSA learning platform with an AI-powered Socratic mentor system. The application combines social features, personalized learning, and intelligent code analysis to create a comprehensive coding education platform.

### Core Technologies
- **Frontend**: Next.js 16.1.6, React 19.2.3, TypeScript
- **Backend**: Next.js API routes, PostgreSQL with Prisma ORM
- **AI/ML**: OpenAI, Groq, OpenRouter, Transformers.js
- **UI**: TailwindCSS, Radix UI, Lucide React, Framer Motion
- **Auth**: NextAuth.js 5.0
- **Database**: PostgreSQL with pgvector extension

## Folder Structure

```
code.zone/
├── app/                    # Next.js app router
│   ├── api/               # API routes (36 endpoints)
│   ├── auth/              # Authentication pages
│   ├── problems/          # DSA problem pages
│   ├── dashboard/         # User dashboard
│   ├── debug/             # Debug tools
│   └── profile/           # User profiles
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components (15 items)
│   └── [specialized]/     # Feature-specific components
├── lib/                  # Core business logic
│   ├── mentor/           # AI mentor system (31 files)
│   ├── executor/         # Code execution engine
│   ├── [services]/       # Various service modules
├── prisma/              # Database schema & migrations
└── types/               # TypeScript type definitions
```

## Responsibility Map

### Core Systems

#### 1. Mentor System (`lib/mentor/`)
**Purpose**: AI-powered Socratic teaching engine
- **patternTracker.ts**: Static code analysis for weak pattern detection
- **personalizationEngine.ts**: User knowledge graph management
- **enhancedDebuggingAssistant.ts**: Intelligent debugging analysis
- **interactiveVisualization.ts**: Code visualization generation
- **services/mentorService.ts**: Main orchestrator
- **[other services]**: Specialized handlers for different aspects

#### 2. API Layer (`app/api/`)
**Purpose**: HTTP interface for all functionality
- **mentor/**: Core mentor interactions (8 endpoints)
- **problems/**: Problem management (4 endpoints)
- **posts/**: Social features (3 endpoints)
- **auth/**: Authentication (2 endpoints)
- **[other]**: Various utility endpoints

#### 3. Database Layer (`prisma/`)
**Purpose**: Data persistence with 20+ models
- **User Management**: User, UserAiSettings, StudentProfile
- **Problems**: Problem, Pattern, TestCase, Hint
- **Mentoring**: MentorSession, MentorMessage, MentorConversationSummary
- **Social**: Post, Comment, PostLike, Follow
- **Personalization**: UserKnowledgeGraph, ConceptMastery, LearningPattern

#### 4. UI Components (`components/`)
**Purpose**: Reusable interface elements
- **MentorChat.tsx**: Main mentor interaction interface
- **AnimationPlayer.tsx**: Code visualization player
- **ApiOnboardingDialog.tsx**: User onboarding
- **[ui/]/**: Base component library

## Data Flow Maps

### 1. Mentor Pipeline Flow
```
User Question → API/mentor → mentorService.execute
├── Session Management (stageEngine)
├── Intent Classification (enhancedIntentClassifier)
├── Pattern Detection (patternTracker)
├── Routing Decision (interactionRouter)
│   ├── STATIC → Static response
│   ├── CACHE_HIT → Cache response
│   └── AI_NEEDED → Full AI processing
└── Response Generation → Client
```

### 2. Personalization Flow
```
User Interaction → personalizationEngine
├── Knowledge Graph Update
├── Concept Mastery Tracking
├── Learning Pattern Analysis
└── Adaptive Response Generation
```

### 3. Code Execution Flow
```
User Code → API/execute → executor/
├── Syntax Check
├── Test Execution
├── Performance Analysis
└── Results → Client
```

### 4. Debug Pipeline Flow
```
Error Detection → enhancedDebuggingAssistant
├── Static Analysis
├── Error Classification
├── Suggestion Generation
└── Visual Debug Aids
```

## Architectural Strengths

### 1. **Modular Design**
- Clear separation of concerns between mentor, API, database, and UI layers
- Well-organized service architecture with specialized handlers

### 2. **Intelligent Caching Strategy**
- Multi-layer caching: exact matches, semantic similarity, soft cache
- Request coalescing to prevent duplicate AI calls
- API key pool rotation for rate limit management

### 3. **Advanced AI Integration**
- Multiple AI provider support (OpenAI, Groq, OpenRouter)
- Intent classification with conversation context
- Personalized responses based on user knowledge graph

### 4. **Comprehensive Data Model**
- Rich user profiling with learning patterns
- Detailed mentoring session tracking
- Social features with engagement metrics

## Architectural Weaknesses

### 1. **God Files**
- **mentorService.ts** (511 lines): Main orchestrator doing too much
- **patternTracker.ts** (1071 lines): Massive file with duplicated pattern metadata
- **debug.ts** (358 lines): Over-engineered logging system

### 2. **Tight Coupling**
- Mentor services directly coupled to Prisma models
- UI components tightly coupled to specific API endpoints
- Lack of abstraction layers between systems

### 3. **Code Duplication**
- Pattern metadata duplicated in patternTracker.ts (lines 48-167 and 168-232)
- Similar validation logic across multiple API endpoints
- Repeated error handling patterns

### 4. **Scalability Risks**
- No message queue system for background processing
- Direct database queries without connection pooling optimization
- Client-side state management without proper normalization

### 5. **Missing Abstractions**
- No repository pattern for data access
- No dependency injection container
- No proper event system for cross-module communication

## Suggested Refactors

### 1. **Break Down God Files**
```typescript
// Split mentorService.ts into:
- MentorOrchestrator (coordination only)
- RequestProcessor (request handling)
- ResponseBuilder (response formatting)
- SessionManager (session lifecycle)
```

### 2. **Introduce Repository Pattern**
```typescript
// Abstract data access
interface IUserRepository {
  findById(id: string): Promise<User>;
  updateStats(userId: string, stats: UserStats): Promise<void>;
}
```

### 3. **Implement Event System**
```typescript
// Decouple modules with events
eventBus.emit('user.submitted_code', { userId, problemId, code });
eventBus.on('user.submitted_code', handleCodeSubmission);
```

### 4. **Create Service Layer**
```typescript
// Business logic layer
class MentorService {
  constructor(
    private userRepository: IUserRepository,
    private aiProvider: IAIProvider,
    private cacheService: ICacheService
  ) {}
}
```

### 5. **Add Background Processing**
```typescript
// Queue system for heavy operations
await queue.add('analyze_patterns', { userId, code });
await queue.add('update_knowledge_graph', { userId, concepts });
```

## Recommended Extension Points

### 1. **New AI Providers**
- Implement `IAIProvider` interface
- Add to `llmClient.ts` provider registry
- Update user settings UI

### 2. **New Problem Types**
- Extend `Problem` model with new fields
- Add specialized handlers in mentor system
- Update UI components for new interactions

### 3. **Additional Social Features**
- Extend social models (Post, Comment, etc.)
- Add new API endpoints following existing patterns
- Create corresponding UI components

### 4. **Analytics Integration**
- Add analytics models to database
- Implement tracking middleware
- Create dashboard components

### 5. **Mobile App Support**
- Extract API logic to shared package
- Create mobile-specific UI components
- Implement authentication for mobile

## Integration Guidelines

### Before Adding New Features:

1. **Identify Affected Modules**
   - Check mentor system if AI-related
   - Check API layer if new endpoints needed
   - Check database models if new data required

2. **Understand Dependencies**
   - Mentor features depend on: patternTracker, personalizationEngine, debug system
   - API endpoints depend on: auth, rate limiting, validation
   - UI components depend on: state management, API clients

3. **Plan Integration Points**
   - Use existing patterns for new endpoints
   - Follow mentor service architecture for AI features
   - Maintain consistency with existing UI patterns

4. **Avoid Breaking Changes**
   - Add new fields as optional when extending models
   - Use feature flags for experimental features
   - Maintain backward compatibility in API responses

### Best Practices:

1. **Follow Existing Patterns**
   - Use the same error handling approach
   - Follow the same validation patterns
   - Use the same response formatting

2. **Maintain Separation of Concerns**
   - Keep business logic in services
   - Keep data access in repositories
   - Keep UI logic in components

3. **Test Thoroughly**
   - Add unit tests for new services
   - Add integration tests for API endpoints
   - Test UI components with different states

This architecture provides a solid foundation for a scalable DSA learning platform while maintaining flexibility for future enhancements.
