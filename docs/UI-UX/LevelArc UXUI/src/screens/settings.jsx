// LevelArc — Ajustes. Sectioned settings list.

function SettingsScreen({ player, lang, onChangeLang, onCloseDay, onResetDemo, onDemoRankUp, onGoOnboarding, t }) {
  const [importOpen, setImportOpen] = React.useState(false);
  const [hapticsOn, setHapticsOn] = React.useState(true);
  const [soundOn, setSoundOn] = React.useState(false);
  const [notifOn, setNotifOn] = React.useState(true);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ScreenHeader title={t.settings} subtitle="CONFIGURACIÓN · SISTEMA" t={t}/>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Identity card */}
        <div style={{
          background: `linear-gradient(180deg, ${LA.surface}, ${LA.bg})`,
          border: `1px solid ${RANK[player.rank]}55`,
          borderRadius: 8, padding: 14,
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: `0 0 0 1px ${RANK[player.rank]}22`,
          position: 'relative', overflow: 'hidden',
        }}>
          <HexGridBg color={RANK[player.rank]} opacity={0.05}/>
          <RankBadge rank={player.rank} size={48} glow/>
          <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <SysLabel color={RANK[player.rank]} style={{ fontSize: 9 }}>◆ {t.identity.toUpperCase()}</SysLabel>
            <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 18, color: LA.fg, marginTop: 2 }}>
              {player.name}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: LA.fgMuted, marginTop: 2 }}>
              {t.rank} {player.rank} · {t.level} {player.level} · {player.totalXp.toLocaleString()} XP
            </div>
          </div>
        </div>

        <Section label="PREFERENCIAS">
          <SettingRow icon="globe" iconColor={LA.primary} title={t.language} value={lang === 'es' ? 'Español' : 'English'}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['es', 'en'].map(l => {
                const active = lang === l;
                return (
                  <button key={l} onClick={() => onChangeLang(l)} style={{
                    background: active ? LA.primary : LA.surface,
                    color: active ? LA.bg : LA.fg,
                    border: `1px solid ${active ? LA.primary : LA.border}`,
                    borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
                    fontFamily: "'Orbitron', sans-serif", fontWeight: 600, fontSize: 11, letterSpacing: '0.06em',
                  }}>{l.toUpperCase()}</button>
                );
              })}
            </div>
          </SettingRow>

          <SettingRow icon="moon" iconColor={LA.primary} title={t.theme} value={t.darkFixed}>
            <span style={{
              fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: LA.fgMuted, letterSpacing: '0.08em',
            }}>FIJO</span>
          </SettingRow>

          <SettingRow icon="bell" iconColor={LA.primary} title={t.notifications} value={t.notificationsCopy}>
            <Toggle on={notifOn} onChange={setNotifOn}/>
          </SettingRow>

          <SettingRow icon="sparkle" iconColor={LA.primary} title={t.haptics} value="Vibración al completar y fallar">
            <Toggle on={hapticsOn} onChange={setHapticsOn}/>
          </SettingRow>

          <SettingRow icon="music" iconColor={LA.primary} title={t.sound} value="Tonos discretos del Sistema">
            <Toggle on={soundOn} onChange={setSoundOn}/>
          </SettingRow>
        </Section>

        <Section label="DATOS">
          <SettingRow icon="download" iconColor={LA.primary} title={t.backup} value={t.backupCopy} stacked>
            <div style={{ display: 'flex', gap: 6 }}>
              <LAButton size="sm" variant="outline" icon="download">{t.exportBtn}</LAButton>
              <LAButton size="sm" variant="secondary" icon="upload" onClick={() => setImportOpen(true)}>{t.importBtn}</LAButton>
            </div>
          </SettingRow>

          <SettingRow icon="refresh" iconColor={LA.primary} title={t.updates} value={t.updatesCopy} stacked>
            <LAButton size="sm" variant="secondary" icon="refresh">{t.checkUpdates}</LAButton>
          </SettingRow>
        </Section>

        <Section label="DEMO" accent={LA.primary}>
          <SettingRow icon="sparkle" iconColor={LA.primary} title="Ascenso de rango" value="Previsualizar la cinemática de ascensión" stacked>
            <LAButton size="sm" variant="outline" icon="bolt" onClick={onDemoRankUp}>Ver ascenso</LAButton>
          </SettingRow>
          <SettingRow icon="eye" iconColor={LA.primary} title="Pantalla de inicio" value="Volver a la pantalla de identidad" stacked>
            <LAButton size="sm" variant="secondary" icon="back" onClick={onGoOnboarding}>Ir a inicio</LAButton>
          </SettingRow>
        </Section>

        <Section label={t.danger.toUpperCase()} accent={LA.danger}>
          <SettingRow icon="skull" iconColor={LA.danger} title={t.closeDay} value={t.closeDayCopy} stacked>
            <LAButton size="sm" variant="danger" onClick={onCloseDay}>{t.closeDay}</LAButton>
          </SettingRow>
          <SettingRow icon="x" iconColor={LA.danger} title={t.resetAll} value={t.resetCopy} stacked>
            <LAButton size="sm" variant="danger" onClick={onResetDemo}>{t.resetAll}</LAButton>
          </SettingRow>
        </Section>

        <Section label={t.about.toUpperCase()}>
          <SettingRow icon="info" iconColor={LA.fgMuted} title={t.appVersion} value={t.author}/>
        </Section>

        {/* Sigil footer */}
        <div style={{ marginTop: 8, padding: '20px 0', textAlign: 'center', opacity: 0.55 }}>
          <img src="assets/logo-mark.svg" alt="" style={{ width: 28, height: 28, opacity: 0.6 }}/>
          <div style={{
            marginTop: 8, fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: LA.fgMuted, letterSpacing: '0.2em',
          }}>◇ SISTEMA AUTÓNOMO · v1.0.0 ◇</div>
        </div>
      </div>

      {importOpen && (
        <ImportBackupModal t={t} onClose={() => setImportOpen(false)}/>
      )}
    </div>
  );
}

function Section({ label, accent = LA.fgMuted, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 2px' }}>
        <SysLabel color={accent} style={{ fontSize: 10, letterSpacing: '0.14em' }}>◇ {label}</SysLabel>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${LA.border}, transparent)` }}/>
      </div>
      <div style={{
        background: LA.surface,
        border: `1px solid ${LA.border}`,
        borderRadius: 8,
        overflow: 'hidden',
      }}>{children}</div>
    </div>
  );
}

function SettingRow({ icon, iconColor, title, value, children, stacked }) {
  return (
    <div style={{
      padding: 14, display: 'flex', alignItems: stacked ? 'flex-start' : 'center',
      gap: 12, borderBottom: `1px solid ${LA.border}`,
      flexDirection: stacked ? 'column' : 'row',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, width: '100%' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 6,
          background: LA.card, border: `1px solid ${LA.border}`,
          display: 'grid', placeItems: 'center', color: iconColor, flexShrink: 0,
        }}>
          <Icon name={icon} size={16}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 14, color: LA.fg }}>{title}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: LA.fgMuted, marginTop: 2 }}>{value}</div>
        </div>
        {!stacked && children}
      </div>
      {stacked && <div style={{ marginLeft: 44, marginTop: 0 }}>{children}</div>}
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 42, height: 24, borderRadius: 12,
      background: on ? LA.primary : LA.card,
      border: `1px solid ${on ? LA.primary : LA.border}`,
      position: 'relative', cursor: 'pointer', padding: 0,
      transition: 'all 160ms cubic-bezier(.2,.7,.2,1)',
      boxShadow: on ? `0 0 8px ${LA.primary}55` : 'none',
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 20 : 2,
        width: 18, height: 18, borderRadius: '50%',
        background: on ? LA.bg : LA.fgMuted,
        transition: 'all 160ms cubic-bezier(.2,.7,.2,1)',
      }}/>
    </button>
  );
}

function ImportBackupModal({ onClose, t }) {
  const [json, setJson] = React.useState('');
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: 'rgba(5,5,9,0.74)', backdropFilter: 'blur(8px)',
      display: 'grid', placeItems: 'center', padding: 20, zIndex: 20,
    }}>
      <div style={{
        background: LA.surface, border: `1px solid ${LA.border}`, borderRadius: 8,
        padding: 16, width: '100%', maxWidth: 360,
      }}>
        <SysLabel color={LA.primary} style={{ fontSize: 10 }}>◆ SISTEMA</SysLabel>
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 18, color: LA.fg, marginTop: 4 }}>
          {t.importBackup}
        </div>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: LA.fgMuted, margin: '8px 0 12px' }}>
          {t.importBackupCopy}
        </p>
        <textarea
          value={json} onChange={e => setJson(e.target.value)}
          placeholder={t.pasteBackupJson}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: LA.card, border: `1px solid ${LA.border}`, borderRadius: 8,
            color: LA.fg, fontFamily: "'Inter', sans-serif", fontSize: 13,
            padding: 12, minHeight: 140, outline: 'none', resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
          <LAButton size="sm" variant="secondary" onClick={onClose}>{t.cancel}</LAButton>
          <LAButton size="sm" variant="primary" disabled={!json.trim()} onClick={onClose}>{t.restore}</LAButton>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SettingsScreen });
