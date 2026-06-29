/** 简易 Markdown 转 rich-text nodes（探针版） */
function parseInline(text) {
  const nodes = [];
  const re = /(\*\*[^*]+\*\*|[^*]+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const part = m[0];
    if (part.startsWith('**') && part.endsWith('**')) {
      nodes.push({ name: 'strong', children: [{ type: 'text', text: part.slice(2, -2) }] });
    } else if (part) {
      nodes.push({ type: 'text', text: part });
    }
  }
  return nodes.length ? nodes : [{ type: 'text', text: text || '' }];
}

function markdownToNodes(md) {
  const lines = String(md || '').split('\n');
  const nodes = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      nodes.push({ name: 'p', attrs: { class: 'md-gap' }, children: [{ type: 'text', text: ' ' }] });
      continue;
    }
    if (/^## /.test(trimmed)) {
      nodes.push({
        name: 'h2',
        attrs: { class: 'md-h2' },
        children: [{ type: 'text', text: trimmed.replace(/^## /, '') }],
      });
      continue;
    }
    if (/^### /.test(trimmed)) {
      nodes.push({
        name: 'h3',
        attrs: { class: 'md-h3' },
        children: [{ type: 'text', text: trimmed.replace(/^### /, '') }],
      });
      continue;
    }
    if (/^> /.test(trimmed)) {
      nodes.push({
        name: 'p',
        attrs: { class: 'md-quote' },
        children: [{ type: 'text', text: trimmed.replace(/^> /, '') }],
      });
      continue;
    }
    if (/^[-|]/.test(trimmed)) {
      nodes.push({
        name: 'p',
        attrs: { class: 'md-line' },
        children: [{ type: 'text', text: trimmed }],
      });
      continue;
    }
    nodes.push({ name: 'p', attrs: { class: 'md-p' }, children: parseInline(trimmed) });
  }
  return nodes;
}

module.exports = { markdownToNodes };
