// LevelArc — Rank-up cinematic overlay. Enhanced sequence.

function RankUpOverlay({ newRank, prevRank, onClose, t }) {
  const c = RANK[newRank];
  const [phase, setPhase] = React.useState(0);
  // 0 = flash, 1 = badge reveal, 2 = settle with CTA

  React.useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 280);
    const t2 = setTimeout(() => setPhase(2), 700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(5,5,9,0.92)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, zIndex: 30,
      animation: 'la-rank-fade-in 240ms cubic-bezier(.2,.7,.2,1)',
      overflow: 'hidden',
    }}>
      <HexGridBg color={c} opacity={0.08}/>
      <Scanlines opacity={0.05}/>

      {/* Radial burst */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at 50% 50%, ${c}33 0%, transparent 55%)`,
        opacity: phase >= 1 ? 1 : 0,
        transition: 'opacity 600ms ease',
        pointerEvents: 'none',
      }}/>

      <style>{`
        @keyframes la-rank-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes la-rank-flash {
          0%   { transform: scale(0.4); opacity: 0; filter: brightness(2.5); }
          40%  { transform: scale(1.12); opacity: 1; filter: brightness(1.6); }
          100% { transform: scale(1); opacity: 1; filter: brightness(1); }
        }
        @keyframes la-rank-glow-pulse {
          0%, 100% { box-shadow: 0 0 0 1px ${c}, 0 0 30px ${c}55, 0 0 0 6px ${c}11; }
          50%      { box-shadow: 0 0 0 1px ${c}, 0 0 60px ${c}aa, 0 0 0 14px ${c}22; }
        }
        @keyframes la-ring-expand {
          0%   { transform: scale(0.6); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes la-text-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* SYSTEM tag */}
      <div style={{
        opacity: phase >= 1 ? 1 : 0,
        transition: 'opacity 360ms ease 100ms',
        marginBottom: 20,
      }}>
        <SysBrackets color={c}>
          <span style={{
            fontFamily: "'Orbitron', sans-serif", fontWeight: 600, fontSize: 11,
            letterSpacing: '0.18em',
          }}>{t.systemAscension}</span>
        </SysBrackets>
      </div>

      {/* Badge with expanding rings */}
      <div style={{ position: 'relative', width: 180, height: 180, display: 'grid', placeItems: 'center' }}>
        {phase >= 1 && [0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute', width: 140, height: 140, borderRadius: 16,
            border: `1px solid ${c}`,
            animation: `la-ring-expand 1.8s cubic-bezier(.2,.7,.2,1) ${i * 0.45}s infinite`,
          }}/>
        ))}
        <div style={{
          width: 140, height: 140, borderRadius: 16,
          background: `radial-gradient(circle at 30% 25%, ${c} 0%, ${c} 60%, ${c}dd 100%)`,
          color: LA.bg,
          display: 'grid', placeItems: 'center',
          fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 96, lineHeight: 1,
          animation: phase >= 1
            ? 'la-rank-glow-pulse 2.4s ease-in-out infinite'
            : 'la-rank-flash 600ms cubic-bezier(.2,.7,.2,1) both',
          position: 'relative',
          boxShadow: `inset 0 0 32px ${LA.bg}33`,
        }}>{newRank}</div>
      </div>

      {/* Previous → new transition mini */}
      <div style={{
        marginTop: 22,
        display: 'flex', alignItems: 'center', gap: 12,
        opacity: phase >= 2 ? 1 : 0,
        transition: 'opacity 400ms ease',
      }}>
        <RankBadge rank={prevRank} size={32}/>
        <Icon name="chevronRight" size={16} color={c}/>
        <RankBadge rank={newRank} size={32} glow/>
      </div>

      {/* Headline */}
      <div style={{
        marginTop: 22,
        fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 26,
        color: LA.fg, letterSpacing: '0.02em', textAlign: 'center',
        opacity: phase >= 2 ? 1 : 0,
        transform: phase >= 2 ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all 400ms cubic-bezier(.2,.7,.2,1) 100ms',
      }}>{t.rankAscended(newRank)}</div>

      {/* Body */}
      <div style={{
        marginTop: 8, maxWidth: 300,
        fontFamily: "'Inter', sans-serif", fontSize: 14, lineHeight: '20px',
        color: LA.fgDim, textAlign: 'center',
        opacity: phase >= 2 ? 1 : 0,
        transition: 'opacity 400ms ease 240ms',
      }}>{t.rankUpBody}</div>

      {/* CTA */}
      <div style={{
        marginTop: 36, width: '100%', maxWidth: 280,
        opacity: phase >= 2 ? 1 : 0,
        transition: 'opacity 400ms ease 380ms',
      }}>
        <LAButton variant="primary" full onClick={onClose} iconRight="chevronRight">{t.continue}</LAButton>
      </div>
    </div>
  );
}

Object.assign(window, { RankUpOverlay });
