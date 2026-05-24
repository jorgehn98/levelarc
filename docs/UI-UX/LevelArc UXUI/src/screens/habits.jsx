// LevelArc — Hábitos. Full habits library with filter chips.

function HabitsScreen({ habits, onTap, onAdd, t }) {
  const [filter, setFilter] = React.useState('active');

  const filtered = habits.filter(h => {
    if (filter === 'all') return true;
    if (filter === 'archived') return h.archived;
    return !h.archived;
  });

  const counts = {
    all: habits.length,
    active: habits.filter(h => !h.archived).length,
    archived: habits.filter(h => h.archived).length,
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ScreenHeader
        title={t.habits}
        subtitle={t.habitsRegistered}
        t={t}
        action={(
          <button onClick={onAdd} aria-label={t.addHabit} style={{
            width: 40, height: 40, display: 'grid', placeItems: 'center',
            background: LA.primary, border: `1px solid ${LA.primary}`,
            borderRadius: 8, color: LA.bg, cursor: 'pointer',
            boxShadow: `0 0 12px ${LA.primaryShadow}`,
          }}>
            <Icon name="plus" size={20}/>
          </button>
        )}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'active', label: t.active },
            { id: 'archived', label: t.archived },
            { id: 'all', label: t.all },
          ].map(f => {
            const active = filter === f.id;
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                background: active ? LA.primary : LA.card,
                color: active ? LA.bg : LA.fg,
                border: `1px solid ${active ? LA.primary : LA.border}`,
                borderRadius: 4, padding: '6px 12px',
                fontFamily: "'Orbitron', sans-serif", fontWeight: 600, fontSize: 11,
                letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                transition: 'all 120ms cubic-bezier(.2,.7,.2,1)',
              }}>
                {f.label}
                <span style={{
                  fontFamily: "'Orbitron', sans-serif", fontSize: 10,
                  color: active ? LA.bg : LA.fgMuted, opacity: 0.85,
                }}>{counts[f.id]}</span>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div style={{
            padding: 24, border: `1px dashed ${LA.border}`, borderRadius: 8,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 10, border: `1px solid ${LA.border}`,
              background: LA.surface, display: 'grid', placeItems: 'center', color: LA.fgMuted,
            }}>
              <Icon name="swords" size={22}/>
            </div>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 14, color: LA.fg }}>
              {t.noHabits}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: LA.fgMuted, maxWidth: 240 }}>
              {t.feedSystem}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(h => <HabitRow key={h.id} habit={h} onTap={() => onTap(h.id)} t={t}/>)}
          </div>
        )}
      </div>
    </div>
  );
}

function HabitRow({ habit, onTap, t }) {
  const isArchived = habit.archived;
  return (
    <button onClick={onTap} style={{
      width: '100%', textAlign: 'left',
      background: LA.card, border: `1px solid ${LA.border}`, borderRadius: 8,
      padding: 12, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
      opacity: isArchived ? 0.55 : 1,
      transition: 'background 120ms cubic-bezier(.2,.7,.2,1), border-color 120ms',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 8,
        background: LA.surface, border: `1px solid ${LA.border}`,
        display: 'grid', placeItems: 'center', color: isArchived ? LA.fgMuted : LA.primary,
        flexShrink: 0,
      }}>
        <Icon name={habit.icon || 'target'} size={18}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 15,
          color: LA.fg, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{habit.name}</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
          fontFamily: "'Inter', sans-serif", fontSize: 12, color: LA.fgMuted,
        }}>
          <span style={{ color: LA.xp, fontFamily: "'Orbitron', sans-serif", fontSize: 11 }}>+{habit.xp} XP</span>
          <span>·</span>
          <span>{habit.kind === 'goal' ? t.goalUnits(habit.goal) : t.binary}</span>
          {habit.streak > 0 && (
            <>
              <span>·</span>
              <span style={{ color: LA.streak, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Icon name="flame" size={11} color={LA.streak}/>{habit.streak}
              </span>
            </>
          )}
        </div>
        {/* importance line */}
        <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              flex: 1, height: 2, borderRadius: 1, maxWidth: 24,
              background: i < habit.importance ? LA.primary : LA.border,
            }}/>
          ))}
        </div>
      </div>
      <Icon name="chevronRight" size={18} color={LA.fgMuted}/>
    </button>
  );
}

Object.assign(window, { HabitsScreen });
