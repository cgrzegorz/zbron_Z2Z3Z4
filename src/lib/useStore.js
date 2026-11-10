import { useEffect, useState } from 'react';
import { getState, subscribe } from './srs.js';

export function useStore() {
  const [s, setS] = useState(getState());
  useEffect(() => subscribe((ns) => setS({ ...ns })), []);
  return s;
}
