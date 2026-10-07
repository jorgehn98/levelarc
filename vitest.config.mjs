import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const path = (relative) => fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  resolve: {
    // Los tests del repositorio ejecutan SQL real: expo-sqlite se sustituye por un adaptador sobre
    // node:sqlite y los módulos nativos por stubs mínimos. El orden importa: lo específico primero.
    alias: [
      { find: 'expo-sqlite', replacement: path('./test/expoSqlite.js') },
      { find: '@/lib/notifications', replacement: path('./test/notifications.ts') },
      { find: '@react-native-async-storage/async-storage', replacement: path('./test/asyncStorage.ts') },
      { find: 'lucide-react-native', replacement: path('./test/empty.ts') },
      { find: /^@\//, replacement: path('./src/') },
    ],
  },
  test: {
    // Zona fija y con offset positivo: las fechas locales no coinciden con las UTC, que es donde
    // fallaba el orden del ledger.
    env: { TZ: 'Asia/Tokyo' },
  },
});
