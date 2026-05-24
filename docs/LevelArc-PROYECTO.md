# LevelArc — Biblia de proyecto

> Documento maestro de referencia. Recoge todas las decisiones cerradas antes de escribir código.
> Estado: identidad visual y gamificación cerradas. Pendiente: esquema de BD y código.

---

## 1. Resumen

LevelArc es un tracker de hábitos gamificado para Android, **100% offline** (sin servidor, sin cuentas, sin conexión). Todos los datos viven en el dispositivo de forma privada. La gamificación es el núcleo: el usuario gana XP completando sus propios hábitos, sube de nivel y asciende por rangos de cazador (E → S), con una estética de "Sistema" inspirada en el tono RPG de Solo Leveling (sin usar su IP).

**Mercado:** Play Store global, bilingüe (español + inglés). Producto a monetizar.

---

## 2. Identidad de marca

### Nombre
**LevelArc**. Verificado sin colisión en Play Store ni marca registrada en EUIPO (búsqueda 0 resultados). Pendiente que el usuario confirme en USPTO antes de registrar marca propia.
- Nombre de paquete sugerido: `app.levelarc` o `com.levelarc`
- Dominio: `levelarc.app` (libre). El `.com` está ocupado por una empresa de empleo sin marca registrada (riesgo bajo, otro sector).

### Logo
Concepto: **portal de medio punto + doble chevron ascendente** ("subir de nivel atravesando el portal").
- Versión completa (doble chevron) para splash y marketing.
- Versión simplificada (un solo chevron) para el icono de app a 48px.
- Color: cian arcano sobre fondo de mazmorra.
- Lockup: "Level" en hueso + "Arc" en cian.
- NOTA: los SVG actuales son bocetos de concepto. El asset final se vectoriza aparte; la tipografía del lockup no es la definitiva (ver §5).

### Tono de voz del "Sistema"
Seco, imperativo, solemne, estilo notificación de videojuego. Ej: "⚠️ Misión diaria: completa 3 hábitos." / "Has fallado, cazador. La racha se ha roto." El sabor Solo Leveling vive en el TONO, no en mecánicas tóxicas.

---

## 3. Paleta de color (cerrada)

### Marca — cian arcano (constante)
| Token | Hex | Uso |
|---|---|---|
| cian glow | `#2DE8D0` | brillos, hover |
| cian core | `#00D9C0` | acento principal, botones primarios |
| cian deep | `#00A896` | estados presionados |
| cian shadow | `#054A42` | fondos sutiles de marca |

**Secundario:** hueso cálido `#E8E0C9` (textos destacados, detalles neutros).

### Fondos — base de mazmorra
| Token | Hex |
|---|---|
| void (pantalla) | `#0A0A0F` |
| surface | `#13131C` |
| card | `#1C1C28` |
| border | `#2A2A3A` |

### Estados (feedback del tracker)
| Estado | Hex |
|---|---|
| completado | `#3DD68C` |
| fallado | `#FF6B6B` |
| racha activa | `#FFA94D` |
| pendiente | `#5A5A6E` |

### Rangos E → S (acento dinámico)
| Rango | Hex | Niveles |
|---|---|---|
| E | `#7A7A8C` | 1-9 |
| D | `#4DB8C4` | 10-24 |
| C | `#4D8BE0` | 25-44 |
| B | `#9B6BE0` | 45-69 |
| A | `#E84855` | 70-99 |
| S | `#F5C542` | 100+ |

Escala corregida para no colisionar con los estados (D≠completado, A≠fallado).

### Sistema de acento dual
- **Cian (marca):** constante. Logo, tab bar, acciones primarias, enlaces.
- **Color de rango (dinámico):** cambia según el rango actual del usuario. Alcance MVP: **barra de XP + badge de rango + glow de cabecera/avatar**. Token único `accentRank`, NUNCA hardcodeado en componentes; se inyecta vía contexto de tema. Verificar contraste de los 6 colores en modo oscuro.

---

## 4. Stack técnico (cerrado)

| Capa | Elección | Razón |
|---|---|---|
| Lenguaje | TypeScript | Tipado evita bugs numéricos en XP/niveles |
| Framework | React Native + Expo (managed) | Aprovecha base React; APK real; notificaciones |
| Navegación | Expo Router | Basado en archivos, tipo Next.js |
| Estado | Zustand | Ligero, poco boilerplate |
| Estilos | NativeWind (Tailwind RN) | Itera diseño rápido; base Tailwind previa |
| Base de datos | SQLite + Drizzle ORM | Local, offline, consultas tipadas, migraciones |
| i18n | español + inglés | Decidido desde el inicio |
| Notificaciones | expo-notifications | Recordatorios locales (offline) |

**Importante:** "offline sin base de datos" se reinterpretó correctamente como "sin servidor, con BD local". SQLite ES la base de datos, pero vive en el dispositivo.

---

## 5. Tipografía (cerrada)

| Rol | Fuente | Uso |
|---|---|---|
| Display | **Orbitron** (500/700) | Títulos, mensajes del "Sistema", nivel/XP/rango |
| Texto/UI | **Inter** (400/500) | Nombres de hábitos, ajustes, cuerpo, datos |

Ambas en Google Fonts (gratis, licencia OFL apta para monetizar) con soporte latino completo (acentos, ñ).

**Aviso de uso (importante):** Orbitron es sci-fi/tecnológica y muy temática. Funciona en títulos cortos y mayúsculas, pero CANSA y pierde legibilidad en bloques largos. Regla estricta: Orbitron SOLO para títulos breves, números y etiquetas del Sistema (pocas palabras). Nunca para párrafos. Todo el cuerpo y la UI van en Inter.

---

## 6. Gamificación (reglas cerradas)

### Fórmula de XP
- **Completar:** `XP = importancia (1-5) × multiplicador_de_racha`
- **Fallar:** `XP = − importancia base` (sin multiplicador). Recuperarse siempre es más barato que caer.

### Suelo de seguridad (crítico)
La penalización **nunca** baja de rango ni de nivel. Se pierde XP del nivel actual, pero el rango conquistado no se devuelve jamás. Evita la espiral de abandono.

### Multiplicador de racha
| Días consecutivos | Multiplicador |
|---|---|
| 1-3 | ×1.0 |
| 4-7 | ×1.25 |
| 8-14 | ×1.5 |
| 15-30 | ×1.75 |
| 31+ | ×2.0 |

### Curva de niveles — mixta
Fórmula de partida: `XP_acumulada(nivel) = 50 × nivel^1.8`. Rápida al inicio (engancha), dura arriba (rango S = proeza de meses). El exponente es tuneable.

### Modelo de datos: híbrido
- **Eventos** (qué hábito se completó/falló y cuándo) = fuente de verdad inmutable.
- **Totales cacheados** (XP, nivel, rango) para lectura rápida.
- Como el XP se deriva de eventos, se puede **recalcular** todo si se cambia la fórmula. Esto permite tunear sin romper datos.

### Tipos de hábito (MVP)
- **Binario:** hecho / no hecho. Cubre la mayoría (meditar, leer, no fumar).
- **Contable con meta:** llega a N/N (ej: agua 4/4). Un binario es matemáticamente un contable de meta 1.
- **Reparto de XP en contables:** todo o nada. Se gana `importancia × multiplicador` SOLO al alcanzar la meta completa. Progreso parcial (3/4) llena la barra visualmente pero NO da XP hasta cerrar la meta. Mantiene una sola lógica de XP coherente con el binario, sin fracciones.
- **No se puede completar más veces que la meta** (4/4 es el tope; no hay 5/4).

### Frecuencia
- Cada hábito puede fijar **días de la semana** en que aplica (ej: gym lun/mié/vie).
- Un día en que el hábito NO toca, NO cuenta como fallado.
- Solo frecuencia semanal por día. NADA de "cada 3 días", "2 veces al mes", etc. (fuera del MVP).

### Misiones diarias (versión mínima MVP)
Una sola misión fija, NO generativa: "Completa 3 hábitos hoy" → XP bonus. Reset diario. Sin variedad ni IA en el MVP.

### Penalización por inactividad (cerrado)
La inactividad (no abrir la app varios días) **solo rompe rachas**, NO resta XP retroactivo. La penalización de XP aplica únicamente cuando: (a) el usuario marca activamente un hábito como fallado, o (b) al cierre del día con la app activa y un hábito sin completar. Un hábito contable con progreso parcial (1/4) NO penaliza; solo penaliza el 0 absoluto al cierre del día, igual que un binario fallado. Esto preserva la tensión (perder rachas duele) sin la espiral de abandono.

---

## 7. Alcance del MVP

### Entra en v1
- Crear / editar / borrar hábitos con importancia (1-5)
- Marcar completado / fallado → ganar/perder XP
- Sistema de niveles, rangos E→S y rachas
- Misión diaria fija ("completa 3 hábitos")
- Pantalla de progreso (nivel, rango, XP, glow dinámico por rango)
- Notificaciones locales de recordatorio
- Backup / exportación de datos (CRÍTICO en app offline)
- Bilingüe ES/EN, modo oscuro

### Fuera del MVP (v2+)
- IA local (Gemma 4 E2B descargable opcional) para enriquecer mensajes del Sistema
- Misiones diarias generativas / dinámicas
- Logros complejos y estadísticas avanzadas
- Chat conversacional con el "Sistema"

### Capa IA (futura, documentada para no migrar luego)
- Modelo: Gemma 4 E2B (GGUF Q4, ~1.5-2GB), descargable desde Ajustes.
- Integración vía `llama.rn` (binding de llama.cpp).
- Contexto DETERMINISTA: el código TS consulta SQLite → arma el system prompt → 1 sola llamada al modelo. SIN subagentes ni tool-calling (el E2B falla tool calls ~75% del tiempo).
- El esquema de BD debe prever desde ya las tablas necesarias para no migrar.

---

## 8. Mapa de pantallas (propuesta de navegación)

Tab bar inferior (cian) con 4 secciones + pantallas modales.

```
Tabs:
  - Hoy (home)        → lista de hábitos del día, marcar completado/fallado, misión diaria
  - Hábitos           → gestión: crear/editar/borrar, ver todos
  - Progreso          → nivel, rango, XP, glow dinámico, historial de rachas
  - Ajustes           → idioma, tema, backup/exportar, (futuro) descarga IA

Modales / pantallas secundarias:
  - Crear/editar hábito  (nombre, importancia 1-5, recordatorio)
  - Detalle de hábito    (racha, historial, estadísticas básicas)
  - Onboarding           (primera vez: explicar el "Sistema")
  - Subida de rango      (pantalla celebratoria al ascender E→S)
```

Esto define el árbol de Expo Router. A validar y afinar antes de codificar.

---

## 9. Estructura de carpetas (propuesta Expo Router)

```
levelarc/
├── app/                        # Expo Router (rutas = archivos)
│   ├── (tabs)/
│   │   ├── index.tsx           # Hoy
│   │   ├── habits.tsx          # Hábitos
│   │   ├── progress.tsx        # Progreso
│   │   └── settings.tsx        # Ajustes
│   │   └── _layout.tsx         # Tab bar
│   ├── habit/
│   │   ├── new.tsx             # Crear hábito
│   │   └── [id].tsx            # Editar/detalle
│   ├── onboarding.tsx
│   ├── rank-up.tsx             # Celebración de ascenso
│   └── _layout.tsx             # Layout raíz (tema, i18n)
│
├── src/
│   ├── db/                     # SQLite + Drizzle
│   │   ├── schema.ts           # Tablas (PENDIENTE diseñar)
│   │   ├── client.ts           # Conexión
│   │   └── migrations/
│   ├── core/                   # Lógica de negocio pura (sin UI)
│   │   ├── xp.ts               # Fórmulas XP, multiplicador
│   │   ├── ranks.ts            # Umbrales E→S
│   │   ├── streaks.ts          # Cálculo de rachas
│   │   └── missions.ts         # Misión diaria
│   ├── stores/                 # Zustand
│   │   ├── habitsStore.ts
│   │   └── playerStore.ts      # Nivel, rango, XP
│   ├── theme/
│   │   ├── colors.ts           # Paleta (§3)
│   │   ├── rankAccent.ts       # Token dinámico accentRank
│   │   └── typography.ts
│   ├── components/             # UI reutilizable
│   ├── i18n/
│   │   ├── es.json
│   │   └── en.json
│   └── lib/
│       ├── notifications.ts
│       └── backup.ts           # Exportar/importar datos
│
├── assets/                     # Logo, iconos, fuentes
├── app.json                    # Config Expo (nombre, paquete, icono)
├── tailwind.config.js          # NativeWind + paleta
├── drizzle.config.ts
└── package.json
```

Separación clave: **`src/core/` es lógica pura sin UI** (las fórmulas de XP, rangos, rachas). Esto permite testearla aislada y reusarla cuando entre la IA. Es la columna vertebral del modelo híbrido.

---

## 10. Esquema de base de datos (cerrado, conceptual)

Modelo híbrido: `EVENTS` es la fuente de verdad inmutable; `PLAYER` son totales cacheados recalculables desde los eventos.

### Convenciones globales
- **IDs:** UUID (`text`), no enteros autoincrementales. Coste cero y abre la puerta a sync/backup entre dispositivos sin colisiones.
- **Fechas:** texto ISO 8601 (`"2026-05-24"` o con hora). SQLite no tiene tipo fecha nativo; el texto ISO es legible, ordenable y comparable. Convención estándar en SQLite/Drizzle.
- **Ajustes (idioma, tema, IA descargada):** NO van en SQLite. Van en AsyncStorage (4 preferencias sueltas, no datos relacionales).

### HABITS — definición de cada hábito
| Campo | Tipo | Notas |
|---|---|---|
| id | text PK | UUID |
| nombre | text | |
| importancia | int | 1-5 |
| tipo | text | "binario" \| "contable" |
| meta | int | N del contable; 1 para binarios (un binario = contable de meta 1) |
| dias_semana | text | ej. "1,3,5". Día que no toca ≠ fallado |
| hora_recordatorio | text | para notificación local; nullable |
| archivado | int | 0/1. NUNCA borrar de verdad por defecto: perder eventos descuadra el XP. Archivar oculta de la UI y preserva integridad |
| creado_en | text | ISO |

### EVENTS — fuente de verdad inmutable (corazón del híbrido)
| Campo | Tipo | Notas |
|---|---|---|
| id | text PK | UUID |
| habit_id | text FK | → HABITS |
| fecha | text | día del evento (ISO) |
| tipo_evento | text | "completado" \| "fallado" |
| xp_delta | int | XP ganado/perdido en ese evento |
| registrado_en | text | timestamp ISO |

Nunca se edita ni borra. Todo el estado del jugador se puede RECALCULAR recorriendo esta tabla. Si cambia la fórmula de XP, se recomputa desde aquí.

### PLAYER — totales cacheados (una sola fila, app sin cuentas)
| Campo | Tipo | Notas |
|---|---|---|
| id | int PK | siempre 1 |
| xp_total | int | |
| nivel | int | |
| rango | text | E/D/C/B/A/S |
| racha_misiones | int | días seguidos cumpliendo misión diaria |
| actualizado_en | text | ISO |

Derivable de EVENTS, cacheado para lectura instantánea. Es el lado "rápido" del híbrido.

### DAILY_MISSIONS — misión diaria (una fila por día)
| Campo | Tipo | Notas |
|---|---|---|
| fecha | text PK | día (ISO) |
| objetivo | int | ej. 3 |
| completados | int | hábitos hechos hoy |
| reclamada | int | 0/1 bonus reclamado |
| xp_bonus | int | recompensa al cumplir |

### Tablas de IA (DOCUMENTADAS, NO crear hasta v2)
Previstas para no migrar luego, pero NO se implementan en el MVP (crear tablas sin usar = deuda técnica).
- **AI_MESSAGES:** id PK, fecha, tipo, contenido, leido. Mensajes generados por el "Sistema".
- **AI_PROFILE:** id PK, resumen (texto rodante para el system prompt), actualizado_en.

Recordatorio de arquitectura IA (§7): el contexto se arma con consultas SQL deterministas, NO con tool-calling del modelo. Estas tablas solo almacenan salida/resumen, no son consultadas por el LLM directamente.

---

## 11. Próximos pasos (fase de código)

Toda la fase de diseño y conceptual está cerrada. Lo que queda es construcción:

1. Inicializar proyecto Expo (TypeScript, Expo Router, NativeWind, Drizzle).
2. Configurar `app.json` (nombre LevelArc, paquete, icono) y la paleta en `tailwind.config.js`.
3. Traducir este esquema a `src/db/schema.ts` (Drizzle) — solo las tablas del MVP (HABITS, EVENTS, PLAYER, DAILY_MISSIONS). NO las de IA.
4. Implementar `src/core/` (lógica pura, con tests): `xp.ts`, `ranks.ts`, `streaks.ts`, `missions.ts`. Antes que la UI.
5. Montar navegación (Expo Router) y pantallas según §8.
6. Sistema de tema con el token dinámico `accentRank`.
7. Notificaciones locales + backup/exportación (crítico).

### Estado del proyecto
- ✅ Identidad de marca (nombre, logo, paleta, acento dual)
- ✅ Tipografía
- ✅ Stack técnico
- ✅ Reglas de gamificación completas
- ✅ Alcance del MVP
- ✅ Mapa de pantallas y estructura de carpetas
- ✅ Esquema de base de datos (conceptual)
- ⬜ Código (siguiente fase)
