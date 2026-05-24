// LevelArc — habit card with state machine.

function HabitCard({ habit, onComplete, onFail, onTap }) {
  const { id, name, importance, type, state, xp, streak } = habit;

  const stateMeta = {
    pending:   { color: LA_COLORS.fgMuted, label: 'PENDIENTE' },
    completed: { color: LA_COLORS.success, label: 'COMPLETADO' },
    failed:    { color: LA_COLORS.danger,  label: 'FALLADO' },
  }[state];

  const isCompleted = state === 'completed';
  const isFailed = state === 'failed';

  return (
    <div
      onClick={onTap}
      style={{
        background: LA_COLORS.card,
        border: `1px solid ${LA_COLORS.border}`,
        borderRadius: 8,
        padding: 14,
        display: 'flex', flexDirection: 'column', gap: 10,
        opacity: isFailed ? 0.65 : 1,
        cursor: onTap ? 'pointer' : 'default',
        transition: 'border-color 160ms cubic-bezier(.2,.7,.2,1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 15,
            color: isFailed ? LA_COLORS.fgMuted : LA_COLORS.fg,
            textDecoration: isFailed ? 'line-through' : 'none',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{name}</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 4,
            fontFamily: "'Inter', sans-serif", fontSize: 12, color: LA_COLORS.fgMuted,
          }}>
            <span>· {type}</span>
            <span>·</span>
            <span>+{xp} XP</span>
            {streak > 0 && (
              <>
                <span>·</span>
                <span style={{ color: LA_COLORS.streak, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Icon name="flame" size={11} color={LA_COLORS.streak}/>{streak}
                </span>
              </>
            )}
          </div>
        </div>

        {/* State pill */}
        <span style={{
          color: stateMeta.color,
          border: `1px solid ${stateMeta.color}`,
          borderRadius: 4, padding: '3px 8px',
          fontFamily: "'Orbitron', sans-serif", fontWeight: 500,
          fontSize: 9, letterSpacing: '0.08em',
          display: 'inline-flex', alignItems: 'center', gap: 5,
          whiteSpace: 'nowrap',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: stateMeta.color }}/>
          {stateMeta.label}
        </span>
      </div>

      {/* Actions — only when pending */}
      {state === 'pending' && (
        <div style={{ display: 'flex', gap: 8 }}>
          <LAButton
            variant="success" full
            onClick={e => { e.stopPropagation(); onComplete && onComplete(id); }}
            icon="check"
          >Completar</LAButton>
          <LAButton
            variant="danger"
            onClick={e => { e.stopPropagation(); onFail && onFail(id); }}
            icon="x"
            style={{ width: 56, padding: 0 }}
          />
        </div>
      )}

      {/* Importance bar — visible always */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <SystemLabel color={LA_COLORS.fgMuted} style={{ fontSize: 9, letterSpacing: '0.1em' }}>
          IMP
        </SystemLabel>
        <div style={{ display: 'flex', gap: 3 }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 14, height: 3, borderRadius: 1,
              background: i < importance ? (isFailed ? LA_COLORS.fgMuted : LA_COLORS.primary) : LA_COLORS.border,
            }}/>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HabitCard });
