import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { getWsTerminalUrl } from '../../services/api';
import {
  Terminal as TerminalIcon,
  Maximize2,
  Minimize2,
  RotateCw,
  Wifi,
  WifiOff,
  Sparkles,
  Command,
  Copy,
  Clipboard,
  Shield,
  Activity,
  Layers,
} from 'lucide-react';

interface WebTerminalPageProps {
  onOpenServices?: () => void;
  onOpenStore?: () => void;
}

export const WebTerminalPage: React.FC<WebTerminalPageProps> = ({ onOpenServices, onOpenStore }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [connected, setConnected] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const sendResize = useCallback((cols: number, rows: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
      } catch {}
    }
  }, []);

  const connect = useCallback(() => {
    if (!termRef.current) return;
    const term = termRef.current;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnecting(true);
    setErrorMsg(null);

    const wsUrl = getWsTerminalUrl();

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
        setErrorMsg(null);
        term.focus();

        if (fitAddonRef.current) {
          fitAddonRef.current.fit();
          sendResize(term.cols, term.rows);
        }
      };

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          term.write(event.data);
        } else if (event.data instanceof Blob) {
          event.data.text().then((text) => term.write(text));
        } else if (event.data instanceof ArrayBuffer) {
          const decoder = new TextDecoder('utf-8');
          term.write(decoder.decode(event.data));
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setConnecting(false);
        term.write('\r\n\x1b[33m[Session disconnected. Click Reconnect to resume shell.]\x1b[0m\r\n');
      };

      ws.onerror = () => {
        setConnected(false);
        setConnecting(false);
        setErrorMsg('WebSocket connection dropped or terminal daemon unreachable.');
      };
    } catch (e: any) {
      setConnected(false);
      setConnecting(false);
      setErrorMsg(e?.message || 'Failed to initialize terminal session');
    }
  }, [sendResize]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!termRef.current) {
      const term = new XTerm({
        cursorBlink: true,
        cursorStyle: 'bar',
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace",
        theme: {
          background: '#040711',
          foreground: '#f1f5f9',
          cursor: '#f59e0b',
          selectionBackground: '#f59e0b44',
          black: '#0a0e1a',
          red: '#f87171',
          green: '#4ade80',
          yellow: '#fbbf24',
          blue: '#60a5fa',
          magenta: '#c084fc',
          cyan: '#22d3ee',
          white: '#f1f5f9',
          brightBlack: '#64748b',
          brightRed: '#ef4444',
          brightGreen: '#22c55e',
          brightYellow: '#f59e0b',
          brightBlue: '#3b82f6',
          brightMagenta: '#a855f7',
          brightCyan: '#06b6d4',
          brightWhite: '#ffffff',
        },
        convertEol: true,
        scrollback: 10000,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      term.open(containerRef.current);
      fitAddon.fit();

      termRef.current = term;
      fitAddonRef.current = fitAddon;

      term.onData((data) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(data);
        }
      });
    }

    connect();

    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && termRef.current) {
        try {
          fitAddonRef.current.fit();
          sendResize(termRef.current.cols, termRef.current.rows);
        } catch {}
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const handleWindowResize = () => {
      if (fitAddonRef.current && termRef.current) {
        try {
          fitAddonRef.current.fit();
          sendResize(termRef.current.cols, termRef.current.rows);
        } catch {}
      }
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (termRef.current) {
        termRef.current.dispose();
        termRef.current = null;
      }
    };
  }, [connect, sendResize]);

  const sendKey = (key: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(key);
      if (termRef.current) termRef.current.focus();
    }
  };

  const runQuickCommand = (cmd: string) => {
    sendKey(`${cmd}\r`);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        sendKey(text);
        setCopiedNotification('Pasted from clipboard!');
        setTimeout(() => setCopiedNotification(null), 2000);
      }
    } catch {
      setCopiedNotification('Clipboard access denied by browser');
      setTimeout(() => setCopiedNotification(null), 2000);
    }
  };

  return (
    <div
      className={`flex flex-col font-mono transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-[#040711] p-0'
          : 'w-full rounded-2xl bg-slate-950/90 border border-white/10 shadow-2xl overflow-hidden'
      }`}
      style={{ height: isFullscreen ? '100vh' : 'calc(100vh - 8.5rem)', minHeight: '600px' }}
    >
      {/* Top Action Toolbar */}
      <div className="px-4 py-3 bg-[#0a1020] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3 shrink-0 select-none">
        {/* Left: Terminal Brand & Status */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <TerminalIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-xs tracking-wider uppercase">
                Appliance Web Terminal
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  connected
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : connecting
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}
              >
                {connected ? (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span>PTY ACTIVE (bash)</span>
                  </>
                ) : connecting ? (
                  <>
                    <RotateCw className="w-3 h-3 text-amber-400 animate-spin" />
                    <span>CONNECTING...</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-rose-400" />
                    <span>OFFLINE</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Live asynchronous pseudoterminal connected to local appliance shell session.
            </p>
          </div>
        </div>

        {/* Right: Quick Commands & Controls */}
        <div className="flex items-center flex-wrap gap-1.5 text-xs">
          {/* Quick Diagnostics Dropdown or Buttons */}
          <div className="hidden lg:flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/5">
            <button
              onClick={() => runQuickCommand('htop')}
              className="px-2 py-1 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 text-[11px] font-bold transition-colors"
              title="Interactive Process Monitor"
            >
              htop
            </button>
            <button
              onClick={() => runQuickCommand('systemctl --failed')}
              className="px-2 py-1 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 text-[11px] font-bold transition-colors"
              title="Check Failed Services"
            >
              failed units
            </button>
            <button
              onClick={() => runQuickCommand('free -h && df -h /')}
              className="px-2 py-1 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 text-[11px] font-bold transition-colors"
              title="Memory and Disk Usage"
            >
              free & df
            </button>
            <button
              onClick={() => runQuickCommand('tailscale status')}
              className="px-2 py-1 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 text-[11px] font-bold transition-colors"
              title="Tailscale Mesh Status"
            >
              tailscale
            </button>
            <button
              onClick={() => runQuickCommand('protonvpn status')}
              className="px-2 py-1 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 text-[11px] font-bold transition-colors"
              title="Proton VPN Status"
            >
              protonvpn
            </button>
          </div>

          {/* Paste Button */}
          <button
            onClick={handlePasteClipboard}
            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/5 transition-all text-xs flex items-center gap-1"
            title="Paste Clipboard Text"
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Paste</span>
          </button>

          {/* Reconnect */}
          <button
            onClick={connect}
            disabled={connecting}
            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/5 transition-all text-xs flex items-center gap-1"
            title="Reconnect Session"
          >
            <RotateCw className={`w-3.5 h-3.5 ${connecting ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reconnect</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/5 transition-all"
            title={isFullscreen ? 'Exit Fullscreen' : 'Full Screen View'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Copied / Action Notification */}
      {copiedNotification && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-300 px-4 py-1 text-xs font-mono text-center shrink-0">
          {copiedNotification}
        </div>
      )}

      {/* Connection Error Banner */}
      {errorMsg && (
        <div className="bg-rose-500/15 border-b border-rose-500/30 text-rose-300 px-4 py-2 text-xs font-mono flex items-center justify-between shrink-0">
          <span>{errorMsg}</span>
          <button onClick={connect} className="underline hover:text-white font-bold ml-2">
            Retry Connection
          </button>
        </div>
      )}

      {/* Terminal Viewport */}
      <div
        ref={containerRef}
        className="flex-1 w-full bg-[#040711] overflow-hidden p-3 min-h-0 select-text"
      />

      {/* Bottom Virtual Keys Bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[#060b18] border-t border-white/[0.06] overflow-x-auto scrollbar-none select-none shrink-0">
        <span className="text-[10px] text-zinc-500 mr-1 hidden sm:inline">Quick Keys:</span>

        <button
          onClick={() => sendKey('\x1b')}
          className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] active:bg-tinapple-gold/20 text-zinc-300 hover:text-white text-[11px] font-bold transition-all shrink-0"
          title="Escape"
        >
          ESC
        </button>

        <button
          onClick={() => sendKey('\t')}
          className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] active:bg-tinapple-gold/20 text-zinc-300 hover:text-white text-[11px] font-bold transition-all shrink-0"
          title="Tab Autocomplete"
        >
          TAB
        </button>

        <button
          onClick={() => sendKey('\x03')}
          className="px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-500/40 text-rose-300 text-[11px] font-bold transition-all shrink-0 border border-rose-500/25"
          title="SIGINT (CTRL+C)"
        >
          CTRL+C
        </button>

        <button
          onClick={() => sendKey('\x1a')}
          className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] active:bg-tinapple-gold/20 text-zinc-300 hover:text-white text-[11px] font-bold transition-all shrink-0"
          title="SIGTSTP (CTRL+Z)"
        >
          CTRL+Z
        </button>

        <button
          onClick={() => sendKey('\x04')}
          className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] active:bg-tinapple-gold/20 text-zinc-300 hover:text-white text-[11px] font-bold transition-all shrink-0"
          title="EOF (CTRL+D)"
        >
          CTRL+D
        </button>

        <button
          onClick={() => sendKey('|')}
          className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white text-[11px] font-bold transition-all shrink-0"
        >
          |
        </button>

        <button
          onClick={() => sendKey('~')}
          className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white text-[11px] font-bold transition-all shrink-0"
        >
          ~
        </button>

        <button
          onClick={() => sendKey('/')}
          className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white text-[11px] font-bold transition-all shrink-0"
        >
          /
        </button>

        <button
          onClick={() => sendKey('-')}
          className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white text-[11px] font-bold transition-all shrink-0"
        >
          -
        </button>

        <button
          onClick={() => sendKey('\x1b[A')}
          className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white text-[11px] font-bold transition-all shrink-0"
          title="History Up"
        >
          ▲
        </button>

        <button
          onClick={() => sendKey('\x1b[B')}
          className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white text-[11px] font-bold transition-all shrink-0"
          title="History Down"
        >
          ▼
        </button>

        <button
          onClick={() => runQuickCommand('clear')}
          className="px-3 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-amber-300 hover:text-amber-200 text-[11px] font-bold transition-all ml-auto shrink-0"
          title="Clear Terminal Screen"
        >
          Clear Screen
        </button>
      </div>
    </div>
  );
};

export default WebTerminalPage;
