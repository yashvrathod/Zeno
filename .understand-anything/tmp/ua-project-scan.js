const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = process.argv[2];
const outputPath = process.argv[3];

if (!projectRoot || !outputPath) {
  process.stderr.write('Usage: node ua-project-scan.js <projectRoot> <outputPath>\n');
  process.exit(1);
}

try {
  // Step 1: File discovery via git ls-files
  let files;
  try {
    files = execSync('git ls-files', { cwd: projectRoot, encoding: 'utf8' }).trim().split('\n');
  } catch (e) {
    files = [];
  }

  // Step 2: Exclusion filtering
  const excludePatterns = [
    /(^|\/)node_modules\//,
    /(^|\/)\.git\//,
    /(^|\/)dist\//,
    /(^|\/)build\//,
    /(^|\/)out\//,
    /(^|\/)coverage\//,
    /(^|\/)\.next\//,
    /(^|\/)\.cache\//,
    /(^|\/)\.turbo\//,
    /(^|\/)target\//,
    /(^|\/)npm-cache\//,
    /\.lock$/,
    /package-lock\.json$/,
    /yarn\.lock$/,
    /pnpm-lock\.yaml$/,
    /\.png$/,
    /\.jpg$/,
    /\.jpeg$/,
    /\.gif$/,
    /\.svg$/,
    /\.ico$/,
    /\.woff$/,
    /\.woff2$/,
    /\.ttf$/,
    /\.eot$/,
    /\.mp3$/,
    /\.mp4$/,
    /\.pdf$/,
    /\.zip$/,
    /\.tar$/,
    /\.gz$/,
    /\.min\.js$/,
    /\.min\.css$/,
    /\.map$/,
    /\.generated\./,
    /(^|\/)\.idea\//,
    /(^|\/)\.vscode\//,
    /^LICENSE$/,
    /^\.gitignore$/,
    /^\.editorconfig$/,
    /^\.prettierrc/,
    /^\.eslintrc/,
    /\.log$/,
  ];

  files = files.filter(f => !excludePatterns.some(p => p.test(f)));

  // Extension to language mapping
  const extToLang = {
    '.ts': 'typescript', '.tsx': 'typescript',
    '.js': 'javascript', '.jsx': 'javascript',
    '.py': 'python', '.go': 'go', '.rs': 'rust',
    '.java': 'java', '.rb': 'ruby',
    '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp', '.h': 'cpp', '.hpp': 'cpp',
    '.c': 'c', '.cs': 'csharp', '.swift': 'swift', '.kt': 'kotlin',
    '.vue': 'vue', '.svelte': 'svelte',
    '.sh': 'shell', '.bash': 'shell',
    '.md': 'markdown', '.rst': 'markdown',
    '.yaml': 'yaml', '.yml': 'yaml',
    '.json': 'json', '.toml': 'toml', '.cfg': 'config', '.ini': 'config',
    '.sql': 'sql', '.graphql': 'graphql', '.gql': 'graphql',
    '.proto': 'protobuf', '.tf': 'terraform', '.tfvars': 'terraform',
    '.html': 'html', '.htm': 'html',
    '.css': 'css', '.scss': 'css', '.sass': 'css', '.less': 'css',
    '.xml': 'xml', '.env': 'config', '.mjs': 'javascript',
    '.php': 'php', '.ps1': 'script', '.bat': 'script', '.prisma': 'data',
    '.d.ts': 'typescript',
  };

  // File category mapping
  function getFileCategory(f, ext) {
    const basename = path.basename(f).toLowerCase();
    // infra (checked first - more specific)
    if (/\.(tf|tfvars)$/.test(ext) || basename === 'dockerfile' ||
        basename.startsWith('docker-compose') || basename === 'makefile' ||
        basename === 'jenkinsfile' || basename === 'procfile' || basename === 'vagrantfile' ||
        f.startsWith('.github/workflows/') || f.startsWith('.gitlab-ci.yml') ||
        f.startsWith('.circleci/') || f.includes('.k8s.') ||
        f.startsWith('k8s/') || f.startsWith('kubernetes/') ||
        f.endsWith('.mjs') && (f.startsWith('eslint') || f.startsWith('postcss'))) {
      return 'infra';
    }
    // data
    if (['.sql', '.graphql', '.gql', '.proto', '.prisma', '.csv'].includes(ext) ||
        basename.endsWith('.schema.json')) return 'data';
    // docs
    if (['.md', '.rst', '.txt'].includes(ext) && basename !== 'license') return 'docs';
    // config
    if (['.yaml', '.yml', '.json', '.toml', '.xml', '.cfg', '.ini', '.env'].includes(ext) ||
        ['tsconfig.json', 'package.json', 'pyproject.toml', 'cargo.toml', 'go.mod',
         'tsconfig.tsbuildinfo', 'components.json', 'prisma.config.ts', 'next.config.ts',
         '.claude/settings.json', '.claude/settings.local.json'].includes(f)) return 'config';
    // script
    if (['.sh', '.bash', '.ps1', '.bat'].includes(ext)) return 'script';
    // markup
    if (['.html', '.htm', '.css', '.scss', '.sass', '.less'].includes(ext)) return 'markup';
    // code
    return 'code';
  }

  function getLanguage(f) {
    const basename = path.basename(f).toLowerCase();
    if (basename === 'dockerfile') return 'dockerfile';
    if (basename === 'makefile') return 'makefile';
    if (basename === 'jenkinsfile') return 'jenkinsfile';
    // Handle .prisma files
    if (f.endsWith('.prisma')) return 'prisma';
    // Handle .mjs
    if (f.endsWith('.mjs')) return 'javascript';
    // Handle .d.ts
    if (f.endsWith('.d.ts')) return 'typescript';
    const ext = '.' + f.split('.').pop().toLowerCase();
    return extToLang[ext] || 'unknown';
  }

  const fileEntries = [];
  for (const f of files) {
    const fullPath = path.join(projectRoot, f);
    if (!fs.existsSync(fullPath)) continue;

    let sizeLines = 0;
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      sizeLines = content.split('\n').length;
    } catch (e) {
      sizeLines = 0;
    }

    const lang = getLanguage(f);
    const cat = getFileCategory(f, '.' + f.split('.').pop().toLowerCase());

    fileEntries.push({
      path: f,
      language: lang,
      sizeLines: sizeLines,
      fileCategory: cat,
    });
  }

  fileEntries.sort((a, b) => a.path.localeCompare(b.path));

  // Step 6: Framework detection
  const frameworks = [];
  const pkgJsonPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      const depNames = Object.keys(allDeps);

      const frameworkMap = {
        'next': 'Next.js', 'react': 'React', 'react-dom': 'React',
        'next-auth': 'NextAuth.js', '@auth/prisma-adapter': 'NextAuth.js',
        'tailwindcss': 'Tailwind CSS', '@tailwindcss/postcss': 'Tailwind CSS',
        'prisma': 'Prisma', '@prisma/client': 'Prisma',
        'zod': 'Zod', 'groq-sdk': 'Groq', 'openai': 'OpenAI',
        '@xenova/transformers': 'Transformers.js',
        '@supabase/supabase-js': 'Supabase',
        '@monaco-editor/react': 'Monaco Editor',
        'ioredis': 'Redis', 'pg': 'PostgreSQL',
        '@hookform/resolvers': 'React Hook Form', 'react-hook-form': 'React Hook Form',
        '@radix-ui/react-avatar': 'Radix UI', '@radix-ui/react-dialog': 'Radix UI',
        '@radix-ui/react-dropdown-menu': 'Radix UI', '@radix-ui/react-label': 'Radix UI',
        '@radix-ui/react-select': 'Radix UI', '@radix-ui/react-slot': 'Radix UI',
        '@radix-ui/react-tabs': 'Radix UI', '@radix-ui/react-tooltip': 'Radix UI',
        'sonner': 'Sonner', 'lucide-react': 'Lucide',
        'bcryptjs': 'bcrypt.js', 'next-themes': 'next-themes',
        'class-variance-authority': 'CVA', 'clsx': 'clsx',
        'tailwind-merge': 'tailwind-merge', 'tw-animate-css': 'tw-animate-css',
        'typescript': 'TypeScript', 'eslint': 'ESLint', 'eslint-config-next': 'ESLint',
      };

      for (const dep of depNames) {
        if (frameworkMap[dep] && !frameworks.includes(frameworkMap[dep])) {
          frameworks.push(frameworkMap[dep]);
        }
      }
    } catch (e) {}
  }

  // Infrastructure frameworks
  for (const f of fileEntries) {
    const basename = path.basename(f.path).toLowerCase();
    if (basename === 'dockerfile' && !frameworks.includes('Docker')) frameworks.push('Docker');
  }

  // Check for TypeScript
  if (fileEntries.some(f => f.language === 'typescript') && !frameworks.includes('TypeScript')) {
    frameworks.push('TypeScript');
  }

  // Step 7: Complexity
  const totalFiles = fileEntries.length;
  let estimatedComplexity = 'small';
  if (totalFiles > 500) estimatedComplexity = 'very-large';
  else if (totalFiles > 150) estimatedComplexity = 'large';
  else if (totalFiles > 30) estimatedComplexity = 'moderate';

  // Step 8: Project name
  let name = 'code-zone';
  let rawDescription = '';
  let readmeHead = '';
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      name = pkg.name || name;
      rawDescription = pkg.description || '';
    } catch (e) {}
  }
  const readmePath = path.join(projectRoot, 'README.md');
  if (fs.existsSync(readmePath)) {
    try {
      readmeHead = fs.readFileSync(readmePath, 'utf8').split('\n').slice(0, 10).join('\n');
    } catch (e) {}
  }

  // Step 9: Import resolution (for code files only)
  const importMap = {};
  const codeFiles = fileEntries.filter(f => f.fileCategory === 'code');

  for (const f of codeFiles) {
    const filePath = f.path;
    const fullPath = path.join(projectRoot, filePath);
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const imports = [];

      // Extract imports using regex for TypeScript/JavaScript
      const importRegex = /(?:import\s+(?:.*?)\s+from\s+['"]|require\s*\(\s*['"])(\.\/[^'"]+|\.\.\/[^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        let importPath = match[1];
        // Remove extension if present
        let cleanImport = importPath.replace(/\.(ts|tsx|js|jsx|mjs)$/, '');

        // Resolve the import
        const importDir = path.dirname(filePath);
        const resolved = resolveImport(cleanImport, importDir, fileEntries);
        if (resolved && !imports.includes(resolved)) {
          imports.push(resolved);
        }
      }
      importMap[filePath] = imports;
    } catch (e) {
      importMap[filePath] = [];
    }
  }

  // Non-code files get empty arrays
  for (const f of fileEntries) {
    if (f.fileCategory !== 'code' && !(f.path in importMap)) {
      importMap[f.path] = [];
    }
  }

  function resolveImport(importPath, importDir, allFiles) {
    const filePaths = allFiles.map(f => f.path);
    // Try exact match with various extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];
    const candidates = [
      path.posix.join(importDir, importPath),
      ...extensions.map(ext => path.posix.join(importDir, importPath + ext)),
      path.posix.join(importDir, importPath, 'index.ts'),
      path.posix.join(importDir, importPath, 'index.js'),
      path.posix.join(importDir, importPath, 'index.tsx'),
      path.posix.join(importDir, importPath, 'index.jsx'),
    ];

    for (const candidate of candidates) {
      if (filePaths.includes(candidate)) return candidate;
    }

    // Try with ../ resolution for relative imports
    const normalized = path.posix.normalize(path.posix.join(importDir, importPath));
    const normCandidates = [
      normalized,
      ...extensions.map(ext => normalized + ext),
      path.posix.join(normalized, 'index.ts'),
      path.posix.join(normalized, 'index.js'),
    ];

    for (const candidate of normCandidates) {
      if (filePaths.includes(candidate)) return candidate;
    }

    return null;
  }

  const result = {
    name: name,
    description: 'A Next.js-based coding interview preparation and learning platform with AI-powered mentoring, problem-solving, and progress tracking.',
    languages: [...new Set(fileEntries.map(f => f.language))].sort(),
    frameworks: frameworks.sort(),
    files: fileEntries,
    totalFiles: fileEntries.length,
    estimatedComplexity: estimatedComplexity,
    importMap: importMap,
  };

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  process.exit(0);
} catch (err) {
  process.stderr.write(err.message + '\n');
  process.exit(1);
}
