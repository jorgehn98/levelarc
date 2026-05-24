// LevelArc — player header (HUD) and bottom navigation.
// Redesigned: stronger HUD feel, center FAB, active tab "slot" indicator.

function PlayerHUD({ player, t, compact = false }) {
  const c = RANK[player.rank];
  const pct = (player.xp / player.xpMax) * 100;

  return (
    <div style={{
      padding: compact ? '14px 20px 16px' : '18px 20px 20px',
      background: `linear-gradient(180deg, ${LA.surface} 0%, ${LA.bg} 100%)`,
      borderBottom: `1px solid ${LA.border}`,
      position: 'relative', overflow: 'hidden',
    }}>
      <HexGridBg color={LA.primary} opacity={0.04}/>
      {/* Top frame line */}
      <div style={{
        position: 'absolute', top: 0, left: 20, right: 20, height: 1,
        background: `linear-gradient(90deg, transparent, ${LA.primary}, transparent)`,
        opacity: 0.5,
      }}/>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Rank badge — left */}
        <div style={{ position: 'relative' }}>
          <RankBadge rank={player.rank} size={52} glow/>
          {/* corner ticks */}
          {[[-3, -3], [55, -3], [-3, 55], [55, 55]].map(([x, y], i) => (
            <div key={i} style={{
              position: 'absolute', left: x, top: y, width: 6, height: 6,
              borderTop: i < 2 ? `1.5px solid ${c}` : 'none',
              borderBottom: i >= 2 ? `1.5px solid ${c}` : 'none',
              borderLeft: i % 2 === 0 ? `1.5px solid ${c}` : 'none',
              borderRight: i % 2 === 1 ? `1.5px solid ${c}` : 'none',
            }}/>
          ))}
        </div>

        {/* Player identity + XP */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ minWidth: 0 }}>
              <SysLabel color={LA.primary} style={{ fontSize: 9, letterSpacing: '0.16em' }}>
                ◆ {t.systemOnline}
              </SysLabel>
              <div style={{
                fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 18,
                color: LA.fg, lineHeight: 1.1, marginTop: 3,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{player.name}</div>
            </div>
            {/* streak chip */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', borderRadius: 4,
              background: `${LA.streak}14`,
              border: `1px solid ${LA.streak}55`,
              color: LA.streak,
            }}>
              <Icon name="flame" size={12} color={LA.streak}/>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 11 }}>{player.streak}</span>
            </div>
          </div>

          {/* XP row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <ProgressBar value={pct} color={c} withGlow height={6}/>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontFamily: "'Orbitron', sans-serif", fontSize: 9.5,
              letterSpacing: '0.1em', color: LA.fgMuted, textTransform: 'uppercase',
            }}>
              <span>{t.level} {player.level} · {t.rank} {player.rank}</span>
              <span style={{ color: LA.fgDim }}>{player.xp} / {player.xpMax} XP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────── Bottom navigation ───────────
function TabBar({ active, onChange, t }) {
  const tabs = [
    { id: 'home',     label: t.today,    icon: 'target' },
    { id: 'habits',   label: t.habits,   icon: 'swords' },
    { id: 'progress', label: t.progress, icon: 'chart' },
    { id: 'settings', label: t.settings, icon: 'settings' },
  ];

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {/* top hairline */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: LA.border,
      }}/>

      <div style={{
        background: LA.surface,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        position: 'relative',
        paddingBottom: 4,
      }}>
        {tabs.map(tab => (
          <NavTab key={tab.id} tab={tab} active={active === tab.id} onClick={() => onChange(tab.id)}/>
        ))}
      </div>
    </div>
  );
}

function NavTab({ tab, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent', border: 'none',
        padding: '12px 0 10px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        color: active ? LA.primary : LA.fgMuted,
        cursor: 'pointer', position: 'relative',
        WebkitTapHighlightColor: 'transparent',
        transition: 'color 160ms cubic-bezier(.2,.7,.2,1)',
      }}
    >
      {/* active top indicator */}
      <div style={{
        position: 'absolute', top: 0, left: '30%', right: '30%', height: 2,
        background: active ? LA.primary : 'transparent',
        boxShadow: active ? `0 0 12px ${LA.primary}` : 'none',
        transition: 'all 200ms cubic-bezier(.2,.7,.2,1)',
      }}/>
      <div style={{
        filter: active ? `drop-shadow(0 0 6px ${LA.primary}aa)` : 'none',
        transition: 'filter 200ms',
      }}>
        <Icon name={tab.icon} size={20}/>
      </div>
      <span style={{
        fontFamily: "'Orbitron', sans-serif", fontWeight: active ? 600 : 500,
        fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>{tab.label}</span>
    </button>
  );
}

// ─────────── Screen header (for inner screens like New habit) ───────────
function ScreenHeader({ title, subtitle, onBack, action, t }) {
  return (
    <div style={{
      padding: '16px 20px 16px',
      background: LA.bg,
      borderBottom: `1px solid ${LA.border}`,
      display: 'flex', alignItems: 'center', gap: 12,
      position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent 10%, ${LA.primary}66, transparent 90%)`,
      }}/>
      {onBack && (
        <button onClick={onBack} aria-label="back" style={{
          width: 40, height: 40, display: 'grid', placeItems: 'center',
          background: LA.card, border: `1px solid ${LA.border}`,
          borderRadius: 8, color: LA.fg, cursor: 'pointer',
        }}>
          <Icon name="back" size={18}/>
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <SysLabel color={LA.primary} style={{ fontSize: 9, letterSpacing: '0.16em' }}>◆ {subtitle}</SysLabel>
        <h1 style={{
          margin: '4px 0 0', fontFamily: "'Orbitron', sans-serif", fontWeight: 700,
          fontSize: 22, color: LA.fg, lineHeight: 1.1,
        }}>{title}</h1>
      </div>
      {action}
    </div>
  );
}

Object.assign(window, { PlayerHUD, TabBar, ScreenHeader });
