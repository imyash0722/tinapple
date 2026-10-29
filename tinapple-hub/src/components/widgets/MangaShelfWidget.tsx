import React, { useState, useEffect } from 'react';
import { BookOpen, ExternalLink, RefreshCw } from 'lucide-react';
import { getServiceHost } from '../../services/api';

interface MangaItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  unreadCount?: number;
  lastChapterRead?: string;
  lastReadTime?: string;
  latestChapter?: string;
  updatedTime?: string;
  source?: string;
}

export const MangaShelfWidget: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reading' | 'history' | 'updates'>('reading');
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Real manga library items only - zero fake placeholder manhwa
  const [readingList, setReadingList] = useState<MangaItem[]>([]);
  const [historyList, setHistoryList] = useState<MangaItem[]>([]);
  const [updatesList, setUpdatesList] = useState<MangaItem[]>([]);

  const fetchLibrary = () => {
    setLoading(true);
    fetch('/api/widgets/manga')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('offline');
      })
      .then((data) => {
        if (data) {
          setOnline(Boolean(data.online));
          if (typeof data.totalCount === 'number') {
            setTotalCount(data.totalCount);
          }
          const mangas = Array.isArray(data.mangas)
            ? data.mangas
            : Array.isArray(data.library)
            ? data.library
            : [];

          if (mangas.length > 0) {
            const parsed: MangaItem[] = mangas.map((m: any, idx: number) => ({
              id: String(m.id || idx),
              title: m.title || 'Untitled Manga',
              thumbnailUrl: m.thumbnailUrl || '/icons/suwayomi.png',
              unreadCount: typeof m.unreadCount === 'number' ? m.unreadCount : 0,
              lastChapterRead: m.lastChapterRead || m.lastReadChapter || '',
              latestChapter: m.latestChapter || '',
              source: m.source?.name || m.source || 'Suwayomi',
            }));
            setReadingList(parsed);
          } else {
            setReadingList([]);
          }

          if (Array.isArray(data.history) && data.history.length > 0) {
            const parsedHist: MangaItem[] = data.history.map((h: any, idx: number) => ({
              id: String(h.id || idx),
              title: h.title || 'Untitled Manga',
              thumbnailUrl: h.thumbnailUrl || '/icons/suwayomi.png',
              unreadCount: typeof h.unreadCount === 'number' ? h.unreadCount : 0,
              lastChapterRead: h.lastChapterRead || h.lastReadChapter || '',
              source: h.source?.name || h.source || 'Suwayomi',
            }));
            setHistoryList(parsedHist);
          } else {
            setHistoryList([]);
          }

          if (Array.isArray(data.updates) && data.updates.length > 0) {
            const parsedUpdates: MangaItem[] = data.updates.map((u: any, idx: number) => ({
              id: String(u.id || idx),
              title: u.title || 'Untitled Manga',
              thumbnailUrl: u.thumbnailUrl || '/icons/suwayomi.png',
              unreadCount: typeof u.unreadCount === 'number' ? u.unreadCount : 0,
              latestChapter: u.latestChapter || '',
              source: u.source?.name || u.source || 'Suwayomi',
            }));
            setUpdatesList(parsedUpdates);
          } else {
            setUpdatesList([]);
          }
        }
      })
      .catch(() => {
        setOnline(false);
        setTotalCount(0);
        setReadingList([]);
        setHistoryList([]);
        setUpdatesList([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const currentList =
    activeTab === 'reading' ? readingList : activeTab === 'history' ? historyList : updatesList;

  const currentHost = getServiceHost();

  return (
    <div className="tinapple-glass-card rounded-2xl bg-[#091124]/90 border border-[#1b2b52] p-5 backdrop-blur-xl shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-[#1b2b52]/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-xl shadow-sm">
            📖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide font-mono">Suwayomi Manga Shelf</h3>
              <span
                className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}
                title={online ? 'Suwayomi Online' : 'Suwayomi Offline'}
              />
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Tachiyomi Extension Engine</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Pills */}
          <div className="flex items-center bg-[#050a16] p-1 rounded-xl border border-[#1b2b52]">
            <button
              onClick={() => setActiveTab('reading')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                activeTab === 'reading'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Library {totalCount > 0 ? `(${totalCount})` : readingList.length > 0 ? `(${readingList.length})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              History {historyList.length > 0 && `(${historyList.length})`}
            </button>
            <button
              onClick={() => setActiveTab('updates')}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                activeTab === 'updates'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Updates {updatesList.length > 0 && `(${updatesList.length})`}
            </button>
          </div>

          <button
            onClick={fetchLibrary}
            className="p-1.5 rounded-lg bg-[#0e1b38] hover:bg-[#14264e] border border-[#1b2b52] text-zinc-400 hover:text-white transition-colors"
            title="Refresh library"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content: Shelf or Empty State */}
      {currentList.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
          {currentList.map((manga, idx) => {
            let subtitle = manga.source || 'Suwayomi';
            if (activeTab === 'reading') {
              if (typeof manga.unreadCount === 'number' && manga.unreadCount > 0) {
                subtitle = `${manga.unreadCount} unread • ${manga.source || 'Library'}`;
              } else {
                subtitle = `Up to date • ${manga.source || 'Library'}`;
              }
            } else if (activeTab === 'history') {
              subtitle = manga.lastChapterRead || manga.source || 'Recently Read';
            } else if (activeTab === 'updates') {
              subtitle = manga.latestChapter ? `New: ${manga.latestChapter}` : manga.source || 'Updated';
            }

            return (
              <a
                key={`${activeTab}-${manga.id}-${idx}`}
                href={`http://${currentHost}:4567/manga/${manga.id}`}
                target="_blank"
                rel="noreferrer"
                className="group relative flex-shrink-0 w-36 rounded-xl overflow-hidden bg-slate-950 border border-[#1b2b52] hover:border-orange-500/50 hover:shadow-xl transition-all cursor-pointer"
              >
                <div className="aspect-[3/4] w-full overflow-hidden relative bg-slate-900">
                  <img
                    src={manga.thumbnailUrl}
                    alt={manga.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/icons/suwayomi.png';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                  {/* Unread badge on library tab */}
                  {activeTab === 'reading' && manga.unreadCount !== undefined && manga.unreadCount > 0 && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-orange-500 text-slate-950 text-[10px] font-bold font-mono shadow-md">
                      +{manga.unreadCount}
                    </span>
                  )}

                  {/* Latest chapter update pill on updates tab */}
                  {activeTab === 'updates' && manga.latestChapter && (
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 text-[10px] font-bold font-mono shadow-md">
                      Update
                    </span>
                  )}
                </div>

                <div className="p-2.5">
                  <h4 className="text-xs font-bold text-white truncate group-hover:text-orange-400 transition-colors" title={manga.title}>
                    {manga.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate" title={subtitle}>
                    {subtitle}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="py-8 px-4 flex flex-col items-center justify-center text-center rounded-xl bg-black/30 border border-[#1b2b52]/60 font-mono">
          <BookOpen className="w-8 h-8 text-orange-400/50 mb-2" />
          <h4 className="text-sm font-bold text-white">
            {online ? 'No Manga in Library' : 'Suwayomi Manga Server Offline'}
          </h4>
          <p className="text-xs text-slate-400 max-w-md mt-1 mb-4 leading-relaxed">
            {online
              ? 'Your Suwayomi manga collection is currently empty. Open Suwayomi to add titles or sync from Tachiyomi / Mihon / Keiyoushi sources.'
              : 'Suwayomi is not running or has not been started. Launch Suwayomi to sync and read your personal manga library.'}
          </p>
          <a
            href={`http://${currentHost}:4567`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 border border-orange-500/30 transition-colors"
          >
            <span>Open Suwayomi Web (:4567)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between pt-1 text-xs">
        <span className="text-[11px] text-slate-400 font-mono">
          Suwayomi Server • Port 4567
        </span>
        <a
          href={`http://${currentHost}:4567/${activeTab === 'history' ? 'history' : activeTab === 'updates' ? 'updates' : 'library'}`}
          target="_blank"
          rel="noreferrer"
          className="text-orange-400 hover:text-orange-300 font-mono font-medium flex items-center gap-1"
        >
          <span>Open Manga Reader</span>
          <span>→</span>
        </a>
      </div>
    </div>
  );
};
