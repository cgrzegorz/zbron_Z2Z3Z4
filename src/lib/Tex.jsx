import katex from 'katex';
import { Fragment, useMemo } from 'react';

export function Tex({ tex, block = false, className = '' }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex.replace(/(\d),(\d)/g, '$1{,}$2'), { displayMode: block, throwOnError: false, strict: false });
    } catch (e) {
      return tex;
    }
  }, [tex, block]);
  const Tag = block ? 'div' : 'span';
  return <Tag className={`tex ${block ? 'tex-block' : ''} ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

// Prosty parser: $$..$$ (blok), $..$ (inline), **pogrubienie**, _kursywa_ nie jest używana.
export function Rich({ text, as: Tag = 'span', className }) {
  const parts = useMemo(() => {
    const out = [];
    const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$|\*\*([^*]+?)\*\*/g;
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push({ t: 'txt', v: text.slice(last, m.index) });
      if (m[1] != null) out.push({ t: 'block', v: m[1] });
      else if (m[2] != null) out.push({ t: 'tex', v: m[2] });
      else out.push({ t: 'b', v: m[3] });
      last = re.lastIndex;
    }
    if (last < text.length) out.push({ t: 'txt', v: text.slice(last) });
    return out;
  }, [text]);
  return (
    <Tag className={className}>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p.t === 'txt' && p.v}
          {p.t === 'tex' && <Tex tex={p.v} />}
          {p.t === 'block' && <Tex tex={p.v} block />}
          {p.t === 'b' && <strong>{p.v}</strong>}
        </Fragment>
      ))}
    </Tag>
  );
}

/**
 * Wzór KaTeX wewnątrz SVG (wykresy). (x, y) to punkt zaczepienia:
 * anchor – 'start' | 'middle' | 'end' (poziomo), valign – 'top' | 'middle' | 'bottom' (pionowo).
 */
export function SvgTex({ x, y, tex, anchor = 'start', valign = 'bottom', className = '', size = 14 }) {
  const W = 360;
  const H = 70;
  const fx = anchor === 'end' ? x - W : anchor === 'middle' ? x - W / 2 : x;
  const fy = valign === 'top' ? y : valign === 'middle' ? y - H / 2 : y - H;
  return (
    <foreignObject x={fx} y={fy} width={W} height={H} className="svg-tex-fo" style={{ overflow: 'visible', pointerEvents: 'none' }}>
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        className={`svg-tex ${className}`}
        style={{
          width: W,
          height: H,
          display: 'flex',
          justifyContent: anchor === 'end' ? 'flex-end' : anchor === 'middle' ? 'center' : 'flex-start',
          alignItems: valign === 'top' ? 'flex-start' : valign === 'middle' ? 'center' : 'flex-end',
          fontSize: size,
        }}
      >
        <Tex tex={tex} />
      </div>
    </foreignObject>
  );
}

/** Etykieta, która może być wzorem: '$...$' → KaTeX, inaczej zwykły tekst. */
export const isTexLabel = (s) => typeof s === 'string' && s.length > 2 && s.startsWith('$') && s.endsWith('$');
