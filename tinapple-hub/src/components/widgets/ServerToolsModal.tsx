import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  Network,
  RotateCw,
  ExternalLink,
  Trash2,
  HardDrive,
  RefreshCw,
  Wifi,
  AlertTriangle,
  CheckCircle2,
  X,
  Search,
  Activity,
  Terminal,
} from 'lucide-react';
import { api } from '../../services/api';
import { OpenPortInfo, MaintenanceResult, FailedUnitsResult } from '../../types/api';

interface ServerToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServerToolsModal: React.FC<ServerToolsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'ports' | 'maintenance' | 'health'>('ports');

  // Ports state
  const [ports, setPorts] = useState<OpenPortInfo[]>([]);
  const [loadingPorts, setLoadingPorts] = useState<boolean>(false);
  const [portFilter, setPortFilter] = useState<string>('');

  // Maintenance state
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [maintenanceLogs, setMaintenanceLogs] = useState<string>('');

  // Health state
  const [failedUnits, setFailedUnits] = useState<FailedUnitsResult>({ units: [], count: 0 });
  const [kernelLogs, setKernelLogs] = useState<string[]>([]);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(false);

  const loadPorts = useCallback(async () => {
    setLoadingPorts(true);
    try {
      const data = await api.getOpenPorts();
      setPorts(data || []);
    } catch {}
    setLoadingPorts(false);
  }, []);

  const loadHealth = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const [failed, klogs] = await Promise.all([api.getFailedUnits(), api.getKernelLogs()]);
      setFailedUnits(failed || { units: [], count: 0 });
      setKernelLogs(klogs || []);
    } catch {}
    setLoadingHealth(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'ports') loadPorts();
      if (activeTab === 'health') loadHealth();
    }
  }, [isOpen, activeTab, loadPorts, loadHealth]);

  const handleRunMaintenance = async (action: string, label: string) => {
    setRunningAction(action);
    setMaintenanceLogs((prev) => `${prev}\n>>> Executing ${label}...\n`);

    try {
      const res: MaintenanceResult = await api.runMaintenance(action);
      setMaintenanceLogs(
        (prev) => `${prev}${res.output || '(No output)'}\n>>> Status: ${res.success ? 'SUCCESS ✓' : 'FAILED ✗'}\n-----------------------------------\n`
      );
    } catch (e: any) {
      setMaintenanceLogs((prev) => `${prev}Error: ${e?.message || 'Execution failed'}\n`);
    } finally {
      setRunningAction(null);
    }
  };

  if (!isOpen) return null;

  const filteredPorts = ports.filter((p) => {
    const term = portFilter.toLowerCase();
    return (
      p.label?.toLowerCase().includes(term) ||
      p.process?.toLowerCase().includes(term) ||
      p.port.toString().includes(term) ||
      p.localIp?.includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex flex-col bg-[#070d1d]/95 border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] max-h-[850px] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0a1329] border-b border-white/[0.08] select-none shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 via-sky-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-tinapple-gold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono font-bold text-base text-white">Server Operations Center</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold">
                  Zero Shell Required
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Port matrix (ss -tulpn), automated maintenance tasks & unit diagnostics
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-all"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-white/[0.08] bg-[#070d1d] shrink-0">
          <button
            onClick={() => setActiveTab('ports')}
            className={`flex items-center gap-2 px-3.5 py-2 border-b-2 font-mono text-xs font-semibold transition-all ${
              activeTab === 'ports'
                ? 'border-tinapple-gold text-tinapple-gold bg-tinapple-gold/5'
                : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>Port Matrix ({ports.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('maintenance')}
            className={`flex items-center gap-2 px-3.5 py-2 border-b-2 font-mono text-xs font-semibold transition-all ${
              activeTab === 'maintenance'
                ? 'border-tinapple-gold text-tinapple-gold bg-tinapple-gold/5'
                : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>1-Click Maintenance</span>
          </button>

          <button
            onClick={() => setActiveTab('health')}
            className={`flex items-center gap-2 px-3.5 py-2 border-b-2 font-mono text-xs font-semibold transition-all ${
              activeTab === 'health'
                ? 'border-tinapple-gold text-tinapple-gold bg-tinapple-gold/5'
                : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Health & Diagnostics {failedUnits.count > 0 && `(${failedUnits.count} failed)`}</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* TAB 1: PORT MATRIX */}
          {activeTab === 'ports' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={portFilter}
                    onChange={(e) => setPortFilter(e.target.value)}
                    placeholder="Filter port, process, service..."
                    className="w-full pl-9 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-tinapple-gold/50"
                  />
                </div>

                <button
                  onClick={loadPorts}
                  disabled={loadingPorts}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono text-zinc-300 hover:text-white transition-all disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loadingPorts ? 'animate-spin' : ''}`} />
                  <span>Refresh Sockets</span>
                </button>
              </div>

              {loadingPorts && ports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-2">
                  <RotateCw className="w-6 h-6 text-tinapple-gold animate-spin" />
                  <p className="font-mono text-xs text-zinc-400">Scanning network sockets (ss -tulpn)...</p>
                </div>
              ) : (
                <div className="border border-white/10 rounded-xl overflow-hidden bg-black/30">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead className="bg-[#0a1329] border-b border-white/[0.08] text-zinc-400 text-[11px] uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">Port</th>
                          <th className="py-2.5 px-3">Proto</th>
                          <th className="py-2.5 px-3">Service / Appliance</th>
                          <th className="py-2.5 px-3">Bind Address</th>
                          <th className="py-2.5 px-3">Process (PID)</th>
                          <th className="py-2.5 px-3 text-right">Web Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05]">
                        {filteredPorts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-zinc-500 font-mono">
                              No open sockets matching search filter
                            </td>
                          </tr>
                        ) : (
                          filteredPorts.map((p, idx) => (
                            <tr key={`${p.protocol}-${p.port}-${idx}`} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-2.5 px-3 font-bold text-tinapple-gold">
                                :{p.port}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  p.protocol.toLowerCase().includes('tcp')
                                    ? 'bg-sky-500/15 text-sky-300 border border-sky-500/25'
                                    : 'bg-purple-500/15 text-purple-300 border border-purple-500/25'
                                }`}>
                                  {p.protocol}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-white">
                                {p.label || p.process}
                              </td>
                              <td className="py-2.5 px-3 text-zinc-400 text-[11px]">
                                {p.localIp || p.address || '0.0.0.0'}
                              </td>
                              <td className="py-2.5 px-3 text-zinc-400 text-[11px]">
                                {p.process} {p.pid > 0 && <span className="text-zinc-600">({p.pid})</span>}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {p.webUrl ? (
                                  <a
                                    href={p.webUrl.startsWith('http') ? p.webUrl : `http://${typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1'}${p.webUrl}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-tinapple-gold/15 hover:bg-tinapple-gold/25 text-tinapple-gold text-[11px] font-semibold transition-all border border-tinapple-gold/30"
                                  >
                                    <span>Open Web</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="text-zinc-600 text-[11px]">Internal</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 1-CLICK MAINTENANCE */}
          {activeTab === 'maintenance' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Clean Cache */}
                <button
                  onClick={() => handleRunMaintenance('clean-cache', 'Pacman Package Cache Clean')}
                  disabled={runningAction !== null}
                  className="flex flex-col items-start p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-left transition-all group disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-2 group-hover:scale-105 transition-transform">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <span className="font-mono font-bold text-xs text-white">Clean Cache</span>
                  <span className="text-[11px] text-zinc-400 font-mono mt-1">
                    Free up gigabytes from pacman/paru cache
                  </span>
                </button>

                {/* 2. Trim SSD */}
                <button
                  onClick={() => handleRunMaintenance('fstrim', 'SSD NVMe / SATA Trim')}
                  disabled={runningAction !== null}
                  className="flex flex-col items-start p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-left transition-all group disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/25 flex items-center justify-center text-sky-400 mb-2 group-hover:scale-105 transition-transform">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <span className="font-mono font-bold text-xs text-white">Trim SSDs</span>
                  <span className="text-[11px] text-zinc-400 font-mono mt-1">
                    Run fstrim to optimize NVMe write wear
                  </span>
                </button>

                {/* 3. Daemon Reload */}
                <button
                  onClick={() => handleRunMaintenance('daemon-reload', 'Systemd Daemon Reload')}
                  disabled={runningAction !== null}
                  className="flex flex-col items-start p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-left transition-all group disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 mb-2 group-hover:scale-105 transition-transform">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <span className="font-mono font-bold text-xs text-white">Reload Systemd</span>
                  <span className="text-[11px] text-zinc-400 font-mono mt-1">
                    Rescan unit files & drop-in overrides
                  </span>
                </button>

                {/* 4. Restart Network */}
                <button
                  onClick={() => handleRunMaintenance('restart-network', 'Network Stack Restart')}
                  disabled={runningAction !== null}
                  className="flex flex-col items-start p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-left transition-all group disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 mb-2 group-hover:scale-105 transition-transform">
                    <Wifi className="w-4 h-4" />
                  </div>
                  <span className="font-mono font-bold text-xs text-white">Restart Network</span>
                  <span className="text-[11px] text-zinc-400 font-mono mt-1">
                    Re-bind Wi-Fi, Ethernet & DHCP leases
                  </span>
                </button>
              </div>

              {/* Live Execution Output Terminal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-tinapple-gold" />
                    <span className="text-xs font-mono font-semibold text-zinc-300">
                      Maintenance Task Output
                    </span>
                  </div>
                  {maintenanceLogs && (
                    <button
                      onClick={() => setMaintenanceLogs('')}
                      className="text-[11px] font-mono text-zinc-400 hover:text-white"
                    >
                      Clear Log
                    </button>
                  )}
                </div>

                <div className="p-3 bg-black/60 border border-white/10 rounded-xl h-60 overflow-y-auto font-mono text-xs text-zinc-300 whitespace-pre-wrap select-text">
                  {maintenanceLogs || 'Ready. Click any maintenance action above to execute.'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HEALTH & DIAGNOSTICS */}
          {activeTab === 'health' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Systemd Unit Health
                </h4>
                <button
                  onClick={loadHealth}
                  disabled={loadingHealth}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono text-zinc-300 hover:text-white transition-all disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
                  <span>Refresh Health</span>
                </button>
              </div>

              {failedUnits.count === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-mono font-bold text-xs text-emerald-300">All Units Operational</p>
                    <p className="font-mono text-[11px] text-zinc-400">0 failed systemd service units detected on this node.</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                    <p className="font-mono font-bold text-xs text-rose-300">
                      {failedUnits.count} Failed Service Unit(s)
                    </p>
                  </div>
                  <ul className="list-disc pl-6 space-y-1 text-xs font-mono text-rose-200">
                    {failedUnits.units.map((u, i) => (
                      <li key={i}>{u}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Kernel Warning & Error Journal Logs */}
              <div className="space-y-2 pt-2">
                <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Kernel & Hardware Journal Alerts (Priority ≤ 3)
                </h4>
                <div className="p-3 bg-black/60 border border-white/10 rounded-xl h-64 overflow-y-auto font-mono text-[11px] text-amber-300/90 whitespace-pre-wrap select-text leading-relaxed">
                  {kernelLogs.length > 0 ? (
                    kernelLogs.join('\n')
                  ) : (
                    <span className="text-zinc-500">No critical kernel alerts in current boot cycle.</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
