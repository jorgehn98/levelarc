// LevelArc — Progreso. Rank + ascension ladder + week chart + heatmap + history.

function ProgressScreen({ player, events, weekData, heatmapData, t }) {
  const c = RANK[player.rank];
  const nextRank = RANK_SEQ[Math.min(RANK_SEQ.indexOf(player.rank) + 1, 5)];
  const pct = (player.xp / player.xpMax) * 100;

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <ScreenHeader title={t.progress} subtitle="HISTORIAL · RANGO · ESTADÍSTICAS" t={t}/>

      <div style={{ padding: '14px 20px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Hero rank card */}
        <RankHero player={player} accent={c} pct={pct} nextRank={nextRank} t={t}/>

        {/* Ascension ladder */}
        <LAPanel padding={14}>
          <SectionTitle icon="bolt" title={t.ascensionPath} accent={c}/>
          <div style={{ marginTop: 12, position: 'relative' }}>
            <div style={{
              position: 'absolute', top: 19, left: 14, right: 14, height: 1,
              background: LA.border,
            }}/>
            <div style={{
              position: 'absolute', top: 19, left: 14,
              width: `calc((100% - 28px) * ${RANK_SEQ.indexOf(player.rank) / (RANK_SEQ.length - 1)})`,
              height: 1, background: LA.primary, boxShadow: `0 0 8px ${LA.primary}`,
            }}/>
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
              {RANK_SEQ.map(r => {
                const cur = r === player.rank;
                const passed = RANK_SEQ.indexOf(r) < RANK_SEQ.indexOf(player.rank);
                return (
                  <div key={r} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: cur ? 38 : 28, height: cur ? 38 : 28, borderRadius: cur ? 8 : 6,
                      background: cur ? RANK[r] : passed ? `${RANK[r]}33` : LA.card,
                      border: `1px solid ${cur ? RANK[r] : passed ? `${RANK[r]}99` : LA.border}`,
                      boxShadow: cur ? `0 0 0 1px ${RANK[r]}55, 0 0 16px ${RANK[r]}88` : 'none',
                      display: 'grid', placeItems: 'center',
                      color: cur ? LA.bg : passed ? RANK[r] : LA.fgMuted,
                      fontFamily: "'Orbitron', sans-serif", fontWeight: 700,
                      fontSize: cur ? 18 : 13,
                      transition: 'all 200ms cubic-bezier(.2,.7,.2,1)',
                    }}>{r}</div>
                    {cur && (
                      <div style={{
                        fontFamily: "'Orbitron', sans-serif", fontWeight: 600, fontSize: 9,
                        color: RANK[r], letterSpacing: '0.1em',
                      }}>◆ ACTUAL</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </LAPanel>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <StatTile label="RACHA" value={player.streak} unit={t.days} color={LA.streak} icon="flame" accent={LA.streak}/>
          <StatTile label="NIVEL" value={player.level} unit={`Rango ${player.rank}`} color={c} icon="trophy" accent={c}/>
          <StatTile label={t.activeHabits.toUpperCase()} value={player.habitCount} unit="misiones" color={LA.primary} icon="swords" accent={LA.primary}/>
          <StatTile label={t.totalXP.toUpperCase()} value={player.totalXp.toLocaleString()} unit="acumulado" color={LA.xp} icon="sparkle" accent={LA.xp}/>
        </div>

        {/* Weekly activity chart */}
        <LAPanel padding={14}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <SectionTitle icon="chart" title={t.weekActivity} accent={LA.primary}/>
            <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: LA.fgMuted, letterSpacing: '0.06em' }}>
              {weekData.reduce((a, b) => a + b.completed, 0)} / {weekData.reduce((a, b) => a + b.target, 0)}
            </span>
          </div>
          <WeekBars data={weekData} t={t}/>
        </LAPanel>

        {/* Heatmap 12 weeks */}
        <LAPanel padding={14}>
          <SectionTitle icon="calendar" title={t.monthHeatmap} accent={LA.primary}/>
          <Heatmap data={heatmapData} accent={c}/>
          <HeatmapLegend accent={c}/>
        </LAPanel>

        {/* History */}
        <LAPanel padding={14}>
          <SectionTitle icon="clock" title={t.history} accent={LA.primary}/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {events.length === 0 ? (
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: LA.fgMuted, textAlign: 'center', padding: '20px 0' }}>
                {t.noEvents}
              </div>
            ) : events.map(ev => (
              <EventRow key={ev.id} ev={ev} t={t}/>
            ))}
          </div>
        </LAPanel>
      </div>
    </div>
  );
}

function RankHero({ player, accent, pct, nextRank, t }) {
  return (
    <div style={{
      position: 'relative',
      background: `radial-gradient(ellipse at 30% 30%, ${accent}22 0%, transparent 60%), ${LA.surface}`,
      border: `1px solid ${accent}55`,
      borderRadius: 8, padding: 18,
      boxShadow: `0 0 0 1px ${accent}33, 0 0 32px ${accent}1a`,
      overflow: 'hidden',
    }}>
      <HexGridBg color={accent} opacity={0.06}/>
      <Scanlines opacity={0.03}/>

      {/* corner L brackets */}
      {['tl', 'tr', 'bl', 'br'].map(pos => {
        const m = { tl: { top: 8, left: 8 }, tr: { top: 8, right: 8 }, bl: { bottom: 8, left: 8 }, br: { bottom: 8, right: 8 } }[pos];
        const b = {
          tl: { borderTop: `1px solid ${accent}99`, borderLeft: `1px solid ${accent}99` },
          tr: { borderTop: `1px solid ${accent}99`, borderRight: `1px solid ${accent}99` },
          bl: { borderBottom: `1px solid ${accent}99`, borderLeft: `1px solid ${accent}99` },
          br: { borderBottom: `1px solid ${accent}99`, borderRight: `1px solid ${accent}99` },
        }[pos];
        return <div key={pos} style={{ position: 'absolute', ...m, width: 10, height: 10, ...b, opacity: 0.7 }}/>;
      })}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        {/* Big rank badge */}
        <div style={{
          width: 92, height: 92, borderRadius: 12,
          background: `radial-gradient(circle at 30% 25%, ${accent} 0%, ${accent} 60%, ${accent}cc 100%)`,
          color: LA.bg,
          display: 'grid', placeItems: 'center',
          fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 60, lineHeight: 1,
          border: `1px solid ${accent}`,
          boxShadow: `0 0 0 1px ${accent}55, 0 0 28px ${accent}aa, inset 0 0 24px ${LA.bg}33`,
          flexShrink: 0,
          position: 'relative',
        }}>{player.rank}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <SysLabel color={accent} style={{ fontSize: 10 }}>◆ {t.currentRank}</SysLabel>
          <div style={{
            fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 30,
            color: LA.fg, marginTop: 4, lineHeight: 1,
          }}>RANGO {player.rank}</div>
          <div style={{
            fontFamily: "'Inter', sans-serif", fontSize: 13, color: LA.fgDim, marginTop: 4,
          }}>{t.level} {player.level} · {player.name}</div>
        </div>
      </div>

      <div style={{ position: 'relative', marginTop: 16 }}>
        <ProgressBar value={pct} color={accent} withGlow height={10}/>
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: 6,
          fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: LA.fgMuted, letterSpacing: '0.06em',
        }}>
          <span>XP {player.xp.toLocaleString()} / {player.xpMax.toLocaleString()}</span>
          <span style={{ color: nextRank !== player.rank ? accent : LA.fgMuted }}>
            → RANGO {nextRank}
          </span>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Icon name={icon} size={14} color={accent}/>
      <SysLabel color={LA.fg} style={{ fontSize: 11, letterSpacing: '0.12em' }}>{title.toUpperCase()}</SysLabel>
    </div>
  );
}

function WeekBars({ data, t }) {
  const max = Math.max(...data.map(d => d.target), 1);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, height: 132, alignItems: 'end' }}>
      {data.map((d, i) => {
        const cPct = (d.completed / max) * 100;
        const tPct = (d.target / max) * 100;
        const isToday = d.today;
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
            <div style={{
              fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: LA.fgMuted, letterSpacing: '0.06em',
            }}>{d.completed}</div>
            <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', position: 'relative' }}>
              {/* target ghost */}
              <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 0,
                height: `${tPct}%`, background: 'transparent',
                border: `1px dashed ${LA.border}`, borderBottom: 'none', borderRadius: '4px 4px 0 0',
              }}/>
              {/* completed fill */}
              <div style={{
                width: '100%', height: `${cPct}%`,
                background: isToday ? LA.primary : `${LA.primary}aa`,
                borderRadius: 4,
                boxShadow: isToday ? `0 0 10px ${LA.primary}80` : 'none',
              }}/>
            </div>
            <span style={{
              fontFamily: "'Orbitron', sans-serif", fontSize: 10,
              color: isToday ? LA.primary : LA.fgMuted, letterSpacing: '0.08em',
              fontWeight: isToday ? 700 : 500,
            }}>{t.weekDays[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function Heatmap({ data, accent }) {
  // data: 12 weeks × 7 days = 84 cells, each 0..4 intensity
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3,
      marginTop: 12,
    }}>
      {data.map((week, w) => (
        <div key={w} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {week.map((intensity, d) => {
            const a = intensity === 0 ? 0 : 0.15 + intensity * 0.21;
            return (
              <div key={d} style={{
                aspectRatio: '1',
                background: intensity === 0 ? LA.card : `${accent}`,
                opacity: intensity === 0 ? 1 : a,
                border: `1px solid ${intensity === 0 ? LA.border : `${accent}66`}`,
                borderRadius: 2,
              }}/>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function HeatmapLegend({ accent }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 10,
      fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: LA.fgMuted, letterSpacing: '0.06em',
    }}>
      <span>MENOS</span>
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} style={{
          width: 10, height: 10, borderRadius: 2,
          background: i === 0 ? LA.card : accent,
          opacity: i === 0 ? 1 : 0.15 + i * 0.21,
          border: `1px solid ${i === 0 ? LA.border : `${accent}66`}`,
        }}/>
      ))}
      <span>MÁS</span>
    </div>
  );
}

function EventRow({ ev, t }) {
  const positive = ev.xpDelta >= 0;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
      borderBottom: `1px solid ${LA.border}`,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6,
        background: `${positive ? LA.success : LA.danger}1a`,
        border: `1px solid ${positive ? LA.success : LA.danger}66`,
        color: positive ? LA.success : LA.danger,
        display: 'grid', placeItems: 'center', flexShrink: 0,
      }}>
        <Icon name={positive ? 'check' : 'x'} size={14}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Inter', sans-serif", fontSize: 13, color: LA.fg,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{ev.habitName || t.archivedHabit}</div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: LA.fgMuted, marginTop: 2 }}>
          {ev.date} · {ev.type}
        </div>
      </div>
      <span style={{
        fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 12,
        color: positive ? LA.success : LA.danger, letterSpacing: '0.04em',
      }}>{positive ? '+' : ''}{ev.xpDelta} XP</span>
    </div>
  );
}

Object.assign(window, { ProgressScreen });
