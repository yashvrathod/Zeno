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

// Premium markdown renderer with luxury typography and spacing.
export function Markdown({ md }: { md: string | null | undefined }) {
  const html = React.useMemo(() => {
    if (!md) return '';
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
          out.push(`<pre class=\"overflow-auto rounded-2xl bg-black border border-white/10 p-6 my-6 shadow-inner\"><code class=\"text-[14px] font-mono text-zinc-300\">${code}</code></pre>`);
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
        const cls = level === 1 ? 'text-3xl font-black tracking-tight' : level === 2 ? 'text-2xl font-bold tracking-tight' : 'text-xl font-semibold tracking-tight';
        out.push(`<h${level} class=\"${cls} text-white mt-10 mb-4\">${text}</h${level}>`);
        continue;
      }

      if (line.trim() === '') {
        out.push('<div class="h-6"></div>');
        continue;
      }

      out.push(`<p class=\"text-[18px] lg:text-[20px] text-zinc-300 leading-[1.7] tracking-tight mb-4 font-normal\">${escapeHtml(line)}</p>`);
    }

    return out.join('\n');
  }, [md]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
