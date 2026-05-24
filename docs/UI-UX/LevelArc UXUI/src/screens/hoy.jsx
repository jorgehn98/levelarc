// LevelArc — Hoy (Today). Daily mission + habit list with stronger hierarchy.

function HoyScreen({ player, habits, dailyMission, onComplete, onFail, onUndo, onClaim, onTap, t }) {
  const pending = habits.filter(h => h.state === 'pending');
  const completed = habits.filter(h => h.state === 'completed');
  const failed = habits.filter(h => h.state === 'failed');

  const missionRatio = Math.min(1, dailyMission.completed / dailyMission.target);
  const missionDone = dailyMission.completed >= dailyMission.target;
  const canClaim = missionDone && !dailyMission.claimed;

  return (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
      <PlayerHUD player={player} t={t}/>

      <div style={{ padding: '16px 20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Daily mission panel — the System speaks */}
        <DailyMissionPanel
          mission={dailyMission}
          ratio={missionRatio}
          isComplete={missionDone}
          canClaim={canClaim}
          onClaim={onClaim}
          t={t}
        />

        {/* Habits today */}
        {habits.length === 0 ? (
          <EmptyToday t={t}/>
        ) : (
          <>
            {pending.length > 0 && (
              <HabitGroup label={t.pending.toUpperCase()} count={`${pending.length}`} accent={LA.primary}>
                {pending.map(h => (
                  <HabitCard key={h.id} habit={h} t={t}
                    onComplete={onComplete} onFail={onFail} onTap={() => onTap(h.id)}/>
                ))}
              </HabitGroup>
            )}
            {completed.length > 0 && (
              <HabitGroup label={t.completed.toUpperCase()} count={`${completed.length}`} accent={LA.success}>
                {completed.map(h => (
                  <HabitCard key={h.id} habit={h} t={t}
                    onUndo={onUndo} onTap={() => onTap(h.id)}/>
                ))}
              </HabitGroup>
            )}
            {failed.length > 0 && (
              <HabitGroup label={t.failed.toUpperCase()} count={`${failed.length}`} accent={LA.danger}>
                {failed.map(h => (
                  <HabitCard key={h.id} habit={h} t={t}
                    onUndo={onUndo} onTap={() => onTap(h.id)}/>
                ))}
              </HabitGroup>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function HabitGroup({ label, count, accent, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}aa` }}/>
        <SysLabel color={LA.fg} style={{ fontSize: 10, letterSpacing: '0.14em' }}>{label}</SysLabel>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${LA.border}, transparent)` }}/>
        <span style={{
          fontFamily: "'Orbitron', sans-serif", fontWeight: 600, fontSize: 11,
          color: LA.fgMuted, letterSpacing: '0.06em',
        }}>{count}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  );
}

function DailyMissionPanel({ mission, ratio, isComplete, canClaim, onClaim, t }) {
  const targets = Array.from({ length: mission.target });
  return (
    <div style={{
      position: 'relative',
      background: `linear-gradient(180deg, ${LA.surface}, ${LA.bg})`,
      border: `1px solid ${isComplete ? LA.success + '66' : LA.primary + '55'}`,
      borderRadius: 8, padding: 16,
      boxShadow: `0 0 0 1px ${isComplete ? LA.success : LA.primary}22, 0 0 24px ${isComplete ? LA.success : LA.primary}1a`,
      overflow: 'hidden',
    }}>
      <Scanlines opacity={0.03}/>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: `${isComplete ? LA.success : LA.primary}1a`,
            border: `1px solid ${isComplete ? LA.success : LA.primary}66`,
            display: 'grid', placeItems: 'center',
            color: isComplete ? LA.success : LA.primary, flexShrink: 0,
          }}>
            <Icon name={isComplete ? 'check' : 'target'} size={18}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SysLabel color={isComplete ? LA.success : LA.primary} style={{ fontSize: 10 }}>
              ◆ {t.systemOnline.split('·')[0].trim()} · {t.dailyMission.toUpperCase()}
            </SysLabel>
            <div style={{
              fontFamily: "'Inter', sans-serif", fontSize: 14, color: LA.fg,
              marginTop: 4, lineHeight: '20px',
            }}>
              {t.completeNHabits(mission.target)}
            </div>
          </div>
          <div style={{
            fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 14,
            color: isComplete ? LA.success : LA.primary, letterSpacing: '0.04em',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>{mission.completed} / {mission.target}</div>
        </div>

        {/* Segmented progress nodes */}
        <div style={{ display: 'flex', gap: 6 }}>
          {targets.map((_, i) => {
            const done = i < mission.completed;
            return (
              <div key={i} style={{
                flex: 1, height: 6, borderRadius: 3,
                background: done ? (isComplete ? LA.success : LA.primary) : LA.card,
                border: `1px solid ${done ? (isComplete ? LA.success : LA.primary) : LA.border}`,
                boxShadow: done ? `0 0 8px ${isComplete ? LA.success : LA.primary}99` : 'none',
                transition: 'all 300ms cubic-bezier(.2,.7,.2,1)',
              }}/>
            );
          })}
        </div>

        {/* Claim CTA */}
        {canClaim && (
          <LAButton variant="primary" full onClick={onClaim} icon="sparkle" style={{ marginTop: 4 }}>
            {t.claimBonus(mission.xpBonus)}
          </LAButton>
        )}
        {isComplete && !canClaim && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4,
            fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: LA.success, letterSpacing: '0.08em',
          }}>
            <Icon name="check" size={14} color={LA.success}/>{t.bonusClaimed.toUpperCase()} · +{mission.xpBonus} XP
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyToday({ t }) {
  return (
    <div style={{
      padding: '32px 24px',
      border: `1px dashed ${LA.border}`,
      borderRadius: 8,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 12,
        border: `1px solid ${LA.border}`, background: LA.surface,
        display: 'grid', placeItems: 'center', color: LA.fgMuted,
      }}>
        <Icon name="target" size={26}/>
      </div>
      <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 15, color: LA.fg }}>
        {t.noHabitsToday}
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: LA.fgMuted, maxWidth: 240 }}>
        {t.createFirstHabit}
      </div>
    </div>
  );
}

Object.assign(window, { HoyScreen });
