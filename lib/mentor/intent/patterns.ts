export type IntentType =
  | "understanding"
  | "hint_request"
  | "implementation_help"
  | "debugging"
  | "solution_request"
  | "clarification"
  | "progress_check"
  | "frustration"
  | "confirmation"
  | "off_topic"
  | "code_review"
  | "optimization"
  | "test_case_question"
  | "approach_validation"
  | "edge_case_help"
  | "pattern_recognition"
  | "transfer_learning";

const LEARNING_PHRASES = [
  "how do i solve this",
  "what code should i write",
  "how should i write",
  "how would you write",
  "what should i write",
];

const SOLUTION_REQUEST_PATTERNS = [
  /^(show|give|write|paste|drop)\s+me\s+(the\s+)?(code|solution|implementation)/i,
  /^(just|simply|please)\s+(write|code|implement|give)\s+.*?(for\s+me|me|this)/i,
  /^(i\s+)?need\s+(the\s+)?(full\s+)?(code|solution)/i,
  /^(complete|full|working)\s+(code|solution|implementation)/i,
];

export const INTENT_PATTERNS: Record<IntentType, { keywords: string[]; weight: number; patterns: RegExp[] }> = {
  understanding: {
    keywords: [
      "what is", "what are", "explain", "how does", "meaning of",
      "difference between", "compare", "vs", "versus", "definition",
      "why do we", "why use", "purpose of", "concept of",
      "how would you describe", "what does this mean",
      "don't know where to start", "where to start",
      "i don't know", "not sure where"
    ],
    weight: 1.0,
    patterns: [
      /^\s*explain\b/i,
      /^\s*what (is|are)\b/i,
      /^\s*meaning of\b/i,
    ]
  },
  hint_request: {
    keywords: [
      "hint", "clue", "tip", "suggestion", "guide me", "nudge",
      "point me", "direction", "where to look", "what to consider",
      "help me get started", "next step", "gentle push",
      "guidance", "focus on", "what to focus",
    ],
    weight: 0.95,
    patterns: [
      /i['"]?m (still )?stuck/i,
      /need some (guidance|help|direction)/i,
      /\bgiv\b.*\bhnt\b/i,
      /\bgive me a hint/i,
    ]
  },
  implementation_help: {
    keywords: [
      "how do I code", "how to implement",
      "write the function", "implement this section",
      "how should I write", "coding this", "translate to code",
      "how would the code look", "syntax for this",
      "how should i approach", "what's the best way",
      "which algorithm should i use",
      "should i use",
    ],
    weight: 0.9,
    patterns: [
      /how (should|do|can) (i|we) (approach|solve|implement)/i,
      /what['"]?s the best (way|approach|algorithm|strategy)/i,
      /which (algorithm|approach|technique|data structure)/i,
      /best (way|approach|method) to (solve|implement|approach)/i,
      /\b(should i use|would you use|do i use)\b/i,
    ]
  },
  debugging: {
    keywords: [
      "why is my code", "why does my code", "my code is", "my solution",
      "my code fails", "not working", "wrong answer", "runtime error",
      "output is wrong", "expected output", "actual output",
      "test case fails", "error in my", "bug in my",
      "failing test", "wrong result",
      "what's wrong", "wrong with", "isn't working",
    ],
    weight: 1.0,
    patterns: [
      /my code (is|does|fails)/i,
      /why (isn't|is not|doesn't|is) (this|it) (not\s+)?(working|wrong|failing)/i,
      /what['"]?s wrong with/i,
      /(getting|having) (an )?error/i,
    ]
  },
  solution_request: {
    keywords: [
      "give me the solution", "show me the code", "write the code",
      "complete solution", "full implementation", "answer please",
      "just tell me", "what's the answer", "final code",
      "paste the solution", "drop the solution",
      "show me how to solve completely",
      "just write it", "just code it",
      "the working solution", "optimal code",
      "show me the implementation",
      "could you write this",
      "i need the answer",
      "i need the code",
      "write the complete",
      "full working code",
      "show me a working",
      "optimal code",
      "working solution",
      "complete code",
      "implementation of this",
      "code for this",
      "write this code",
      "show me the complete",
      "show me full",
      "just give me",
      "can you write this",
      "can you code this",
      "implement this for me",
      "write the function",
      "code this",
      "show me exactly",
      "what's the implementation",
    ].filter(k => !LEARNING_PHRASES.some(p => k.startsWith(p))),
    weight: 1.0,
    patterns: [
      /^(just|simply|please)\s+(write|show|give)\s+(me|the|this|it)/i,
      /^(show|give|write)\s+(me|us|the)\s+(solution|code|implementation)/i,
      /^(can\s+you\s+)?(just\s+)?(write|show|give|code|implement)\b.*?(for\s+me|please)\b/i,
      /\b(need|want)\s+(the\s+)?(code|solution|implementation)\b/i,
    ]
  },
  clarification: {
    keywords: [
      "what does this mean", "clarify", "confused by", "not sure about",
      "does this mean", "is this saying", "problem statement",
      "explain again", "what exactly", "elaborate",
      "don't understand the", "i don't understand",
    ],
    weight: 0.85,
    patterns: []
  },
  progress_check: {
    keywords: [
      "am i right", "am i correct", "is this correct", "on the right track",
      "does this work", "will this pass", "is my approach right",
      "checking if", "verify my", "is this the right way"
    ],
    weight: 0.9,
    patterns: []
  },
  frustration: {
    keywords: [
      "frustrated", "can't figure", "giving up", "too hard",
      "impossible", "discouraged",
      "overwhelmed", "confused", "lost", "need help badly",
      "i give up", "screw this", "what the hell",
      "tired of this", "fed up", "not getting this",
      "hate this", "useless",
      "ayúdame", "ayudame", "problema",
    ],
    weight: 0.9,
    patterns: [
      /i'm (so|very|really) (frustrated|confused)/i,
      /(giving up|fed up)\s+(with|on)/i,
      /help me with this\b/i,
      /i need assistance\b/i,
      /stuck and (can't|cannot)/i,
      /i['"]?m (still )?(stuck|lost|confused)\b/i,
      /keep (getting|seeing|having) (the same|an) error/i,
    ]
  },
  off_topic: {
    keywords: [
      "favorite", "weather", "joke", "movie", "music", "game",
      "chatgpt", "gpt", "ai model", "who are you", "how old",
      "created you", "your opinion", "think about", "unrelated"
    ],
    weight: 0.9,
    patterns: []
  },
  code_review: {
    keywords: [
      "review my code", "feedback on code", "improve my code",
      "refactor", "clean up", "optimize this", "better way to write",
      "code quality", "style issue", "can you review",
      "critique my"
    ],
    weight: 0.95,
    patterns: []
  },
  optimization: {
    keywords: [
      "time complexity", "space complexity", "big o", "O(n)",
      "faster", "more efficient", "optimize", "performance",
      "memory usage", "reduce time", "better complexity",
      "can we make this", "improve the speed",
      "times out", "too slow", "timed out",
    ],
    weight: 1.0,
    patterns: [
      /times?\s+out\b/i,
      /passes.*test.*but/i,
      /(too\s+slow|very\s+slow|runs?\s+slow)/i,
      /\bO\s*\(n/i,
    ]
  },
  test_case_question: {
    keywords: [
      "test case", "input", "output for", "what about", "edge case",
      "boundary", "example with", "try this", "handle when",
      "what if the input is", "corner case"
    ],
    weight: 0.85,
    patterns: []
  },
  approach_validation: {
    keywords: [
      "is my approach", "is this approach", "is the strategy",
      "am i on the right path", "is this the right way",
      "is this correct", "does this make sense",
      "is this a valid"
    ],
    weight: 0.9,
    patterns: []
  },
  edge_case_help: {
    keywords: [
      "edge case", "corner case", "boundary", "empty array",
      "single element", "null", "undefined", "what about when",
      "handle the case", "special case", "what about edge cases", "empty input",
    ],
    weight: 0.85,
    patterns: [
      /what about (edge|corner) cases?/i,
      /handle (empty|null|edge|boundary) (input|case)/i,
    ]
  },
  pattern_recognition: {
    keywords: [
      "what pattern", "which pattern", "sliding window",
      "two pointer", "binary search", "dynamic programming",
      "backtracking", "greedy", "hash map", "recursion",
      "graph", "tree", "matches", "similar to",
      "reminds me of", "same as"
    ],
    weight: 0.9,
    patterns: []
  },
  transfer_learning: {
    keywords: [
      "how is this like", "similar to", "same as",
      "like the previous", "compared to", "just like",
      "similar problem", "transfer this", "apply here"
    ],
    weight: 0.8,
    patterns: []
  },
  confirmation: {
    keywords: [
      "yes", "correct", "right", "exactly", "true", "yep", "affirmative",
      "makes sense", "understand", "i get it", "i see",
    ],
    weight: 0.8,
    patterns: [
      /^(yes|correct|right|exactly)$/i,
      /is (this|that|my|it) (right|correct|on the right track|approach correct)/i,
      /am i (right|correct)/i,
      /is my approach (right|correct)/i,
    ]
  },
};
