// LevelArc — mock data + initial state.

function makeInitialState() {
  const habits = [
    { id: 'h1', name: 'Meditar 10 min',    importance: 2, kind: 'binary', frequency: 'daily', state: 'completed', xp: 30, streak: 12, icon: 'moon', archived: false, days: [0,1,2,3,4,5,6] },
    { id: 'h2', name: 'Leer 20 páginas',   importance: 3, kind: 'goal', goal: 20, progress: 12, frequency: 'daily', state: 'pending', xp: 45, streak: 7, icon: 'book', archived: false, days: [0,1,2,3,4,5,6] },
    { id: 'h3', name: 'Entrenar fuerza',   importance: 3, kind: 'binary', frequency: 'custom', state: 'pending', xp: 45, streak: 4, icon: 'dumbbell', archived: false, days: [0,2,4] },
    { id: 'h4', name: 'Hidratarse 2 L',    importance: 1, kind: 'goal', goal: 8, progress: 5, frequency: 'daily', state: 'pending', xp: 15, streak: 21, icon: 'droplet', archived: false, days: [0,1,2,3,4,5,6] },
    { id: 'h5', name: 'Caminar 30 min',    importance: 2, kind: 'binary', frequency: 'daily', state: 'failed', xp: 30, streak: 0, icon: 'leaf', archived: false, days: [0,1,2,3,4,5,6] },
    { id: 'h6', name: 'Sin azúcar',        importance: 2, kind: 'binary', frequency: 'daily', state: 'completed', xp: 30, streak: 3, icon: 'coffee', archived: false, days: [0,1,2,3,4,5,6] },
    { id: 'h7', name: 'Diario nocturno',   importance: 1, kind: 'binary', frequency: 'daily', state: 'pending', xp: 15, streak: 9, icon: 'pen', archived: false, days: [0,1,2,3,4,5,6] },
    { id: 'h8', name: 'Práctica de guitarra', importance: 2, kind: 'goal', goal: 3, progress: 0, frequency: 'weekly', state: 'pending', xp: 30, streak: 2, icon: 'music', archived: true, days: [0,2,4,6] },
  ];

  const player = {
    name: 'Jugador 001',
    level: 12, rank: 'D',
    xp: 240, xpMax: 600,
    streak: 7,
    habitCount: habits.filter(h => !h.archived).length,
    totalXp: 3240,
  };

  const dailyMission = { target: 3, completed: 2, claimed: false, xpBonus: 25 };

  const events = [
    { id: 'e1', habitName: 'Meditar 10 min', date: 'hoy · 08:14', type: 'completar', xpDelta: 30 },
    { id: 'e2', habitName: 'Sin azúcar',     date: 'hoy · 12:02', type: 'completar', xpDelta: 30 },
    { id: 'e3', habitName: 'Caminar 30 min', date: 'hoy · 21:00', type: 'fallar',    xpDelta: -10 },
    { id: 'e4', habitName: 'Leer 20 páginas',date: 'ayer · 22:20', type: 'completar', xpDelta: 45 },
    { id: 'e5', habitName: 'Hidratarse 2 L', date: 'ayer · 18:00', type: 'completar', xpDelta: 15 },
    { id: 'e6', habitName: 'Entrenar fuerza',date: 'ayer · 07:30', type: 'completar', xpDelta: 45 },
    { id: 'e7', habitName: 'Diario nocturno',date: '2 días', type: 'completar', xpDelta: 15 },
  ];

  // Week data: M T W T F S S
  const weekData = [
    { completed: 4, target: 5, today: false },
    { completed: 5, target: 5, today: false },
    { completed: 3, target: 5, today: false },
    { completed: 5, target: 5, today: false },
    { completed: 4, target: 5, today: false },
    { completed: 2, target: 5, today: true }, // today (S)
    { completed: 0, target: 5, today: false },
  ];

  // 12 weeks × 7 days, intensity 0-4
  const seed = 'levelarc-2026-05';
  const rng = mulberry(hashStr(seed));
  const heatmapData = Array.from({ length: 12 }).map((_, w) =>
    Array.from({ length: 7 }).map((_, d) => {
      const r = rng();
      if (w === 11 && d > 5) return 0; // future today
      if (r < 0.18) return 0;
      if (r < 0.4) return 1;
      if (r < 0.7) return 2;
      if (r < 0.9) return 3;
      return 4;
    })
  );

  return { habits, player, dailyMission, events, weekData, heatmapData };
}

function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }
function mulberry(a) {
  return function() { let t = (a += 0x6D2B79F5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

Object.assign(window, { makeInitialState });
