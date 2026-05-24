// LevelArc — Rank-up cinematic overlay. ~700ms reveal sequence.

function RankUpOverlay({ newRank, onClose }) {
  const c = RANK_COLORS[newRank];
  const [phase, setPhase] = React.useState(0); // 0 flash → 1 settle

  React.useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 280);
    return () => clearTimeout(t1);
  }, []);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(10, 10, 15, 0.84)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, zIndex: 10,
      animation: 'la-fade-in 220ms cubic-bezier(.2,.7,.2,1)',
    }}>
      <style>{`
        @keyframes la-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes la-rank-pulse {
          0%   { transform: scale(0.6); opacity: 0; filter: brightness(2); }
          40%  { transform: scale(1.08); opacity: 1; filter: brightness(1.4); }
          100% { transform: scale(1);    opacity: 1; filter: brightness(1); }
        }
        @keyframes la-glow-pulse {
          0%, 100% { box-shadow: 0 0 0 1px ${c}, 0 0 30px ${c}55; }
          50%      { box-shadow: 0 0 0 1px ${c}, 0 0 60px ${c}aa; }
        }
        @keyframes la-rise { from { transform: translateY(8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>

      <SystemLabel color={c} style={{ fontSize: 12, marginBottom: 22, opacity: phase ? 1 : 0, transition: 'opacity 400ms' }}>
        [ SISTEMA · ASCENSIÓN ]
      </SystemLabel>

      <div style={{
        width: 132, height: 132, borderRadius: 16,
        background: c, color: LA_COLORS.bg,
        display: 'grid', placeItems: 'center',
        fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 84, lineHeight: 1,
        border: `1px solid ${c}`,
        animation: phase ? 'la-glow-pulse 2.4s ease-in-out infinite' : 'la-rank-pulse 600ms cubic-bezier(.2,.7,.2,1)',
      }}>{newRank}</div>

      <div style={{
        marginTop: 28,
        fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 26,
        color: LA_COLORS.fg, letterSpacing: '0.02em', textAlign: 'center',
        opacity: phase ? 1 : 0, transform: phase ? 'translateY(0)' : 'translateY(8px)',
        transition: 'all 400ms cubic-bezier(.2,.7,.2,1) 200ms',
      }}>Rango ascendido a {newRank}</div>

      <div style={{
        marginTop: 8, maxWidth: 280,
        fontFamily: "'Inter', sans-serif", fontSize: 14, lineHeight: '20px',
        color: LA_COLORS.fgMuted, textAlign: 'center',
        opacity: phase ? 1 : 0, transition: 'opacity 400ms 320ms',
      }}>Tu XP máximo y multiplicadores se ajustan en consecuencia.</div>

      <div style={{
        marginTop: 36, width: '100%', maxWidth: 280,
        opacity: phase ? 1 : 0, transition: 'opacity 400ms 460ms',
      }}>
        <LAButton variant="primary" full onClick={onClose}>Continuar</LAButton>
      </div>
    </div>
  );
}

Object.assign(window, { RankUpOverlay });
