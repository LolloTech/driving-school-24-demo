import { useEffect, useState } from 'react';
export function useHealth() {
  const [connected, setConnected] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    let busy = false;
    const check = async () => {
      if (busy) return;
      busy = true;
      try {
        const r = await fetch('/health', { signal: AbortSignal.timeout(5000), cache: 'no-store' });
        const data = await r.json();
        if (alive) setConnected(r.ok && data.ok === true);
      } catch {
        if (alive) setConnected(false);
      } finally {
        busy = false;
      }
    };
    void check();
    const timer = setInterval(() => void check(), 15000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  return connected;
}
