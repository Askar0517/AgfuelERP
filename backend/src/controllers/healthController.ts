import { Request, Response } from 'express';
import { getDbSyncStatus, testDbConnection, getSanitizedDbTarget, pool, SCHEMA_TABLES } from '../db/index.ts';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

export interface HealthData {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  uptime: number;
  uptimeFormatted: string;
  timestamp: string;
  environment: string;
  system: {
    nodeVersion: string;
    platform: string;
    pid: number;
    memory: {
      heapUsedMB: number;
      heapTotalMB: number;
      rssMB: number;
    };
  };
  database: {
    connected: boolean;
    mode: string;
    target: string;
    database: string;
    engine: string;
    latencyMs?: number;
    tablesSynced: string;
    pool: {
      total: number;
      idle: number;
      waiting: number;
    };
    tables: Array<{ tableName: string; label: string; status: string; rowCount?: number }>;
  };
}

/**
 * Health Check Controller
 * Provides service health, uptime, live/cached PostgreSQL database status,
 * connection latency, table synchronization, memory metrics, runtime details,
 * and a rich interactive HTML status dashboard.
 */
export async function healthCheckHandler(req: Request, res: Response): Promise<void> {
  const live = req.query.live === 'true' || req.query.fresh === 'true';
  let dbStatus = getDbSyncStatus();
  let liveCheck: { connected: boolean; latencyMs?: number; engine: string; database: string; error?: string } | null = null;

  if (live || !dbStatus) {
    try {
      liveCheck = await testDbConnection();
    } catch (err: any) {
      liveCheck = {
        connected: false,
        engine: 'In-Memory MockStore',
        database: 'petropulse',
        error: err?.message || 'Database connection error',
      };
    }
  }

  const isConnected = liveCheck ? liveCheck.connected : (dbStatus ? dbStatus.connection.connected : false);
  const engine = liveCheck ? liveCheck.engine : (dbStatus ? dbStatus.connection.engine : 'PostgreSQL');
  const databaseName = liveCheck ? liveCheck.database : (dbStatus ? dbStatus.connection.database : 'petropulse');
  const latencyMs = liveCheck?.latencyMs ?? dbStatus?.connection.latencyMs;
  const target = getSanitizedDbTarget();

  const mem = process.memoryUsage();
  const memory = {
    heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
    heapTotalMB: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
    rssMB: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
  };

  const poolStats = {
    total: pool.totalCount || 0,
    idle: pool.idleCount || 0,
    waiting: pool.waitingCount || 0,
  };

  const uptimeSec = process.uptime();

  // Populate table sync list
  const tablesList = (dbStatus && dbStatus.tableSync && dbStatus.tableSync.tables)
    ? dbStatus.tableSync.tables
    : SCHEMA_TABLES.map((t) => ({
        tableName: t.tableName,
        label: t.label,
        status: isConnected ? 'SYNCED' : 'READY_IN_MEMORY',
        rowCount: 0,
      }));

  const healthData: HealthData = {
    status: 'ok',
    service: 'PetroPulse Fuel ERP Backend',
    version: '1.0.0',
    uptime: uptimeSec,
    uptimeFormatted: formatUptime(uptimeSec),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
      memory,
    },
    database: {
      connected: isConnected,
      mode: isConnected ? 'POSTGRESQL' : (dbStatus?.tableSync.mode || 'IN_MEMORY_FALLBACK'),
      target,
      database: databaseName,
      engine,
      latencyMs,
      tablesSynced: dbStatus ? `${dbStatus.tableSync.syncedTablesCount}/${dbStatus.tableSync.totalExpectedTables}` : `${tablesList.length}/${SCHEMA_TABLES.length}`,
      pool: poolStats,
      tables: tablesList,
    },
  };

  // Determine whether to serve HTML status dashboard or JSON
  const format = req.query.format as string | undefined;
  const acceptHeader = req.headers.accept || '';
  const isHtmlRequested =
    format === 'html' ||
    req.path.endsWith('/dashboard') ||
    (format !== 'json' &&
      typeof acceptHeader === 'string' &&
      acceptHeader.includes('text/html') &&
      !acceptHeader.includes('application/json'));

  if (isHtmlRequested) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(renderHealthHtml(healthData));
    return;
  }

  res.status(200).json(healthData);
}

/**
 * Generates modern dark-themed HTML diagnostic dashboard.
 */
function renderHealthHtml(data: HealthData): string {
  const isOk = data.database.connected;
  const memPct = Math.min(100, Math.round((data.system.memory.heapUsedMB / data.system.memory.heapTotalMB) * 100));
  const latencyBadgeClass = (data.database.latencyMs ?? 0) < 150 ? 'badge-green' : (data.database.latencyMs ?? 0) < 400 ? 'badge-yellow' : 'badge-red';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PetroPulse — System Health & Diagnostics</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: #111827;
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #10b981;
      --accent-glow: rgba(16, 185, 129, 0.25);
      --mint: #5eead4;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --text-dim: #6b7280;
      --green: #10b981;
      --yellow: #f59e0b;
      --red: #ef4444;
      --blue: #3b82f6;
      --purple: #8b5cf6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Helvetica Neue", sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 24px;
      min-height: 100vh;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    /* Header */
    .header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--card-border);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #059669, #0284c7);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(5, 150, 105, 0.4);
    }
    .brand-logo svg {
      width: 24px;
      height: 24px;
      fill: white;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #fff;
    }
    .brand-subtitle {
      font-size: 13px;
      color: var(--text-muted);
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      border: 1px solid transparent;
      outline: none;
    }
    .btn-primary {
      background: linear-gradient(135deg, #059669, #10b981);
      color: white;
      box-shadow: 0 0 12px var(--accent-glow);
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #047857, #059669);
      transform: translateY(-1px);
    }
    .btn-primary:active {
      transform: translateY(0);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text);
      border-color: var(--card-border);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    /* Status Banner */
    .status-banner {
      background: ${isOk ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'};
      border: 1px solid ${isOk ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .status-banner-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .pulse-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: ${isOk ? '#10b981' : '#ef4444'};
      box-shadow: 0 0 0 0 ${isOk ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)'};
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    .status-text {
      font-size: 15px;
      font-weight: 700;
      color: ${isOk ? '#34d399' : '#f87171'};
    }
    .status-sub {
      font-size: 12px;
      color: var(--text-muted);
    }
    .timer-badge {
      font-size: 12px;
      color: var(--text-dim);
      background: rgba(0, 0, 0, 0.3);
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid var(--card-border);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    /* Grid */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
      gap: 18px;
      margin-bottom: 24px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      transition: border-color 0.2s;
    }
    .card:hover {
      border-color: rgba(255, 255, 255, 0.15);
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .card-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-value {
      font-size: 26px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 8px;
    }
    .card-subtext {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 12px;
      word-break: break-all;
    }
    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .badge-green { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-yellow { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-red { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .badge-blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
    .badge-gray { background: rgba(107, 114, 128, 0.15); color: #9ca3af; border: 1px solid rgba(107, 114, 128, 0.3); }

    /* Progress bar */
    .progress-track {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 9999px;
      overflow: hidden;
      margin-top: 6px;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981, #06b6d4);
      border-radius: 9999px;
      transition: width 0.3s ease;
    }

    /* Key-Value Pair */
    .kv-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 8px;
    }
    .kv-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      padding: 4px 0;
      border-bottom: 1px dashed rgba(255, 255, 255, 0.05);
    }
    .kv-row:last-child { border-bottom: none; }
    .kv-label { color: var(--text-muted); }
    .kv-val { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #fff; font-size: 12px; }

    /* Table Section */
    .section-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .search-input {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      color: #fff;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      outline: none;
      width: 220px;
    }
    .search-input:focus {
      border-color: var(--accent);
    }
    .table-container {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    th {
      padding: 10px 12px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--card-border);
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: var(--text);
    }
    tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }
    .table-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      color: #a5f3fc;
    }

    /* JSON Box */
    .json-card {
      background: #0d1117;
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 16px;
      margin-top: 20px;
      display: none;
    }
    .json-card.open {
      display: block;
    }
    pre {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      color: #7dd3fc;
      overflow-x: auto;
      max-height: 400px;
      padding: 12px;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 8px;
    }

    /* Spinner */
    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <div class="brand">
        <div class="brand-logo">
          <svg viewBox="0 0 24 24">
            <path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 10H6V5h6v5zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
          </svg>
        </div>
        <div>
          <h1 class="brand-title">${data.service}</h1>
          <p class="brand-subtitle">v${data.version} • Telemetry & System Diagnostics</p>
        </div>
      </div>
      <div class="header-actions">
        <button id="liveProbeBtn" class="btn btn-primary" onclick="runLiveProbe()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
          </svg>
          <span id="probeText">Run Live Probe</span>
        </button>
        <button id="toggleJsonBtn" class="btn btn-secondary" onclick="toggleJsonView()">
          { } Raw JSON
        </button>
        <a href="?format=json" target="_blank" class="btn btn-secondary">
          ↗ API Endpoint
        </a>
      </div>
    </header>

    <!-- Status Banner -->
    <div class="status-banner" id="statusBanner">
      <div class="status-banner-left">
        <div class="pulse-dot" id="statusDot"></div>
        <div>
          <div class="status-text" id="statusText">${isOk ? 'All Systems Operational' : 'Degraded: PostgreSQL Offline'}</div>
          <div class="status-sub" id="statusSub">Last verified: <span id="lastVerified">${new Date(data.timestamp).toLocaleTimeString()}</span></div>
        </div>
      </div>
      <div class="timer-badge">
        <span id="countdownText">Auto refresh: 15s</span>
        <button onclick="toggleAutoRefresh()" id="pauseBtn" style="background:none; border:none; color:var(--mint); cursor:pointer; font-size:11px; text-decoration:underline;">Pause</button>
      </div>
    </div>

    <!-- Metric Cards Grid -->
    <div class="grid">
      <!-- Card 1: Database Status -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            </svg>
            Database
          </span>
          <span id="dbBadge" class="badge ${isOk ? 'badge-green' : 'badge-red'}">${isOk ? 'CONNECTED' : 'DISCONNECTED'}</span>
        </div>
        <div class="card-value" id="dbEngine">${data.database.connected ? 'PostgreSQL' : 'In-Memory Fallback'}</div>
        <div class="card-subtext" id="dbTarget">${data.database.target}</div>
        <div class="kv-list">
          <div class="kv-row">
            <span class="kv-label">Round-Trip Latency</span>
            <span class="kv-val"><span id="dbLatencyBadge" class="badge ${latencyBadgeClass}">${data.database.latencyMs !== undefined ? data.database.latencyMs + ' ms' : 'N/A'}</span></span>
          </div>
          <div class="kv-row">
            <span class="kv-label">Database Name</span>
            <span class="kv-val" id="dbName">${data.database.database}</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">Operating Mode</span>
            <span class="kv-val" id="dbMode">${data.database.mode}</span>
          </div>
        </div>
      </div>

      <!-- Card 2: Table Synchronization -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            Table Synchronization
          </span>
          <span class="badge badge-green" id="syncBadge">100% SYNCED</span>
        </div>
        <div class="card-value" id="tablesSynced">${data.database.tablesSynced}</div>
        <div class="card-subtext">Active Forecourt ERP schema catalog</div>
        <div class="progress-track">
          <div class="progress-fill" style="width: 100%;"></div>
        </div>
        <div class="kv-list" style="margin-top: 14px;">
          <div class="kv-row">
            <span class="kv-label">Core Tables Expected</span>
            <span class="kv-val">${SCHEMA_TABLES.length} tables</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">Verified In DB</span>
            <span class="kv-val" id="tablesVerified">${data.database.tables.length} tables</span>
          </div>
        </div>
      </div>

      <!-- Card 3: Connection Pool -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
            SQL Connection Pool
          </span>
          <span class="badge badge-blue">PG POOL</span>
        </div>
        <div class="card-value" id="poolTotal">${data.database.pool.total} <span style="font-size:14px; font-weight: normal; color:var(--text-muted);">clients</span></div>
        <div class="card-subtext">Pool limits: 10 max clients • 15s timeout</div>
        <div class="kv-list">
          <div class="kv-row">
            <span class="kv-label">Idle Clients</span>
            <span class="kv-val" id="poolIdle">${data.database.pool.idle}</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">Waiting Requests</span>
            <span class="kv-val" id="poolWaiting">${data.database.pool.waiting}</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">SSL Mode</span>
            <span class="kv-val badge badge-green">ENABLED</span>
          </div>
        </div>
      </div>

      <!-- Card 4: System & Uptime -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Runtime & System
          </span>
          <span class="badge badge-gray" id="envBadge">${data.environment.toUpperCase()}</span>
        </div>
        <div class="card-value" id="uptimeFormatted">${data.uptimeFormatted}</div>
        <div class="card-subtext">Process Uptime • PID <span id="sysPid">${data.system.pid}</span></div>
        <div class="kv-list">
          <div class="kv-row">
            <span class="kv-label">Node Runtime</span>
            <span class="kv-val">${data.system.nodeVersion} (${data.system.platform})</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">Memory (Heap / RSS)</span>
            <span class="kv-val" id="memText">${data.system.memory.heapUsedMB} MB / ${data.system.memory.rssMB} MB</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" id="memProgress" style="width: ${memPct}%;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Schema Tables Matrix -->
    <div class="section-card">
      <div class="section-header">
        <h2 class="section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 3h18v18H3z"></path>
            <path d="M3 9h18"></path>
            <path d="M3 15h18"></path>
            <path d="M9 3v18"></path>
            <path d="M15 3v18"></path>
          </svg>
          Forecourt Schema Tables Synchronization (${data.database.tables.length})
        </h2>
        <input type="text" id="tableFilter" class="search-input" placeholder="Filter tables..." oninput="filterTables()">
      </div>
      <div class="table-container">
        <table id="schemaTable">
          <thead>
            <tr>
              <th style="width: 30%;">Database Table</th>
              <th style="width: 45%;">Functional Domain</th>
              <th style="width: 25%;">Sync Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.database.tables.map((t) => `
              <tr class="table-row">
                <td class="table-code">${t.tableName}</td>
                <td>${t.label}</td>
                <td><span class="badge ${t.status === 'SYNCED' ? 'badge-green' : 'badge-yellow'}">● ${t.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Raw JSON Collapsible -->
    <div id="jsonViewer" class="json-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span style="font-weight:600; font-size:13px; color:#fff;">Raw JSON Telemetry</span>
        <button class="btn btn-secondary" onclick="copyJsonToClipboard()">Copy JSON</button>
      </div>
      <pre><code id="jsonPre">${escapeHtml(JSON.stringify(data, null, 2))}</code></pre>
    </div>
  </div>

  <script>
    let autoRefreshActive = true;
    let countdown = 15;
    let timerInterval = null;

    function escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function toggleJsonView() {
      const viewer = document.getElementById('jsonViewer');
      viewer.classList.toggle('open');
      const btn = document.getElementById('toggleJsonBtn');
      btn.innerText = viewer.classList.contains('open') ? '✕ Close JSON' : '{ } Raw JSON';
    }

    function copyJsonToClipboard() {
      const json = document.getElementById('jsonPre').innerText;
      navigator.clipboard.writeText(json).then(() => {
        alert('Health telemetry copied to clipboard!');
      });
    }

    function filterTables() {
      const query = document.getElementById('tableFilter').value.toLowerCase();
      const rows = document.querySelectorAll('.table-row');
      rows.forEach(r => {
        const text = r.innerText.toLowerCase();
        r.style.display = text.includes(query) ? '' : 'none';
      });
    }

    function toggleAutoRefresh() {
      autoRefreshActive = !autoRefreshActive;
      const pauseBtn = document.getElementById('pauseBtn');
      pauseBtn.innerText = autoRefreshActive ? 'Pause' : 'Resume';
      if (!autoRefreshActive) {
        document.getElementById('countdownText').innerText = 'Auto refresh: Paused';
      } else {
        countdown = 15;
      }
    }

    async function runLiveProbe(isSilent = false) {
      const btn = document.getElementById('liveProbeBtn');
      const probeText = document.getElementById('probeText');
      if (!isSilent) {
        probeText.innerHTML = '<span class="spinner"></span> Probing...';
        btn.disabled = true;
      }

      try {
        const basePath = window.location.pathname.replace(/\\/dashboard$/, '');
        const res = await fetch(basePath + '?live=true&format=json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        updateDashboard(data);
      } catch (err) {
        console.error('Probe error:', err);
      } finally {
        if (!isSilent) {
          probeText.innerText = 'Run Live Probe';
          btn.disabled = false;
        }
      }
    }

    function updateDashboard(data) {
      const isOk = data.database.connected;
      document.getElementById('statusDot').className = 'pulse-dot';
      document.getElementById('statusDot').style.background = isOk ? '#10b981' : '#ef4444';
      document.getElementById('statusText').innerText = isOk ? 'All Systems Operational' : 'Degraded: PostgreSQL Offline';
      document.getElementById('statusText').style.color = isOk ? '#34d399' : '#f87171';
      document.getElementById('lastVerified').innerText = new Date(data.timestamp).toLocaleTimeString();

      // DB card
      document.getElementById('dbBadge').className = 'badge ' + (isOk ? 'badge-green' : 'badge-red');
      document.getElementById('dbBadge').innerText = isOk ? 'CONNECTED' : 'DISCONNECTED';
      document.getElementById('dbEngine').innerText = isOk ? 'PostgreSQL' : 'In-Memory Fallback';
      document.getElementById('dbTarget').innerText = data.database.target;
      document.getElementById('dbName').innerText = data.database.database;
      document.getElementById('dbMode').innerText = data.database.mode;

      const latencyBadge = document.getElementById('dbLatencyBadge');
      if (data.database.latencyMs !== undefined) {
        latencyBadge.innerText = data.database.latencyMs + ' ms';
        latencyBadge.className = 'badge ' + (data.database.latencyMs < 150 ? 'badge-green' : data.database.latencyMs < 400 ? 'badge-yellow' : 'badge-red');
      } else {
        latencyBadge.innerText = 'N/A';
        latencyBadge.className = 'badge badge-gray';
      }

      // Tables
      document.getElementById('tablesSynced').innerText = data.database.tablesSynced;

      // Pool
      document.getElementById('poolTotal').innerHTML = data.database.pool.total + ' <span style="font-size:14px; font-weight: normal; color:var(--text-muted);">clients</span>';
      document.getElementById('poolIdle').innerText = data.database.pool.idle;
      document.getElementById('poolWaiting').innerText = data.database.pool.waiting;

      // Runtime
      document.getElementById('uptimeFormatted').innerText = data.uptimeFormatted;
      document.getElementById('memText').innerText = data.system.memory.heapUsedMB + ' MB / ' + data.system.memory.rssMB + ' MB';
      const pct = Math.min(100, Math.round((data.system.memory.heapUsedMB / data.system.memory.heapTotalMB) * 100));
      document.getElementById('memProgress').style.width = pct + '%';

      // JSON
      document.getElementById('jsonPre').innerHTML = escapeHtml(JSON.stringify(data, null, 2));
    }

    // Auto Refresh Loop
    setInterval(() => {
      if (!autoRefreshActive) return;
      countdown--;
      if (countdown <= 0) {
        countdown = 15;
        runLiveProbe(true);
      }
      document.getElementById('countdownText').innerText = 'Auto refresh: ' + countdown + 's';
    }, 1000);
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
