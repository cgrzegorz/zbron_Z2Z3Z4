// Silnik schematów: elementy opisane danymi, rysowane jako SVG.
// Każdy element może mieć `id` (klikalny) i `slot` (może zostać ukryty w ćwiczeniu).

function Label({ x, y, s, anchor = 'middle', size = 14, cls = '' }) {
  if (!s) return null;
  // "V_R" → V z indeksem dolnym R
  const [main, sub] = String(s).split('_');
  // pojedynczy symbol (R, i_1, U_Ż…) – czcionka matematyczna jak we wzorach KaTeX
  const sym = /^[A-Za-zŻ]$/.test(main);
  return (
    <text x={x} y={y} textAnchor={anchor} className={`sch-label ${sym ? 'sym' : ''} ${cls}`} fontSize={size * (sym ? 1.12 : 1)} dominantBaseline="middle">
      {main}
      {sub && (
        <tspan baselineShift="sub" fontSize={size * 0.72} className={sym ? 'sym-sub' : ''}>
          {sub}
        </tspan>
      )}
    </text>
  );
}

const Mask = ({ x, y, w, h }) => <rect x={x - w / 2} y={y - h / 2} width={w} height={h} className="sch-mask" />;

function Resistor({ x, y, dir = 'h', label, labelPos }) {
  const h = dir === 'h';
  const w = h ? 40 : 14;
  const hh = h ? 14 : 40;
  const lp = labelPos || (h ? [x, y - 18] : [x + 22, y]);
  return (
    <g>
      <rect x={x - w / 2} y={y - hh / 2} width={w} height={hh} className="sch-body" />
      <Label x={lp[0]} y={lp[1]} s={label} anchor={h ? 'middle' : 'start'} />
    </g>
  );
}

function Nonlinear({ x, y, dir = 'h', label }) {
  const h = dir === 'h';
  const w = h ? 40 : 14;
  const hh = h ? 14 : 40;
  return (
    <g>
      <rect x={x - w / 2} y={y - hh / 2} width={w} height={hh} className="sch-body" />
      {h ? (
        <path d={`M${x - 26} ${y + 14} L${x - 18} ${y + 14} L${x + 18} ${y - 14}`} className="sch-line" />
      ) : (
        <path d={`M${x - 14} ${y + 26} L${x - 14} ${y + 18} L${x + 14} ${y - 18}`} className="sch-line" />
      )}
      <Label x={h ? x : x + 22} y={h ? y - 22 : y} s={label} anchor={h ? 'middle' : 'start'} />
    </g>
  );
}

function Capacitor({ x, y, dir = 'h', label }) {
  const h = dir === 'h';
  return (
    <g>
      {h ? (
        <>
          <Mask x={x} y={y} w={8} h={4} />
          <line x1={x - 4} y1={y - 13} x2={x - 4} y2={y + 13} className="sch-plate" />
          <line x1={x + 4} y1={y - 13} x2={x + 4} y2={y + 13} className="sch-plate" />
        </>
      ) : (
        <>
          <Mask x={x} y={y} w={4} h={8} />
          <line x1={x - 14} y1={y - 4} x2={x + 14} y2={y - 4} className="sch-plate" />
          <line x1={x - 14} y1={y + 4} x2={x + 14} y2={y + 4} className="sch-plate" />
        </>
      )}
      <Label x={h ? x : x + 22} y={h ? y - 22 : y} s={label} anchor={h ? 'middle' : 'start'} />
    </g>
  );
}

function Inductor({ x, y, dir = 'h', label, labelPos }) {
  const h = dir === 'h';
  const n = 4;
  const r = 5.5;
  let d = '';
  if (h) {
    const x0 = x - n * r;
    d = `M${x0} ${y}`;
    for (let i = 0; i < n; i++) d += ` a${r} ${r} 0 0 1 ${2 * r} 0`;
  } else {
    const y0 = y - n * r;
    d = `M${x} ${y0}`;
    for (let i = 0; i < n; i++) d += ` a${r} ${r} 0 0 1 0 ${2 * r}`;
  }
  const lp = labelPos || (h ? [x, y + 16] : [x + 16, y]);
  return (
    <g>
      <Mask x={x} y={y} w={h ? n * 2 * r : 3} h={h ? 3 : n * 2 * r} />
      <path d={d} className="sch-line" fill="none" />
      <Label x={lp[0]} y={lp[1]} s={label} anchor={h ? 'middle' : 'start'} />
    </g>
  );
}

function Source({ x, y, kind = 'dc', label, labelPos }) {
  const lp = labelPos || [x - 24, y];
  return (
    <g>
      <circle cx={x} cy={y} r={16} className="sch-body" />
      {kind === 'dc' ? (
        <line x1={x} y1={y - 16} x2={x} y2={y + 16} className="sch-line" />
      ) : (
        <path d={`M${x - 9} ${y} q4.5 -8 9 0 t9 0`} className="sch-line" fill="none" />
      )}
      <Label x={lp[0]} y={lp[1]} s={label} anchor="end" />
    </g>
  );
}

function Meter({ x, y, m, hidden, slotValue, onSlot, state }) {
  if (hidden) {
    return (
      <g className={`sch-slot ${state || ''}`} onClick={onSlot} style={{ cursor: 'pointer' }}>
        <circle cx={x} cy={y} r={16} className="sch-slot-c" />
        <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" className="sch-slot-t" fontSize={slotValue ? 12 : 16}>
          {slotValue ? slotLabel(slotValue) : '?'}
        </text>
      </g>
    );
  }
  const [main, sub] = String(m).split('_');
  return (
    <g>
      <circle cx={x} cy={y} r={15} className="sch-body" />
      <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle" className="sch-meter-t" fontSize={m.length > 2 ? 11 : 13}>
        {main}
        {sub && (
          <tspan baselineShift="sub" fontSize={9}>
            {sub}
          </tspan>
        )}
      </text>
    </g>
  );
}

export function slotLabel(v) {
  return { A: 'A', V: 'V', 'µA': 'µA', W: 'W', SW: '⏻' }[v] || v;
}

function Switch({ x, y, dir = 'h', label, note, hidden, slotValue, onSlot, state }) {
  if (hidden) return <Meter x={x} y={y} hidden slotValue={slotValue} onSlot={onSlot} state={state} />;
  const h = dir === 'h';
  return (
    <g>
      {h ? (
        <>
          <Mask x={x} y={y} w={30} h={4} />
          <circle cx={x - 14} cy={y} r={2.5} className="sch-dot" />
          <circle cx={x + 14} cy={y} r={2.5} className="sch-dot" />
          <line x1={x - 14} y1={y} x2={x + 12} y2={y - 13} className="sch-line" />
          <Label x={x} y={y - 26} s={label} />
          {note && <Label x={x} y={y + 16} s={note} size={11} cls="sch-note" />}
        </>
      ) : (
        <>
          <Mask x={x} y={y} w={4} h={30} />
          <circle cx={x} cy={y - 14} r={2.5} className="sch-dot" />
          <circle cx={x} cy={y + 14} r={2.5} className="sch-dot" />
          <line x1={x} y1={y + 14} x2={x + 13} y2={y - 12} className="sch-line" />
          <Label x={x + 20} y={y} s={label} anchor="start" />
          {note && <Label x={x + 20} y={y + 16} s={note} size={11} anchor="start" cls="sch-note" />}
        </>
      )}
    </g>
  );
}

function Lamp({ x, y, label }) {
  const d = 14 * Math.SQRT1_2;
  return (
    <g>
      <circle cx={x} cy={y} r={14} className="sch-body" />
      <line x1={x - d} y1={y - d} x2={x + d} y2={y + d} className="sch-line" />
      <line x1={x - d} y1={y + d} x2={x + d} y2={y - d} className="sch-line" />
      <Label x={x + 22} y={y} s={label} anchor="start" />
    </g>
  );
}

function Arrow({ from, to, label, labelPos, cls = '' }) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const a = Math.atan2(y2 - y1, x2 - x1);
  const s = 7;
  const p1 = [x2 - s * Math.cos(a - 0.4), y2 - s * Math.sin(a - 0.4)];
  const p2 = [x2 - s * Math.cos(a + 0.4), y2 - s * Math.sin(a + 0.4)];
  const lp = labelPos || [(x1 + x2) / 2, (y1 + y2) / 2 - 10];
  return (
    <g className={cls}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} className="sch-arrow" />
      <path d={`M${x2} ${y2} L${p1[0]} ${p1[1]} L${p2[0]} ${p2[1]} Z`} className="sch-arrowhead" />
      <Label x={lp[0]} y={lp[1]} s={label} size={13} cls="sch-italic" />
    </g>
  );
}

function MArc({ from, to, bend = 30, label, labelPos }) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const cx = mx + (-dy / len) * bend;
  const cy = my + (dx / len) * bend;
  const head = (px, py, qx, qy) => {
    const a = Math.atan2(py - qy, px - qx);
    const s = 7;
    return `M${px} ${py} L${px - s * Math.cos(a - 0.4)} ${py - s * Math.sin(a - 0.4)} L${px - s * Math.cos(a + 0.4)} ${py - s * Math.sin(a + 0.4)} Z`;
  };
  const lp = labelPos || [cx, cy + (bend > 0 ? 12 : -12)];
  return (
    <g>
      <path d={`M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`} className="sch-arrow" fill="none" />
      <path d={head(x1, y1, cx, cy)} className="sch-arrowhead" />
      <path d={head(x2, y2, cx, cy)} className="sch-arrowhead" />
      <Label x={lp[0]} y={lp[1]} s={label} cls="sch-italic" />
    </g>
  );
}

function AutoTrafo({ x, y }) {
  return (
    <g>
      <Inductor x={x} y={y} dir="v" />
      <line x1={x - 16} y1={y + 22} x2={x + 16} y2={y - 22} className="sch-line" />
      <path d={`M${x + 16} ${y - 22} l-8 2 l4 5 Z`} className="sch-arrowhead" />
      <Label x={x + 14} y={y + 34} s="AT" size={11} anchor="start" cls="sch-note" />
    </g>
  );
}

/**
 * props:
 *  def: { w, h, els: [...] }
 *  hidden: Set(ids) – sloty ukryte
 *  slotValues: {id: value}, slotStates: {id: 'ok'|'bad'}
 *  onSlot(id)
 *  onPick(id) – kliknięcie elementu (tryb szukania błędu)
 *  marks: {id: 'ok'|'bad'|'sel'}
 *  overrides: {id: {...}} – podmiana atrybutów elementu (np. błąd)
 */
export function Schematic({ def, hidden, slotValues = {}, slotStates = {}, onSlot, onPick, marks = {}, overrides = {}, className = '' }) {
  const els = def.els.map((e) => (e.id && overrides[e.id] ? { ...e, ...overrides[e.id] } : e));
  return (
    <svg viewBox={`0 0 ${def.w} ${def.h}`} className={`schem ${className}`} role="img">
      {/* najpierw przewody */}
      {els.filter((e) => e.t === 'wire').map((e, i) => (
        <polyline key={'w' + i} points={e.pts.map((p) => p.join(',')).join(' ')} className={`sch-wire ${e.dash ? 'sch-dash' : ''}`} fill="none" />
      ))}
      {els.map((e, i) => {
        if (e.t === 'wire') return null;
        const isHidden = hidden && e.id && hidden.has(e.id);
        const common = {
          ...e,
          hidden: isHidden,
          slotValue: slotValues[e.id],
          state: slotStates[e.id],
          onSlot: onSlot ? () => onSlot(e.id) : undefined,
        };
        let node = null;
        switch (e.t) {
          case 'R': node = <Resistor {...common} />; break;
          case 'NL': node = <Nonlinear {...common} />; break;
          case 'C': node = <Capacitor {...common} />; break;
          case 'L': node = <Inductor {...common} />; break;
          case 'src': node = <Source {...common} />; break;
          case 'meter': node = <Meter {...common} />; break;
          case 'sw': node = <Switch {...common} />; break;
          case 'lamp': node = <Lamp {...common} />; break;
          case 'dot': node = <circle cx={e.x} cy={e.y} r={3.2} className="sch-dot" />; break;
          case 'term':
            node = (
              <g>
                <circle cx={e.x} cy={e.y} r={4} className="sch-term" />
                <Label x={e.x - 12} y={e.y} s={e.label} anchor="end" />
              </g>
            );
            break;
          case 'star': node = <text x={e.x} y={e.y} className="sch-star" textAnchor="middle" dominantBaseline="middle">∗</text>; break;
          case 'text': node = <Label x={e.x} y={e.y} s={e.s} size={e.size || 13} anchor={e.anchor || 'middle'} cls={e.cls || ''} />; break;
          case 'arrow': node = <Arrow {...e} />; break;
          case 'marc': node = <MArc {...e} />; break;
          case 'at': node = <AutoTrafo {...e} />; break;
          default: node = null;
        }
        const mark = e.id && marks[e.id];
        const bb = e.id ? hitBox(e) : null;
        return (
          <g key={i} className={`sch-el ${mark ? 'mark-' + mark : ''}`}>
            {node}
            {bb && mark && <rect x={bb.x - 4} y={bb.y - 4} width={bb.w + 8} height={bb.h + 8} rx={8} className={`sch-markbox ${mark}`} />}
            {bb && onPick && !isHidden && (
              <rect
                x={bb.x - 6}
                y={bb.y - 6}
                width={bb.w + 12}
                height={bb.h + 12}
                rx={8}
                className="sch-hit"
                onClick={() => onPick(e.id)}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function hitBox(e) {
  const h = e.dir !== 'v';
  switch (e.t) {
    case 'meter':
    case 'src':
    case 'lamp':
      return { x: e.x - 16, y: e.y - 16, w: 32, h: 32 };
    case 'sw':
      return h ? { x: e.x - 16, y: e.y - 16, w: 32, h: 22 } : { x: e.x - 6, y: e.y - 16, w: 22, h: 32 };
    case 'R':
    case 'NL':
    case 'L':
      return h ? { x: e.x - 22, y: e.y - 10, w: 44, h: 20 } : { x: e.x - 10, y: e.y - 22, w: 20, h: 44 };
    case 'C':
      return h ? { x: e.x - 8, y: e.y - 14, w: 16, h: 28 } : { x: e.x - 14, y: e.y - 8, w: 28, h: 16 };
    case 'star':
      return { x: e.x - 8, y: e.y - 8, w: 16, h: 16 };
    case 'arrow': {
      const xs = [e.from[0], e.to[0]];
      const ys = [e.from[1], e.to[1]];
      return { x: Math.min(...xs) - 4, y: Math.min(...ys) - 6, w: Math.abs(xs[1] - xs[0]) + 8, h: Math.abs(ys[1] - ys[0]) + 12 };
    }
    default:
      return null;
  }
}
