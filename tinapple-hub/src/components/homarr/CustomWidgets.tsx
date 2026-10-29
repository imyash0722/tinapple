import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  RotateCw,
  Edit3,
  Globe,
  FileText,
  Bookmark,
  Activity,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
} from 'lucide-react';
import { CanvasWidget } from '../../types/canvas';

// 1. Custom Iframe Embed Widget
export const CustomIframeWidget: React.FC<{ widget: CanvasWidget }> = ({ widget }) => {
  const url = widget.customConfig?.url || '';
  const [iframeKey, setIframeKey] = useState(0);
  const [loadError, setLoadError] = useState(false);

  return (
    <div className="h-full w-full flex flex-col rounded-2xl bg-slate-900/90 border border-white/10 overflow-hidden shadow-xl backdrop-blur-md">
      {/* Header bar */}
      <div className="px-3.5 py-2.5 border-b border-white/10 bg-slate-950/60 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{widget.icon || '🌐'}</span>
          <span className="font-mono font-bold text-xs text-white truncate">{widget.title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIframeKey((k) => k + 1)}
            className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            title="Reload Frame"
          >
            <RotateCw className="w-3 h-3" />
          </button>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              title="Open in New Tab"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 w-full h-full relative bg-slate-950">
        {url ? (
          <iframe
            key={iframeKey}
            src={url}
            title={widget.title}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            onError={() => setLoadError(true)}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-4 text-center font-mono text-xs text-zinc-500">
            <Globe className="w-8 h-8 mb-2 opacity-40 text-sky-400" />
            <span>No URL configured</span>
            <span className="text-[10px] text-zinc-600 mt-1">Click Edit Widget to set an embed URL</span>
          </div>
        )}
      </div>
    </div>
  );
};

// 2. Custom Markdown Sticky Note Widget
export const CustomMarkdownWidget: React.FC<{ widget: CanvasWidget }> = ({ widget }) => {
  const content = widget.customConfig?.markdown || 'Write your server notes, commands, or documentation here...';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full w-full flex flex-col rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-white/10 p-4 shadow-xl backdrop-blur-md overflow-hidden">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">{widget.icon || '📝'}</span>
          <span className="font-mono font-bold text-xs text-white">{widget.title}</span>
        </div>
        <button
          onClick={handleCopy}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Copy Text"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto font-mono text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed pr-1 selection:bg-purple-500/30">
        {content}
      </div>
    </div>
  );
};

// 3. Custom Links Hub Widget
export const CustomLinksWidget: React.FC<{ widget: CanvasWidget }> = ({ widget }) => {
  const links = widget.customConfig?.links || [];

  return (
    <div className="h-full w-full flex flex-col rounded-2xl bg-slate-900/90 border border-white/10 p-4 shadow-xl backdrop-blur-md overflow-hidden">
      <div className="flex items-center gap-2 pb-2 mb-3 border-b border-white/10 shrink-0">
        <span className="text-base">{widget.icon || '🔖'}</span>
        <span className="font-mono font-bold text-xs text-white">{widget.title}</span>
        <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10">
          {links.length} links
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {links.length > 0 ? (
          links.map((link, idx) => (
            <a
              key={link.id || idx}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-white/5 hover:border-white/15 text-zinc-200 hover:text-white transition-all group font-mono text-xs"
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className="text-sm shrink-0">{link.icon || '🔗'}</span>
                <span className="font-medium truncate">{link.name}</span>
              </div>
              <ExternalLink className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 shrink-0 ml-2" />
            </a>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center font-mono text-xs text-zinc-500 py-6">
            <Bookmark className="w-6 h-6 mb-2 opacity-40 text-amber-400" />
            <span>No links configured</span>
            <span className="text-[10px] text-zinc-600 mt-0.5">Click Edit Widget to add links</span>
          </div>
        )}
      </div>
    </div>
  );
};

// 4. Custom Endpoint / Port Monitor Widget
export const CustomMonitorWidget: React.FC<{ widget: CanvasWidget }> = ({ widget }) => {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const endpoint = widget.customConfig?.pingEndpoint || '';
  const port = widget.customConfig?.targetPort;

  const checkHealth = async () => {
    setStatus('checking');
    const start = performance.now();
    try {
      const targetUrl = endpoint || (port ? `http://${window.location.hostname}:${port}` : null);
      if (!targetUrl) {
        setStatus('offline');
        return;
      }
      // Attempt head or fetch with short timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      await fetch(targetUrl, { mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeoutId);
      setLatencyMs(Math.round(performance.now() - start));
      setStatus('online');
    } catch {
      setStatus('offline');
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, (widget.customConfig?.refreshSeconds || 30) * 1000);
    return () => clearInterval(interval);
  }, [endpoint, port]);

  return (
    <div className="h-full w-full flex flex-col justify-between rounded-2xl bg-slate-900/90 border border-white/10 p-4 shadow-xl backdrop-blur-md font-mono">
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2 truncate">
          <span className="text-base">{widget.icon || '⚡'}</span>
          <span className="font-bold text-xs text-white truncate">{widget.title}</span>
        </div>
        <button
          onClick={checkHealth}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Ping Now"
        >
          <RotateCw className="w-3 h-3" />
        </button>
      </div>

      <div className="my-3 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          {status === 'online' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : status === 'checking' ? (
            <Activity className="w-5 h-5 text-amber-400 animate-pulse" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-400" />
          )}
          <div>
            <span className="text-xs font-bold text-white uppercase block">
              {status === 'online' ? 'Operational' : status === 'checking' ? 'Testing link...' : 'Unreachable'}
            </span>
            <span className="text-[10px] text-zinc-400">
              {endpoint || (port ? `Port :${port}` : 'No target defined')}
            </span>
          </div>
        </div>

        {latencyMs !== null && status === 'online' && (
          <span className="text-[11px] font-bold text-emerald-300 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
            {latencyMs}ms
          </span>
        )}
      </div>

      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500">
        <span>Auto-ping: {widget.customConfig?.refreshSeconds || 30}s</span>
        <span className="text-zinc-400">Node Link</span>
      </div>
    </div>
  );
};
