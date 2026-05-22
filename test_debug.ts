import { validateAIResponse } from '@/lib/responseValidator';

const response = `Here's the complete solution:

\`\`\`python
class Solution:
    def solve(self, nums, target):
        seen = {}
        for i, num in enumerate(nums):
            complement = target - num
            if complement in seen:
                return [seen[complement], i]
            seen[num] = i
        return []
\`\`\`

This works perfectly.`;

const result = validateAIResponse(response, 'EXPLORE');
console.log(JSON.stringify({
  isValid: result.isValid,
  violationType: result.violationType,
  rewrittenResponse: result.rewrittenResponse,
  stageAssessment: result.stageAssessment,
}, null, 2));
