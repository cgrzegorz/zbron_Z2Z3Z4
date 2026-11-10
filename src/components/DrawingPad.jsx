import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

const COLORS = [
  { k: 'ink', label: 'Czarny' },
  { k: 'blue', label: 'Niebieski' },
  { k: 'red', label: 'Czerwony' },
  { k: 'green', label: 'Zielony' },
];

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#222';
}

/** Tablica do rysowania odpowiedzi – myszka, rysik, palec. */
export const DrawingPad = forwardRef(function DrawingPad({ height = 380, background = 'grid' }, ref) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const strokes = useRef([]);
  const redo = useRef([]);
  const current = useRef(null);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('ink');
  const [width, setWidth] = useState(2.5);
  const [, force] = useState(0);
  const [bg, setBg] = useState(background);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = c.width / dpr;
    const h = c.height / dpr;
    ctx.clearRect(0, 0, w, h);
    const all = current.current ? [...strokes.current, current.current] : strokes.current;
    for (const s of all) {
      if (s.pts.length === 0) continue;
      ctx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.strokeStyle = s.tool === 'eraser' ? 'rgba(0,0,0,1)' : cssVar(`--pen-${s.color}`);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = s.tool === 'eraser' ? 18 : s.width;
      ctx.beginPath();
      ctx.moveTo(s.pts[0][0], s.pts[0][1]);
      if (s.pts.length === 1) ctx.lineTo(s.pts[0][0] + 0.1, s.pts[0][1] + 0.1);
      for (let i = 1; i < s.pts.length - 1; i++) {
        const mx = (s.pts[i][0] + s.pts[i + 1][0]) / 2;
        const my = (s.pts[i][1] + s.pts[i + 1][1]) / 2;
        ctx.quadraticCurveTo(s.pts[i][0], s.pts[i][1], mx, my);
      }
      if (s.pts.length > 1) ctx.lineTo(s.pts[s.pts.length - 1][0], s.pts[s.pts.length - 1][1]);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  const resize = useCallback(() => {
    const c = canvasRef.current;
    const wrap = wrapRef.current;
    if (!c || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth;
    c.width = Math.round(w * dpr);
    c.height = Math.round(height * dpr);
    c.style.width = w + 'px';
    c.style.height = height + 'px';
    draw();
  }, [height, draw]);

  useEffect(() => {
    resize();
    const ro = new ResizeObserver(resize);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [resize]);

  useEffect(draw, [draw]);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  const down = (e) => {
    if (e.pointerType === 'touch' && e.isPrimary === false) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture(e.pointerId);
    current.current = { tool, color, width: e.pointerType === 'pen' ? width * (0.6 + (e.pressure || 0.5)) : width, pts: [pos(e)] };
    draw();
  };
  const move = (e) => {
    if (!current.current) return;
    e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs) current.current.pts.push(pos(ev));
    draw();
  };
  const up = () => {
    if (!current.current) return;
    strokes.current.push(current.current);
    current.current = null;
    redo.current = [];
    force((x) => x + 1);
    draw();
  };

  const undo = () => {
    const s = strokes.current.pop();
    if (s) redo.current.push(s);
    force((x) => x + 1);
    draw();
  };
  const redoFn = () => {
    const s = redo.current.pop();
    if (s) strokes.current.push(s);
    force((x) => x + 1);
    draw();
  };
  const clear = () => {
    strokes.current = [];
    redo.current = [];
    force((x) => x + 1);
    draw();
  };

  useImperativeHandle(ref, () => ({
    isEmpty: () => strokes.current.length === 0,
    toDataURL: () => canvasRef.current?.toDataURL('image/png'),
    clear,
  }));

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redoFn();
        else undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="pad">
      <div className="pad-tools">
        <div className="seg">
          <button className={tool === 'pen' ? 'on' : ''} onClick={() => setTool('pen')} title="Pióro">
            ✏️ Pióro
          </button>
          <button className={tool === 'eraser' ? 'on' : ''} onClick={() => setTool('eraser')} title="Gumka">
            🧽 Gumka
          </button>
        </div>
        <div className="swatches">
          {COLORS.map((c) => (
            <button
              key={c.k}
              className={`swatch pen-${c.k} ${color === c.k && tool === 'pen' ? 'on' : ''}`}
              onClick={() => {
                setColor(c.k);
                setTool('pen');
              }}
              title={c.label}
              aria-label={c.label}
            />
          ))}
        </div>
        <select value={width} onChange={(e) => setWidth(Number(e.target.value))} aria-label="Grubość">
          <option value={1.5}>cienko</option>
          <option value={2.5}>średnio</option>
          <option value={4}>grubo</option>
        </select>
        <select value={bg} onChange={(e) => setBg(e.target.value)} aria-label="Tło">
          <option value="grid">kratka</option>
          <option value="lines">linie</option>
          <option value="none">czysto</option>
        </select>
        <span className="spacer" />
        <button onClick={undo} disabled={!strokes.current.length} title="Cofnij (Ctrl+Z)">
          ↶
        </button>
        <button onClick={redoFn} disabled={!redo.current.length} title="Ponów (Ctrl+Shift+Z)">
          ↷
        </button>
        <button onClick={clear} disabled={!strokes.current.length}>
          Wyczyść
        </button>
      </div>
      <div ref={wrapRef} className={`pad-canvas-wrap pad-bg-${bg}`}>
        <canvas ref={canvasRef} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} className="pad-canvas" />
      </div>
    </div>
  );
});
