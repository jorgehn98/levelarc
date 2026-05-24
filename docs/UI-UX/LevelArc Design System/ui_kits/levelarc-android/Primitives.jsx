// LevelArc — shared UI primitives. Theme-coupled, no external icon deps.
// Lucide-style line icons inlined.

const LA_COLORS = {
  bg: '#0A0A0F',
  surface: '#13131C',
  card: '#1C1C28',
  border: '#2A2A3A',
  fg: '#E8E0C9',
  fgMuted: '#5A5A6E',
  primary: '#3FCAE6',
  primaryGlow: '#7EE0F2',
  primaryPressed: '#27A5C2',
  success: '#3DD68C',
  danger: '#FF6B6B',
  streak: '#FFA94D',
};
const RANK_COLORS = {
  E: '#7A7A8C',
  D: '#4DB8C4',
  C: '#4D8BE0',
  B: '#9B6BE0',
  A: '#E84855',
  S: '#F5C542',
};

// ───────── Icon ─────────
function Icon({ name, size = 22, color = 'currentColor', stroke = 1.75, style }) {
  const p = {
    fill: 'none', stroke: color, strokeWidth: stroke,
    strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  const paths = {
    home: <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...p}/>,
    swords: (<g {...p}><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M5 14l9 9"/><path d="M19 21l2-2"/><path d="m9.5 14.5 4-4"/></g>),
    chart: (<g {...p}><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/></g>),
    system: (<g {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></g>),
    plus: <path d="M12 5v14M5 12h14" {...p}/>,
    check: <path d="M20 6 9 17l-5-5" {...p}/>,
    x: <path d="M18 6 6 18M6 6l12 12" {...p}/>,
    flame: <path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c1.5 0 3-1.5 3-3 0-2-3-4-3-7 0 2-3 4-3 7a4 4 0 1 0 8 0c0-2-3-3-3-5" {...p}/>,
    target: (<g {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></g>),
    archive: (<g {...p}><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/></g>),
    chevron: <path d="m9 18 6-6-6-6" {...p}/>,
    back: <path d="m15 18-6-6 6-6" {...p}/>,
    book: (<g {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></g>),
    bell: (<g {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/></g>),
    settings: <Icon name="system" size={size} stroke={stroke} color={color}/>,
    dumbbell: (<g {...p}><path d="M6.5 6.5h11v11h-11z" transform="rotate(45 12 12)"/><path d="M3 11v2M21 11v2M5 9v6M19 9v6"/></g>),
    droplet: <path d="M12 3s7 7 7 12a7 7 0 1 1-14 0c0-5 7-12 7-12z" {...p}/>,
    moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" {...p}/>,
    chevronRight: <path d="m9 18 6-6-6-6" {...p}/>,
    sparkle: (<g {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></g>),
    trophy: (<g {...p}><path d="M6 9H4a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1h3"/><path d="M18 9h2a2 2 0 0 0 2-2V5a1 1 0 0 0-1-1h-3"/><path d="M6 4h12v6a6 6 0 0 1-12 0z"/><path d="M9 22h6M12 18v4"/></g>),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>{paths[name] || null}</svg>
  );
}

// ───────── System label / brackets ─────────
function SystemLabel({ children, color = LA_COLORS.primary, style }) {
  return (
    <div style={{
      fontFamily: "'Orbitron', sans-serif", fontWeight: 500, fontSize: 11,
      letterSpacing: '0.08em', textTransform: 'uppercase', color,
      ...style,
    }}>{children}</div>
  );
}

// ───────── Button ─────────
function LAButton({ variant = 'primary', children, onClick, disabled, full, icon, style }) {
  const base = {
    height: 44, borderRadius: 8, border: '1px solid transparent',
    fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 14,
    padding: icon && !children ? 0 : '0 18px',
    width: full ? '100%' : (icon && !children ? 44 : undefined),
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'background 120ms cubic-bezier(.2,.7,.2,1), transform 120ms cubic-bezier(.2,.7,.2,1)',
    userSelect: 'none', WebkitTapHighlightColor: 'transparent',
  };
  const variants = {
    primary: { background: LA_COLORS.primary, color: LA_COLORS.bg },
    secondary: { background: LA_COLORS.card, color: LA_COLORS.fg, borderColor: LA_COLORS.border },
    danger: { background: LA_COLORS.card, color: LA_COLORS.danger, borderColor: LA_COLORS.danger },
    success: { background: LA_COLORS.card, color: LA_COLORS.success, borderColor: LA_COLORS.success },
    ghost: { background: 'transparent', color: LA_COLORS.primary },
    icon: { background: LA_COLORS.card, color: LA_COLORS.fg, borderColor: LA_COLORS.border, width: 44 },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
      onMouseUp={e => e.currentTarget.style.transform = ''}
      onMouseLeave={e => e.currentTarget.style.transform = ''}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {icon && <Icon name={icon} size={18}/>}
      {children}
    </button>
  );
}

// ───────── Panel ─────────
function LAPanel({ children, glow = false, color, style }) {
  return (
    <div style={{
      background: LA_COLORS.surface,
      border: `1px solid ${glow ? (color || LA_COLORS.primary) : LA_COLORS.border}`,
      borderRadius: 8,
      padding: 16,
      boxShadow: glow ? `0 0 0 1px ${color || LA_COLORS.primary}55, 0 0 24px ${color || LA_COLORS.primary}30` : 'none',
      ...style,
    }}>{children}</div>
  );
}

// ───────── Progress bar ─────────
function ProgressBar({ value = 0, color = LA_COLORS.primary, height = 8, withGlow = false }) {
  const w = Math.max(0, Math.min(100, value));
  return (
    <div style={{ height, background: LA_COLORS.card, borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        width: `${w}%`, height: '100%', background: color,
        borderRadius: 4,
        boxShadow: withGlow ? `0 0 12px ${color}80` : 'none',
        transition: 'width 400ms cubic-bezier(.2,.7,.2,1)',
      }}/>
    </div>
  );
}

// ───────── Rank badge ─────────
function RankBadge({ rank = 'E', size = 36 }) {
  const c = RANK_COLORS[rank];
  return (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: c, color: LA_COLORS.bg,
      display: 'grid', placeItems: 'center',
      fontFamily: "'Orbitron', sans-serif", fontWeight: 700,
      fontSize: size * 0.5, lineHeight: 1,
      border: `1px solid ${c}`,
    }}>{rank}</div>
  );
}

Object.assign(window, {
  LA_COLORS, RANK_COLORS, Icon, SystemLabel, LAButton, LAPanel, ProgressBar, RankBadge,
});
