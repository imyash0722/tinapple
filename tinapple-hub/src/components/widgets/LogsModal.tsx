import React, { useEffect, useRef } from 'react';
import { X, Terminal, Copy, Check, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LogsModalProps {
  serviceName: string | null;
  logs: string[] | string;
  onClose: () => void;
}

export const LogsModal: React.FC<LogsModalProps> = ({ serviceName, logs, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const logLines = React.useMemo(() => {
    if (Array.isArray(logs)) return logs;
    if (typeof logs === 'string') return logs.split('\n').filter((l) => l.trim().length > 0);
    return [];
  }, [logs]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logLines]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!serviceName) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(logLines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-3xl rounded-2xl border border-tinapple-border bg-tinapple-card/95 backdrop-blur-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-tinapple-border/70 bg-tinapple-dark/60">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-tinapple-cyan/15 text-tinapple-cyan">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white font-mono">
                  journalctl -u {serviceName}.service
                </h3>
                <span className="text-[10px] text-tinapple-subtext font-mono">
                  Live Unit Journal Logs
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono text-tinapple-subtext hover:text-white bg-tinapple-surface border border-tinapple-border transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-tinapple-green" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-tinapple-muted hover:text-white hover:bg-tinapple-surface transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Terminal log output */}
          <div className="p-4 overflow-y-auto flex-1 font-mono text-xs leading-relaxed space-y-1 bg-tinapple-dark/90 text-tinapple-text selection:bg-tinapple-blue/30">
            {logLines.length > 0 ? (
              logLines.map((line, idx) => (
                <div key={idx} className="hover:bg-white/5 px-2 py-0.5 rounded transition-colors break-all">
                  <span className="text-tinapple-muted select-none mr-2">{String(idx + 1).padStart(2, '0')}</span>
                  <span
                    className={
                      line.includes('error') || line.includes('Failed')
                        ? 'text-tinapple-red'
                        : line.includes('warn')
                        ? 'text-tinapple-yellow'
                        : line.includes('Started')
                        ? 'text-tinapple-green'
                        : 'text-tinapple-text'
                    }
                  >
                    {line}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-tinapple-muted italic p-4 text-center">
                Waiting for logs from journald...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Footer */}
          <div className="px-5 py-2.5 border-t border-tinapple-border/70 bg-tinapple-dark/60 flex items-center justify-between text-[11px] font-mono text-tinapple-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tinapple-green animate-pulse" />
              <span>Streaming stdout/stderr</span>
            </span>
            <span>Press ESC to exit</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default LogsModal;
