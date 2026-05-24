// LevelArc — Nuevo / Editar hábito. Form with strong visual structure.

function NewHabitScreen({ habit, onClose, onSave, onArchive, t }) {
  const isEdit = !!habit;
  const [name, setName] = React.useState(habit?.name || '');
  const [kind, setKind] = React.useState(habit?.kind || 'binary');
  const [goal, setGoal] = React.useState(habit?.goal || 10);
  const [freq, setFreq] = React.useState(habit?.frequency || 'daily');
  const [importance, setImportance] = React.useState(habit?.importance || 2);
  const [icon, setIcon] = React.useState(habit?.icon || 'target');
  const [days, setDays] = React.useState(habit?.days || [0, 1, 2, 3, 4, 5, 6]);

  const xpReward = importance * 15;
  const valid = name.trim().length > 0;

  const icons = ['target', 'book', 'flame', 'dumbbell', 'droplet', 'moon', 'sun', 'leaf', 'coffee', 'music', 'pen', 'code'];

  const submit = () => {
    if (!valid) return;
    onSave({ name: name.trim(), kind, goal, frequency: freq, importance, icon, days });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ScreenHeader
        title={isEdit ? t.editHabit : t.newHabit}
        subtitle={t.newHabitSubtitle}
        onBack={onClose}
        t={t}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Live preview */}
        <div style={{
          padding: 14,
          background: `linear-gradient(180deg, ${LA.surface}, ${LA.bg})`,
          border: `1px solid ${LA.primary}55`,
          borderRadius: 8,
          boxShadow: `0 0 0 1px ${LA.primary}22, 0 0 18px ${LA.primary}1a`,
          display: 'flex', alignItems: 'center', gap: 12,
          position: 'relative', overflow: 'hidden',
        }}>
          <Scanlines opacity={0.025}/>
          <div style={{
            width: 48, height: 48, borderRadius: 8,
            background: LA.card, border: `1px solid ${LA.primary}66`,
            display: 'grid', placeItems: 'center', color: LA.primary, flexShrink: 0,
            boxShadow: `inset 0 0 12px ${LA.primary}22`,
          }}>
            <Icon name={icon} size={22}/>
          </div>
          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <SysLabel color={LA.primary} style={{ fontSize: 9 }}>◆ VISTA PREVIA</SysLabel>
            <div style={{
              fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 15,
              color: name ? LA.fg : LA.fgMuted, marginTop: 4,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{name || t.namePlaceholder}</div>
            <div style={{
              fontFamily: "'Inter', sans-serif", fontSize: 11, color: LA.fgMuted, marginTop: 3,
            }}>
              <span style={{ color: LA.xp, fontFamily: "'Orbitron', sans-serif" }}>+{xpReward} XP</span>
              {' · '}{kind === 'goal' ? t.goalUnits(goal) : t.binary}
              {' · '}{freq === 'daily' ? t.daily : freq === 'weekly' ? t.weekly : t.custom}
            </div>
          </div>
        </div>

        {/* Name */}
        <Field label={t.name}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t.namePlaceholder}
            maxLength={40}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: LA.card,
              border: `1px solid ${name ? LA.primary : LA.border}`,
              boxShadow: name ? `0 0 0 1px ${LA.primary}55, 0 0 12px ${LA.primary}25` : 'none',
              borderRadius: 8, height: 46, padding: '0 14px',
              fontFamily: "'Inter', sans-serif", fontSize: 15,
              color: LA.fg, outline: 'none',
              transition: 'all 160ms cubic-bezier(.2,.7,.2,1)',
            }}
          />
        </Field>

        {/* Kind: binary vs goal */}
        <Field label={t.type}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <KindCard active={kind === 'binary'} onClick={() => setKind('binary')} icon="check"
              title={t.binary} help={t.binaryHelp}/>
            <KindCard active={kind === 'goal'} onClick={() => setKind('goal')} icon="chartArea"
              title={t.goal} help={t.goalHelp}/>
          </div>
          {kind === 'goal' && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <SysLabel color={LA.fgMuted} style={{ fontSize: 10 }}>META</SysLabel>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setGoal(Math.max(1, goal - 1))} style={stepperBtn(LA)}>−</button>
                <div style={{
                  flex: 1, height: 38, background: LA.card, border: `1px solid ${LA.border}`,
                  borderRadius: 8, display: 'grid', placeItems: 'center',
                  fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 16, color: LA.fg,
                }}>{goal}</div>
                <button onClick={() => setGoal(Math.min(99, goal + 1))} style={stepperBtn(LA)}>+</button>
              </div>
            </div>
          )}
        </Field>

        {/* Frequency */}
        <Field label={t.frequency}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { id: 'daily', label: t.daily },
              { id: 'weekly', label: t.weekly },
              { id: 'custom', label: t.custom },
            ].map(f => (
              <SegBtn key={f.id} active={freq === f.id} onClick={() => setFreq(f.id)}>{f.label}</SegBtn>
            ))}
          </div>
          {freq === 'custom' && (
            <DaysPicker days={days} onChange={setDays} t={t}/>
          )}
        </Field>

        {/* Importance */}
        <Field label={`${t.importance} · ${t.importanceXP(xpReward)}`}>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3].map(n => (
              <button key={n} onClick={() => setImportance(n)} style={{
                flex: 1, height: 52,
                background: importance >= n ? `${LA.primary}22` : LA.card,
                color: importance >= n ? LA.primary : LA.fgMuted,
                border: `1px solid ${importance >= n ? LA.primary : LA.border}`,
                boxShadow: importance === n ? `0 0 0 1px ${LA.primary}55, 0 0 12px ${LA.primary}30` : 'none',
                borderRadius: 8, cursor: 'pointer',
                fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 18,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                transition: 'all 120ms cubic-bezier(.2,.7,.2,1)',
              }}>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 8, height: 8, borderRadius: 1,
                      background: i < n ? LA.primary : LA.border,
                    }}/>
                  ))}
                </div>
                <span style={{ fontSize: 10, letterSpacing: '0.06em', color: LA.fgMuted, fontWeight: 500 }}>+{n * 15}</span>
              </button>
            ))}
          </div>
        </Field>

        {/* Icon picker */}
        <Field label={t.pickIcon}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
            {icons.map(ic => (
              <button key={ic} onClick={() => setIcon(ic)} style={{
                aspectRatio: '1', display: 'grid', placeItems: 'center',
                background: icon === ic ? `${LA.primary}1a` : LA.card,
                border: `1px solid ${icon === ic ? LA.primary : LA.border}`,
                boxShadow: icon === ic ? `0 0 0 1px ${LA.primary}55, 0 0 10px ${LA.primary}30` : 'none',
                borderRadius: 8,
                color: icon === ic ? LA.primary : LA.fgDim,
                cursor: 'pointer',
                transition: 'all 120ms cubic-bezier(.2,.7,.2,1)',
              }}>
                <Icon name={ic} size={20}/>
              </button>
            ))}
          </div>
        </Field>

        <div style={{ flex: 1 }}/>

        {isEdit && (
          <button onClick={() => onArchive && onArchive()} style={{
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 6,
            color: LA.danger, fontFamily: "'Inter', sans-serif", fontSize: 13,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Icon name="archive" size={14}/>{t.archive}
          </button>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <LAButton variant="secondary" onClick={onClose} style={{ flex: 1 }}>{t.cancel}</LAButton>
          <LAButton variant="primary" onClick={submit} disabled={!valid} icon={isEdit ? 'check' : 'sparkle'} style={{ flex: 2 }}>
            {isEdit ? t.save : t.registerMission}
          </LAButton>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SysLabel color={LA.fgMuted} style={{ fontSize: 10 }}>◇ {label.toUpperCase()}</SysLabel>
      {children}
    </div>
  );
}

function SegBtn({ active, children, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? LA.primary : LA.card,
      color: active ? LA.bg : LA.fg,
      border: `1px solid ${active ? LA.primary : LA.border}`,
      borderRadius: 8, height: 44, cursor: 'pointer',
      fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 13,
      transition: 'all 120ms cubic-bezier(.2,.7,.2,1)',
    }}>{children}</button>
  );
}

function KindCard({ active, onClick, icon, title, help }) {
  return (
    <button onClick={onClick} style={{
      textAlign: 'left',
      background: active ? `${LA.primary}1a` : LA.card,
      border: `1px solid ${active ? LA.primary : LA.border}`,
      boxShadow: active ? `0 0 0 1px ${LA.primary}55, 0 0 12px ${LA.primary}25` : 'none',
      borderRadius: 8, padding: 12, cursor: 'pointer',
      display: 'flex', flexDirection: 'column', gap: 6,
      transition: 'all 120ms cubic-bezier(.2,.7,.2,1)',
    }}>
      <Icon name={icon} size={18} color={active ? LA.primary : LA.fgDim}/>
      <div style={{
        fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 13,
        color: active ? LA.primary : LA.fg, letterSpacing: '0.04em',
      }}>{title.toUpperCase()}</div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11.5, color: LA.fgMuted, lineHeight: '15px' }}>{help}</div>
    </button>
  );
}

function DaysPicker({ days, onChange, t }) {
  const labels = t.weekDays;
  const toggle = (i) => onChange(days.includes(i) ? days.filter(d => d !== i) : [...days, i].sort());
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginTop: 10 }}>
      {labels.map((d, i) => {
        const active = days.includes(i);
        return (
          <button key={i} onClick={() => toggle(i)} style={{
            aspectRatio: '1', minHeight: 36,
            background: active ? LA.primary : LA.card,
            color: active ? LA.bg : LA.fgDim,
            border: `1px solid ${active ? LA.primary : LA.border}`,
            borderRadius: 6, cursor: 'pointer',
            fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 12,
            transition: 'all 120ms cubic-bezier(.2,.7,.2,1)',
          }}>{d}</button>
        );
      })}
    </div>
  );
}

function stepperBtn(LA) {
  return {
    width: 38, height: 38, borderRadius: 8,
    background: LA.card, border: `1px solid ${LA.border}`,
    color: LA.fg, cursor: 'pointer',
    fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 18,
  };
}

Object.assign(window, { NewHabitScreen });
