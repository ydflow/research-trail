import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';

export function sourceUrl(value: string): string {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

export function MarkdownContent({ content }: { content: string }) {
  const [error, setError] = useState('');
  async function openSource(url: string) {
    setError('');
    try {
      if (!window.researchTrail) throw new Error('Bridge unavailable');
      await window.researchTrail.openNewsSource(url);
    } catch { setError('来源链接未能打开。'); }
  }
  return <div className="message-markdown"><Markdown skipHtml remarkPlugins={[remarkGfm]}
    urlTransform={sourceUrl} components={{
      a: ({ href, children }) => href ? <button type="button" className="markdown-source" role="link"
        onClick={() => { void openSource(href); }}>{children}</button> : <span>{children}</span>,
      // Model text never fetches a remote image or executes raw HTML.
      img: ({ alt }) => <span>【图片：{alt || '未自动加载'}】</span>,
    }}>{content}</Markdown>{error && <p role="alert">{error}</p>}</div>;
}
