export interface ProfileCardData {
  id: string;
  name: string;
  category: string;
  tagline: string;
  accentColor: string;
  installed: boolean;
  glyph: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function generateProfileCardSvg(card: ProfileCardData): string {
  const { id, name, category, tagline, accentColor, installed, glyph } = card;
  const statusColor = installed ? '#7ec789' : '#e5b567';
  const statusText = installed ? 'ACTIVE APPLIANCE' : 'READY TO DEPLOY';

  const safeCategory = escapeXml(category.toUpperCase());
  const safeName = escapeXml(name);
  const safeTagline = escapeXml(tagline);
  const safeStatus = escapeXml(statusText);

  const bgId = `bgGrad-${id}`;
  const glowId = `glowGrad-${id}`;
  const meshId = `meshCenter-${id}`;
  const shadowId = `shadow-${id}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="460" viewBox="0 0 360 460">
    <defs>
      <linearGradient id="${bgId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0a0c10"/>
        <stop offset="50%" stop-color="#141822"/>
        <stop offset="100%" stop-color="#06070a"/>
      </linearGradient>
      <linearGradient id="${glowId}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="${statusColor}" stop-opacity="0.3"/>
      </linearGradient>
      <radialGradient id="${meshId}" cx="50%" cy="38%" r="50%">
        <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
      <filter id="${shadowId}" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="${accentColor}" flood-opacity="0.25"/>
      </filter>
    </defs>

    <!-- Card Background -->
    <rect width="360" height="460" rx="20" fill="url(#${bgId})" stroke="#1e2330" stroke-width="1.5"/>
    <rect width="360" height="460" rx="20" fill="url(#${meshId})" pointer-events="none"/>

    <!-- Subtle Cyber Grid -->
    <path d="M20 70 H340 M20 370 H340 M20 200 H340" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1" stroke-dasharray="4 4"/>
    <path d="M70 20 V440 M290 20 V440" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1" stroke-dasharray="4 4"/>

    <!-- Top Accent Bar -->
    <rect x="20" y="16" width="320" height="3" rx="1.5" fill="url(#${glowId})"/>

    <!-- Corner Cyber Brackets -->
    <path d="M24 36 H38 M24 36 V50" stroke="${accentColor}" stroke-opacity="0.7" stroke-width="2" fill="none"/>
    <path d="M336 36 H322 M336 36 V50" stroke="${accentColor}" stroke-opacity="0.7" stroke-width="2" fill="none"/>
    <path d="M24 436 H38 M24 436 V422" stroke="${accentColor}" stroke-opacity="0.7" stroke-width="2" fill="none"/>
    <path d="M336 436 H322 M336 436 V422" stroke="${accentColor}" stroke-opacity="0.7" stroke-width="2" fill="none"/>

    <!-- Header Category & Status -->
    <text x="44" y="46" font-family="ui-monospace, monospace" font-size="10" font-weight="700" fill="${accentColor}" letter-spacing="1.5">${safeCategory}</text>
    <circle cx="320" cy="43" r="3.5" fill="${statusColor}"/>
    <text x="310" y="46" font-family="ui-monospace, monospace" font-size="9" font-weight="600" fill="#9ca3af" text-anchor="end" letter-spacing="1">${safeStatus}</text>

    <!-- Center Glyph Orb -->
    <g transform="translate(180, 190)" filter="url(#${shadowId})">
      <circle cx="0" cy="0" r="64" fill="#0d111a" stroke="${accentColor}" stroke-width="1.5" stroke-opacity="0.6"/>
      <circle cx="0" cy="0" r="54" fill="none" stroke="#252c3d" stroke-width="1" stroke-dasharray="6 4"/>
      <circle cx="0" cy="0" r="74" fill="none" stroke="${accentColor}" stroke-width="1" stroke-opacity="0.15"/>
      <!-- Inner Glyph Path -->
      ${glyph}
    </g>

    <!-- Bottom Metadata Panel -->
    <rect x="20" y="310" width="320" height="110" rx="12" fill="#0c0e14" fill-opacity="0.85" stroke="#1c212c" stroke-width="1"/>
    
    <text x="180" y="342" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="-0.3">
      ${safeName}
    </text>
    <text x="180" y="364" font-family="ui-monospace, monospace" font-size="11" font-weight="600" fill="${accentColor}" text-anchor="middle">
      ${safeTagline}
    </text>
    <text x="180" y="398" font-family="ui-monospace, monospace" font-size="10" fill="#64748b" text-anchor="middle" letter-spacing="0.5">
      TINAPPLE APPLIANCE OS // MANAGED NODE
    </text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}
