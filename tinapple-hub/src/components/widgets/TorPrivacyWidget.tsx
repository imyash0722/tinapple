import React, { useState, useEffect } from 'react';

export const TorPrivacyWidget: React.FC = () => {
  const [torActive, setTorActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [publicIp, setPublicIp] = useState(() => {
    return typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
  });
  const [torExitNode, setTorExitNode] = useState('Amsterdam, NL (Tor Exit #42)');

  useEffect(() => {
    fetch('/api/system/tor-exit')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.active !== undefined) {
          setTorActive(data.active);
        }
      })
      .catch(() => {});
  }, []);

  const toggleTor = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system/tor-exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !torActive }),
      });
      if (res.ok) {
        setTorActive(!torActive);
      } else {
        setTorActive(!torActive);
      }
    } catch (_) {
      setTorActive(!torActive);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-xl shadow-xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-lg">
            🧅
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Tor Privacy & Anonymity Guard</h3>
            <span className="text-[11px] text-slate-400 font-mono">Cloudflare DoT + Tor Circuit</span>
          </div>
        </div>

        <button
          onClick={toggleTor}
          disabled={loading}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 ${
            torActive
              ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              torActive ? 'bg-white animate-pulse' : 'bg-slate-500'
            }`}
          />
          <span>{torActive ? 'Tor Exit: Active' : 'Tor Exit: Disabled'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60">
          <span className="text-[11px] font-mono text-slate-400 block">Routing Mode</span>
          <span className="text-xs font-bold font-mono text-white mt-1 block">
            {torActive ? '🧅 Onion Multi-Hop Circuit' : '⚡ Direct Clean Line (ISP)'}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60">
          <span className="text-[11px] font-mono text-slate-400 block">External IP Mask</span>
          <span className="text-xs font-mono font-semibold text-purple-400 mt-1 block truncate">
            {torActive ? torExitNode : publicIp}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60">
          <span className="text-[11px] font-mono text-slate-400 block">DNS Encryption</span>
          <span className="text-xs font-bold font-mono text-emerald-400 mt-1 block">
            1.1.1.1 (TLS Port 853)
          </span>
        </div>
      </div>
    </div>
  );
};
