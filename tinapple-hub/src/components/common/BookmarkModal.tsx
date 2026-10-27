import React, { useState, useEffect } from 'react';
import { X, Globe, Tag, Palette, Link as LinkIcon, Check } from 'lucide-react';
import { CustomBookmark } from '../../services/dashboardLayout';

interface BookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bookmark: Omit<CustomBookmark, 'id'>, id?: string) => void;
  editingBookmark?: CustomBookmark | null;
}

const PRESET_COLORS = [
  '#10B981', // Emerald
  '#38BDF8', // Sky
  '#6366F1', // Indigo
  '#A855F7', // Purple
  '#F43F5E', // Rose
  '#F97316', // Orange
  '#EAB308', // Amber
  '#6D4AFF', // Proton Violet
  '#148FD2', // Syncthing Cyan
];

const PRESET_CATEGORIES = ['Homelab', 'Media', 'Network', 'Automation', 'Development', 'Tools', 'External'];

export const BookmarkModal: React.FC<BookmarkModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingBookmark,
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState('Homelab');
  const [accentColor, setAccentColor] = useState('#10B981');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingBookmark) {
      setName(editingBookmark.name);
      setUrl(editingBookmark.url);
      setTagline(editingBookmark.tagline || '');
      setCategory(editingBookmark.category || 'Homelab');
      setAccentColor(editingBookmark.accentColor || '#10B981');
    } else {
      setName('');
      setUrl('');
      setTagline('');
      setCategory('Homelab');
      setAccentColor('#10B981');
    }
    setError('');
  }, [editingBookmark, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for this bookmark.');
      return;
    }
    if (!url.trim()) {
      setError('Please provide a valid destination URL.');
      return;
    }

    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = `http://${finalUrl}`;
    }

    onSave(
      {
        name: name.trim(),
        url: finalUrl,
        tagline: tagline.trim() || undefined,
        category: category.trim() || 'Homelab',
        accentColor,
      },
      editingBookmark?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-[#0c101a] border border-tinapple-border/80 p-6 shadow-2xl text-white font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-tinapple-border/60 mb-5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
              style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
            >
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wider uppercase text-white">
                {editingBookmark ? 'Edit Bookmark' : 'Add Homelab Bookmark'}
              </h3>
              <p className="text-[11px] text-tinapple-muted">
                Fast direct access portal on your dashboard grid
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 mb-1 font-semibold uppercase tracking-wider text-[11px]">
              Service or Portal Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Home Assistant, Plex, Proxmox"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-tinapple-gold focus:outline-none text-white text-xs"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-semibold uppercase tracking-wider text-[11px]">
              Destination URL *
            </label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g. 192.168.1.50:8123 or https://..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-tinapple-gold focus:outline-none text-white text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-semibold uppercase tracking-wider text-[11px]">
              Tagline / Subtext (Optional)
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Smart home automation hub"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-tinapple-gold focus:outline-none text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-semibold uppercase tracking-wider text-[11px]">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition-all ${
                    category === cat
                      ? 'bg-tinapple-gold/20 text-tinapple-gold border-tinapple-gold/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Or type custom category"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-[11px]"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1.5 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-tinapple-gold" />
              <span>Accent Color</span>
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setAccentColor(color)}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 border border-white/20"
                  style={{ backgroundColor: color }}
                  title={color}
                >
                  {accentColor === color && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-tinapple-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-tinapple-gold hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-tinapple-gold/20 transition-all"
            >
              {editingBookmark ? 'Save Changes' : 'Add to Dashboard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
