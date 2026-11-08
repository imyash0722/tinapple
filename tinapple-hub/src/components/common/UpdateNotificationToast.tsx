import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, RefreshCw, Sparkles, GitCommit, ArrowUpRight } from 'lucide-react';
import { AppUpdateService } from '../../services/appUpdate';
import { api } from '../../services/api';

const DISMISSED_SHA_KEY = 'tinapple_dismissed_update_sha';
const SESSION_DISMISSED_KEY = 'tinapple_update_toast_session_dismissed';

declare const __BUILD_COMMIT__: string;

interface GitHubCommitInfo {
  sha: string;
  fullSha: string;
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
  const isAndroid = AppUpdateService.isNativeAndroid();

  const checkRepoUpdates = useCallback(async () => {
    // If dismissed in this session, never show again
    try {
      if (sessionStorage.getItem(SESSION_DISMISSED_KEY) === 'true') {
        return;
      }
    } catch {}

    // 1. First query server-cached update manifest (ETag cached in <1ms)
    try {
      const serverManifest = await api.getSystemUpdates();
      if (serverManifest && serverManifest.latest_sha) {
        const sha = serverManifest.latest_sha;
        const shortSha = serverManifest.short_sha || sha.substring(0, 7);
        const message = serverManifest.message || 'New updates available for appliance';
        const date = serverManifest.date || '';
        const author = serverManifest.author || 'tinapple';
        const url = serverManifest.url || 'https://github.com/imyash0722/tinapple/commits/main';

        try {
          const currentBuild = typeof __BUILD_COMMIT__ !== 'undefined' ? __BUILD_COMMIT__ : '';
          if (currentBuild && (currentBuild === sha || currentBuild.startsWith(shortSha) || sha.startsWith(currentBuild.substring(0, 7)))) {
            return;
          }
        } catch {}

        if (message.startsWith('chore(dist)') || message.includes('[skip-notify]')) {
          return;
        }

        try {
          const dismissed = localStorage.getItem(DISMISSED_SHA_KEY);
          if (dismissed && (dismissed === sha || dismissed === shortSha || sha.startsWith(dismissed))) {
            return;
          }
        } catch {}

        setLatestCommit({
          sha: shortSha,
          fullSha: sha,
          message,
          date,
          author,
          url,
        });
        setIsVisible(true);
        return;
      }
    } catch {}

    // 2. Direct fallback to GitHub API
    try {
      const res = await fetch('https://api.github.com/repos/imyash0722/tinapple/commits/main', {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });
      if (!res.ok) return;

      const data = await res.json();
      const sha = data.sha || '';
      const shortSha = sha ? sha.substring(0, 7) : '';
      const message = data.commit?.message?.split('\n')[0] || 'New updates pushed to repository';
      const date = data.commit?.committer?.date || '';
      const author = data.commit?.author?.name || 'imyash0722';
      const url = data.html_url || 'https://github.com/imyash0722/tinapple/commits/main';

      // 1. If currently running build is already this commit, don't notify
      try {
        const currentBuild = typeof __BUILD_COMMIT__ !== 'undefined' ? __BUILD_COMMIT__ : '';
        if (currentBuild && (currentBuild === sha || currentBuild.startsWith(shortSha) || sha.startsWith(currentBuild.substring(0, 7)))) {
          return;
        }
      } catch {}

      // 2. Ignore automated dist/internal maintenance commits from popping up system update prompts
      if (message.startsWith('chore(dist)') || message.includes('[skip-notify]')) {
        return;
      }

      // 3. Check if user already dismissed or started this update
      try {
        const dismissed = localStorage.getItem(DISMISSED_SHA_KEY);
        if (dismissed && (dismissed === sha || dismissed === shortSha || sha.startsWith(dismissed))) {
          return;
        }
      } catch {}

      setLatestCommit({
        sha: shortSha,
        fullSha: sha,
        message,
        date,
        author,
        url,
      });
      setIsVisible(true);
    } catch {
      // Offline / network fallback
    }
  }, []);

  useEffect(() => {
    // Check once after initial dashboard load (4s delay)
    try {
      if (sessionStorage.getItem(SESSION_DISMISSED_KEY) === 'true') {
        return;
      }
    } catch {}

    const timer = setTimeout(() => {
      checkRepoUpdates();
    }, 4000);

    return () => {
      clearTimeout(timer);
    };
  }, [checkRepoUpdates]);

  const handleDismiss = () => {
    try {
      if (latestCommit?.fullSha) {
        localStorage.setItem(DISMISSED_SHA_KEY, latestCommit.fullSha);
      } else if (latestCommit?.sha) {
        localStorage.setItem(DISMISSED_SHA_KEY, latestCommit.sha);
      }
      sessionStorage.setItem(SESSION_DISMISSED_KEY, 'true');
    } catch {}
    setIsVisible(false);
  };

  const handleStartUpdate = () => {
    try {
      if (latestCommit?.fullSha) {
        localStorage.setItem(DISMISSED_SHA_KEY, latestCommit.fullSha);
      } else if (latestCommit?.sha) {
        localStorage.setItem(DISMISSED_SHA_KEY, latestCommit.sha);
      }
      sessionStorage.setItem(SESSION_DISMISSED_KEY, 'true');
    } catch {}
    setIsVisible(false);
    if (onTriggerUpdate) {
      onTriggerUpdate();
    }
  };

  if (!isVisible || !latestCommit) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -30, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92vw] sm:w-full font-sans select-none"
      >
        <div className="relative rounded-2xl bg-slate-900/95 border border-cyan-400/40 p-3 sm:p-4 shadow-2xl shadow-cyan-950/80 backdrop-blur-3xl overflow-hidden text-xs">
          {/* Subtle accent glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-3 relative z-10">
            {/* Left Column: Icon + Update Info */}
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-cyan-300" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-white tracking-wide text-xs">
                    {isAndroid ? 'Android Update Available' : 'Tinapple System Update'}
                  </span>
                  <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {latestCommit.sha}
                  </span>
                </div>

                <p className="text-slate-300 line-clamp-1 text-[11px] font-medium leading-relaxed">
                  {latestCommit.message}
                </p>
              </div>
            </div>

            {/* Right Column: Actions + Dismiss */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={handleStartUpdate}
                className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
              >
                <span>Yes, Update</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Dismiss update"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpdateNotificationToast;
