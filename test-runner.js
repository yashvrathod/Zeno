#!/usr/bin/env node

/**
 * Quick Test Runner for AI Mentor
 *
 * This script provides an easy way to run tests and analyze AI failures
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function color(color, text) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

function printHeader(text) {
  console.log('\n' + color('cyan', '═'.repeat(60)));
  console.log(color('cyan', `  ${text}`));
  console.log(color('cyan', '═'.repeat(60)) + '\n');
}

function printSuccess(text) {
  console.log(color('green', `✓ ${text}`));
}

function printError(text) {
  console.log(color('red', `✗ ${text}`));
}

function printInfo(text) {
  console.log(color('blue', `ℹ ${text}`));
}

function printWarning(text) {
  console.log(color('yellow', `⚠ ${text}`));
}

function runCommand(command, description) {
  printInfo(description);
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    printSuccess(description);
    return { success: true, output };
  } catch (error) {
    printError(`${description} failed`);
    return { success: false, error: error.message };
  }
}

function checkDependencies() {
  printHeader('Checking Dependencies');

  const dependencies = ['jest', 'typescript', '@types/jest', 'ts-jest'];
  let missing = [];

  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    dependencies.forEach(dep => {
      if (!allDeps[dep]) {
        missing.push(dep);
      }
    });
  } catch (error) {
    printError('Could not read package.json');
    return false;
  }

  if (missing.length > 0) {
    printError(`Missing dependencies: ${missing.join(', ')}`);
    printInfo('Install them with: npm install --save-dev ' + missing.join(' '));
    return false;
  }

  printSuccess('All dependencies installed');
  return true;
}

function checkTestFiles() {
  printHeader('Checking Test Files');

  const testDir = path.join(__dirname, 'lib', 'mentor', '__tests__');
  const testFiles = [
    'aiFailureDetection.test.ts',
    'intentClassificationFailure.test.ts',
    'contextBuildingFailure.test.ts',
    'integrationScenarios.test.ts',
    'stageEngine.test.ts'
  ];

  let existing = [];
  let missing = [];

  testFiles.forEach(file => {
    const filePath = path.join(testDir, file);
    if (fs.existsSync(filePath)) {
      existing.push(file);
    } else {
      missing.push(file);
    }
  });

  if (existing.length > 0) {
    printSuccess(`Found ${existing.length} test files`);
    existing.forEach(file => printInfo(`  - ${file}`));
  }

  if (missing.length > 0) {
    printWarning(`Missing ${missing.length} test files`);
    missing.forEach(file => printInfo(`  - ${file}`));
  }

  return missing.length === 0;
}

function runQuickTests() {
  printHeader('Running Quick Tests');

  printInfo('This will run a subset of tests to quickly identify major issues\n');

  const result = runCommand(
    'npm test -- --testPathPattern="aiFailureDetection|intentClassificationFailure" --verbose',
    'Running quick failure detection tests'
  );

  return result.success;
}

function runAllTests() {
  printHeader('Running All Tests');

  const result = runCommand(
    'npm test',
    'Running complete test suite'
  );

  return result.success;
}

function runCoverage() {
  printHeader('Running Coverage Analysis');

  const result = runCommand(
    'npm run test:coverage',
    'Generating coverage report'
  );

  if (result.success) {
    printInfo('Coverage report generated in coverage/ directory');
    printInfo('Open coverage/index.html in your browser for detailed report');
  }

  return result.success;
}

function analyzeResults() {
  printHeader('Test Results Analysis');

  // Check if coverage report exists
  const coverageDir = path.join(__dirname, 'coverage');
  if (fs.existsSync(coverageDir)) {
    printSuccess('Coverage report available');

    // Look for coverage summary
    const coverageFile = path.join(coverageDir, 'coverage-final.json');
    if (fs.existsSync(coverageFile)) {
      try {
        const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
        printInfo('Coverage metrics available in coverage-final.json');
      } catch (error) {
        printWarning('Could not parse coverage data');
      }
    }
  } else {
    printWarning('No coverage report found. Run with: npm run test:coverage');
  }

  console.log('\n' + color('magenta', 'Next Steps:'));
  console.log('1. Review failed tests to identify AI issues');
  console.log('2. Check coverage report for untested code');
  console.log('3. Add tests for new failure patterns');
  console.log('4. Fix identified issues in the AI mentor');
}

function showMenu() {
  console.log('\n' + color('cyan', '╔══════════════════════════════════════════════════════════╗'));
  console.log(color('cyan', '║') + '  AI Mentor Test Runner - Choose an action:              ' + color('cyan', '║'));
  console.log(color('cyan', '╠══════════════════════════════════════════════════════════╣'));
  console.log(color('cyan', '║') + '  1. Run quick tests (failure detection)                ' + color('cyan', '║'));
  console.log(color('cyan', '║') + '  2. Run all tests                                      ' + color('cyan', '║'));
  console.log(color('cyan', '║') + '  3. Run coverage analysis                              ' + color('cyan', '║'));
  console.log(color('cyan', '║') + '  4. Check setup and dependencies                       ' + color('cyan', '║'));
  console.log(color('cyan', '║') + '  5. Analyze previous results                           ' + color('cyan', '║'));
  console.log(color('cyan', '║') + '  6. Run tests in watch mode                            ' + color('cyan', '║'));
  console.log(color('cyan', '║') + '  0. Exit                                              ' + color('cyan', '║'));
  console.log(color('cyan', '╚══════════════════════════════════════════════════════════╝'));
}

function main() {
  console.log('\n' + color('magenta', '🤖 AI Mentor Test Suite'));
  console.log(color('magenta', '═════════════════════════════════════════════════════════'));

  const args = process.argv.slice(2);

  if (args.length === 0) {
    showMenu();
    console.log('\nUsage: node test-runner.js [option]');
    console.log('Or run directly: npm test');
    return;
  }

  const option = args[0];

  switch (option) {
    case '1':
    case 'quick':
      if (!checkDependencies()) return;
      runQuickTests();
      break;

    case '2':
    case 'all':
      if (!checkDependencies()) return;
      runAllTests();
      break;

    case '3':
    case 'coverage':
      if (!checkDependencies()) return;
      runCoverage();
      break;

    case '4':
    case 'check':
      checkDependencies();
      checkTestFiles();
      break;

    case '5':
    case 'analyze':
      analyzeResults();
      break;

    case '6':
    case 'watch':
      if (!checkDependencies()) return;
      printInfo('Starting tests in watch mode...');
      execSync('npm run test:watch', { stdio: 'inherit' });
      break;

    case '0':
    case 'exit':
      printInfo('Goodbye!');
      break;

    default:
      printError(`Unknown option: ${option}`);
      showMenu();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  runQuickTests,
  runAllTests,
  runCoverage,
  checkDependencies,
  checkTestFiles,
  analyzeResults
};