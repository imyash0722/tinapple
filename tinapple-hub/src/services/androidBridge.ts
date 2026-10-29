import { CanvasWidget } from '../types/canvas';

declare global {
  interface Window {
    TinappleBridge?: {
      onWidgetMoved?: (widgetId: string, x: number, y: number) => void;
      onWidgetResized?: (widgetId: string, w: number, h: number) => void;
      onWidgetSaved?: (widgetJson: string) => void;
      onLayoutModeChanged?: (mode: string) => void;
      performHapticFeedback?: (type: string) => void;
      showToast?: (message: string) => void;
      openNativeApp?: (packageName: string) => void;
    };
  }
}

export const AndroidBridge = {
  isNative: (): boolean => {
    return typeof window !== 'undefined' && typeof window.TinappleBridge !== 'undefined';
  },

  performHaptic: (type: 'light' | 'medium' | 'heavy' | 'selection' = 'light') => {
    if (typeof window !== 'undefined' && window.TinappleBridge?.performHapticFeedback) {
      window.TinappleBridge.performHapticFeedback(type);
    } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      // Fallback web vibration
      try {
        if (type === 'selection') navigator.vibrate(10);
        else if (type === 'light') navigator.vibrate(20);
        else if (type === 'medium') navigator.vibrate(40);
        else if (type === 'heavy') navigator.vibrate(80);
      } catch {}
    }
  },

  notifyWidgetMoved: (id: string, x: number, y: number) => {
    if (typeof window !== 'undefined' && window.TinappleBridge?.onWidgetMoved) {
      window.TinappleBridge.onWidgetMoved(id, x, y);
    }
  },

  notifyWidgetResized: (id: string, w: number, h: number) => {
    if (typeof window !== 'undefined' && window.TinappleBridge?.onWidgetResized) {
      window.TinappleBridge.onWidgetResized(id, w, h);
    }
  },

  notifyWidgetSaved: (widget: CanvasWidget) => {
    if (typeof window !== 'undefined' && window.TinappleBridge?.onWidgetSaved) {
      window.TinappleBridge.onWidgetSaved(JSON.stringify(widget));
    }
  },

  notifyLayoutModeChanged: (mode: string) => {
    if (typeof window !== 'undefined' && window.TinappleBridge?.onLayoutModeChanged) {
      window.TinappleBridge.onLayoutModeChanged(mode);
    }
  },

  showToast: (message: string) => {
    if (typeof window !== 'undefined' && window.TinappleBridge?.showToast) {
      window.TinappleBridge.showToast(message);
    }
  },
};
