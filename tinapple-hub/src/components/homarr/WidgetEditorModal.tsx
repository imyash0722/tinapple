import React, { useState } from 'react';
import {
  X,
  Save,
  Trash2,
  Copy,
  Sliders,
  Globe,
  FileText,
  Bookmark,
  Activity,
  Plus,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { CanvasWidget, WidgetCategory, WidgetType } from '../../types/canvas';

interface WidgetEditorModalProps {
  widget: CanvasWidget | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedWidget: CanvasWidget) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (widget: CanvasWidget) => void;
}

export const WidgetEditorModal: React.FC<WidgetEditorModalProps> = ({
  widget,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onDuplicate,
}) => {
  if (!isOpen || !widget) return null;

  const [title, setTitle] = useState(widget.title);
  const [icon, setIcon] = useState(widget.icon || '🧩');
  const [category, setCategory] = useState<WidgetCategory>(widget.category || 'system');
  const [width, setWidth] = useState(widget.w);
  const [height, setHeight] = useState(widget.h);
  const [color, setColor] = useState(widget.color || '#AA5CC3');

  // Custom config states
  const [iframeUrl, setIframeUrl] = useState(widget.customConfig?.url || '');
  const [markdown, setMarkdown] = useState(widget.customConfig?.markdown || '');
  const [targetPort, setTargetPort] = useState(widget.customConfig?.targetPort || 80);
  const [pingEndpoint, setPingEndpoint] = useState(widget.customConfig?.pingEndpoint || '');
  const [refreshSeconds, setRefreshSeconds] = useState(widget.customConfig?.refreshSeconds || 30);
  const [links, setLinks] = useState(widget.customConfig?.links || []);

  const [newLinkName, setNewLinkName] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkIcon, setNewLinkIcon] = useState('🔗');

  const handleApplyPreset = (w: number, h: number) => {
    setWidth(w);
    setHeight(h);
  };

  const handleAddLink = () => {
    if (!newLinkName || !newLinkUrl) return;
    setLinks([
      ...links,
      {
        id: 'link_' + Date.now(),
        name: newLinkName,
        url: newLinkUrl.startsWith('http') ? newLinkUrl : `http://${newLinkUrl}`,
        icon: newLinkIcon || '🔗',
      },
    ]);
    setNewLinkName('');
    setNewLinkUrl('');
    setNewLinkIcon('🔗');
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const updated: CanvasWidget = {
      ...widget,
      title,
      icon,
      category,
      w: width,
      h: height,
      color,
      customConfig: {
        ...widget.customConfig,
        url: iframeUrl,
        markdown,
        targetPort: Number(targetPort),
        pingEndpoint,
        refreshSeconds: Number(refreshSeconds),
        links,
      },
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-white/10 shadow-2xl overflow-hidden font-mono text-xs flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-tinapple-gold" />
            <h3 className="font-bold text-white text-sm">Customize Widget: {widget.title}</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Basic Info: Title & Icon */}
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3">
              <label className="text-zinc-400 block mb-1">Widget Title:</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-tinapple-gold"
              />
            </div>
            <div>
              <label className="text-zinc-400 block mb-1">Icon:</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full px-3 py-2 text-center rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-tinapple-gold text-base"
              />
            </div>
          </div>

          {/* Size & Presets */}
          <div>
            <label className="text-zinc-400 block mb-1.5 flex items-center justify-between">
              <span>Canvas Dimensions (Width × Height):</span>
              <span className="text-tinapple-gold font-bold">
                {width}px × {height}px
              </span>
            </label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              <button
                type="button"
                onClick={() => handleApplyPreset(360, 260)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-zinc-300 hover:text-white border border-white/5 text-[10px]"
              >
                Compact (360×260)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(480, 320)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-zinc-300 hover:text-white border border-white/5 text-[10px]"
              >
                Standard (480×320)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(720, 360)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-zinc-300 hover:text-white border border-white/5 text-[10px]"
              >
                Wide (720×360)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(960, 480)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-zinc-300 hover:text-white border border-white/5 text-[10px]"
              >
                Expanded (960×480)
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-zinc-500 mb-0.5 block">Custom Width (px):</span>
                <input
                  type="number"
                  min="240"
                  max="1600"
                  step="20"
                  value={width}
                  onChange={(e) => setWidth(Math.max(240, Number(e.target.value)))}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 mb-0.5 block">Custom Height (px):</span>
                <input
                  type="number"
                  min="160"
                  max="1200"
                  step="20"
                  value={height}
                  onChange={(e) => setHeight(Math.max(160, Number(e.target.value)))}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Conditional Custom Configuration */}
          {widget.type === 'custom_iframe' && (
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 space-y-2">
              <label className="text-zinc-300 font-bold flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>Web Embed / IFrame Target URL:</span>
              </label>
              <input
                type="text"
                placeholder="https://grafana.lan or http://100.108.215.120:3000"
                value={iframeUrl}
                onChange={(e) => setIframeUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-tinapple-gold"
              />
              <p className="text-[10px] text-zinc-500">
                Note: Some websites block iframe embedding via X-Frame-Options or CSP headers.
              </p>
            </div>
          )}

          {widget.type === 'custom_markdown' && (
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 space-y-2">
              <label className="text-zinc-300 font-bold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <span>Markdown Notes / Commands:</span>
              </label>
              <textarea
                rows={6}
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-tinapple-gold leading-relaxed"
                placeholder="# Server Runbook&#10;- Deploy command: ./deploy.sh&#10;- Subnet: 192.168.4.0/24"
              />
            </div>
          )}

          {widget.type === 'custom_links' && (
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 space-y-3">
              <label className="text-zinc-300 font-bold flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                <span>Configured Links ({links.length}):</span>
              </label>

              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {links.map((link, idx) => (
                  <div
                    key={link.id || idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-zinc-300"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span>{link.icon || '🔗'}</span>
                      <span className="font-semibold text-white truncate">{link.name}</span>
                      <span className="text-[10px] text-zinc-500 truncate">{link.url}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveLink(idx)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-white/5 grid grid-cols-12 gap-2">
                <input
                  type="text"
                  placeholder="Link Name"
                  value={newLinkName}
                  onChange={(e) => setNewLinkName(e.target.value)}
                  className="col-span-4 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                />
                <input
                  type="text"
                  placeholder="https://..."
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="col-span-6 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddLink}
                  disabled={!newLinkName || !newLinkUrl}
                  className="col-span-2 px-2 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 text-xs disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {widget.type === 'custom_monitor' && (
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 space-y-3">
              <label className="text-zinc-300 font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Endpoint Ping Configuration:</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-zinc-500 block mb-1">Target Port:</span>
                  <input
                    type="number"
                    value={targetPort}
                    onChange={(e) => setTargetPort(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 block mb-1">Check Interval (sec):</span>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={refreshSeconds}
                    onChange={(e) => setRefreshSeconds(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(widget.id);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-bold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
            {onDuplicate && (
              <button
                type="button"
                onClick={() => {
                  onDuplicate(widget);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white font-bold flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800 text-zinc-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-tinapple-gold hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-500/20"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
