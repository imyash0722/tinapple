export interface CustomBookmark {
  id: string;
  name: string;
  url: string;
  tagline?: string;
  icon?: string;
  accentColor?: string;
  category?: string;
}

export type DashboardWidgetId = 'quickconnect' | 'transfers' | 'manga' | 'tor';

export interface DashboardWidgetConfig {
  id: DashboardWidgetId;
  title: string;
  visible: boolean;
  order: number;
}

export interface DashboardLayoutState {
  version: number;
  widgets: DashboardWidgetConfig[];
  bookmarks: CustomBookmark[];
}

const STORAGE_KEY = 'tinapple_dashboard_layout_v4';

export const DEFAULT_WIDGETS: DashboardWidgetConfig[] = [
  { id: 'quickconnect', title: 'Quick Connect Portals', visible: true, order: 0 },
  { id: 'transfers', title: 'Transfers & Downloads', visible: true, order: 1 },
  { id: 'manga', title: 'Suwayomi Manga Library', visible: true, order: 2 },
  { id: 'tor', title: 'Tor Privacy Guard', visible: true, order: 3 },
];

export const DEFAULT_BOOKMARKS: CustomBookmark[] = [
  {
    id: 'bm-github',
    name: 'GitHub Repository',
    url: 'https://github.com/imyash0722/tinapple',
    tagline: 'Source code & releases',
    accentColor: '#10B981',
    category: 'Development',
  },
  {
    id: 'bm-arch',
    name: 'Arch Linux Wiki',
    url: 'https://wiki.archlinux.org',
    tagline: 'Documentation & packages',
    accentColor: '#1793D1',
    category: 'Reference',
  },
];

export function loadDashboardLayout(): DashboardLayoutState {
  if (typeof window === 'undefined') {
    return {
      version: 4,
      widgets: [...DEFAULT_WIDGETS],
      bookmarks: [...DEFAULT_BOOKMARKS],
    };
  }

  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Check legacy storage keys
      raw = localStorage.getItem('tinapple_dashboard_layout_v3') || localStorage.getItem('tinapple_dashboard_layout_v2');
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.widgets)) {
        // Ensure all default widgets exist
        const loadedWidgets: DashboardWidgetConfig[] = [];
        for (const def of DEFAULT_WIDGETS) {
          const found = parsed.widgets.find((w: any) => w.id === def.id);
          if (found) {
            loadedWidgets.push({
              id: def.id,
              title: def.title,
              visible: def.id === 'manga' && isV2 ? false : typeof found.visible === 'boolean' ? found.visible : def.visible,
              order: typeof found.order === 'number' ? found.order : def.order,
            });
          } else {
            loadedWidgets.push({ ...def });
          }
        }
        loadedWidgets.sort((a, b) => a.order - b.order);

        const newState: DashboardLayoutState = {
          version: 3,
          widgets: loadedWidgets,
          bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [...DEFAULT_BOOKMARKS],
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        return newState;
      }
    }
  } catch (err) {
    console.warn('Failed to parse dashboard layout from localStorage:', err);
  }

  return {
    version: 3,
    widgets: [...DEFAULT_WIDGETS],
    bookmarks: [...DEFAULT_BOOKMARKS],
  };
}

export function saveDashboardLayout(state: DashboardLayoutState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save dashboard layout to localStorage:', err);
  }
}
