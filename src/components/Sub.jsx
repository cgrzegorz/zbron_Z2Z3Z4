// "u_C(5 s)" → u<sub>C</sub>(5 s)
export function Sub({ s }) {
  const parts = String(s).split(/_([A-Za-z0-9ŻżĄąĆćĘęŁłŃńÓóŚśŹź]+)/);
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <sub key={i}>{p}</sub> : <span key={i}>{p}</span>))}
    </>
  );
}
