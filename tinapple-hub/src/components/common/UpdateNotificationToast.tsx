import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpCircle, X, ExternalLink, RefreshCw, Sparkles, GitCommit } from 'lucide-react';
import { api } from '../../services/api';
import { AppUpdateService } from '../../services/appUpdate';

const DISMISSED_SHA_KEY = 'tinapple_dismissed_update_sha';

interface GitHubCommitInfo {
  sha: string;
  message: string;
  date: string;
  author: string;
  url: string;
}

interface UpdateNotificationToastProps {
  onTriggerUpdate?: () => void;
}

export const UpdateNotificationToast: React.FC<UpdateNotificationToastProps> = ({ onTriggerUpdate }) => {
  const [latestCommit, setLatestCommit] = useState<GitHubCommitInfo | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  const checkRepoUpdates = useCallback(async () => {
    try {
      const res = await fetch('https://api.github.com/repos/imyash0722/tinapple/commits/main', {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
      if (!res.ok) return;

      const data = await res.json();
      const sha = data.sha;
      const shortSha = sha ? sha.substring(0, 7) : '';
      const message = data.commit?.message?.split('\n')[0] || 'New updates pushed to repository';
      const date = data.commit?.committer?.date || '';
      const author = data.commit?.author?.name || 'imyash0722';
      const url = data.html_url || 'https://github.com/imyash0722/tinapple/commits/main';

      // Check if user already dismissed this commit
      const dismissed = localStorage.getItem(DISMISSED_SHA_KEY);
      if (dismissed === sha) {
        return;
      }

      setLatestCommit({
        sha: shortSha,
        message,
        date,
        author,
        url,
      });
      setIsVisible(true);
    } catch {
      // Offline / campus network fallback
    }
  }, []);

  useEffect(() => {
    // Initial check after 3 seconds
    const initialTimer = setTimeout(() => {
      checkRepoUpdates();
    }, 3000);

    // Periodic check every 5 minutes
    const interval = setInterval(() => {
      checkRepoUpdates();
    }, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [checkRepoUpdates]);

  const handleDismiss = () => {
    if (latestCommit?.sha) {
      try {
        localStorage.setItem(DISMISSED_SHA_KEY, latestCommit.sha);
      } catch {}
    }
    setIsVisible(false);
  };

  const handleApplyUpdate = async () => {
    setIsUpdating(true);
    if (AppUpdateService.isNativeAndroid()) {
      setUpdateStatus('Connecting to update server...');
      try {
        const apkUrl = 'https://pineapple-server.taildb42a2.ts.net/tinapple-client.apk';
        const res = await AppUpdateService.installApk(apkUrl, (progress) => {
          setUpdateStatus(`Downloading update (${progress}%)...`);
        });
        if (res.success) {
          setUpdateStatus('Launching Android installer...');
          setTimeout(() => setIsVisible(false), 3000);
        } else {
          setUpdateStatus(`Update notice: ${res.error || res.status}`);
          setIsUpdating(false);
        }
      } catch (e: any) {
        setUpdateStatus(`Update failed: ${e.message || 'Check connection'}`);
        setIsUpdating(false);
      }
      return;
    }

    setUpdateStatus('Deploying system update...');
    try {
      if (onTriggerUpdate) {
        onTriggerUpdate();
      } else {
        await api.runSystemUpdate();
      }
      setUpdateStatus('Update completed successfully!');
      setTimeout(() => {
        setIsVisible(false);
      }, 3000);
    } catch (e: any) {
      setUpdateStatus(`Update failed: ${e.message || 'Check logs'}`);
      setTimeout(() => setIsUpdating(false), 3000);
    }
  };

  if (!isVisible || !latestCommit) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="fixed bottom-5 right-5 z-50 max-w-sm w-full font-mono select-none"
      >
        <div className="relative rounded-2xl bg-slate-900/95 border border-cyan-500/40 p-4 shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl overflow-hidden text-xs">
          {/* Ambient glow accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top header row */}
          <div className="flex items-start justify-between gap-2 mb-2 relative z-10">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-tinapple-gold" />
                Tinapple Repo Update
              </span>
            </div>

            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Dismiss update notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Commit Message & Metadata */}
          <div className="space-y-1.5 mb-3 relative z-10">
            <div className="text-zinc-200 font-semibold line-clamp-2 leading-relaxed">
              {latestCommit.message}
            </div>

            <div className="flex items-center gap-2 text-[10px] text-zinc-400">
              <span className="flex items-center gap-1 text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                <GitCommit className="w-2.5 h-2.5" />
                {latestCommit.sha}
              </span>
              <span>by {latestCommit.author}</span>
            </div>
          </div>

          {updateStatus && (
            <div className="mb-2 p-1.5 rounded-lg bg-black/40 border border-white/10 text-[10px] text-zinc-300">
              {updateStatus}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 relative z-10">
            <button
              onClick={handleApplyUpdate}
              disabled={isUpdating}
              className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>
                {isUpdating
                  ? 'Updating...'
                  : AppUpdateService.isNativeAndroid()
                  ? 'Update App'
                  : 'Update System'}
              </span>
            </button>

            <a
              href={latestCommit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="py-1.5 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white font-semibold flex items-center gap-1 transition-all"
            >
              <span>View</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpdateNotificationToast;
