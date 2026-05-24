// LevelArc — design tokens, icons, primitives.
// Forked from the design system UI Kit, with extended icons + variants.

const LA = {
  bg: '#0A0A0F',
  bgDeep: '#050509',
  surface: '#13131C',
  surfaceRaised: '#1A1A26',
  card: '#1C1C28',
  cardHover: '#23232F',
  border: '#2A2A3A',
  borderBright: '#3A3A4D',
  fg: '#E8E0C9',
  fgDim: '#A8A39A',
  fgMuted: '#5A5A6E',
  primary: '#3FCAE6',
  primaryGlow: '#7EE0F2',
  primaryDeep: '#27A5C2',
  primaryShadow: 'rgba(63,202,230,0.25)',
  success: '#3DD68C',
  danger: '#FF6B6B',
  streak: '#FFA94D',
  xp: '#F5C542',
};

const RANK = {
  E: '#7A7A8C',
  D: '#4DB8C4',
  C: '#4D8BE0',
  B: '#9B6BE0',
  A: '#E84855',
  S: '#F5C542',
};
const RANK_SEQ = ['E', 'D', 'C', 'B', 'A', 'S'];

// ─────────── Icon set ───────────
function Icon({ name, size = 22, color = 'currentColor', stroke = 1.75, style }) {
  const p = { fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    // nav
    home: <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...p}/>,
    target: (<g {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></g>),
    swords: (<g {...p}><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M5 14l9 9"/><path d="M19 21l2-2"/><path d="m9.5 14.5 4-4"/></g>),
    list: (<g {...p}><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></g>),
    chart: (<g {...p}><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/></g>),
    chartArea: (<g {...p}><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 7-7"/></g>),
    settings: (<g {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></g>),
    // actions
    plus: <path d="M12 5v14M5 12h14" {...p}/>,
    check: <path d="M20 6 9 17l-5-5" {...p}/>,
    x: <path d="M18 6 6 18M6 6l12 12" {...p}/>,
    undo: (<g {...p}><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/></g>),
    archive: (<g {...p}><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/></g>),
    chevron: <path d="m9 18 6-6-6-6" {...p}/>,
    chevronRight: <path d="m9 18 6-6-6-6" {...p}/>,
    chevronDown: <path d="m6 9 6 6 6-6" {...p}/>,
    back: <path d="m15 18-6-6 6-6" {...p}/>,
    // semantic
    flame: <path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c1.5 0 3-1.5 3-3 0-2-3-4-3-7 0 2-3 4-3 7a4 4 0 1 0 8 0c0-2-3-3-3-5" {...p}/>,
    bolt: <path d="M13 2 3 14h7l-1 8 10-12h-7z" {...p}/>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...p}/>,
    sparkle: (<g {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></g>),
    trophy: (<g {...p}><path d="M6 9H4a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1h3"/><path d="M18 9h2a2 2 0 0 0 2-2V5a1 1 0 0 0-1-1h-3"/><path d="M6 4h12v6a6 6 0 0 1-12 0z"/><path d="M9 22h6M12 18v4"/></g>),
    // habit icons
    book: (<g {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></g>),
    dumbbell: (<g {...p}><path d="M14.4 14.4 9.6 9.6"/><path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/><path d="m21.5 21.5-1.4-1.4"/><path d="M3.9 3.9 2.5 2.5"/><path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"/></g>),
    droplet: <path d="M12 3s7 7 7 12a7 7 0 1 1-14 0c0-5 7-12 7-12z" {...p}/>,
    moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" {...p}/>,
    sun: (<g {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></g>),
    leaf: <path d="M11 20A7 7 0 0 1 4 13c0-5 5-8 11-8 0 6-3 11-8 11l-3 0M4 13s4-3 8-3" {...p}/>,
    coffee: (<g {...p}><path d="M10 2v2M14 2v2M16 8a4 4 0 0 1 0 8h-1"/><path d="M3 8h13v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/></g>),
    music: (<g {...p}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></g>),
    pen: (<g {...p}><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13 15.5 10.5"/><path d="m2 22 1.5-5L15 6l3 3L7 20.5z"/></g>),
    code: (<g {...p}><path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/></g>),
    // settings
    globe: (<g {...p}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></g>),
    bell: (<g {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/></g>),
    download: (<g {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></g>),
    upload: (<g {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/></g>),
    refresh: (<g {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></g>),
    info: (<g {...p}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></g>),
    skull: (<g {...p}><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M8 20v-2h8v2"/><path d="M12.5 17 12 22h0l-.5-5"/><path d="M16 20a2 2 0 0 0 1.56-3.25C20 14.65 21 12.45 21 10c0-4.5-4-8-9-8s-9 3.5-9 8c0 2.45 1 4.65 3.44 6.75A2 2 0 0 0 8 20z"/></g>),
    // brand calligraphy
    bracketsOpen: (<g {...p}><path d="M8 4 4 8v8l4 4M16 4l4 4v8l-4 4"/></g>),
    dot: <circle cx="12" cy="12" r="2" fill={color} stroke="none"/>,
    eye: (<g {...p}><path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z"/><circle cx="12" cy="12" r="3"/></g>),
    calendar: (<g {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></g>),
    clock: (<g {...p}><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></g>),
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" style={style}>{paths[name] || null}</svg>;
}

// ─────────── System label ───────────
function SysLabel({ children, color = LA.primary, style }) {
  return (
    <div style={{
      fontFamily: "'Orbitron', sans-serif", fontWeight: 500, fontSize: 10,
      letterSpacing: '0.12em', textTransform: 'uppercase', color, ...style,
    }}>{children}</div>
  );
}

// ─────────── Bracket-wrapped system message ───────────
function SysBrackets({ children, color = LA.primary }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color }}>
      <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700 }}>[</span>
      <span>{children}</span>
      <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700 }}>]</span>
    </span>
  );
}

// ─────────── Button ───────────
function LAButton({ variant = 'primary', children, onClick, disabled, full, icon, iconRight, size = 'md', style, ariaLabel }) {
  const heights = { sm: 36, md: 44, lg: 52 };
  const base = {
    height: heights[size], borderRadius: 8, border: '1px solid transparent',
    fontFamily: "'Inter', sans-serif", fontWeight: 500,
    fontSize: size === 'sm' ? 13 : 14,
    padding: icon && !children ? 0 : '0 18px',
    width: full ? '100%' : (icon && !children ? heights[size] : undefined),
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'background 120ms cubic-bezier(.2,.7,.2,1), transform 120ms cubic-bezier(.2,.7,.2,1), box-shadow 120ms',
    userSelect: 'none', WebkitTapHighlightColor: 'transparent',
    boxSizing: 'border-box',
  };
  const variants = {
    primary: { background: LA.primary, color: LA.bg, boxShadow: `0 0 0 1px ${LA.primary}, 0 0 16px ${LA.primaryShadow}` },
    secondary: { background: LA.card, color: LA.fg, borderColor: LA.border },
    danger: { background: LA.card, color: LA.danger, borderColor: LA.danger },
    success: { background: LA.success, color: LA.bg },
    ghost: { background: 'transparent', color: LA.primary },
    outline: { background: 'transparent', color: LA.primary, borderColor: LA.primary },
    icon: { background: LA.card, color: LA.fg, borderColor: LA.border },
  };
  return (
    <button
      aria-label={ariaLabel}
      onClick={disabled ? undefined : onClick}
      onMouseDown={e => !disabled && (e.currentTarget.style.transform = 'scale(0.97)')}
      onMouseUp={e => (e.currentTarget.style.transform = '')}
      onMouseLeave={e => (e.currentTarget.style.transform = '')}
      onTouchStart={e => !disabled && (e.currentTarget.style.transform = 'scale(0.97)')}
      onTouchEnd={e => (e.currentTarget.style.transform = '')}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18}/>}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 16 : 18}/>}
    </button>
  );
}

// ─────────── Panel ───────────
function LAPanel({ children, glow = false, color, style, padding = 16 }) {
  return (
    <div style={{
      background: LA.surface,
      border: `1px solid ${glow ? (color || LA.primary) : LA.border}`,
      borderRadius: 8,
      padding,
      boxShadow: glow ? `0 0 0 1px ${color || LA.primary}33, 0 0 24px ${color || LA.primary}22` : 'none',
      ...style,
    }}>{children}</div>
  );
}

// ─────────── Progress bar ───────────
function ProgressBar({ value = 0, color = LA.primary, height = 8, withGlow = false, segments = 0 }) {
  const w = Math.max(0, Math.min(100, value));
  return (
    <div style={{
      height, background: LA.card, borderRadius: 4, overflow: 'hidden', position: 'relative',
      border: `1px solid ${LA.border}`,
    }}>
      <div style={{
        width: `${w}%`, height: '100%', background: color, borderRadius: 3,
        boxShadow: withGlow ? `0 0 12px ${color}80, inset 0 0 8px ${color}40` : 'none',
        transition: 'width 500ms cubic-bezier(.2,.7,.2,1)',
      }}/>
      {segments > 0 && Array.from({ length: segments - 1 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${((i + 1) / segments) * 100}%`,
          width: 1, background: LA.bg, opacity: 0.7,
        }}/>
      ))}
    </div>
  );
}

// ─────────── Rank badge ───────────
function RankBadge({ rank = 'E', size = 36, glow = false }) {
  const c = RANK[rank];
  return (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: c, color: LA.bg,
      display: 'grid', placeItems: 'center',
      fontFamily: "'Orbitron', sans-serif", fontWeight: 700,
      fontSize: size * 0.5, lineHeight: 1,
      border: `1px solid ${c}`,
      boxShadow: glow ? `0 0 0 1px ${c}55, 0 0 ${size/2}px ${c}80` : 'none',
      flexShrink: 0,
      position: 'relative',
    }}>{rank}</div>
  );
}

// ─────────── Stat tile ───────────
function StatTile({ label, value, unit, color = LA.fg, icon, accent }) {
  return (
    <div style={{
      background: LA.card,
      border: `1px solid ${LA.border}`,
      borderRadius: 8, padding: 14,
      display: 'flex', flexDirection: 'column', gap: 4,
      position: 'relative', overflow: 'hidden',
    }}>
      {accent && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: accent,
          boxShadow: `0 0 12px ${accent}80`,
        }}/>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SysLabel color={LA.fgMuted} style={{ fontSize: 9 }}>{label}</SysLabel>
        {icon && <Icon name={icon} size={14} color={LA.fgMuted}/>}
      </div>
      <div style={{
        fontFamily: "'Orbitron', sans-serif", fontWeight: 700,
        fontSize: 24, color, lineHeight: 1.05, marginTop: 2,
      }}>{value}</div>
      {unit && <div style={{
        fontFamily: "'Inter', sans-serif", fontSize: 11, color: LA.fgMuted, marginTop: 2,
      }}>{unit}</div>}
    </div>
  );
}

// ─────────── Scanlines decoration ───────────
function Scanlines({ opacity = 0.04, style }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,${opacity}) 2px, rgba(255,255,255,${opacity}) 3px)`,
      ...style,
    }}/>
  );
}

// ─────────── Hex grid background decoration ───────────
function HexGridBg({ color = LA.primary, opacity = 0.06 }) {
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity }} aria-hidden>
      <defs>
        <pattern id="hex-grid" width="28" height="32" patternUnits="userSpaceOnUse" patternTransform="scale(1)">
          <path d="M14 0 L28 8 L28 24 L14 32 L0 24 L0 8 Z" fill="none" stroke={color} strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex-grid)"/>
    </svg>
  );
}

Object.assign(window, {
  LA, RANK, RANK_SEQ, Icon, SysLabel, SysBrackets,
  LAButton, LAPanel, ProgressBar, RankBadge, StatTile, Scanlines, HexGridBg,
});
