// LevelArc — habit card. Forked & improved from UI Kit.

function HabitCard({ habit, t, onComplete, onFail, onUndo, onTap, compact = false }) {
  const { id, name, importance, type, state, xp, streak, icon = 'target', goal, progress = 0 } = habit;

  const meta = {
    pending:   { color: LA.fgMuted, label: t.pending.toUpperCase() },
    completed: { color: LA.success, label: t.completedShort.toUpperCase() },
    failed:    { color: LA.danger,  label: t.failedShort.toUpperCase() },
  }[state];

  const isCompleted = state === 'completed';
  const isFailed = state === 'failed';
  const isGoal = habit.kind === 'goal';

  return (
    <div onClick={onTap} style={{
      background: isCompleted ? `linear-gradient(180deg, ${LA.card}, ${LA.surface})` : LA.card,
      border: `1px solid ${isCompleted ? LA.success + '55' : isFailed ? LA.danger + '40' : LA.border}`,
      borderRadius: 8,
      padding: 14,
      display: 'flex', flexDirection: 'column', gap: 10,
      opacity: isFailed ? 0.72 : 1,
      cursor: onTap ? 'pointer' : 'default',
      position: 'relative',
      transition: 'border-color 160ms cubic-bezier(.2,.7,.2,1), background 160ms',
      overflow: 'hidden',
    }}>
      {/* left status bar */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0, width: 3,
        background: isCompleted ? LA.success : isFailed ? LA.danger : LA.primary,
        opacity: isFailed ? 0.4 : 1,
      }}/>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Icon tile */}
        <div style={{
          width: 40, height: 40, borderRadius: 8,
          background: LA.surface,
          border: `1px solid ${isCompleted ? LA.success + '66' : LA.border}`,
          display: 'grid', placeItems: 'center',
          color: isCompleted ? LA.success : isFailed ? LA.fgMuted : LA.primary,
          flexShrink: 0,
          boxShadow: isCompleted ? `0 0 12px ${LA.success}30` : 'none',
        }}>
          {isCompleted ? <Icon name="check" size={20}/> : <Icon name={icon} size={20}/>}
        </div>

        {/* Body */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 15,
            color: isFailed ? LA.fgMuted : LA.fg,
            textDecoration: isFailed ? 'line-through' : 'none',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{name}</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap',
            fontFamily: "'Inter', sans-serif", fontSize: 12, color: LA.fgMuted,
          }}>
            <span style={{ color: LA.xp, fontFamily: "'Orbitron', sans-serif", fontWeight: 500, fontSize: 11 }}>
              +{xp} XP
            </span>
            <span>·</span>
            <span>{type}</span>
            {streak > 0 && (
              <>
                <span>·</span>
                <span style={{ color: LA.streak, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Icon name="flame" size={11} color={LA.streak}/>{streak}
                </span>
              </>
            )}
          </div>
        </div>

        {/* state pill */}
        <span style={{
          color: meta.color,
          border: `1px solid ${meta.color}66`,
          background: `${meta.color}14`,
          borderRadius: 4, padding: '3px 7px',
          fontFamily: "'Orbitron', sans-serif", fontWeight: 600,
          fontSize: 9, letterSpacing: '0.08em',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>{meta.label}</span>
      </div>

      {/* Goal progress */}
      {isGoal && goal && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ProgressBar value={(progress / goal) * 100} color={isCompleted ? LA.success : LA.primary} height={4}/>
          <span style={{
            fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: LA.fgMuted, minWidth: 38, textAlign: 'right',
          }}>{progress}/{goal}</span>
        </div>
      )}

      {/* Actions */}
      {state === 'pending' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
          <LAButton
            variant="primary" full
            onClick={e => { e.stopPropagation(); onComplete && onComplete(id); }}
            icon="check"
          >{t.complete}</LAButton>
          <LAButton
            variant="danger"
            onClick={e => { e.stopPropagation(); onFail && onFail(id); }}
            icon="x" ariaLabel={t.fail}
            style={{ width: 56, padding: 0 }}
          />
        </div>
      )}
      {(isCompleted || isFailed) && onUndo && (
        <button
          onClick={e => { e.stopPropagation(); onUndo(id); }}
          style={{
            alignSelf: 'flex-start', background: 'transparent', border: 'none',
            color: LA.fgDim, cursor: 'pointer',
            fontFamily: "'Inter', sans-serif", fontSize: 12,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 0',
          }}
        >
          <Icon name="undo" size={12}/> {t.undo}
        </button>
      )}

      {/* Importance dots */}
      <div style={{ position: 'absolute', bottom: 8, right: 12, display: 'flex', gap: 3 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 4, height: 4, borderRadius: '50%',
            background: i < importance ? (isFailed ? LA.fgMuted : LA.primary) : LA.border,
          }}/>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { HabitCard });
