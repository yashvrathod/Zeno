// Shared piston execution utility.

export const LANGUAGE_CONFIG: Record<string, { language: string; version: string }> = {
  javascript: { language: 'javascript', version: '18.15.0' },
  python: { language: 'python', version: '3.10.0' },
  java: { language: 'java', version: '15.0.2' },
  cpp: { language: 'c++', version: '10.2.0' },
};

export async function runOnPiston({
  code,
  language,
  stdin,
}: {
  code: string;
  language: keyof typeof LANGUAGE_CONFIG;
  stdin: string;
}) {
  const langConfig = LANGUAGE_CONFIG[language];
  if (!langConfig) throw new Error(`Language ${language} not supported`);

  const apiUrl = process.env.NEXT_PUBLIC_PISTON_API_URL || 'https://emkc.org/api/v2/piston';

  const res = await fetch(`${apiUrl}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: langConfig.language,
      version: langConfig.version,
      files: [{ name: fileName(language), content: code }],
      stdin,
    }),
  });

  if (!res.ok) {
    throw new Error(`Piston error: ${res.status}`);
  }

  const data = (await res.json()) as any;
  const stdout = (data?.run?.stdout ?? '').toString();
  const stderr = (data?.run?.stderr ?? '').toString();
  const output = (stdout + (stderr ? `\n${stderr}` : '')).trim();

  return { output, raw: data };
}

function fileName(language: keyof typeof LANGUAGE_CONFIG) {
  if (language === 'python') return 'main.py';
  if (language === 'java') return 'Main.java';
  if (language === 'cpp') return 'main.cpp';
  return 'main.js';
}
