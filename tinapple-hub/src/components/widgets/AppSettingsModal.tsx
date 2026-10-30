import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Sliders,
  FileCode,
  Save,
  RotateCw,
  X,
  Check,
  Copy,
  Folder,
  Cpu,
  Power,
  ShieldCheck,
  AlertCircle,
  HardDrive,
  Info,
} from 'lucide-react';
import { api } from '../../services/api';
import { SquishSwitch } from '../reactbits/SquishSwitch';
import { AppConfigDetails } from '../../types/api';

interface AppSettingsModalProps {
  isOpen: boolean;
  appId: string | null;
  appName?: string;
  onClose: () => void;
  onAppUpdated?: () => void;
}

export const AppSettingsModal: React.FC<AppSettingsModalProps> = ({
  isOpen,
  appId,
  appName,
  onClose,
  onAppUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'advanced' | 'rawConfig'>('advanced');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfigDetails | null>(null);

  // Form states
  const [port, setPort] = useState<number>(0);
  const [autostart, setAutostart] = useState<boolean>(false);
  const [cpuWeight, setCpuWeight] = useState<number>(100);
  const [ignorePerms, setIgnorePerms] = useState<boolean>(false);
  const [rawConfig, setRawConfig] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Load config data
  const loadAppConfig = useCallback(async () => {
    if (!appId) return;
    setLoading(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const data = await api.getAppConfig(appId);
      if (data) {
        setConfig(data);
        setPort(data.port || 0);
        setAutostart(data.autostart || false);
        setCpuWeight(data.cpuWeight || 100);
        setIgnorePerms(data.ignorePerms ?? false);
        setRawConfig(data.rawConfig || '');
      } else {
        setErrorMessage(`Could not load configuration details for ${appId}`);
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    if (isOpen && appId) {
      loadAppConfig();
    }
  }, [isOpen, appId, loadAppConfig]);

  const handleSave = async () => {
    if (!appId) return;
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const ok = await api.updateAppConfig(appId, {
        port: port > 0 ? port : undefined,
        autostart,
        cpuWeight,
        ignorePerms: appId === 'syncthing' ? ignorePerms : undefined,
        rawConfig: rawConfig.trim() !== '' ? rawConfig : undefined,
      });

      if (ok) {
        setSaveSuccess(true);
        if (onAppUpdated) onAppUpdated();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setErrorMessage('Failed to save configuration. Check permissions.');
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Error occurred while saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(rawConfig);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper snippet injector for raw config
  const handleInsertTrueNASSnippet = () => {
    const snippet = `\n<!-- TrueNAS & Multi-OS Compatibility Overrides -->\n<ignorePerms>true</ignorePerms>\n<autoAcceptFolders>true</autoAcceptFolders>\n`;
    setRawConfig((prev) => prev + snippet);
  };

  if (!isOpen || !appId) return null;

  const displayName = appName || config?.name || appId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex flex-col bg-[#070d1d]/95 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0a1329] border-b border-white/[0.08] select-none shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-tinapple-gold/20 via-sky-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-tinapple-gold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono font-bold text-base text-white">{displayName}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-zinc-300">
                  {config?.unit || `${appId}.service`}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Independent Service Configuration & Raw Config Editor
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

        {/* Tab Selector */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-white/[0.08] bg-[#070d1d] shrink-0">
          <button
            onClick={() => setActiveTab('advanced')}
            className={`flex items-center gap-2 px-3.5 py-2 border-b-2 font-mono text-xs font-semibold transition-all ${
              activeTab === 'advanced'
                ? 'border-tinapple-gold text-tinapple-gold bg-tinapple-gold/5'
                : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Advanced Options</span>
          </button>

          <button
            onClick={() => setActiveTab('rawConfig')}
            className={`flex items-center gap-2 px-3.5 py-2 border-b-2 font-mono text-xs font-semibold transition-all ${
              activeTab === 'rawConfig'
                ? 'border-tinapple-gold text-tinapple-gold bg-tinapple-gold/5'
                : 'border-transparent text-zinc-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Raw Config Editor (Paste Config)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <RotateCw className="w-8 h-8 text-tinapple-gold animate-spin" />
              <p className="font-mono text-xs text-zinc-400">Loading {displayName} configuration...</p>
            </div>
          ) : (
            <>
              {/* Notification Alerts */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Configuration saved successfully! Daemon reloaded.</span>
                </div>
              )}

              {activeTab === 'advanced' ? (
                <div className="space-y-4">
                  {/* Option 1: Port Configuration */}
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono font-semibold text-zinc-200 flex items-center gap-2">
                        <HardDrive className="w-4 h-4 text-tinapple-gold" />
                        <span>Listening Port</span>
                      </label>
                      <span className="text-[11px] font-mono text-zinc-400">
                        Default: {config?.port || 'Dynamic'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max="65535"
                        value={port || ''}
                        onChange={(e) => setPort(parseInt(e.target.value) || 0)}
                        placeholder="e.g. 8080"
                        className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-tinapple-gold/50"
                      />
                      <button
                        type="button"
                        onClick={() => setPort(config?.port || 0)}
                        className="px-3 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono text-zinc-300 hover:text-white transition-all"
                      >
                        Reset Default
                      </button>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      Overrides the port in the systemd environment or config file.
                    </p>
                  </div>

                  {/* Option 2: Autostart on Boot */}
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-xs font-mono font-semibold text-zinc-200 flex items-center gap-2">
                        <Power className="w-4 h-4 text-emerald-400" />
                        <span>Autostart on Boot (systemd enabled)</span>
                      </label>
                      <p className="text-[11px] text-zinc-400 font-mono">
                        Automatically launch {displayName} when the server starts up.
                      </p>
                    </div>
                    <SquishSwitch
                      checked={autostart}
                      onChange={setAutostart}
                      variant="emerald"
                      size="sm"
                    />
                  </div>

                  {/* Option 3: CPU Weight / Resource Priority */}
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono font-semibold text-zinc-200 flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-sky-400" />
                        <span>CPU Weight / Scheduling Priority</span>
                      </label>
                      <span className="text-[11px] font-mono text-tinapple-gold font-bold">
                        Weight: {cpuWeight}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="1000"
                      step="20"
                      value={cpuWeight}
                      onChange={(e) => setCpuWeight(parseInt(e.target.value))}
                      className="w-full accent-tinapple-gold cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                      <span>Low (Background: 50)</span>
                      <span>Balanced (Standard: 100)</span>
                      <span>High Priority (500)</span>
                      <span>Realtime (1000)</span>
                    </div>
                  </div>

                  {/* Option 4: Syncthing TrueNAS / Cross-Platform Permission Fix */}
                  {appId === 'syncthing' && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-white/[0.03] to-white/[0.03] border border-amber-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <label className="text-xs font-mono font-bold text-amber-300 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-amber-400" />
                            <span>TrueNAS & Windows Sync: Ignore Permissions</span>
                          </label>
                          <p className="text-[11px] text-zinc-400 font-mono">
                            Sets <code className="text-amber-300">&lt;ignorePerms&gt;true&lt;/ignorePerms&gt;</code> in config.xml to avoid POSIX/NTFS permission conflicts with Windows or TrueNAS SMB shares.
                          </p>
                        </div>
                        <SquishSwitch
                          checked={ignorePerms}
                          onChange={setIgnorePerms}
                          variant="amber"
                          size="sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Option 5: Storage & Configuration Paths */}
                  <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5 text-xs font-mono">
                    <div className="flex items-center gap-2 text-zinc-300 font-semibold mb-2">
                      <Folder className="w-4 h-4 text-purple-400" />
                      <span>Configuration File Path</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 text-[11px] text-zinc-300 font-mono break-all select-all">
                      {config?.configPath || 'Managed by systemd service unit'}
                    </div>
                  </div>
                </div>
              ) : (
                /* Tab 2: Raw Config Editor (User requested box to just paste config) */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-zinc-300">
                        Config File Contents:
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400 truncate max-w-xs">
                        {config?.configPath || 'Default Configuration'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {appId === 'syncthing' && (
                        <button
                          type="button"
                          onClick={handleInsertTrueNASSnippet}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-mono transition-all"
                          title="Add TrueNAS ignorePerms tag"
                        >
                          + TrueNAS Tag
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white text-[11px] font-mono transition-all"
                        title="Copy configuration"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] font-mono text-zinc-400">
                    Paste or edit configuration directly below. Changes are saved to disk and the service is automatically reloaded.
                  </p>

                  <div className="relative">
                    <textarea
                      value={rawConfig}
                      onChange={(e) => setRawConfig(e.target.value)}
                      rows={14}
                      placeholder={`# Paste ${displayName} configuration here...`}
                      className="w-full p-3.5 bg-black/60 border border-white/10 rounded-xl font-mono text-xs text-slate-100 placeholder-zinc-600 focus:outline-none focus:border-tinapple-gold/50 resize-y leading-relaxed"
                      spellCheck={false}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0a1329] border-t border-white/[0.08] shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
            <Info className="w-3.5 h-3.5 text-tinapple-gold" />
            <span>Applies automatically on save</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white text-xs font-mono font-semibold transition-all"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-tinapple-gold to-amber-500 hover:from-tinapple-gold/90 hover:to-amber-500/90 text-slate-950 text-xs font-mono font-bold shadow-lg shadow-tinapple-gold/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Saving & Reloading...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save & Reload Daemon</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
