// LevelArc — Onboarding / Pantalla de entrada.
// Modo "first": input para nombre + "Iniciar ascensión".
// Modo "return": identidad + rango actual con tematización por rango + "Continuar ascensión".

function OnboardingScreen({ mode = 'first', player, onActivate, t }) {
  const isFirst = mode === 'first';
  const accent = isFirst ? LA.primary : RANK[player.rank];
  const [name, setName] = React.useState(isFirst ? '' : (player.name || ''));
  const [activating, setActivating] = React.useState(false);

  const valid = name.trim().length >= 2;

  const handleActivate = () => {
    if (isFirst && !valid) return;
    setActivating(true);
    setTimeout(() => onActivate && onActivate({ name: name.trim() || player.name }), 480);
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex', flexDirection: 'column',
      background: `radial-gradient(ellipse at 50% 28%, ${accent}1f 0%, transparent 58%), ${LA.bg}`,
      position: 'relative', overflow: 'hidden',
      transition: 'background 360ms cubic-bezier(.2,.7,.2,1)',
    }}>
      <HexGridBg color={accent} opacity={0.07}/>
      <Scanlines opacity={0.02}/>

      {/* corner ticks */}
      {['tl', 'tr', 'bl', 'br'].map(pos => {
        const off = 16;
        const map = { tl: { top: off, left: off }, tr: { top: off, right: off }, bl: { bottom: off, left: off }, br: { bottom: off, right: off } };
        const borders = {
          tl: { borderTop: `1px solid ${accent}`, borderLeft: `1px solid ${accent}` },
          tr: { borderTop: `1px solid ${accent}`, borderRight: `1px solid ${accent}` },
          bl: { borderBottom: `1px solid ${accent}`, borderLeft: `1px solid ${accent}` },
          br: { borderBottom: `1px solid ${accent}`, borderRight: `1px solid ${accent}` },
        };
        return <div key={pos} style={{ position: 'absolute', ...map[pos], width: 22, height: 22, ...borders[pos], opacity: 0.55, pointerEvents: 'none', transition: 'border-color 360ms cubic-bezier(.2,.7,.2,1)' }}/>;
      })}

      <style>{`
        @keyframes la-pulse-ring {
          0% { transform: scale(0.95); opacity: 0.7; }
          80% { transform: scale(1.18); opacity: 0; }
          100% { transform: scale(1.18); opacity: 0; }
        }
        @keyframes la-logo-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes la-flicker-in {
          0%, 60%, 70%, 100% { opacity: 1; }
          65% { opacity: 0.4; }
        }
        @keyframes la-onb-rise {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        flex: 1, padding: isFirst ? '44px 28px 24px' : '36px 28px 16px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
        gap: isFirst ? 18 : 14, position: 'relative',
      }}>
        {/* Logo with pulse rings */}
        <div style={{ position: 'relative', width: isFirst ? 180 : 156, height: isFirst ? 180 : 156, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <div style={{
            position: 'absolute', width: '98%', height: '98%', borderRadius: '50%',
            border: `1px dashed ${accent}55`,
            animation: 'la-logo-spin 28s linear infinite',
          }}/>
          <div style={{
            position: 'absolute', width: '86%', height: '86%', borderRadius: '50%',
            border: `1px solid ${accent}33`,
          }}/>
          {[0, 1].map(i => (
            <div key={i} style={{
              position: 'absolute', width: '86%', height: '86%', borderRadius: '50%',
              border: `1px solid ${accent}`,
              animation: `la-pulse-ring 3s cubic-bezier(.2,.7,.2,1) ${i * 1.5}s infinite`,
            }}/>
          ))}
          <img
            src="assets/logo-detailed.svg" alt="LevelArc"
            style={{
              width: isFirst ? 124 : 108, height: isFirst ? 124 : 108,
              filter: `drop-shadow(0 0 14px ${accent}88)`,
              transition: 'filter 360ms cubic-bezier(.2,.7,.2,1)',
            }}
          />
        </div>

        {/* Wordmark */}
        <div style={{
          fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: isFirst ? 30 : 26,
          letterSpacing: '0.08em', color: LA.fg,
          animation: 'la-flicker-in 1.6s ease 0.2s both',
        }}>LEVEL<span style={{ color: accent, transition: 'color 360ms cubic-bezier(.2,.7,.2,1)' }}>ARC</span></div>

        <SysLabel color={accent} style={{
          fontSize: 11, marginTop: -2,
        }}>
          [ {isFirst ? t.systemActivated.toUpperCase() : 'SISTEMA · EN LÍNEA'} ]
        </SysLabel>

        {isFirst ? (
          <FirstTimeFlow name={name} setName={setName} t={t}/>
        ) : (
          <ReturnFlow player={player} accent={accent} t={t}/>
        )}
      </div>

      {/* CTA */}
      <div style={{
        padding: '0 24px 26px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        position: 'relative', zIndex: 1,
      }}>
        <LAButton
          variant="primary" full
          onClick={handleActivate}
          disabled={activating || (isFirst && !valid)}
          iconRight={activating ? null : 'chevronRight'}
          style={{
            maxWidth: 320,
            background: accent,
            color: LA.bg,
            boxShadow: `0 0 0 1px ${accent}, 0 0 18px ${accent}55`,
          }}
        >
          {activating ? 'Inicializando…' : isFirst ? t.beginAscension : 'Continuar ascensión'}
        </LAButton>
        <div style={{
          fontFamily: "'Orbitron', sans-serif", fontSize: 9.5, letterSpacing: '0.14em',
          color: LA.fgMuted, textTransform: 'uppercase',
        }}>◇ {t.privacyLine} ◇</div>
      </div>
    </div>
  );
}

// ── First-time flow: name input + intro copy
function FirstTimeFlow({ name, setName, t }) {
  return (
    <div style={{
      width: '100%', maxWidth: 320,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
    }}>
      <p style={{
        fontFamily: "'Inter', sans-serif", fontSize: 14, lineHeight: '20px',
        color: LA.fgDim, textAlign: 'center', margin: 0,
        textWrap: 'pretty',
      }}>{t.onboardingBody}</p>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SysLabel color={LA.fgMuted} style={{ fontSize: 10 }}>◇ NOMBRE DEL JUGADOR</SysLabel>
        <div style={{ position: 'relative' }}>
          <input
            value={name}
            onChange={e => setName(e.target.value.slice(0, 24))}
            placeholder="Tu nombre…"
            maxLength={24}
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              background: LA.card,
              border: `1px solid ${name ? LA.primary : LA.border}`,
              boxShadow: name ? `0 0 0 1px ${LA.primary}55, 0 0 14px ${LA.primary}25` : 'none',
              borderRadius: 8, height: 48,
              padding: '0 14px',
              fontFamily: "'Orbitron', sans-serif", fontWeight: 600, fontSize: 16, letterSpacing: '0.04em',
              color: LA.fg, outline: 'none',
              transition: 'all 200ms cubic-bezier(.2,.7,.2,1)',
            }}
          />
          {/* corner ticks on input */}
          {['tl', 'tr', 'bl', 'br'].map(pos => {
            const m = { tl: { top: -4, left: -4 }, tr: { top: -4, right: -4 }, bl: { bottom: -4, left: -4 }, br: { bottom: -4, right: -4 } }[pos];
            const c = name ? LA.primary : LA.border;
            const b = {
              tl: { borderTop: `1.5px solid ${c}`, borderLeft: `1.5px solid ${c}` },
              tr: { borderTop: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}` },
              bl: { borderBottom: `1.5px solid ${c}`, borderLeft: `1.5px solid ${c}` },
              br: { borderBottom: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}` },
            }[pos];
            return <div key={pos} style={{ position: 'absolute', ...m, width: 8, height: 8, ...b, pointerEvents: 'none', transition: 'border-color 160ms ease' }}/>;
          })}
        </div>
        <div style={{
          fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: LA.fgMuted,
          textAlign: 'center', marginTop: 2,
        }}>
          Así te llamará el Sistema. Puedes cambiarlo en Ajustes.
        </div>
      </div>

      {/* Starting identity preview */}
      <div style={{
        width: '100%',
        padding: 12, background: LA.surface,
        border: `1px solid ${LA.border}`, borderRadius: 8,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <RankBadge rank="E" size={40} glow/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <SysLabel color={LA.fgMuted} style={{ fontSize: 9 }}>◇ IDENTIDAD INICIAL</SysLabel>
          <div style={{
            fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 14, color: LA.fg, marginTop: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{name.trim() || 'JUGADOR · SIN NOMBRE'}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: LA.fgMuted, marginTop: 2 }}>
            Rango E · Nivel 1 · 0 XP
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Return flow: identity + rank + level + xp bar
function ReturnFlow({ player, accent, t }) {
  const pct = (player.xp / player.xpMax) * 100;
  const rankSeq = ['E', 'D', 'C', 'B', 'A', 'S'];
  const idx = rankSeq.indexOf(player.rank);
  const nextRank = rankSeq[Math.min(rankSeq.length - 1, idx + 1)];
  const isMax = player.rank === 'S';

  return (
    <div style={{
      width: '100%', maxWidth: 320,
      display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 14,
    }}>
      {/* Player name */}
      <div style={{ textAlign: 'center' }}>
        <SysLabel color={LA.fgMuted} style={{ fontSize: 10 }}>◇ BIENVENIDO DE VUELTA, JUGADOR</SysLabel>
        <div style={{
          marginTop: 6,
          fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 22, color: LA.fg,
          letterSpacing: '0.04em',
          textShadow: `0 0 14px ${accent}55`,
        }}>{player.name.toUpperCase()}</div>
      </div>

      {/* Identity panel — themed by rank */}
      <div style={{
        background: `linear-gradient(180deg, ${LA.surface}, ${LA.bg})`,
        border: `1px solid ${accent}55`,
        borderRadius: 8, padding: 14,
        boxShadow: `0 0 0 1px ${accent}22, 0 0 22px ${accent}1a`,
        position: 'relative', overflow: 'hidden',
      }}>
        <HexGridBg color={accent} opacity={0.05}/>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <RankBadge rank={player.rank} size={56} glow/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SysLabel color={accent} style={{ fontSize: 9 }}>◆ RANGO ACTUAL</SysLabel>
            <div style={{
              fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 24, color: LA.fg,
              marginTop: 2, lineHeight: 1, letterSpacing: '0.02em',
            }}>RANGO {player.rank}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: LA.fgDim, marginTop: 4 }}>
              Nivel {player.level} · {player.totalXp.toLocaleString()} XP totales
            </div>
          </div>
        </div>

        {/* XP bar */}
        <div style={{ position: 'relative', marginTop: 12 }}>
          <ProgressBar value={pct} color={accent} withGlow height={6}/>
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 6,
            fontFamily: "'Orbitron', sans-serif", fontSize: 9.5, color: LA.fgMuted,
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            <span>{player.xp} / {player.xpMax} XP</span>
            <span style={{ color: isMax ? accent : LA.fgMuted }}>
              {isMax ? '◆ RANGO MÁXIMO' : `→ RANGO ${nextRank}`}
            </span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
      }}>
        <MiniStat icon="flame" label="RACHA" value={player.streak} unit="días" color={LA.streak}/>
        <MiniStat icon="swords" label="ACTIVOS" value={player.habitCount} unit="misiones" color={accent}/>
        <MiniStat icon="trophy" label="NIVEL" value={player.level} unit={`Rango ${player.rank}`} color={accent}/>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, unit, color }) {
  return (
    <div style={{
      background: LA.card, border: `1px solid ${LA.border}`, borderRadius: 6,
      padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Icon name={icon} size={11} color={color}/>
        <SysLabel color={LA.fgMuted} style={{ fontSize: 8.5, letterSpacing: '0.1em' }}>{label}</SysLabel>
      </div>
      <div style={{
        fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 18, color,
        lineHeight: 1.05,
      }}>{value}</div>
      <div style={{
        fontFamily: "'Inter', sans-serif", fontSize: 10, color: LA.fgMuted,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{unit}</div>
    </div>
  );
}

Object.assign(window, { OnboardingScreen });
