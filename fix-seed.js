const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, 'prisma', 'seed.js');
let content = fs.readFileSync(seedPath, 'utf8');

// Replace the testCase.create block with upsert
const oldCreate = `// Create test cases
for (const tc of problem.testCases) {
  await prisma.testCase.create({
    data: {
      problemId: p.id,
      order: tc.isHidden ? 99 : problem.testCases.indexOf(tc) + 1,
      input: tc.input,
      expected: tc.expected,
      isHidden: tc.isHidden,
    },
  });
}`;

const newUpsert = `// Create test cases
for (const tc of problem.testCases) {
  const order = tc.isHidden ? 99 : problem.testCases.indexOf(tc) + 1;
  await prisma.testCase.upsert({
    where: {
      problemId_order_isHidden: {
        problemId: p.id,
        order,
        isHidden: tc.isHidden,
      },
    },
    update: {},
    create: {
      problemId: p.id,
      order,
      input: tc.input,
      expected: tc.expected,
      isHidden: tc.isHidden,
    },
  });
}`;

content = content.replace(oldCreate, newUpsert);

// Also replace hints and hints upsert
const oldHints = `// Create hints
for (const hint of problem.hints) {
  await prisma.hint.create({
    data: {
      problemId: p.id,
      text: hint.text,
      type: hint.type,
      escalationLevel: hint.escalationLevel,
    },
  });
}`;

const newHints = `// Create hints
for (const hint of problem.hints) {
  await prisma.hint.upsert({
    where: {
      problemId_escalationLevel: {
        problemId: p.id,
        escalationLevel: hint.escalationLevel,
      },
    },
    update: {},
    create: {
      problemId: p.id,
      text: hint.text,
      type: hint.type,
      escalationLevel: hint.escalationLevel,
    },
  });
}`;

content = content.replace(oldHints, newHints);

fs.writeFileSync(seedPath, content);
console.log('Fixed seed.js with upsert instead of create');
