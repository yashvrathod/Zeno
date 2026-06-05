import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Prisma } from "@prisma/client";

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Cannot run seed.");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

type ParamType = { name: string; type: string };

type ProblemSpec = {
  slug: string;
  methodName: string;
  paramTypes: ParamType[];
  returnType: string;
};

const PROBLEM_SPECS: ProblemSpec[] = [
  {
    slug: "valid-palindrome",
    methodName: "solution",
    paramTypes: [{ name: "s", type: "string" }],
    returnType: "boolean",
  },
  {
    slug: "two-sum",
    methodName: "twoSum",
    paramTypes: [
      { name: "nums", type: "number[]" },
      { name: "target", type: "number" },
    ],
    returnType: "number[]",
  },
  {
    slug: "binary-search",
    methodName: "solution",
    paramTypes: [
      { name: "nums", type: "number[]" },
      { name: "target", type: "number" },
    ],
    returnType: "number",
  },
  {
    slug: "number-of-islands",
    methodName: "solution",
    paramTypes: [{ name: "grid", type: "number[][]" }],
    returnType: "number",
  },
  {
    slug: "climbing-stairs",
    methodName: "solution",
    paramTypes: [{ name: "n", type: "number" }],
    returnType: "number",
  },
  {
    slug: "tp-01-royal-banquet-pairing",
    methodName: "twoSum",
    paramTypes: [
      { name: "nums", type: "number[]" },
      { name: "target", type: "number" },
    ],
    returnType: "number[]",
  },
  {
    slug: "tp-02-wizard-triplet-spell",
    methodName: "threeSum",
    paramTypes: [{ name: "nums", type: "number[]" }],
    returnType: "number[][]",
  },
  {
    slug: "tp-03-harbour-container-stack",
    methodName: "solution",
    paramTypes: [{ name: "heights", type: "number[]" }],
    returnType: "number",
  },
  {
    slug: "tp-05-plague-doctor-quarantine",
    methodName: "solution",
    paramTypes: [{ name: "nums", type: "number[]" }],
    returnType: "number[]",
  },
  {
    slug: "tp-11-flood-model-trapped-rainwater",
    methodName: "solution",
    paramTypes: [{ name: "heights", type: "number[]" }],
    returnType: "number",
  },
  {
    slug: "tp-12-oracle-mirror-validation",
    methodName: "isPalindrome",
    paramTypes: [{ name: "s", type: "string" }],
    returnType: "boolean",
  },
];

const DEFAULT_TS = `function solution() {
  // your code here
}
`;

function jsStarter(spec: ProblemSpec): string {
  const params = spec.paramTypes.map((p) => p.name).join(", ");
  return `function ${spec.methodName}(${params}) {
  // your code here
}
`;
}

function tsStarter(spec: ProblemSpec): string {
  const params = spec.paramTypes
    .map((p) => `${p.name}: ${tsType(p.type)}`)
    .join(", ");
  const ret = tsType(spec.returnType);
  return `function ${spec.methodName}(${params}): ${ret} {
  // your code here
  return ${defaultReturn(spec.returnType)};
}
`;
}

function pythonStarter(spec: ProblemSpec): string {
  const params = spec.paramTypes.map((p) => p.name).join(", ");
  return `def ${spec.methodName}(${params}):
    # your code here
    ${defaultPythonReturn(spec.returnType)}
`;
}

function javaStarter(spec: ProblemSpec): string {
  const params = spec.paramTypes
    .map((p) => `${javaType(p.type)} ${p.name}`)
    .join(", ");
  const ret = javaType(spec.returnType);
  return `class Main {
    public static ${ret} ${spec.methodName}(${params}) {
        // your code here
        return ${defaultJavaReturn(spec.returnType)};
    }
}
`;
}

function cppStarter(spec: ProblemSpec): string {
  const params = spec.paramTypes
    .map((p) => `${cppType(p.type)} ${p.name}`)
    .join(", ");
  const ret = cppType(spec.returnType);
  return `#include <vector>
#include <string>
using namespace std;

class Main {
public:
    ${ret} ${spec.methodName}(${params}) {
        // your code here
        ${defaultCppReturn(spec.returnType)}
    }
};
`;
}

function tsType(t: string): string {
  if (t === "number[]") return "number[]";
  if (t === "number[][]") return "number[][]";
  if (t === "string[]") return "string[]";
  if (t === "boolean") return "boolean";
  if (t === "number") return "number";
  if (t === "string") return "string";
  return "unknown";
}

function javaType(t: string): string {
  if (t === "number[]") return "int[]";
  if (t === "number[][]") return "int[][]";
  if (t === "string[]") return "String[]";
  if (t === "boolean") return "boolean";
  if (t === "number") return "int";
  if (t === "string") return "String";
  return "Object";
}

function cppType(t: string): string {
  if (t === "number[]") return "vector<int>";
  if (t === "number[][]") return "vector<vector<int>>";
  if (t === "string[]") return "vector<string>";
  if (t === "boolean") return "bool";
  if (t === "number") return "int";
  if (t === "string") return "string";
  return "auto";
}

function defaultReturn(t: string): string {
  if (t === "boolean") return "false";
  if (t === "number") return "0";
  if (t === "number[]") return "[]";
  if (t === "number[][]") return "[]";
  if (t === "string") return '""';
  return "undefined";
}

function defaultPythonReturn(t: string): string {
  if (t === "boolean") return "return False";
  if (t === "number") return "return 0";
  if (t === "number[]") return "return []";
  if (t === "number[][]") return "return []";
  if (t === "string") return 'return ""';
  return "return None";
}

function defaultJavaReturn(t: string): string {
  if (t === "boolean") return "false";
  if (t === "number") return "0";
  if (t === "number[]") return "new int[0]";
  if (t === "number[][]") return "new int[0][]";
  if (t === "string") return '""';
  return "null";
}

function defaultCppReturn(t: string): string {
  if (t === "boolean") return "return false;";
  if (t === "number") return "return 0;";
  if (t === "number[]") return "return {};";
  if (t === "number[][]") return "return {};";
  if (t === "string") return 'return "";';
  return "return {};";
}

function buildStarterCode(spec: ProblemSpec): Prisma.InputJsonValue {
  return {
    javascript: jsStarter(spec),
    typescript: tsStarter(spec),
    python: pythonStarter(spec),
    java: javaStarter(spec),
    cpp: cppStarter(spec),
  };
}

async function main() {
  const prisma = createPrismaClient();

  const problems = await prisma.problem.findMany({
    select: { id: true, slug: true },
  });

  let sigCount = 0;
  let starterCount = 0;
  let skipped: string[] = [];

  for (const spec of PROBLEM_SPECS) {
    const problem = problems.find((p) => p.slug === spec.slug);
    if (!problem) {
      skipped.push(spec.slug);
      continue;
    }

    await prisma.problemSignature.upsert({
      where: { problemId: problem.id },
      create: {
        problemId: problem.id,
        className: null,
        methodName: spec.methodName,
        paramTypes: spec.paramTypes as unknown as Prisma.InputJsonValue,
        returnType: spec.returnType,
      },
      update: {
        className: null,
        methodName: spec.methodName,
        paramTypes: spec.paramTypes as unknown as Prisma.InputJsonValue,
        returnType: spec.returnType,
      },
    });
    sigCount++;

    const starter = buildStarterCode(spec);
    await prisma.problem.update({
      where: { id: problem.id },
      data: { starterCode: starter },
    });
    starterCount++;
  }

  console.log(`ProblemSignature upserted: ${sigCount}`);
  console.log(`Problem.starterCode updated: ${starterCount}`);
  if (skipped.length > 0) {
    console.log(`Skipped (no DB row): ${skipped.join(", ")}`);
  }
  console.log("\nDone.");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
