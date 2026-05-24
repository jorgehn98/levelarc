// LevelArc — header with player identity, level, XP bar, rank.

function PlayerHeader({ name = 'Jugador', level = 12, rank = 'D', xp = 240, xpMax = 600, streak = 7 }) {
  const c = RANK_COLORS[rank];
  const pct = (xp / xpMax) * 100;
  return (
    <div style={{
      padding: '16px 20px 20px',
      background: LA_COLORS.bg,
      borderBottom: `1px solid ${LA_COLORS.border}`,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Top row — prominent logo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src="../../assets/logo-detailed.svg"
            width="44" height="44" alt=""
            style={{ display: 'block', filter: 'drop-shadow(0 0 10px rgba(63,202,230,0.35))' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{
              fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 16,
              letterSpacing: '0.06em', color: LA_COLORS.fg, lineHeight: 1,
            }}>LEVEL<span style={{ color: LA_COLORS.primary }}>ARC</span></div>
            <SystemLabel style={{ fontSize: 10, letterSpacing: '0.1em' }}>SISTEMA · NIVEL {level}</SystemLabel>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: LA_COLORS.streak }}>
          <Icon name="flame" size={16} color={LA_COLORS.streak}/>
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 500, fontSize: 12, letterSpacing: '0.04em' }}>{streak}</span>
        </div>
      </div>

      {/* Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <RankBadge rank={rank} size={48}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 22,
            color: LA_COLORS.fg, lineHeight: 1.1,
          }}>{name}</div>
          <div style={{
            fontFamily: "'Inter', sans-serif", fontSize: 13,
            color: LA_COLORS.fgMuted, marginTop: 4,
          }}>Rango {rank} · {xp} / {xpMax} XP</div>
        </div>
      </div>

      {/* XP bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <ProgressBar value={pct} color={c} withGlow/>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontFamily: "'Orbitron', sans-serif", fontSize: 10,
          letterSpacing: '0.06em', color: LA_COLORS.fgMuted, textTransform: 'uppercase',
        }}>
          <span>XP · Rango {rank}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      </div>
    </div>
  );
}

function TabBar({ active, onChange }) {
  const tabs = [
    { id: 'home', label: 'Hoy', icon: 'home' },
    { id: 'habits', label: 'Hábitos', icon: 'swords' },
    { id: 'stats', label: 'Stats', icon: 'chart' },
    { id: 'system', label: 'Sistema', icon: 'system' },
  ];
  return (
    <div style={{
      background: LA_COLORS.surface,
      borderTop: `1px solid ${LA_COLORS.border}`,
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    }}>
      {tabs.map(t => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              background: 'transparent', border: 'none',
              padding: '10px 0 12px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              color: isActive ? LA_COLORS.primary : LA_COLORS.fgMuted,
              cursor: 'pointer', position: 'relative',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Icon name={t.icon} size={22}/>
            <span style={{
              fontFamily: "'Orbitron', sans-serif", fontWeight: 500,
              fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>{t.label}</span>
            {isActive && (
              <div style={{
                position: 'absolute', top: 0, left: '25%', right: '25%', height: 2,
                background: LA_COLORS.primary,
                boxShadow: `0 0 12px ${LA_COLORS.primary}b3`,
              }}/>
            )}
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, { PlayerHeader, TabBar });
