# LevelArc — Ficha de Google Play

Textos y respuestas para Play Console. Límites de Play: título 30 caracteres, descripción breve 80, descripción completa 4000. Los recuentos entre paréntesis están contados sobre el texto tal como aparece aquí; si cambias un texto, vuelve a contarlo.

Cada afirmación de la ficha está contrastada con el código de la versión `1.2.0`: 21 logros (`src/core/achievements.ts`), 5 títulos y 6 auras (`src/core/shop.ts`), nombres de atributos en inglés (`src/i18n/index.ts`) y tamaño del modelo (`src/ai/modelMetadata.ts`, 3 106 736 256 bytes).

## Datos generales

- Nombre del paquete: `app.levelarc`
- Categoría: Productividad
- Etiquetas sugeridas: Hábitos, Productividad, Salud y bienestar
- Correo de contacto: hola@levelarc.app
- Sitio web: https://levelarc.app
- Política de privacidad: https://levelarc.app/privacy/ (ES), https://levelarc.app/en/privacy/ (EN)
- Precio: gratis, sin compras dentro de la app, sin anuncios

## Español (es-ES)

**Título** (8): `LevelArc`

**Descripción breve** (68): `Hábitos como misiones: gana XP y sube de rango. Privado, sin cuenta.`

**Descripción completa** (1632)

```
LevelArc convierte tus hábitos en misiones diarias. Cada hábito que completas da XP según su importancia, mantiene tu racha y te acerca al siguiente rango, de E a S.

Todo se guarda en tu teléfono. No hay cuenta, no hay servidor y no hay suscripción.

CÓMO FUNCIONA
• Crea hábitos binarios (hecho o no hecho) o contables (por ejemplo, 8 vasos de agua).
• Elige los días de la semana y, si quieres, una hora de recordatorio.
• Marca cada hábito como completado o fallado. Fallar resta XP, pero nunca te baja de nivel.
• Completa todos los hábitos del día para reclamar la misión diaria.

PROGRESO QUE SE VE
• Niveles y rangos de E a S.
• Seis atributos que crecen con tus hábitos: Fuerza, Vitalidad, Intelecto, Voluntad, Carisma y Destreza.
• Rachas por hábito, consistencia de 30 días y mapa de actividad de 12 semanas.
• 21 logros y una tienda de títulos y auras que se desbloquean con Esencia, la moneda del juego. No se compra con dinero real.

PRIVADO POR DISEÑO
• Sin registro ni inicio de sesión.
• Sin anuncios ni analítica.
• Tus hábitos y tu progreso se guardan en el teléfono y no se envían a ningún servidor de LevelArc. Puedes exportar una copia de seguridad a un archivo y restaurarla cuando quieras.

NYX, EL SISTEMA (OPCIONAL)
NYX es la voz del Sistema: te recibe cada día y comenta tu progreso. Funciona sin conexión con respuestas predefinidas. Si quieres conversación libre, puedes descargar un modelo de IA de unos 3,1 GB que se ejecuta en tu propio teléfono; nada de lo que escribes se envía a un servidor. Requiere un dispositivo con memoria suficiente y es totalmente opcional.

Disponible en español e inglés.
```

## English (en-US)

**Title** (8): `LevelArc`

**Short description** (68): `Habits as missions: earn XP and rank up. Private, no account needed.`

**Full description** (1547)

```
LevelArc turns your habits into daily missions. Every habit you complete earns XP based on its importance, keeps your streak alive and moves you towards the next rank, from E to S.

Everything is stored on your phone. No account, no server and no subscription.

HOW IT WORKS
• Create yes/no habits or countable ones (for example, 8 glasses of water).
• Pick the days of the week and, if you want, a reminder time.
• Mark each habit as completed or failed. Failing costs XP, but it never drops your level.
• Complete every habit of the day to claim the daily mission.

PROGRESS YOU CAN SEE
• Levels and ranks from E to S.
• Six attributes that grow with your habits: Strength, Vitality, Intellect, Willpower, Charisma and Dexterity.
• Per-habit streaks, 30-day consistency and a 12-week activity map.
• 21 achievements and a shop of titles and auras unlocked with Essence, the in-game currency. It cannot be bought with real money.

PRIVATE BY DESIGN
• No sign-up, no login.
• No ads, no analytics.
• Your habits and progress are stored on the phone and are never sent to a LevelArc server. You can export a backup file and restore it whenever you want.

NYX, THE SYSTEM (OPTIONAL)
NYX is the voice of the System: it greets you each day and comments on your progress. It works offline with built-in replies. If you want free conversation, you can download an AI model of about 3.1 GB that runs on your own phone; nothing you type is sent to a server. It needs a device with enough memory and is entirely optional.

Available in Spanish and English.
```

## Seguridad de los datos (Data safety)

| Pregunta | Respuesta |
|---|---|
| ¿La app recopila o comparte datos de usuario? | No |
| ¿Los datos se cifran en tránsito? | No aplica: la app no transmite datos de usuario |
| ¿Se puede solicitar la eliminación de datos? | No aplica: no hay datos en servidores. El usuario los borra desde Ajustes → Peligro → Resetear todo o desinstalando |

Tráfico de red que sí existe, y por qué no cuenta como recopilación:

- Comprobación de actualizaciones de la app (Expo Updates, `u.expo.dev`): al arrancar y desde Ajustes, la app pregunta al servidor de actualizaciones con identificadores técnicos de la versión instalada. No incluye datos del usuario ni de sus hábitos.
- Descarga opcional del modelo de IA desde Hugging Face (`huggingface.co`): la inicia el usuario; es una descarga de archivo, no envía contenido del usuario.
- Enlaces de Ajustes → Acerca de: abren la web o el correo en otra aplicación. La app no hace esa petición.

No hay más llamadas de red en el código: sin analítica, sin informes de errores y sin notificaciones push. `expo-notifications` trae Firebase Messaging como dependencia, pero la app no registra ningún token ni configura Firebase.

Copia de seguridad de Android: la app mantiene activada la copia automática del sistema (sin el modelo de IA). Si el usuario tiene la copia de Google activada en su teléfono, Android guarda la base de datos en la cuenta de Google del propio usuario. Play no lo trata como recopilación por parte del desarrollador, pero la política de privacidad de la web debe mencionarlo, y por eso la ficha dice "ningún servidor de LevelArc" en vez de "tus datos no salen del dispositivo".

Si en el futuro se añade analítica, informes de errores o sincronización, esta sección y la política de privacidad deben actualizarse antes de publicar.

## Clasificación de contenido

Cuestionario IARC: sin violencia, sin contenido sexual, sin lenguaje soez, sin sustancias, sin apuestas, sin interacción entre usuarios, sin compartir ubicación, sin compras. Resultado esperado: apta para todos los públicos (PEGI 3).

El chat con IA genera texto en el dispositivo. Declararlo en "Contenido generado por IA" si Play Console lo pregunta: la generación es local, sin moderación en servidor, y el usuario es el único destinatario.

## Público objetivo

13 años o más. No está dirigida a niños. Es una decisión de producto por confirmar al rellenar el cuestionario.

## Recursos gráficos pendientes

- Icono 512 × 512 (derivar de `assets/icon.png`).
- Gráfico de funciones 1024 × 500.
- Capturas de teléfono: mínimo 2, recomendado 6 (Hoy, Hábitos, Progreso, Logros, Tienda, NYX), en español e inglés, tomadas del build de producción.
