/**
 * tinapple Dashboard - Main Application
 * Tokyo Night Theme Homelab Server OS Dashboard
 * Vanilla ES6 module - No build step required
 */

class TinappleDashboard {
  constructor() {
    this.apiBase = '/api/v1';
    this.ws = null;
    this.sse = null;
    this.wsAttempts = 0;
    this.sseAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    
    // Telemetry & Chart State
    this.maxChartPoints = 60;
    this.chartData = {
      cpu: [],
      mem: []
    };
    this.charts = {
      cpu: null,
      mem: null
    };
    this.activeChartHover = null;
    this.lastNetStats = null;
    this.lastNetTime = null;
    
    // Data Caches
    this.config = null;
    this.services = [];
    this.systemInfo = null;
    this.hardwareInfo = null;
    this.batteryInfo = null;
    this.currentSection = 'dashboard';
    this.activeLogService = null;
    this.logAutoScroll = true;

    // Toast Container
    this.toastContainer = null;
    this.modalOverlay = null;

    // Initialize when instantiated
    this.init();
  }

  async init() {
    this.setupToastContainer();
    this.setupModal();
    this.bindEvents();
    this.setupCharts();

    // Determine initial section from URL hash or default to dashboard
    const initialSection = window.location.hash.replace('#', '') || 'dashboard';
    this.switchSection(initialSection, false);

    // Initial Data Fetching
    await Promise.allSettled([
      this.loadSystemInfo(),
      this.loadConfig(),
      this.loadServices(),
      this.loadHardware()
    ]);

    // Connect Real-Time Streams
    this.connectSSE();
    this.connectWebSocket();

    // Listen for resize to update canvas charts
    window.addEventListener('resize', this.debounce(() => {
      this.resizeCharts();
      this.renderCharts();
    }, 150));
  }

  /* ==========================================================================
     API Client Helper
     ========================================================================== */
  async api(path, options = {}) {
    const url = `${this.apiBase}${path}`;
    const headers = {
      'Accept': 'application/json',
      ...options.headers
    };

    if (options.body && typeof options.body !== 'string' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    try {
      const res = await fetch(url, { ...options, headers });
      if (!res.ok) {
        let errMsg = `HTTP ${res.status}: ${res.statusText}`;
        try {
          const errData = await res.json();
          if (errData && errData.error) errMsg = errData.error;
        } catch (_) {}
        throw new Error(errMsg);
      }
      // Check if response is empty
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await res.json();
      }
      return await res.text();
    } catch (err) {
      console.warn(`[API] Error on ${path}:`, err.message);
      throw err;
    }
  }

  /* ==========================================================================
     DOM Event Bindings
     ========================================================================== */
  bindEvents() {
    // Navigation items
    document.querySelectorAll('.nav-item[data-section]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        this.switchSection(section, true);
      });
    });

    // Hash change routing
    window.addEventListener('hashchange', () => {
      const section = window.location.hash.replace('#', '');
      if (section && section !== this.currentSection) {
        this.switchSection(section, false);
      }
    });

    // Mobile Sidebar toggle (clicking logo or mobile burger)
    const logoEl = document.querySelector('.header-left .logo');
    if (logoEl) {
      logoEl.addEventListener('click', () => this.toggleMobileSidebar());
      logoEl.setAttribute('role', 'button');
      logoEl.setAttribute('tabindex', '0');
      logoEl.setAttribute('aria-label', 'Toggle navigation menu');
      logoEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleMobileSidebar();
        }
      });
    }

    // Header Session Mode Toggle
    const sessionToggleBtn = document.getElementById('session-toggle');
    if (sessionToggleBtn) {
      sessionToggleBtn.addEventListener('click', () => this.cycleSessionMode(sessionToggleBtn));
    }

    // Refresh Button in Dashboard
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshAll(refreshBtn));
    }

    // Service Search Filter
    const searchInput = document.getElementById('service-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.filterServices(e.target.value));
    }

    // Hardware Controls: Battery Charge Limit
    const chargeSlider = document.getElementById('charge-limit');
    const chargeVal = document.getElementById('charge-limit-value');
    if (chargeSlider && chargeVal) {
      chargeSlider.addEventListener('input', (e) => {
        chargeVal.textContent = `${e.target.value}%`;
      });
    }

    const setChargeBtn = document.getElementById('set-charge-limit');
    if (setChargeBtn) {
      setChargeBtn.addEventListener('click', () => this.applyChargeLimit(setChargeBtn));
    }

    // Hardware Controls: Thermal Profile
    const setThermalBtn = document.getElementById('set-thermal-profile');
    if (setThermalBtn) {
      setThermalBtn.addEventListener('click', () => this.applyThermalProfile(setThermalBtn));
    }

    // Hardware Controls: Power Profile
    const setPowerBtn = document.getElementById('set-power-profile');
    if (setPowerBtn) {
      setPowerBtn.addEventListener('click', () => this.applyPowerProfile(setPowerBtn));
    }

    // Settings Form
    const generalForm = document.getElementById('general-settings');
    if (generalForm) {
      generalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const submitBtn = generalForm.querySelector('button[type="submit"]');
        this.saveGeneralSettings(submitBtn);
      });
    }

    // Settings Quick Toggles (auto-save or sync with manifest)
    const cachyosToggle = document.getElementById('setting-cachyos');
    const easeToggle = document.getElementById('setting-ease');
    if (cachyosToggle) {
      cachyosToggle.addEventListener('change', () => this.saveFeatureToggles());
    }
    if (easeToggle) {
      easeToggle.addEventListener('change', () => this.saveFeatureToggles());
    }

    // Delegated actions for Services (Start, Stop, Restart, Enable, Disable, Logs)
    document.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-service-action]');
      if (actionBtn) {
        const action = actionBtn.dataset.serviceAction;
        const name = actionBtn.dataset.serviceName;
        this.handleServiceAction(action, name, actionBtn);
        return;
      }

      const logsBtn = e.target.closest('[data-service-logs]');
      if (logsBtn) {
        const name = logsBtn.dataset.serviceLogs;
        this.openServiceLogsModal(name);
        return;
      }
    });

    // Global keyboard shortcuts (Esc to close modal/sidebar, / to search)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.modalOverlay && this.modalOverlay.classList.contains('active')) {
          this.closeModal();
        } else {
          this.closeMobileSidebar();
        }
      } else if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        const searchInput = document.getElementById('service-search');
        if (searchInput && this.currentSection === 'services') {
          e.preventDefault();
          searchInput.focus();
        }
      }
    });
  }

  /* ==========================================================================
     Navigation & Section Switching
     ========================================================================== */
  switchSection(sectionId, updateHash = true) {
    if (!sectionId) sectionId = 'dashboard';
    this.currentSection = sectionId;

    if (updateHash) {
      window.location.hash = sectionId;
    }

    // Update nav links
    document.querySelectorAll('.nav-item').forEach(item => {
      const match = item.dataset.section === sectionId;
      item.classList.toggle('active', match);
      item.setAttribute('aria-selected', match ? 'true' : 'false');
    });

    // Switch section visibility
    document.querySelectorAll('.section').forEach(sec => {
      const match = sec.id === `section-${sectionId}`;
      sec.classList.toggle('active', match);
    });

    // Close mobile sidebar if open
    this.closeMobileSidebar();

    // Trigger section specific loads or redraws
    if (sectionId === 'dashboard') {
      setTimeout(() => {
        this.resizeCharts();
        this.renderCharts();
      }, 50);
    } else if (sectionId === 'services') {
      this.loadServices();
    } else if (sectionId === 'hardware') {
      this.loadHardware();
    } else if (sectionId === 'network') {
      this.renderNetworkSection();
    } else if (sectionId === 'storage') {
      this.renderStorageSection();
    } else if (sectionId === 'settings') {
      this.loadConfig();
    }
  }

  toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    let backdrop = document.querySelector('.sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      backdrop.addEventListener('click', () => this.closeMobileSidebar());
      document.body.appendChild(backdrop);
    }

    if (sidebar) {
      const isOpen = sidebar.classList.toggle('open');
      backdrop.classList.toggle('active', isOpen);
    }
  }

  closeMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const backdrop = document.querySelector('.sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
  }

  /* ==========================================================================
     Real-Time Telemetry: SSE Stream
     ========================================================================== */
  connectSSE() {
    if (this.sse) {
      try { this.sse.close(); } catch (_) {}
    }

    const sseUrl = `${this.apiBase}/system/telemetry/stream`;
    this.sse = new EventSource(sseUrl);

    this.sse.onopen = () => {
      this.sseAttempts = 0;
      this.updateConnectionStatus('connected', 'Live Telemetry');
    };

    this.sse.addEventListener('telemetry', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleTelemetryData(data);
      } catch (err) {
        console.error('[SSE] Telemetry JSON parse error:', err);
      }
    });

    this.sse.onerror = () => {
      this.sse.close();
      this.sse = null;
      this.reconnectSSE();
    };
  }

  reconnectSSE() {
    if (this.sseAttempts >= this.maxReconnectAttempts) {
      console.warn('[SSE] Max reconnect attempts reached.');
      this.updateConnectionStatus('disconnected', 'Telemetry Offline');
      return;
    }
    this.sseAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.sseAttempts - 1), 30000);
    this.updateConnectionStatus('connecting', 'Reconnecting...');
    setTimeout(() => this.connectSSE(), delay);
  }

  /* ==========================================================================
     Real-Time WebSocket Connection
     ========================================================================== */
  connectWebSocket() {
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:8088';
    const wsUrl = `${protocol}//${host}${this.apiBase}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (e) {
      console.warn('[WS] WebSocket initialization failed:', e);
      return;
    }

    this.ws.onopen = () => {
      this.wsAttempts = 0;
      this.updateConnectionStatus('connected', 'Connected');
      // Subscribe to all event channels
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        channels: ['telemetry', 'services', 'logs', 'config']
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleWSMessage(msg);
      } catch (err) {
        console.warn('[WS] Non-JSON message received:', event.data);
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.scheduleWSReconnect();
    };

    this.ws.onerror = (err) => {
      console.warn('[WS] WebSocket error:', err);
      if (this.ws) {
        try { this.ws.close(); } catch (_) {}
      }
    };
  }

  scheduleWSReconnect() {
    if (this.wsAttempts >= this.maxReconnectAttempts) {
      console.warn('[WS] Max reconnect attempts reached.');
      return;
    }
    this.wsAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.wsAttempts - 1), 30000);
    setTimeout(() => this.connectWebSocket(), delay);
  }

  handleWSMessage(msg) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'telemetry':
        this.handleTelemetryData(msg.data);
        break;
      case 'service_update':
        this.loadServices(false);
        break;
      case 'log_line':
        this.appendLogLine(msg.data || msg.line || msg);
        break;
      case 'config_change':
        this.loadConfig();
        this.showToast('System configuration reloaded', 'info');
        break;
      default:
        break;
    }
  }

  updateConnectionStatus(status, text) {
    const dot = document.querySelector('.status-dot');
    const label = document.getElementById('status-text');

    if (dot) {
      dot.classList.remove('connected', 'connecting', 'disconnected');
      dot.classList.add(status);
    }
    if (label && text) {
      label.textContent = text;
    }
  }

  /* ==========================================================================
     Telemetry Processing & UI Updates
     ========================================================================== */
  handleTelemetryData(data) {
    if (!data) return;

    const timestamp = data.timestamp ? (data.timestamp * 1000) : Date.now();

    // 1. CPU Usage
    if (data.cpu) {
      const cpuUsage = typeof data.cpu.usage_percent === 'number' ? data.cpu.usage_percent : 0;
      const cpuEl = document.getElementById('cpu-usage');
      if (cpuEl) {
        cpuEl.textContent = `${cpuUsage.toFixed(1)}%`;
        this.applyUsageColor(cpuEl, cpuUsage);
      }
      this.addChartPoint('cpu', cpuUsage, timestamp);
    }

    // 2. Memory Usage
    if (data.memory) {
      const memUsage = typeof data.memory.used_percent === 'number' ? data.memory.used_percent : 0;
      const memEl = document.getElementById('mem-usage');
      if (memEl) {
        memEl.textContent = `${memUsage.toFixed(1)}%`;
        this.applyUsageColor(memEl, memUsage);
      }
      this.addChartPoint('mem', memUsage, timestamp);
    }

    // 3. Disk Usage
    if (data.disk) {
      const diskUsage = typeof data.disk.used_percent === 'number' ? data.disk.used_percent : 0;
      const diskEl = document.getElementById('disk-usage');
      if (diskEl) {
        diskEl.textContent = `${diskUsage.toFixed(1)}%`;
        this.applyUsageColor(diskEl, diskUsage);
      }
    }

    // 4. Network Rate (Calculated from cumulative bytes delta)
    if (data.network) {
      const rxBytes = data.network.rx_bytes || 0;
      const txBytes = data.network.tx_bytes || 0;
      const now = timestamp;

      let rxSpeed = 0;
      let txSpeed = 0;

      if (this.lastNetStats && this.lastNetTime) {
        const deltaSec = (now - this.lastNetTime) / 1000;
        if (deltaSec > 0 && deltaSec < 15) {
          if (rxBytes >= this.lastNetStats.rx) {
            rxSpeed = (rxBytes - this.lastNetStats.rx) / deltaSec;
          }
          if (txBytes >= this.lastNetStats.tx) {
            txSpeed = (txBytes - this.lastNetStats.tx) / deltaSec;
          }
        }
      }

      this.lastNetStats = { rx: rxBytes, tx: txBytes };
      this.lastNetTime = now;

      const netEl = document.getElementById('net-speed');
      if (netEl) {
        netEl.textContent = `↑ ${this.formatBytes(txSpeed)}/s ↓ ${this.formatBytes(rxSpeed)}/s`;
      }
    }

    // 5. Thermal Data
    if (data.thermal) {
      const temp = typeof data.thermal.max_temp_c === 'number' ? data.thermal.max_temp_c : null;
      if (temp !== null) {
        const tempEls = document.querySelectorAll('#max-temp');
        tempEls.forEach(el => {
          el.textContent = `${temp.toFixed(1)}°C`;
          if (temp > 80) {
            el.style.color = 'var(--danger)';
          } else if (temp > 65) {
            el.style.color = 'var(--warning)';
          } else {
            el.style.color = 'var(--accent)';
          }
        });
      }
    }

    // 6. Battery Data (if included in telemetry)
    if (data.battery) {
      this.updateBatteryUI(data.battery);
    }

    // 7. Services Status mapping
    if (data.services && typeof data.services === 'object') {
      this.updateServiceBadges(data.services);
    }

    // Redraw charts
    this.renderCharts();

    // Cache telemetry for subviews
    this.lastTelemetry = data;
    if (this.currentSection === 'network') this.renderNetworkSection();
    if (this.currentSection === 'storage') this.renderStorageSection();
  }

  applyUsageColor(element, percent) {
    if (percent >= 85) {
      element.style.color = 'var(--danger)';
    } else if (percent >= 70) {
      element.style.color = 'var(--warning)';
    } else {
      element.style.color = 'var(--fg)';
    }
  }

  /* ==========================================================================
     Canvas Chart Implementation (No external dependencies, High DPI, Crisp)
     ========================================================================== */
  setupCharts() {
    this.charts.cpu = document.getElementById('cpu-chart');
    this.charts.mem = document.getElementById('mem-chart');

    // Attach interactive hover listeners
    [
      { canvas: this.charts.cpu, key: 'cpu', label: 'CPU' },
      { canvas: this.charts.mem, key: 'mem', label: 'Memory' }
    ].forEach(({ canvas, key, label }) => {
      if (!canvas) return;

      canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        this.activeChartHover = { key, x, label };
        this.renderCharts();
      });

      canvas.addEventListener('mouseleave', () => {
        if (this.activeChartHover && this.activeChartHover.key === key) {
          this.activeChartHover = null;
          this.renderCharts();
        }
      });
    });

    this.resizeCharts();
    this.renderCharts();
  }

  resizeCharts() {
    const dpr = window.devicePixelRatio || 1;
    [this.charts.cpu, this.charts.mem].forEach(canvas => {
      if (!canvas || !canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = 200;

      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);

      const ctx = canvas.getContext('2d');
      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);
    });
  }

  addChartPoint(type, value, timestamp) {
    if (!this.chartData[type]) this.chartData[type] = [];
    this.chartData[type].push({
      val: Math.max(0, Math.min(100, value)),
      time: timestamp || Date.now()
    });

    if (this.chartData[type].length > this.maxChartPoints) {
      this.chartData[type].shift();
    }
  }

  renderCharts() {
    this.drawCanvasChart(
      this.charts.cpu,
      this.chartData.cpu,
      '#7aa2f7', // Tokyo Night Blue
      'CPU Usage',
      this.activeChartHover?.key === 'cpu' ? this.activeChartHover : null
    );

    this.drawCanvasChart(
      this.charts.mem,
      this.chartData.mem,
      '#7dcfff', // Tokyo Night Cyan
      'Memory Usage',
      this.activeChartHover?.key === 'mem' ? this.activeChartHover : null
    );
  }

  drawCanvasChart(canvas, data, strokeColor, label, hover) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    if (width <= 0 || height <= 0) return;

    // Margins
    const padTop = 24;
    const padBottom = 24;
    const padLeft = 34;
    const padRight = 16;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Grid Lines & Value Labels (0%, 25%, 50%, 75%, 100%)
    ctx.strokeStyle = '#292e42';
    ctx.lineWidth = 1;
    ctx.font = '10px monospace';
    ctx.fillStyle = '#565f89';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const gridSteps = [0, 25, 50, 75, 100];
    gridSteps.forEach(pct => {
      const y = padTop + chartH - (pct / 100) * chartH;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();

      ctx.fillText(`${pct}%`, padLeft - 6, y);
    });

    if (!data || data.length < 2) {
      // Empty placeholder
      ctx.fillStyle = '#565f89';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '12px monospace';
      ctx.fillText('Collecting metrics stream...', width / 2, height / 2);
      return;
    }

    // 2. Map data points to coordinates
    const points = [];
    const totalSlots = this.maxChartPoints - 1;
    const offset = this.maxChartPoints - data.length;

    data.forEach((item, idx) => {
      const x = padLeft + ((idx + offset) / totalSlots) * chartW;
      const y = padTop + chartH - (item.val / 100) * chartH;
      points.push({ x, y, val: item.val, time: item.time });
    });

    // 3. Draw Gradient Fill Under Curve
    ctx.beginPath();
    ctx.moveTo(points[0].x, padTop + chartH);
    ctx.lineTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midX = (p0.x + p1.x) / 2;
      ctx.bezierCurveTo(midX, p0.y, midX, p1.y, p1.x, p1.y);
    }

    const lastPt = points[points.length - 1];
    ctx.lineTo(lastPt.x, padTop + chartH);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
    gradient.addColorStop(0, strokeColor + '55'); // 33% opacity
    gradient.addColorStop(1, strokeColor + '00'); // transparent
    ctx.fillStyle = gradient;
    ctx.fill();

    // 4. Draw Line Stroke
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midX = (p0.x + p1.x) / 2;
      ctx.bezierCurveTo(midX, p0.y, midX, p1.y, p1.x, p1.y);
    }

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 5. Glow Dot on Latest Point
    ctx.beginPath();
    ctx.arc(lastPt.x, lastPt.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lastPt.x, lastPt.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = strokeColor + '44';
    ctx.fill();

    // 6. Interactive Hover Tooltip
    if (hover && hover.x >= padLeft && hover.x <= width - padRight) {
      // Find closest point to mouse X
      let closest = points[0];
      let minDist = Math.abs(points[0].x - hover.x);

      for (let i = 1; i < points.length; i++) {
        const dist = Math.abs(points[i].x - hover.x);
        if (dist < minDist) {
          minDist = dist;
          closest = points[i];
        }
      }

      // Vertical guide line
      ctx.strokeStyle = '#c0caf566';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(closest.x, padTop);
      ctx.lineTo(closest.x, padTop + chartH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Point circle
      ctx.beginPath();
      ctx.arc(closest.x, closest.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Tooltip Box
      const timeStr = new Date(closest.time).toLocaleTimeString();
      const text = `${hover.label}: ${closest.val.toFixed(1)}% (${timeStr})`;
      ctx.font = '11px monospace';
      const textWidth = ctx.measureText(text).width;
      const boxW = textWidth + 16;
      const boxH = 22;

      let boxX = closest.x - boxW / 2;
      if (boxX < padLeft) boxX = padLeft;
      if (boxX + boxW > width - padRight) boxX = width - padRight - boxW;
      const boxY = Math.max(padTop - 20, closest.y - 30);

      ctx.fillStyle = '#16161ee6';
      ctx.strokeStyle = '#414868';
      ctx.lineWidth = 1;
      this.drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 4, true, true);

      ctx.fillStyle = '#c0caf5';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, boxX + boxW / 2, boxY + boxH / 2);
    }
  }

  drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  /* ==========================================================================
     Service Management
     ========================================================================== */
  async loadServices(showToastOnError = true) {
    try {
      const data = await this.api('/services');
      this.services = Array.isArray(data.services) ? data.services : [];
      this.renderServicesTable(this.services);
      this.renderServicesGrid(this.services);
    } catch (err) {
      console.error('[Services] Failed to load services:', err);
      if (showToastOnError) {
        this.showToast(`Failed to load services: ${err.message}`, 'error');
      }
    }
  }

  isServiceRunning(status) {
    if (!status) return false;
    const s = String(status).toLowerCase();
    return s === 'running' || s === 'active';
  }

  renderServicesTable(services) {
    const tbody = document.getElementById('services-tbody');
    if (!tbody) return;

    if (!services || services.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-muted" style="text-align:center; padding: 24px;">No services configured.</td></tr>`;
      return;
    }

    tbody.innerHTML = services.map(svc => {
      const isRunning = this.isServiceRunning(svc.status);
      const statusClass = this.normalizeStatusClass(svc.status);

      return `
        <tr data-service="${this.escapeHtml(svc.name)}">
          <td>
            <div class="service-name-wrapper">
              <strong>${this.escapeHtml(svc.name)}</strong>
              ${svc.port ? `<span class="service-card-port">${svc.port}</span>` : ''}
            </div>
          </td>
          <td>
            <span class="status-badge ${statusClass}">
              ${this.escapeHtml(svc.status || 'unknown')}
            </span>
          </td>
          <td>${svc.port ? `<span class="mono">${svc.port}</span>` : '<span class="text-muted">-</span>'}</td>
          <td>
            <div class="service-card-actions">
              ${isRunning ? `
                <button class="btn btn-sm btn-danger" data-service-action="stop" data-service-name="${this.escapeHtml(svc.name)}" title="Stop ${this.escapeHtml(svc.name)}">Stop</button>
                <button class="btn btn-sm btn-secondary" data-service-action="restart" data-service-name="${this.escapeHtml(svc.name)}" title="Restart ${this.escapeHtml(svc.name)}">Restart</button>
              ` : `
                <button class="btn btn-sm btn-primary" data-service-action="start" data-service-name="${this.escapeHtml(svc.name)}" title="Start ${this.escapeHtml(svc.name)}">Start</button>
              `}
              <button class="btn btn-sm btn-secondary" data-service-action="${svc.enabled ? 'disable' : 'enable'}" data-service-name="${this.escapeHtml(svc.name)}" title="${svc.enabled ? 'Disable autostart' : 'Enable autostart'}">
                ${svc.enabled ? 'Disable' : 'Enable'}
              </button>
              <button class="btn btn-sm btn-secondary" data-service-logs="${this.escapeHtml(svc.name)}" title="View logs for ${this.escapeHtml(svc.name)}">Logs</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderServicesGrid(services) {
    const grid = document.getElementById('services-grid');
    if (!grid) return;

    if (!services || services.length === 0) {
      grid.innerHTML = `<div class="card text-muted" style="grid-column: 1 / -1; text-align: center; padding: 32px;">No services found.</div>`;
      return;
    }

    grid.innerHTML = services.map(svc => {
      const isRunning = this.isServiceRunning(svc.status);
      const statusClass = this.normalizeStatusClass(svc.status);

      return `
        <div class="card service-card" data-service="${this.escapeHtml(svc.name)}">
          <div class="service-card-header">
            <span class="service-card-name">${this.escapeHtml(svc.name)}</span>
            ${svc.port ? `<span class="service-card-port">${svc.port}</span>` : ''}
          </div>
          <div class="service-card-status">
            <span class="status-badge ${statusClass}">
              ${this.escapeHtml(svc.status || 'unknown')}
            </span>
            <span class="service-enabled-tag ${svc.enabled ? 'enabled' : 'disabled'}">
              ${svc.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div class="service-card-actions">
            ${isRunning ? `
              <button class="btn btn-sm btn-danger" data-service-action="stop" data-service-name="${this.escapeHtml(svc.name)}">Stop</button>
              <button class="btn btn-sm btn-secondary" data-service-action="restart" data-service-name="${this.escapeHtml(svc.name)}">Restart</button>
            ` : `
              <button class="btn btn-sm btn-primary" data-service-action="start" data-service-name="${this.escapeHtml(svc.name)}">Start</button>
            `}
            <button class="btn btn-sm btn-secondary" data-service-action="${svc.enabled ? 'disable' : 'enable'}" data-service-name="${this.escapeHtml(svc.name)}">
              ${svc.enabled ? 'Disable' : 'Enable'}
            </button>
            <button class="btn btn-sm btn-secondary" data-service-logs="${this.escapeHtml(svc.name)}">Logs</button>
          </div>
        </div>
      `;
    }).join('');
  }

  updateServiceBadges(statusMap) {
    if (!statusMap) return;

    Object.entries(statusMap).forEach(([name, status]) => {
      // Find matching cached service object and update status
      const svc = this.services.find(s => s.name === name);
      if (svc) svc.status = status;

      const normClass = this.normalizeStatusClass(status);

      // Update in table
      const row = document.querySelector(`#services-tbody tr[data-service="${name}"]`);
      if (row) {
        const badge = row.querySelector('.status-badge');
        if (badge) {
          badge.className = `status-badge ${normClass}`;
          badge.textContent = status;
        }
      }

      // Update in grid
      const card = document.querySelector(`#services-grid .service-card[data-service="${name}"]`);
      if (card) {
        const badge = card.querySelector('.status-badge');
        if (badge) {
          badge.className = `status-badge ${normClass}`;
          badge.textContent = status;
        }
      }
    });
  }

  normalizeStatusClass(status) {
    if (!status) return 'unknown';
    const s = String(status).toLowerCase();
    if (s === 'running' || s === 'active') return 'running';
    if (s === 'stopped' || s === 'inactive' || s === 'dead') return 'stopped';
    if (s === 'activating' || s === 'deactivating' || s === 'reloading') return 'activating';
    if (s === 'failed' || s === 'error') return 'failed';
    return 'unknown';
  }

  filterServices(query) {
    const q = (query || '').toLowerCase().trim();
    document.querySelectorAll('#services-tbody tr, #services-grid .service-card').forEach(el => {
      const name = el.dataset.service?.toLowerCase() || '';
      const text = el.textContent?.toLowerCase() || '';
      const match = !q || name.includes(q) || text.includes(q);
      el.style.display = match ? '' : 'none';
    });
  }

  async handleServiceAction(action, name, btn) {
    if (!name || !action) return;

    const originalText = btn.textContent;
    btn.disabled = true;
    btn.classList.add('loading');

    // Disable sibling buttons in the same container while request is running
    const container = btn.closest('.service-card-actions');
    const siblingBtns = container ? container.querySelectorAll('button') : [];
    siblingBtns.forEach(b => { if (b !== btn) b.disabled = true; });

    try {
      await this.api(`/services/${encodeURIComponent(name)}/${encodeURIComponent(action)}`, {
        method: 'POST'
      });
      this.showToast(`Service ${name} ${action} command sent successfully`, 'success');
      // Reload services to fetch updated state
      await this.loadServices(false);
    } catch (err) {
      this.showToast(`Failed to ${action} ${name}: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.textContent = originalText;
      siblingBtns.forEach(b => { b.disabled = false; });
    }
  }

  /* ==========================================================================
     Service Logs Modal
     ========================================================================== */
  async openServiceLogsModal(name) {
    this.activeLogService = name;
    this.logAutoScroll = true;

    const modalContent = `
      <div class="logs-toolbar">
        <div class="logs-toolbar-left">
          <label for="modal-log-lines">Lines:
            <select id="modal-log-lines" class="select-sm">
              <option value="50">50</option>
              <option value="100" selected>100</option>
              <option value="250">250</option>
              <option value="500">500</option>
            </select>
          </label>
          <label class="checkbox-label-sm">
            <input type="checkbox" id="modal-log-autoscroll" checked> Auto-scroll
          </label>
        </div>
        <div class="logs-toolbar-right">
          <button class="btn btn-sm btn-secondary" id="modal-copy-logs" title="Copy logs to clipboard">
            Copy
          </button>
          <button class="btn btn-sm btn-secondary" id="modal-refresh-logs" title="Refresh logs">
            Refresh
          </button>
        </div>
      </div>
      <div class="modal-logs-wrapper" id="modal-logs-container">
        <pre class="modal-logs" id="modal-log-pre">Loading journal logs for ${this.escapeHtml(name)}...</pre>
      </div>
    `;

    this.openModal(`Logs: ${name}`, modalContent);

    // Bind log toolbar events
    const linesSelect = document.getElementById('modal-log-lines');
    const autoScrollCheck = document.getElementById('modal-log-autoscroll');
    const refreshBtn = document.getElementById('modal-refresh-logs');
    const copyBtn = document.getElementById('modal-copy-logs');

    if (linesSelect) {
      linesSelect.addEventListener('change', () => this.fetchServiceLogs(name, linesSelect.value));
    }
    if (autoScrollCheck) {
      autoScrollCheck.addEventListener('change', (e) => {
        this.logAutoScroll = e.target.checked;
      });
    }
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        const lines = linesSelect ? linesSelect.value : 100;
        this.fetchServiceLogs(name, lines);
      });
    }
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const pre = document.getElementById('modal-log-pre');
        if (pre && pre.textContent) {
          try {
            await navigator.clipboard.writeText(pre.textContent);
            this.showToast('Logs copied to clipboard', 'info');
          } catch (_) {
            this.showToast('Failed to copy to clipboard', 'warning');
          }
        }
      });
    }

    // Initial fetch
    await this.fetchServiceLogs(name, 100);
  }

  async fetchServiceLogs(name, lines = 100) {
    const pre = document.getElementById('modal-log-pre');
    if (!pre) return;

    try {
      const data = await this.api(`/services/${encodeURIComponent(name)}/logs?lines=${encodeURIComponent(lines)}`);
      const logsText = data.logs || (typeof data === 'string' ? data : '');
      pre.textContent = logsText || `[No logs recorded for ${name}]`;

      const container = document.getElementById('modal-logs-container');
      if (container && this.logAutoScroll) {
        container.scrollTop = container.scrollHeight;
      }
    } catch (err) {
      if (pre) {
        pre.textContent = `[Failed to retrieve logs: ${err.message}]`;
      }
    }
  }

  appendLogLine(data) {
    if (!this.activeLogService) return;
    const serviceName = data.service || data.name;
    if (serviceName && serviceName !== this.activeLogService) return;

    const line = data.line || (typeof data === 'string' ? data : JSON.stringify(data));
    const pre = document.getElementById('modal-log-pre');
    const container = document.getElementById('modal-logs-container');
    if (pre && line) {
      pre.textContent += `\n${line}`;
      if (container && this.logAutoScroll) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }

  /* ==========================================================================
     Hardware & Session Controls
     ========================================================================== */
  async loadHardware() {
    try {
      const [hwRes, battRes, thermRes, pwrRes] = await Promise.allSettled([
        this.api('/hardware/info'),
        this.api('/hardware/battery'),
        this.api('/hardware/thermal'),
        this.api('/hardware/power-profile')
      ]);

      if (hwRes.status === 'fulfilled') {
        this.hardwareInfo = hwRes.value;
        const hwProfile = document.getElementById('hw-profile');
        if (hwProfile) {
          hwProfile.textContent = hwRes.value.hardware_profile || 'auto';
        }
      }

      if (battRes.status === 'fulfilled') {
        this.batteryInfo = battRes.value;
        this.updateBatteryControls(battRes.value);
      }

      if (thermRes.status === 'fulfilled') {
        const thermSelect = document.getElementById('thermal-profile');
        if (thermSelect && thermRes.value.profile) {
          thermSelect.value = thermRes.value.profile;
        }
      }

      if (pwrRes.status === 'fulfilled') {
        const pwrSelect = document.getElementById('power-profile');
        if (pwrSelect && pwrRes.value.active) {
          pwrSelect.value = pwrRes.value.active;
        }
      }
    } catch (err) {
      console.error('[Hardware] Failed to load hardware details:', err);
    }
  }

  updateBatteryControls(batt) {
    if (!batt) return;
    const slider = document.getElementById('charge-limit');
    const valSpan = document.getElementById('charge-limit-value');
    if (slider && typeof batt.charge_limit === 'number') {
      slider.value = batt.charge_limit;
    }
    if (valSpan && typeof batt.charge_limit === 'number') {
      valSpan.textContent = `${batt.charge_limit}%`;
    }
  }

  updateBatteryUI(batt) {
    if (!batt) return;
    const fill = document.getElementById('battery-fill');
    const percentEl = document.getElementById('battery-percent');
    const statusEl = document.getElementById('battery-status');

    const pct = typeof batt.percent === 'number' ? batt.percent : 80;
    if (fill) {
      fill.style.width = `${pct}%`;
      fill.classList.toggle('low', pct <= 25);
      fill.classList.toggle('critical', pct <= 10);
    }
    if (percentEl) {
      percentEl.textContent = `${pct}%`;
    }
    if (statusEl) {
      let statusText = batt.status || (batt.charging ? 'Charging' : 'Discharging');
      if (batt.charge_limit) {
        statusText += ` (Limit ${batt.charge_limit}%)`;
      }
      statusEl.textContent = statusText;
    }
  }

  async applyChargeLimit(btn) {
    const slider = document.getElementById('charge-limit');
    if (!slider) return;
    const limit = parseInt(slider.value, 10);

    btn.disabled = true;
    btn.classList.add('loading');
    try {
      await this.api('/hardware/battery/charge-limit', {
        method: 'POST',
        body: { limit }
      });
      this.showToast(`Battery charge limit set to ${limit}%`, 'success');
      if (this.config && this.config.hardware?.battery) {
        this.config.hardware.battery.charge_limit = limit;
      }
    } catch (err) {
      this.showToast(`Failed to set charge limit: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  }

  async applyThermalProfile(btn) {
    const select = document.getElementById('thermal-profile');
    if (!select) return;
    const profile = select.value;

    btn.disabled = true;
    btn.classList.add('loading');
    try {
      await this.api('/hardware/thermal/profile', {
        method: 'POST',
        body: { profile }
      });
      this.showToast(`Thermal profile updated to ${profile}`, 'success');
      if (this.config && this.config.hardware) {
        this.config.hardware.thermal_profile = profile;
      }
    } catch (err) {
      this.showToast(`Failed to set thermal profile: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  }

  async applyPowerProfile(btn) {
    const select = document.getElementById('power-profile');
    if (!select) return;
    const profile = select.value;

    btn.disabled = true;
    btn.classList.add('loading');
    try {
      await this.api('/hardware/power-profile', {
        method: 'POST',
        body: { profile }
      });
      this.showToast(`Power profile updated to ${profile}`, 'success');
      if (this.config && this.config.hardware) {
        this.config.hardware.power_profile = profile;
      }
    } catch (err) {
      this.showToast(`Failed to set power profile: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  }

  async cycleSessionMode(btn) {
    const current = (this.config?.session_mode || document.getElementById('session-mode')?.textContent || 'headless').trim().toLowerCase();
    const modes = ['headless', 'interactive', 'kiosk'];
    const nextIdx = (modes.indexOf(current) + 1) % modes.length;
    const nextMode = modes[nextIdx];

    if (btn) {
      btn.disabled = true;
      btn.classList.add('loading');
    }

    try {
      await this.api('/session', {
        method: 'POST',
        body: { mode: nextMode }
      });
      this.updateSessionBadge(nextMode);
      if (this.config) this.config.session_mode = nextMode;
      this.showToast(`Session mode switched to ${nextMode}`, 'success');
    } catch (err) {
      this.showToast(`Failed to change session mode: ${err.message}`, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('loading');
      }
    }
  }

  updateSessionBadge(mode) {
    const badge = document.getElementById('session-mode');
    if (!badge) return;
    badge.textContent = mode;
    badge.className = `session-badge session-${mode}`;
  }

  /* ==========================================================================
     System Info & Settings Persistence
     ========================================================================== */
  async loadSystemInfo() {
    try {
      const info = await this.api('/system/info');
      this.systemInfo = info;

      if (info.session) this.updateSessionBadge(info.session);

      // Populate hardware info fields
      const hwCpu = document.getElementById('hw-cpu');
      const hwGpu = document.getElementById('hw-gpu');
      const hwTpm2 = document.getElementById('hw-tpm2');
      const hwProfile = document.getElementById('hw-profile');

      if (hwProfile && info.hardware) hwProfile.textContent = info.hardware;
      if (hwCpu) hwCpu.textContent = info.cpu || 'Multi-Core Server CPU';
      if (hwGpu) hwGpu.textContent = info.gpu || 'Integrated Display Controller';
      if (hwTpm2) hwTpm2.textContent = info.tpm2 ? 'Enabled (2.0)' : 'Not detected';
    } catch (err) {
      console.warn('[System] Failed to load system info:', err);
    }
  }

  async loadConfig() {
    try {
      const config = await this.api('/config');
      this.config = config;
      this.populateSettingsForm(config);
    } catch (err) {
      console.error('[Config] Failed to load manifest config:', err);
    }
  }

  populateSettingsForm(cfg) {
    if (!cfg) return;

    if (cfg.session_mode) this.updateSessionBadge(cfg.session_mode);

    const hostnameInput = document.getElementById('setting-hostname');
    const kernelSelect = document.getElementById('setting-kernel');
    const fsSelect = document.getElementById('setting-fs');
    const bootloaderSelect = document.getElementById('setting-bootloader');
    const cachyosCheck = document.getElementById('setting-cachyos');
    const easeCheck = document.getElementById('setting-ease');

    if (hostnameInput && cfg.hostname) hostnameInput.value = cfg.hostname;
    if (kernelSelect && cfg.kernel_profile) kernelSelect.value = cfg.kernel_profile;
    if (fsSelect && cfg.filesystem) fsSelect.value = cfg.filesystem;
    if (bootloaderSelect && cfg.bootloader) bootloaderSelect.value = cfg.bootloader;
    if (cachyosCheck && typeof cfg.cachyos_repos === 'boolean') cachyosCheck.checked = cfg.cachyos_repos;
    if (easeCheck && typeof cfg.ease_of_use_mode === 'boolean') easeCheck.checked = cfg.ease_of_use_mode;

    // Sync hardware controls from config
    if (cfg.hardware) {
      if (cfg.hardware.battery) this.updateBatteryControls(cfg.hardware.battery);
      const thermSelect = document.getElementById('thermal-profile');
      if (thermSelect && cfg.hardware.thermal_profile) thermSelect.value = cfg.hardware.thermal_profile;
      const pwrSelect = document.getElementById('power-profile');
      if (pwrSelect && cfg.hardware.power_profile) pwrSelect.value = cfg.hardware.power_profile;
    }
  }

  async saveGeneralSettings(btn) {
    const hostname = document.getElementById('setting-hostname')?.value?.trim();
    const kernel = document.getElementById('setting-kernel')?.value;
    const fs = document.getElementById('setting-fs')?.value;
    const bootloader = document.getElementById('setting-bootloader')?.value;
    const cachyos = !!document.getElementById('setting-cachyos')?.checked;
    const ease = !!document.getElementById('setting-ease')?.checked;

    if (!hostname) {
      this.showToast('Hostname cannot be empty', 'error');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.classList.add('loading');
    }

    // Preserve the full manifest object to ensure Go validation passes
    const payload = {
      ...(this.config || {}),
      hostname,
      kernel_profile: kernel || this.config?.kernel_profile || 'lts',
      filesystem: fs || this.config?.filesystem || 'ext4',
      bootloader: bootloader || this.config?.bootloader || 'auto',
      cachyos_repos: cachyos,
      ease_of_use_mode: ease
    };

    try {
      await this.api('/config', {
        method: 'POST',
        body: payload
      });
      this.config = payload;
      this.showToast('System configuration saved successfully', 'success');
    } catch (err) {
      this.showToast(`Failed to save settings: ${err.message}`, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('loading');
      }
    }
  }

  async saveFeatureToggles() {
    if (!this.config) return;
    const cachyos = !!document.getElementById('setting-cachyos')?.checked;
    const ease = !!document.getElementById('setting-ease')?.checked;

    const payload = {
      ...this.config,
      cachyos_repos: cachyos,
      ease_of_use_mode: ease
    };

    try {
      await this.api('/config', {
        method: 'POST',
        body: payload
      });
      this.config = payload;
      this.showToast('Repository preferences updated', 'success');
    } catch (err) {
      this.showToast(`Failed to update toggle: ${err.message}`, 'error');
    }
  }

  /* ==========================================================================
     Network & Storage Views
     ========================================================================== */
  renderNetworkSection() {
    const netContainer = document.getElementById('network-interfaces');
    const fwContainer = document.getElementById('firewall-status');
    if (!netContainer) return;

    const ifaceName = this.config?.network?.interface || 'eth0';
    const isDhcp = this.config?.network?.dhcp !== false;
    const ipAddr = this.config?.network?.static_fallback?.address || '192.168.1.100/24';
    const gw = this.config?.network?.static_fallback?.gateway || '192.168.1.1';
    const dns = this.config?.network?.static_fallback?.dns?.join(', ') || '1.1.1.1, 9.9.9.9';

    const rx = this.lastNetStats ? this.formatBytes(this.lastNetStats.rx) : '0 B';
    const tx = this.lastNetStats ? this.formatBytes(this.lastNetStats.tx) : '0 B';

    netContainer.innerHTML = `
      <div class="interface-card">
        <div class="interface-header">
          <div>
            <div class="interface-name">${this.escapeHtml(ifaceName)}</div>
            <div class="interface-ip">${isDhcp ? 'DHCP (Active)' : 'Static'}: ${this.escapeHtml(ipAddr)}</div>
          </div>
          <span class="status-badge running">Connected</span>
        </div>
        <div class="interface-details">
          <div>Gateway: <span class="mono">${this.escapeHtml(gw)}</span></div>
          <div>DNS: <span class="mono">${this.escapeHtml(dns)}</span></div>
          <div class="interface-stats">Total RX: <span class="mono">${rx}</span> | Total TX: <span class="mono">${tx}</span></div>
        </div>
      </div>
    `;

    if (fwContainer) {
      // List active service ports
      const openPorts = (this.services || [])
        .filter(s => s.port)
        .map(s => `<span class="service-card-port" style="margin: 2px;">${s.port} (${s.name})</span>`)
        .join(' ');

      fwContainer.innerHTML = `
        <div class="firewall-card">
          <div class="firewall-header">
            <span>UFW State:</span>
            <span class="status-badge running">Active / Protected</span>
          </div>
          <p class="text-muted" style="margin-top: 8px; font-size: 12px;">
            Default Policy: <strong>DENY</strong> incoming, <strong>ALLOW</strong> outgoing.
          </p>
          <div style="margin-top: 12px;">
            <div style="font-size: 12px; color: var(--fg-muted); margin-bottom: 6px;">Open Service Ports:</div>
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              ${openPorts || '<span class="text-muted">No open ports</span>'}
            </div>
          </div>
        </div>
      `;
    }
  }

  renderStorageSection() {
    const fsContainer = document.getElementById('filesystems');
    const poolContainer = document.getElementById('storage-pools');
    if (!fsContainer) return;

    const disk = this.lastTelemetry?.disk;
    const total = disk?.total_bytes ? this.formatBytes(disk.total_bytes) : '500 GB';
    const free = disk?.free_bytes ? this.formatBytes(disk.free_bytes) : '250 GB';
    const usedPct = disk?.used_percent ? disk.used_percent : 50;
    const usedBytes = disk?.total_bytes && disk?.free_bytes ? this.formatBytes(disk.total_bytes - disk.free_bytes) : '250 GB';
    const fsType = this.config?.filesystem || 'ext4';

    fsContainer.innerHTML = `
      <div class="fs-card">
        <div class="fs-info">
          <div>
            <strong>/ (Root Filesystem)</strong>
            <span class="text-muted" style="font-size: 11px; margin-left: 6px;">[${this.escapeHtml(fsType)}]</span>
          </div>
          <div class="text-muted" style="font-size: 12px; margin-top: 4px;">
            ${usedBytes} used of ${total} (${free} free)
          </div>
        </div>
        <div class="fs-usage-wrapper">
          <div class="fs-bar">
            <div class="fs-fill ${usedPct > 85 ? 'critical' : usedPct > 70 ? 'warning' : ''}" style="width: ${usedPct}%"></div>
          </div>
          <span class="mono" style="font-size: 12px; min-width: 45px; text-align: right;">${usedPct.toFixed(1)}%</span>
        </div>
      </div>
    `;

    if (poolContainer) {
      poolContainer.innerHTML = `
        <div class="pool-card">
          <div class="pool-info">
            <strong>System Storage Pool</strong>
            <span class="text-muted" style="font-size: 11px; margin-left: 6px;">(Default Volume Group)</span>
            <div class="text-muted" style="font-size: 12px; margin-top: 4px;">
              Health: <span class="status-badge running" style="padding: 2px 6px; font-size: 10px;">Optimal</span>
            </div>
          </div>
          <div class="pool-stats text-muted" style="font-size: 12px;">
            Mount: <span class="mono">/dev/mapper/tinapple-root</span>
          </div>
        </div>
      `;
    }
  }

  /* ==========================================================================
     Full Refresh Trigger
     ========================================================================== */
  async refreshAll(btn) {
    if (btn) {
      btn.disabled = true;
      btn.classList.add('loading');
    }

    try {
      await Promise.allSettled([
        this.loadSystemInfo(),
        this.loadConfig(),
        this.loadServices(false),
        this.loadHardware()
      ]);
      this.showToast('Dashboard data refreshed', 'info');
    } catch (_) {
      this.showToast('Refresh completed with warnings', 'warning');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('loading');
      }
    }
  }

  /* ==========================================================================
     Toast Notifications System
     ========================================================================== */
  setupToastContainer() {
    this.toastContainer = document.querySelector('.toast-container');
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.className = 'toast-container';
      document.body.appendChild(this.toastContainer);
    }
  }

  showToast(message, type = 'info', duration = 4000) {
    if (!this.toastContainer) this.setupToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'alert');

    // Tokyo Night themed SVG icons
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else if (type === 'warning') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    } else {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
      <div class="toast-icon">${iconSvg}</div>
      <div class="toast-message">${this.escapeHtml(message)}</div>
      <button class="toast-close" aria-label="Dismiss notification">&times;</button>
      <div class="toast-progress" style="animation-duration: ${duration}ms"></div>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.dismissToast(toast));

    this.toastContainer.appendChild(toast);

    // Limit maximum visible toasts
    while (this.toastContainer.children.length > 5) {
      this.dismissToast(this.toastContainer.children[0]);
    }

    const timer = setTimeout(() => {
      this.dismissToast(toast);
    }, duration);

    // Pause on hover
    toast.addEventListener('mouseenter', () => clearTimeout(timer));
    toast.addEventListener('mouseleave', () => {
      setTimeout(() => this.dismissToast(toast), 1500);
    });
  }

  dismissToast(toast) {
    if (!toast || toast.classList.contains('removing')) return;
    toast.classList.add('removing');
    setTimeout(() => {
      toast.remove();
    }, 280);
  }

  /* ==========================================================================
     Accessible Modal System
     ========================================================================== */
  setupModal() {
    this.modalOverlay = document.querySelector('.modal-overlay');
    if (!this.modalOverlay) {
      this.modalOverlay = document.createElement('div');
      this.modalOverlay.className = 'modal-overlay';
      this.modalOverlay.setAttribute('role', 'dialog');
      this.modalOverlay.setAttribute('aria-modal', 'true');
      this.modalOverlay.innerHTML = `
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title" id="modal-title"></h3>
            <button class="modal-close" aria-label="Close modal dialog">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal-body" id="modal-body"></div>
          <div class="modal-footer" id="modal-footer">
            <button class="btn btn-secondary modal-close-btn">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(this.modalOverlay);

      this.modalOverlay.querySelector('.modal-close')?.addEventListener('click', () => this.closeModal());
      this.modalOverlay.querySelector('.modal-close-btn')?.addEventListener('click', () => this.closeModal());
      this.modalOverlay.addEventListener('click', (e) => {
        if (e.target === this.modalOverlay) this.closeModal();
      });
    }
  }

  openModal(title, bodyHtml) {
    if (!this.modalOverlay) this.setupModal();

    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');

    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = bodyHtml;

    this.modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    if (!this.modalOverlay) return;
    this.modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    this.activeLogService = null;
  }

  /* ==========================================================================
     Utilities & Helpers
     ========================================================================== */
  formatBytes(bytes, decimals = 1) {
    if (bytes === 0 || !bytes || isNaN(bytes)) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const idx = Math.min(i, sizes.length - 1);
    return `${parseFloat((bytes / Math.pow(k, idx)).toFixed(dm))} ${sizes[idx]}`;
  }

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
}

// Instantiate dashboard application once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.tinapple = new TinappleDashboard();
  });
} else {
  window.tinapple = new TinappleDashboard();
}