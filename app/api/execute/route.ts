import { NextRequest, NextResponse } from 'next/server';

// Piston Language Identifiers (FREE API!)
const LANGUAGE_CONFIG: Record<string, { language: string; version: string }> = {
  javascript: { language: 'javascript', version: '18.15.0' }, // Node.js
  python: { language: 'python', version: '3.10.0' },
  java: { language: 'java', version: '15.0.2' },
  cpp: { language: 'c++', version: '10.2.0' },
};

export async function POST(request: NextRequest) {
  try {
    const { code, language, testCases } = await request.json();

    const langConfig = LANGUAGE_CONFIG[language];
    if (!langConfig) {
      return NextResponse.json(
        { error: `Language ${language} is not supported` },
        { status: 400 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_PISTON_API_URL || 'https://emkc.org/api/v2/piston';
    const results = [];

    // Run each test case
    for (const testCase of testCases) {
      // Prepare the code with test case input
      let fullCode = '';
      let fileName = 'Main';
      
      if (language === 'javascript') {
        fullCode = `
${code}

// Test case
const nums = ${JSON.stringify(testCase.nums)};
const target = ${testCase.target};
const result = twoSum(nums, target);
console.log(JSON.stringify(result));
`;
        fileName = 'solution.js';
      } else if (language === 'python') {
        fullCode = `
${code}

# Test case
nums = ${JSON.stringify(testCase.nums)}
target = ${testCase.target}
solution = Solution()
result = solution.twoSum(nums, target)
print(result)
`;
        fileName = 'solution.py';
      } else if (language === 'java') {
        // Check if user code contains Solution class
        const hasSolutionClass = code.includes('class Solution');
        
        if (hasSolutionClass) {
          // User provided Solution class, wrap it with Main
          fullCode = `
import java.util.*;

${code}

public class Main {
    public static void main(String[] args) {
        Solution solution = new Solution();
        int[] nums = {${testCase.nums.join(', ')}};
        int target = ${testCase.target};
        int[] result = solution.twoSum(nums, target);
        System.out.println(Arrays.toString(result));
    }
}
`;
        } else {
          // User provided only method, create full Solution class
          fullCode = `
import java.util.*;

class Solution {
    ${code}
}

public class Main {
    public static void main(String[] args) {
        Solution solution = new Solution();
        int[] nums = {${testCase.nums.join(', ')}};
        int target = ${testCase.target};
        int[] result = solution.twoSum(nums, target);
        System.out.println(Arrays.toString(result));
    }
}
`;
        }
        fileName = 'Main.java';
      } else if (language === 'cpp') {
        fullCode = `
#include <iostream>
#include <vector>
using namespace std;

${code}

int main() {
    Solution solution;
    vector<int> nums = {${testCase.nums.join(', ')}};
    int target = ${testCase.target};
    vector<int> result = solution.twoSum(nums, target);
    cout << "[";
    for (int i = 0; i < result.size(); i++) {
        cout << result[i];
        if (i < result.size() - 1) cout << ", ";
    }
    cout << "]" << endl;
    return 0;
}
`;
        fileName = 'solution.cpp';
      }

      // Submit to Piston API
      const submissionResponse = await fetch(`${apiUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: langConfig.language,
          version: langConfig.version,
          files: [
            {
              name: fileName,
              content: fullCode,
            },
          ],
          stdin: '',
          args: [],
          compile_timeout: 10000,
          run_timeout: 3000,
          compile_memory_limit: -1,
          run_memory_limit: -1,
        }),
      });

      if (!submissionResponse.ok) {
        const errorText = await submissionResponse.text();
        console.error('Piston submission error:', errorText);
        throw new Error(`Piston API error: ${submissionResponse.status}`);
      }

      const submission = await submissionResponse.json();

      // Parse the output
      let output = '';
      let passed = false;
      let error = null;

      // Check for compilation or runtime errors
      if (submission.compile && submission.compile.stderr) {
        error = submission.compile.stderr;
      } else if (submission.run && submission.run.stderr) {
        error = submission.run.stderr;
      } else if (submission.run && submission.run.stdout) {
        output = submission.run.stdout.trim();
        
        // Parse the output and compare with expected
        try {
          let actualResult;
          if (language === 'java' || language === 'cpp') {
            // Parse "[0, 1]" format
            actualResult = JSON.parse(output.replace(/\[/g, '[').replace(/\]/g, ']'));
          } else if (language === 'python') {
            // Python outputs as [0, 1] without quotes
            actualResult = JSON.parse(output.replace(/'/g, '"'));
          } else {
            actualResult = JSON.parse(output);
          }
          
          passed = JSON.stringify(actualResult.sort()) === JSON.stringify(testCase.expected.sort());
        } catch {
          output = submission.run.stdout?.trim() || 'No output';
          passed = false;
        }
      } else {
        error = 'No output produced';
      }

      results.push({
        passed,
        input: `nums = [${testCase.nums.join(', ')}], target = ${testCase.target}`,
        expected: JSON.stringify(testCase.expected),
        actual: output || error || 'No output',
        status: error ? 'Runtime Error' : (passed ? 'Accepted' : 'Wrong Answer'),
        time: submission.run?.code === 0 ? '< 0.1' : null,
        memory: null, // Piston doesn't provide memory info
        error: error,
      });
    }

    return NextResponse.json({ results });
  } catch (error: unknown) {
    console.error('Execution error:', error);
    const message = error instanceof Error ? error.message : 'Failed to execute code';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
