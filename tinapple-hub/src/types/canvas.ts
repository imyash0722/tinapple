export type WidgetCategory = 'telemetry' | 'network' | 'media' | 'storage' | 'system' | 'custom';

export type WidgetType =
  | 'homarr_apps_board'
  | 'single_appliance'
  | 'silicon_telemetry'
  | 'digital_clock'
  | 'transfers_rate'
  | 'network_guard'
  | 'port_matrix'
  | 'media_server'
  | 'storage_vault'
  | 'quick_terminal'
  | 'hardware_thermals'
  | 'manga_shelf'
  | 'system_journal'
  | 'quick_connect'
  | 'homelab_bookmarks'
  | 'custom_iframe'
  | 'custom_markdown'
  | 'custom_links'
  | 'custom_monitor';

export interface CustomWidgetLink {
  id: string;
  name: string;
  url: string;
  icon?: string;
}

export interface WidgetCustomConfig {
  url?: string;
  markdown?: string;
  refreshSeconds?: number;
  links?: CustomWidgetLink[];
  targetPort?: number;
  pingEndpoint?: string;
  [key: string]: any;
}

export interface CanvasWidget {
  id: string;
  type: WidgetType | string;
  title: string;
  description?: string;
  icon: string;
  category: WidgetCategory;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex?: number;
  visible: boolean;
  color?: string;
  colSpan?: 3 | 4 | 6 | 12;
  order?: number;
  customConfig?: WidgetCustomConfig;
}

export interface CanvasViewport {
  panX: number;
  panY: number;
  zoom: number;
}

export type CanvasLayoutMode = 'canvas' | 'grid';

export interface CanvasState {
  version: number;
  viewport: CanvasViewport;
  layoutMode: CanvasLayoutMode;
  widgets: CanvasWidget[];
  snapToGrid: boolean;
  gridSize: number;
}
