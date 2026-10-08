// Config plugin local: reglas de copia de seguridad de Android.
//
// Android copia por defecto todo `files/` a la cuenta de Google del usuario (auto backup), con un
// tope de 25 MB por app. El modelo de IA opcional (~3,1 GB) vive en `files/models/` (Paths.document
// de expo-file-system es `context.filesDir`; ver src/ai/modelManager.ts): con él dentro la copia
// supera el tope y deja de hacerse, justo para quien activó la IA, y la base SQLite (`files/SQLite/`)
// se queda sin respaldo. Este plugin mantiene la copia automática y saca de ella solo el modelo.
//
// Escribe dos ficheros en res/xml porque Android usa uno u otro según la versión:
// - `android:fullBackupContent` para API <= 30.
// - `android:dataExtractionRules` para API >= 31 (copia en la nube y transferencia entre dispositivos).

const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Ruta relativa a `files/`. Debe coincidir con MODELS_DIR de src/ai/modelManager.ts.
const MODELS_PATH = 'models/';

const FULL_BACKUP_CONTENT = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
  <exclude domain="file" path="${MODELS_PATH}"/>
</full-backup-content>
`;

const DATA_EXTRACTION_RULES = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
    <exclude domain="file" path="${MODELS_PATH}"/>
  </cloud-backup>
  <device-transfer>
    <exclude domain="file" path="${MODELS_PATH}"/>
  </device-transfer>
</data-extraction-rules>
`;

function withBackupRuleFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const xmlDir = path.join(modConfig.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      await fs.promises.mkdir(xmlDir, { recursive: true });
      await fs.promises.writeFile(path.join(xmlDir, 'levelarc_backup_rules.xml'), FULL_BACKUP_CONTENT);
      await fs.promises.writeFile(path.join(xmlDir, 'levelarc_data_extraction_rules.xml'), DATA_EXTRACTION_RULES);
      return modConfig;
    },
  ]);
}

function withBackupRuleAttributes(config) {
  return withAndroidManifest(config, (modConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(modConfig.modResults);
    application.$['android:allowBackup'] = 'true';
    application.$['android:fullBackupContent'] = '@xml/levelarc_backup_rules';
    application.$['android:dataExtractionRules'] = '@xml/levelarc_data_extraction_rules';
    return modConfig;
  });
}

module.exports = function withAndroidBackupRules(config) {
  return withBackupRuleAttributes(withBackupRuleFiles(config));
};
