// LevelArc — main screens.

// ────────────── HomeScreen / Hoy ──────────────
function HomeScreen({ player, habits, onComplete, onFail, onOpenAdd }) {
  const today = habits.filter(h => h.state === 'pending').length;
  const total = habits.length;
  const done  = habits.filter(h => h.state === 'completed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <PlayerHeader {...player}/>

      <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1, overflowY: 'auto' }}>
        {/* System message */}
        <LAPanel glow style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{
              color: LA_COLORS.primary, fontFamily: "'Orbitron', sans-serif",
              fontWeight: 700, fontSize: 14, lineHeight: 1, marginTop: 2,
            }}>[ ]</div>
            <div style={{ flex: 1 }}>
              <SystemLabel style={{ fontSize: 10 }}>SISTEMA · MISIÓN DIARIA</SystemLabel>
              <div style={{
                fontFamily: "'Inter', sans-serif", fontSize: 14, color: LA_COLORS.fg,
                marginTop: 4, lineHeight: '20px',
              }}>
                Completa {today} hábito{today !== 1 ? 's' : ''} para mantener tu racha.
              </div>
            </div>
          </div>
        </LAPanel>

        {/* Section header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
          <SystemLabel color={LA_COLORS.fg}>HÁBITOS · HOY</SystemLabel>
          <span style={{
            fontFamily: "'Orbitron', sans-serif", fontSize: 11,
            color: LA_COLORS.fgMuted, letterSpacing: '0.04em',
          }}>{done} / {total}</span>
        </div>

        {/* Habit list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {habits.map(h => (
            <HabitCard key={h.id} habit={h} onComplete={onComplete} onFail={onFail}/>
          ))}
        </div>

        {/* Add habit CTA */}
        <button
          onClick={onOpenAdd}
          style={{
            marginTop: 4,
            background: 'transparent',
            border: `1px dashed ${LA_COLORS.border}`,
            color: LA_COLORS.fgMuted,
            borderRadius: 8,
            padding: '14px',
            fontFamily: "'Inter', sans-serif", fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: 'pointer',
          }}
        >
          <Icon name="plus" size={16}/>
          Nuevo hábito
        </button>
      </div>
    </div>
  );
}

// ────────────── HabitsScreen ──────────────
function HabitsScreen({ habits, onOpenAdd }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ScreenHeader title="Hábitos" subtitle="Misiones registradas" action={
        <button onClick={onOpenAdd} aria-label="add" style={iconBtnStyle}>
          <Icon name="plus" size={18}/>
        </button>
      }/>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', flex: 1 }}>
        <SystemLabel color={LA_COLORS.fgMuted}>ACTIVOS · {habits.length}</SystemLabel>
        {habits.map(h => (
          <div key={h.id} style={{
            background: LA_COLORS.card,
            border: `1px solid ${LA_COLORS.border}`,
            borderRadius: 8, padding: 14,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: LA_COLORS.surface, border: `1px solid ${LA_COLORS.border}`,
              display: 'grid', placeItems: 'center', color: LA_COLORS.primary, flexShrink: 0,
            }}>
              <Icon name={h.icon || 'target'} size={18}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 15, color: LA_COLORS.fg }}>{h.name}</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: LA_COLORS.fgMuted, marginTop: 2 }}>
                {h.type} · +{h.xp} XP · racha {h.streak}
              </div>
            </div>
            <Icon name="chevronRight" size={18} color={LA_COLORS.fgMuted}/>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────── AddHabitScreen ──────────────
function AddHabitScreen({ onClose, onCreate }) {
  const [name, setName] = React.useState('');
  const [type, setType] = React.useState('Diario');
  const [importance, setImportance] = React.useState(2);
  const [icon, setIcon] = React.useState('target');

  const icons = ['target', 'book', 'flame', 'dumbbell', 'droplet', 'moon'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ScreenHeader
        title="Nuevo hábito"
        subtitle="Registra una nueva misión"
        back={onClose}
      />
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18, flex: 1, overflowY: 'auto' }}>
        {/* Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SystemLabel color={LA_COLORS.fgMuted}>NOMBRE</SystemLabel>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Meditar 10 minutos"
            style={{
              background: LA_COLORS.card,
              border: `1px solid ${name ? LA_COLORS.primary : LA_COLORS.border}`,
              boxShadow: name ? `0 0 0 1px ${LA_COLORS.primary}55, 0 0 16px ${LA_COLORS.primary}25` : 'none',
              borderRadius: 8, height: 44, padding: '0 14px',
              fontFamily: "'Inter', sans-serif", fontSize: 15,
              color: LA_COLORS.fg, outline: 'none',
            }}
          />
        </div>

        {/* Type */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SystemLabel color={LA_COLORS.fgMuted}>FRECUENCIA</SystemLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {['Diario', 'Semanal', 'Mensual'].map(t => (
              <button key={t} onClick={() => setType(t)} style={{
                background: type === t ? LA_COLORS.primary : LA_COLORS.card,
                color: type === t ? LA_COLORS.bg : LA_COLORS.fg,
                border: `1px solid ${type === t ? LA_COLORS.primary : LA_COLORS.border}`,
                borderRadius: 8, height: 44,
                fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 13,
                cursor: 'pointer',
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Importance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SystemLabel color={LA_COLORS.fgMuted}>IMPORTANCIA · +{importance * 15} XP</SystemLabel>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3].map(n => (
              <button key={n} onClick={() => setImportance(n)} style={{
                flex: 1, height: 44,
                background: importance >= n ? LA_COLORS.primary : LA_COLORS.card,
                color: importance >= n ? LA_COLORS.bg : LA_COLORS.fgMuted,
                border: `1px solid ${importance >= n ? LA_COLORS.primary : LA_COLORS.border}`,
                borderRadius: 8,
                fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 14,
                cursor: 'pointer',
              }}>{n}</button>
            ))}
          </div>
        </div>

        {/* Icon */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SystemLabel color={LA_COLORS.fgMuted}>ICONO</SystemLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {icons.map(ic => (
              <button key={ic} onClick={() => setIcon(ic)} style={{
                aspectRatio: '1', display: 'grid', placeItems: 'center',
                background: LA_COLORS.card,
                border: `1px solid ${icon === ic ? LA_COLORS.primary : LA_COLORS.border}`,
                boxShadow: icon === ic ? `0 0 0 1px ${LA_COLORS.primary}55, 0 0 12px ${LA_COLORS.primary}30` : 'none',
                borderRadius: 8,
                color: icon === ic ? LA_COLORS.primary : LA_COLORS.fg,
                cursor: 'pointer',
              }}>
                <Icon name={ic} size={20}/>
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }}/>

        <LAButton
          variant="primary" full
          disabled={!name.trim()}
          onClick={() => onCreate({ name, type, importance, icon })}
        >
          Registrar misión
        </LAButton>
      </div>
    </div>
  );
}

// ────────────── StatsScreen ──────────────
function StatsScreen({ player, habits }) {
  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const values = [3, 5, 2, 6, 4, 5, 4];
  const maxV = Math.max(...values);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ScreenHeader title="Stats" subtitle="Tu progreso semanal"/>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18, flex: 1, overflowY: 'auto' }}>
        {/* Summary panels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <SummaryStat label="RACHA" value={player.streak} unit="días" color={LA_COLORS.streak}/>
          <SummaryStat label="NIVEL" value={player.level} unit={`rango ${player.rank}`} color={RANK_COLORS[player.rank]}/>
          <SummaryStat label="HÁBITOS" value={habits.length} unit="activos" color={LA_COLORS.primary}/>
          <SummaryStat label="XP TOTAL" value="3 240" unit="acumulado" color={LA_COLORS.fg}/>
        </div>

        {/* Weekly chart */}
        <LAPanel>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <SystemLabel>SEMANA · COMPLETADOS</SystemLabel>
            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: LA_COLORS.fgMuted }}>29 / 42</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, height: 140, alignItems: 'end' }}>
            {values.map((v, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{
                    width: '100%', height: `${(v / maxV) * 100}%`,
                    background: i === 5 ? LA_COLORS.primary : LA_COLORS.primaryPressed,
                    borderRadius: 4,
                    boxShadow: i === 5 ? `0 0 10px ${LA_COLORS.primary}80` : 'none',
                  }}/>
                </div>
                <span style={{
                  fontFamily: "'Orbitron', sans-serif", fontSize: 10,
                  color: i === 5 ? LA_COLORS.primary : LA_COLORS.fgMuted,
                  letterSpacing: '0.06em',
                }}>{days[i]}</span>
              </div>
            ))}
          </div>
        </LAPanel>

        {/* Rank progress */}
        <LAPanel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <RankBadge rank={player.rank} size={36}/>
            <div style={{ flex: 1 }}>
              <SystemLabel>RANGO · {player.rank}</SystemLabel>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: LA_COLORS.fgMuted, marginTop: 2 }}>
                {player.xp} / {player.xpMax} XP hasta rango C
              </div>
            </div>
          </div>
          <ProgressBar value={(player.xp / player.xpMax) * 100} color={RANK_COLORS[player.rank]} withGlow/>
        </LAPanel>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, unit, color }) {
  return (
    <div style={{
      background: LA_COLORS.card,
      border: `1px solid ${LA_COLORS.border}`,
      borderRadius: 8, padding: 12,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <SystemLabel color={LA_COLORS.fgMuted} style={{ fontSize: 9, letterSpacing: '0.1em' }}>{label}</SystemLabel>
      <div style={{
        fontFamily: "'Orbitron', sans-serif", fontWeight: 700,
        fontSize: 22, color, lineHeight: 1.1,
      }}>{value}</div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: LA_COLORS.fgMuted }}>{unit}</div>
    </div>
  );
}

// ────────────── SystemScreen ──────────────
function SystemScreen({ player, onRankUpDemo }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ScreenHeader title="Sistema" subtitle="Notificaciones del Sistema"/>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto' }}>
        <SystemMessage variant="primary" head="SISTEMA · NOTIFICACIÓN" body="Misión diaria registrada. +25 XP otorgados." time="hace 4 min"/>
        <SystemMessage variant="primary" head="SISTEMA · RACHA" body={`Racha de ${player.streak} días mantenida.`} time="hoy · 09:12"/>
        <SystemMessage variant="warn" head="SISTEMA · ALERTA" body="Racha en riesgo. Quedan 2 hábitos por completar hoy." time="hoy · 18:00"/>
        <SystemMessage variant="primary" head="SISTEMA · ARCHIVO" body="Hábito archivado: 'Hidratarse'." time="ayer"/>

        <button onClick={onRankUpDemo} style={{
          marginTop: 8,
          background: 'transparent',
          border: `1px dashed ${LA_COLORS.border}`,
          color: LA_COLORS.fgMuted,
          borderRadius: 8, padding: 14,
          fontFamily: "'Inter', sans-serif", fontSize: 13,
          cursor: 'pointer',
        }}>↑ Demo: simular ascenso de rango</button>
      </div>
    </div>
  );
}

function SystemMessage({ variant = 'primary', head, body, time }) {
  const c = variant === 'warn' ? LA_COLORS.danger : LA_COLORS.primary;
  return (
    <div style={{
      background: LA_COLORS.surface,
      border: `1px solid ${c}`,
      boxShadow: `0 0 0 1px ${c}33, 0 0 18px ${c}1f`,
      borderRadius: 8, padding: 14,
      display: 'flex', gap: 12,
    }}>
      <div style={{
        color: c, fontFamily: "'Orbitron', sans-serif", fontWeight: 700,
        fontSize: 14, lineHeight: 1, marginTop: 2,
      }}>{variant === 'warn' ? '[ ! ]' : '[ ]'}</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <SystemLabel color={c} style={{ fontSize: 10 }}>{head}</SystemLabel>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: LA_COLORS.fg, lineHeight: '20px' }}>{body}</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: LA_COLORS.fgMuted, marginTop: 2 }}>{time}</div>
      </div>
    </div>
  );
}

// ────────────── ScreenHeader (shared) ──────────────
const iconBtnStyle = {
  width: 40, height: 40, display: 'grid', placeItems: 'center',
  background: LA_COLORS.card,
  border: `1px solid ${LA_COLORS.border}`,
  borderRadius: 8, color: LA_COLORS.fg, cursor: 'pointer',
};

function ScreenHeader({ title, subtitle, back, action }) {
  return (
    <div style={{
      padding: '16px 20px 18px',
      background: LA_COLORS.bg,
      borderBottom: `1px solid ${LA_COLORS.border}`,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {back && (
        <button onClick={back} aria-label="back" style={iconBtnStyle}>
          <Icon name="back" size={18}/>
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{
          margin: 0, fontFamily: "'Orbitron', sans-serif", fontWeight: 700,
          fontSize: 24, color: LA_COLORS.fg, lineHeight: 1.1,
        }}>{title}</h1>
        {subtitle && (
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: LA_COLORS.fgMuted, marginTop: 4 }}>
            {subtitle}
          </div>
        )}
      </div>
      {action || (
        <img
          src="../../assets/logo-detailed.svg"
          width="36" height="36" alt=""
          style={{ display: 'block', opacity: 0.85, filter: 'drop-shadow(0 0 8px rgba(63,202,230,0.25))' }}
        />
      )}
    </div>
  );
}

Object.assign(window, {
  HomeScreen, HabitsScreen, AddHabitScreen, StatsScreen, SystemScreen,
  SystemMessage, ScreenHeader, SummaryStat,
});
