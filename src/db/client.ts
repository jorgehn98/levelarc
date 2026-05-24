import { openDatabaseSync } from 'expo-sqlite';

export const sqlite = openDatabaseSync('levelarc.db');
