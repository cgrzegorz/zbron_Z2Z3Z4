import { useRef } from 'react';
import { SvgTex, isTexLabel } from '../lib/Tex.jsx';

// Prosty układ współrzędnych w SVG z dostępem do skal.
export function usePlotScales({ w, h, pad, x: [x0, x1], y: [y0, y1] }) {
  const sx = (v) => pad.l + ((v - x0) / (x1 - x0)) * (w - pad.l - pad.r);
  const sy = (v) => h - pad.b - ((v - y0) / (y1 - y0)) * (h - pad.t - pad.b);
  const ix = (px) => x0 + ((px - pad.l) / (w - pad.l - pad.r)) * (x1 - x0);
  const iy = (py) => y0 + ((h - pad.b - py) / (h - pad.t - pad.b)) * (y1 - y0);
  return { sx, sy, ix, iy };
}

export const DEFAULT_PAD = { l: 56, r: 24, t: 22, b: 40 };

export function pathFrom(points, sx, sy) {
  return points
    .filter((p) => isFinite(p[0]) && isFinite(p[1]))
    .map((p, i) => `${i ? 'L' : 'M'}${sx(p[0]).toFixed(1)} ${sy(p[1]).toFixed(1)}`)
    .join(' ');
}

export function sampleFn(f, a, b, n = 120) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const x = a + ((b - a) * i) / n;
    out.push([x, f(x)]);
  }
  return out;
}

/**
 * Plot – rysuje osie; children(scales) rysuje zawartość.
 * xTicks/yTicks: [{v, label}]
 */
export function Plot({
  w = 520,
  h = 300,
  pad = DEFAULT_PAD,
  x,
  y,
  xLabel,
  yLabel,
  xTicks = [],
  yTicks = [],
  grid = false,
  children,
  svgRef,
  className = '',
  onPointerDown,
  onPointerMove,
  onPointerUp,
  style,
}) {
  const sc = usePlotScales({ w, h, pad, x, y });
  const { sx, sy } = sc;
  const localRef = useRef(null);
  const ref = svgRef || localRef;
  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${w} ${h}`}
      className={`plot ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={style}
    >
      <defs>
        <marker id="axhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" className="plot-axhead" />
        </marker>
      </defs>
      {grid &&
        xTicks.map((t, i) => <line key={'gx' + i} x1={sx(t.v)} x2={sx(t.v)} y1={sy(y[0])} y2={sy(y[1])} className="plot-grid" />)}
      {grid &&
        yTicks.map((t, i) => <line key={'gy' + i} x1={sx(x[0])} x2={sx(x[1])} y1={sy(t.v)} y2={sy(t.v)} className="plot-grid" />)}
      <line x1={sx(x[0])} y1={sy(y[0])} x2={w - 8} y2={sy(y[0])} className="plot-axis" markerEnd="url(#axhead)" />
      <line x1={sx(x[0])} y1={sy(y[0])} x2={sx(x[0])} y2={8} className="plot-axis" markerEnd="url(#axhead)" />
      {xTicks.map((t, i) => (
        <g key={'xt' + i}>
          <line x1={sx(t.v)} x2={sx(t.v)} y1={sy(y[0])} y2={sy(y[0]) + 5} className="plot-axis" />
          {isTexLabel(t.label) ? (
            <SvgTex x={sx(t.v)} y={sy(y[0]) + 7} tex={t.label.slice(1, -1)} anchor="middle" valign="top" className="tick" size={12} />
          ) : (
            <text x={sx(t.v)} y={sy(y[0]) + 18} textAnchor="middle" className="plot-tick">
              {t.label}
            </text>
          )}
        </g>
      ))}
      {yTicks.map((t, i) => (
        <g key={'yt' + i}>
          <line x1={sx(x[0]) - 5} x2={sx(x[0])} y1={sy(t.v)} y2={sy(t.v)} className="plot-axis" />
          {isTexLabel(t.label) ? (
            <SvgTex x={sx(x[0]) - 8} y={sy(t.v)} tex={t.label.slice(1, -1)} anchor="end" valign="middle" className="tick" size={12} />
          ) : (
            <text x={sx(x[0]) - 8} y={sy(t.v)} textAnchor="end" dominantBaseline="middle" className="plot-tick">
              {t.label}
            </text>
          )}
        </g>
      ))}
      {xLabel &&
        (isTexLabel(xLabel) ? (
          <SvgTex x={w - 10} y={sy(y[0]) + 36} tex={xLabel.slice(1, -1)} anchor="end" className="axlabel" size={15} />
        ) : (
          <text x={w - 10} y={sy(y[0]) + 30} textAnchor="end" className="plot-axlabel">
            {xLabel}
          </text>
        ))}
      {yLabel &&
        (isTexLabel(yLabel) ? (
          <SvgTex x={sx(x[0]) + 8} y={2} tex={yLabel.slice(1, -1)} valign="top" className="axlabel" size={15} />
        ) : (
          <text x={sx(x[0]) + 8} y={14} className="plot-axlabel">
            {yLabel}
          </text>
        ))}
      {children && children(sc)}
    </svg>
  );
}

/** Zamienia zdarzenie wskaźnika na współrzędne w przestrzeni viewBox. */
export function svgPoint(svg, evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  const m = svg.getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  const p = pt.matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}
