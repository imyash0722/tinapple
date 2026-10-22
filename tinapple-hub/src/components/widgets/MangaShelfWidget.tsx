import React, { useState, useEffect } from 'react';

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
  const [online, setOnline] = useState(true);

  // Default rich showcase items
  const [readingList] = useState<MangaItem[]>([
    {
      id: '1',
      title: 'Solo Leveling: Ragnarok',
      thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80',
      unreadCount: 4,
      lastChapterRead: 'Chapter 38',
      source: 'Asura Scans',
    },
    {
      id: '2',
      title: 'Omniscient Reader’s Viewpoint',
      thumbnailUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&q=80',
      unreadCount: 2,
      lastChapterRead: 'Chapter 214',
      source: 'Flame Comics',
    },
    {
      id: '3',
      title: 'The Beginning After The End',
      thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
      unreadCount: 8,
      lastChapterRead: 'Chapter 175',
      source: 'Tapas',
    },
    {
      id: '4',
      title: 'Chainsaw Man',
      thumbnailUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=400&q=80',
      unreadCount: 1,
      lastChapterRead: 'Chapter 168',
      source: 'MangaDex',
    },
    {
      id: '5',
      title: 'Jujutsu Kaisen',
      thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
      unreadCount: 0,
      lastChapterRead: 'Chapter 271',
      source: 'MangaPlus',
    },
  ]);

  const [historyList] = useState<MangaItem[]>([
    {
      id: '1',
      title: 'Solo Leveling: Ragnarok',
      thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80',
      lastChapterRead: 'Chapter 38',
      lastReadTime: '2 hours ago',
    },
    {
      id: '2',
      title: 'Omniscient Reader’s Viewpoint',
      thumbnailUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&q=80',
      lastChapterRead: 'Chapter 214',
      lastReadTime: 'Yesterday',
    },
    {
      id: '4',
      title: 'Chainsaw Man',
      thumbnailUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=400&q=80',
      lastChapterRead: 'Chapter 168',
      lastReadTime: '3 days ago',
    },
  ]);

  const [updatesList] = useState<MangaItem[]>([
    {
      id: '1',
      title: 'Solo Leveling: Ragnarok',
      thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80',
      latestChapter: 'Chapter 42',
      updatedTime: '45 mins ago',
    },
    {
      id: '3',
      title: 'The Beginning After The End',
      thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
      latestChapter: 'Chapter 183',
      updatedTime: '3 hours ago',
    },
    {
      id: '2',
      title: 'Omniscient Reader’s Viewpoint',
      thumbnailUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&q=80',
      latestChapter: 'Chapter 216',
      updatedTime: '5 hours ago',
    },
  ]);

  useEffect(() => {
    fetch('/api/widgets/manga')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('offline');
      })
      .then((data) => {
        if (data && data.online !== undefined) {
          setOnline(data.online);
        }
      })
      .catch(() => {
        setOnline(true);
      });
  }, []);

  const currentList =
    activeTab === 'reading' ? readingList : activeTab === 'history' ? historyList : updatesList;

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 backdrop-blur-xl shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-xl shadow-sm">
            📖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">Suwayomi Manga Shelf</h3>
              <span className="w-2 h-2 rounded-full bg-emerald-400" title="Online" />
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Tachiyomi Extension Engine</span>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center bg-slate-950/70 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab('reading')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'reading'
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Reading
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('updates')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
              activeTab === 'updates'
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Updates
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Shelf */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
        {currentList.map((manga) => (
          <a
            key={manga.id}
            href={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:4567`}
            target="_blank"
            rel="noreferrer"
            className="group relative flex-shrink-0 w-36 rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 hover:border-orange-500/50 hover:shadow-xl transition-all"
          >
            <div className="aspect-[3/4] w-full overflow-hidden relative">
              <img
                src={manga.thumbnailUrl}
                alt={manga.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

              {/* Unread badge */}
              {manga.unreadCount !== undefined && manga.unreadCount > 0 && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-orange-500 text-slate-950 text-[10px] font-bold font-mono shadow-md">
                  +{manga.unreadCount}
                </span>
              )}

              {/* Latest chapter update pill */}
              {manga.latestChapter && (
                <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-emerald-500 text-slate-950 text-[10px] font-bold font-mono shadow-md">
                  {manga.latestChapter}
                </span>
              )}
            </div>

            <div className="p-2.5">
              <h4 className="text-xs font-bold text-white truncate group-hover:text-orange-400 transition-colors">
                {manga.title}
              </h4>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                {manga.lastChapterRead || manga.updatedTime || manga.lastReadTime || manga.source}
              </p>
            </div>
          </a>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1 text-xs">
        <span className="text-[11px] text-slate-400 font-mono">
          Suwayomi Server • Port 4567
        </span>
        <a
          href={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:4567`}
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
