import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import {
  Terminal as TerminalIcon,
  Maximize2,
  Minimize2,
  X,
  RotateCw,
  Wifi,
  WifiOff,
  CornerDownLeft,
} from 'lucide-react';

interface WebTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WebTerminalModal: React.FC<WebTerminalModalProps> = ({ isOpen, onClose }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const [connected, setConnected] = useState<boolean>(false);
  const [connecting, setConnecting] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Send resize to backend
  const sendResize = useCallback((cols: number, rows: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
      } catch {}
    }
  }, []);

  // Connect WebSocket to PTY
  const connect = useCallback(() => {
    if (!termRef.current) return;
    const term = termRef.current;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnecting(true);
    setErrorMsg(null);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/terminal/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
        setErrorMsg(null);
        term.focus();

        // Fit and notify size
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
        term.write('\r\n\x1b[33m[Session disconnected. Press Reconnect to restart.]\x1b[0m\r\n');
      };

      ws.onerror = () => {
        setConnected(false);
        setConnecting(false);
        setErrorMsg('WebSocket connection failed. Verify terminal service.');
      };
    } catch (e: any) {
      setConnected(false);
      setConnecting(false);
      setErrorMsg(e?.message || 'Failed to initiate terminal connection');
    }
  }, [sendResize]);

  // Initialize xterm
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    // Create terminal instance if not created
    if (!termRef.current) {
      const term = new XTerm({
        cursorBlink: true,
        cursorStyle: 'bar',
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace",
        theme: {
          background: '#040711',
          foreground: '#e2e8f0',
          cursor: '#38bdf8',
          selectionBackground: '#38bdf833',
          black: '#000000',
          red: '#f87171',
          green: '#4ade80',
          yellow: '#facc15',
          blue: '#60a5fa',
          magenta: '#c084fc',
          cyan: '#22d3ee',
          white: '#f1f5f9',
          brightBlack: '#64748b',
          brightRed: '#ef4444',
          brightGreen: '#22c55e',
          brightYellow: '#eab308',
          brightBlue: '#3b82f6',
          brightMagenta: '#a855f7',
          brightCyan: '#06b6d4',
          brightWhite: '#ffffff',
        },
        convertEol: true,
        scrollback: 5000,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      term.open(containerRef.current);
      fitAddon.fit();

      termRef.current = term;
      fitAddonRef.current = fitAddon;

      // Handle user keyboard input
      term.onData((data) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(data);
        }
      });
    }

    // Connect WebSocket
    connect();

    // Resize observer
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

    return () => {
      resizeObserver.disconnect();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (termRef.current) {
        termRef.current.dispose();
        termRef.current = null;
      }
      fitAddonRef.current = null;
    };
  }, [isOpen, connect, sendResize]);

  // Handle mobile helper buttons
  const sendKey = (seq: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(seq);
      if (termRef.current) termRef.current.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`flex flex-col bg-[#050a17]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          isFullscreen
            ? 'w-full h-full max-w-full max-h-full rounded-none'
            : 'w-full max-w-4xl h-[82vh] max-h-[850px]'
        }`}
      >
        {/* Terminal Header - ReactBits Glassmorphic Window Titlebar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#080f22]/90 border-b border-white/[0.08] select-none shrink-0">
          {/* macOS Style Traffic Light Dots */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-rose-500 hover:bg-rose-600 transition-colors cursor-pointer"
              title="Close Terminal"
              aria-label="Close Terminal"
            />
            <button
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="w-3 h-3 rounded-full bg-amber-500 hover:bg-amber-600 transition-colors cursor-pointer"
              title="Toggle Size"
              aria-label="Toggle Size"
            />
            <button
              onClick={() => setIsFullscreen(true)}
              className="w-3 h-3 rounded-full bg-emerald-500 hover:bg-emerald-600 transition-colors cursor-pointer"
              title="Maximize"
              aria-label="Maximize"
            />
            <div className="hidden sm:flex items-center gap-2 ml-3">
              <TerminalIcon className="w-4 h-4 text-tinapple-gold" />
              <span className="font-mono text-xs font-semibold text-slate-200">
                tinapple appliance pty
              </span>
            </div>
          </div>

          {/* Connection status indicator */}
          <div className="flex items-center gap-2">
            {connecting ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono animate-pulse">
                <RotateCw className="w-3 h-3 animate-spin" />
                <span>Connecting</span>
              </span>
            ) : connected ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                <Wifi className="w-3 h-3" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">Active PTY</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-mono">
                <WifiOff className="w-3 h-3" />
                <span>Offline</span>
              </span>
            )}

            {/* Reconnect button */}
            <button
              onClick={connect}
              className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition-all text-xs"
              title="Restart PTY Session"
            >
              <RotateCw className={`w-3.5 h-3.5 ${connecting ? 'animate-spin' : ''}`} />
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white transition-all text-xs"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-rose-500/20 text-zinc-300 hover:text-rose-300 transition-all text-xs"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Error notification banner if any */}
        {errorMsg && (
          <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs font-mono flex items-center justify-between">
            <span>{errorMsg}</span>
            <button
              onClick={connect}
              className="underline hover:text-white ml-2 text-xs font-bold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Terminal Canvas Container */}
        <div
          ref={containerRef}
          className="flex-1 w-full bg-[#040711] overflow-hidden p-2 min-h-0"
        />

        {/* Mobile & Phone Quick-Keys Bar (Virtual keys for ESC, TAB, CTRL, etc.) */}
        <div className="flex items-center gap-1 px-2.5 py-2 bg-[#060b18] border-t border-white/[0.06] overflow-x-auto scrollbar-none select-none shrink-0">
          <span className="text-[10px] font-mono text-zinc-500 mr-1 hidden sm:inline">Keys:</span>
          
          <button
            onClick={() => sendKey('\x1b')}
            className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] active:bg-tinapple-gold/20 text-zinc-300 hover:text-white text-[11px] font-mono font-bold transition-all shrink-0"
            title="Escape"
          >
            ESC
          </button>

          <button
            onClick={() => sendKey('\t')}
            className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] active:bg-tinapple-gold/20 text-zinc-300 hover:text-white text-[11px] font-mono font-bold transition-all shrink-0"
            title="Tab Autocomplete"
          >
            TAB
          </button>

          <button
            onClick={() => sendKey('\x03')}
            className="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-500/40 text-rose-300 text-[11px] font-mono font-bold transition-all shrink-0 border border-rose-500/25"
            title="SIGINT (Interrupt process)"
          >
            CTRL+C
          </button>

          <button
            onClick={() => sendKey('\x1a')}
            className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] active:bg-tinapple-gold/20 text-zinc-300 hover:text-white text-[11px] font-mono font-bold transition-all shrink-0"
            title="SIGTSTP (Suspend job)"
          >
            CTRL+Z
          </button>

          <button
            onClick={() => sendKey('\x04')}
            className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] active:bg-tinapple-gold/20 text-zinc-300 hover:text-white text-[11px] font-mono font-bold transition-all shrink-0"
            title="EOF (Exit shell)"
          >
            CTRL+D
          </button>

          <button
            onClick={() => sendKey('|')}
            className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] active:bg-tinapple-gold/20 text-zinc-300 hover:text-white text-[11px] font-mono font-bold transition-all shrink-0"
          >
            |
          </button>

          <button
            onClick={() => sendKey('~')}
            className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] active:bg-tinapple-gold/20 text-zinc-300 hover:text-white text-[11px] font-mono font-bold transition-all shrink-0"
          >
            ~
          </button>

          <button
            onClick={() => sendKey('/')}
            className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] active:bg-tinapple-gold/20 text-zinc-300 hover:text-white text-[11px] font-mono font-bold transition-all shrink-0"
          >
            /
          </button>

          <button
            onClick={() => sendKey('-')}
            className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] active:bg-tinapple-gold/20 text-zinc-300 hover:text-white text-[11px] font-mono font-bold transition-all shrink-0"
          >
            -
          </button>

          <button
            onClick={() => sendKey('\x1b[A')}
            className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] active:bg-tinapple-gold/20 text-zinc-300 hover:text-white text-[11px] font-mono font-bold transition-all shrink-0"
            title="History Up"
          >
            ▲
          </button>

          <button
            onClick={() => sendKey('\x1b[B')}
            className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] active:bg-tinapple-gold/20 text-zinc-300 hover:text-white text-[11px] font-mono font-bold transition-all shrink-0"
            title="History Down"
          >
            ▼
          </button>

          <button
            onClick={() => sendKey('clear\r')}
            className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] active:bg-tinapple-gold/20 text-amber-300 hover:text-amber-200 text-[11px] font-mono font-bold transition-all ml-auto shrink-0 flex items-center gap-1"
            title="Clear Terminal Screen"
          >
            <span>Clear</span>
          </button>
        </div>
      </div>
    </div>
  );
};
