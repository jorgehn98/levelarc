// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_brainy_blockbuster.sql';
import m0001 from './0001_gigantic_daredevil.sql';
import m0002 from './0002_familiar_iron_fist.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002
    }
  }
  