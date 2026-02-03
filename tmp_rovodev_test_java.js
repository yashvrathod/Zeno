// Test script to verify Java execution fix
const testJavaExecution = async () => {
  const testCode = `class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[] {};
    }
}`;

  const testCases = [
    { nums: [2, 7, 11, 15], target: 9, expected: [0, 1] },
    { nums: [3, 2, 4], target: 6, expected: [1, 2] },
    { nums: [3, 3], target: 6, expected: [0, 1] }
  ];

  try {
    const response = await fetch('http://localhost:3000/api/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: testCode,
        language: 'java',
        testCases: testCases
      })
    });

    const result = await response.json();
    console.log('Test Results:', JSON.stringify(result, null, 2));
    
    if (result.results) {
      const allPassed = result.results.every(r => r.passed);
      console.log('\n' + (allPassed ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED'));
      result.results.forEach((r, i) => {
        console.log(`Test ${i + 1}: ${r.passed ? '✅' : '❌'} - ${r.status}`);
        if (!r.passed) {
          console.log(`  Input: ${r.input}`);
          console.log(`  Expected: ${r.expected}`);
          console.log(`  Actual: ${r.actual}`);
          if (r.error) console.log(`  Error: ${r.error}`);
        }
      });
    }
  } catch (error) {
    console.error('Error testing Java execution:', error);
  }
};

testJavaExecution();
