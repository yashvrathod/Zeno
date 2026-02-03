'use client';

import * as React from 'react';

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#039;';
      default:
        return c;
    }
  });
}

// Minimal markdown renderer (headings + paragraphs + code fences) without external deps.
export function Markdown({ md }: { md: string }) {
  const html = React.useMemo(() => {
    const lines = md.split(/\r?\n/);
    const out: string[] = [];
    let inCode = false;
    let codeLang = '';
    let codeBuf: string[] = [];

    for (const line of lines) {
      const fence = line.match(/^```(.*)$/);
      if (fence) {
        if (!inCode) {
          inCode = true;
          codeLang = fence[1].trim();
          codeBuf = [];
        } else {
          inCode = false;
          const code = escapeHtml(codeBuf.join('\n'));
          out.push(`<pre class=\"overflow-auto rounded-md bg-[#0f0f0f] border border-zinc-800 p-3\"><code class=\"text-xs text-gray-100\">${code}</code></pre>`);
          codeLang = '';
        }
        continue;
      }

      if (inCode) {
        codeBuf.push(line);
        continue;
      }

      const h = line.match(/^(#{1,3})\s+(.*)$/);
      if (h) {
        const level = h[1].length;
        const text = escapeHtml(h[2]);
        const cls = level === 1 ? 'text-xl font-semibold' : level === 2 ? 'text-lg font-semibold' : 'text-base font-semibold';
        out.push(`<h${level} class=\"${cls} text-white mt-4 mb-2\">${text}</h${level}>`);
        continue;
      }

      if (line.trim() === '') {
        out.push('<div class="h-3"></div>');
        continue;
      }

      out.push(`<p class=\"text-sm text-gray-200 leading-relaxed\">${escapeHtml(line)}</p>`);
    }

    return out.join('\n');
  }, [md]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
