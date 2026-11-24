'use client';

import React from 'react';

/**
 * Merender teks soal/opsi matematika secara ringan tanpa library eksternal.
 * Mendukung pecahan vertikal bertingkat: \frac{pembilang}{penyebut}
 * (dihasilkan otomatis dari Word Equation <m:f> maupun diketik manual oleh guru).
 */
function parseMathTokens(input) {
  const str = String(input ?? '');
  const nodes = [];
  let i = 0;
  let buf = '';

  const flushBuf = () => {
    if (buf) {
      nodes.push({ type: 'text', value: buf });
      buf = '';
    }
  };

  const readBraced = (s, startIdx) => {
    if (s[startIdx] !== '{') return null;
    let depth = 0;
    for (let j = startIdx; j < s.length; j += 1) {
      if (s[j] === '{') depth += 1;
      else if (s[j] === '}') {
        depth -= 1;
        if (depth === 0) {
          return { content: s.slice(startIdx + 1, j), endIdx: j + 1 };
        }
      }
    }
    return null;
  };

  while (i < str.length) {
    if (str.startsWith('\\frac', i)) {
      let cursor = i + 5;
      while (cursor < str.length && str[cursor] === ' ') cursor += 1;
      const num = readBraced(str, cursor);
      if (num) {
        let nextCursor = num.endIdx;
        while (nextCursor < str.length && str[nextCursor] === ' ') nextCursor += 1;
        const den = readBraced(str, nextCursor);
        if (den) {
          flushBuf();
          nodes.push({
            type: 'frac',
            num: parseMathTokens(num.content),
            den: parseMathTokens(den.content),
          });
          i = den.endIdx;
          continue;
        }
      }
    }
    buf += str[i];
    i += 1;
  }

  flushBuf();
  return nodes;
}

function renderNodes(nodes, keyPrefix = 'm') {
  return nodes.map((node, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (node.type === 'frac') {
      return (
        <span
          key={key}
          className="inline-flex flex-col items-center align-middle mx-0.5 leading-tight text-[0.9em]"
        >
          <span className="border-b border-current px-1 pb-[1px] text-center">
            {renderNodes(node.num, `${key}-n`)}
          </span>
          <span className="px-1 pt-[1px] text-center">
            {renderNodes(node.den, `${key}-d`)}
          </span>
        </span>
      );
    }
    return <React.Fragment key={key}>{node.value}</React.Fragment>;
  });
}

export default function MathText({ text, className = '' }) {
  if (text === null || text === undefined || text === '') return null;
  const raw = String(text);
  if (!raw.includes('\\frac')) {
    return className ? <span className={className}>{raw}</span> : <>{raw}</>;
  }
  const tokens = parseMathTokens(raw);
  return className ? (
    <span className={className}>{renderNodes(tokens)}</span>
  ) : (
    <>{renderNodes(tokens)}</>
  );
}
