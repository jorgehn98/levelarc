# LevelArc — Personaje del Sistema (dirección de arte)

Guía para generar los sprites del personaje que aparece en las "Apariciones del Sistema".
Las imágenes finales van en `assets/character/{neutral,celebrate,serious}.png` (PNG sin fondo).
Mapeo en `src/components/systemCharacter.ts` (descomentar `source` por pose).

## Concepto

"El Sistema" encarnado como una **guía holográfica**: una entidad joven, etérea y andrógina-femenina, hecha de luz cian semitranslúcida. No es humana del todo: es la interfaz viva del juego. Fría, autoritaria, pero con presencia. Encaja con el tono "Solo Leveling / el Sistema" (seco, imperativo) y con la identidad de marca (oscuro, cian `#3FCAE6`, circuitos, anillos de rango E–S).

## Paleta y reglas de estilo

- Cian de marca `#3FCAE6` (emisión/glow), blanco-hueso `#E8E0C9` (luces altas), fondo de marca negro-azulado `#0A0A0F` (armadura).
- Holograma semitranslúcido con rim light neón cian, glifos HUD flotando, anillos de rango orbitando.
- Estilo: **anime / cel-shaded semirrealista**, lineart limpio, alto detalle, glow neón, atmósfera oscura.
- Mismo personaje, misma paleta y mismo encuadre relativo en TODAS las poses (consistencia visual).

## Especificaciones técnicas

- Resolución: **1024×1024** (o 1024×1536 vertical). PNG con **transparencia real (alpha)**.
- Encuadre: **medio cuerpo / busto** (de pecho para arriba), personaje centrado, ligeramente girado a su derecha (hacia donde irá el bocadillo), mirando al jugador. Deja aire alrededor (no recortes la cabeza).
- Transparencia: si tu generador no da alpha, genera sobre **fondo negro plano** o verde croma y recorta (remove.bg / herramienta de recorte).
- Consistencia entre poses: reutiliza el **bloque base** idéntico + la misma semilla/seed o referencia de personaje (p. ej. Midjourney `--cref`). Genera primero `neutral`, fíjalo como referencia y deriva el resto.
- Prompts en inglés (rinden mejor en los generadores).

## Bloque base (pega esto IGUAL al inicio de cada prompt)

```
A holographic guide spirit called "The System": a youthful, ethereal, androgynous-feminine humanoid made of semi-translucent glowing cyan light (#3FCAE6) with bone-white highlights. Luminous pupil-less cyan eyes, short layered hair whose tips dissolve into cyan data particles. Wearing dark navy-black (#0A0A0F) arcane-futuristic light armor/robe with neon cyan circuit lines along the edges and a glowing hexagonal System emblem on the chest. Faint floating HUD glyphs and orbiting rank rings (E to S). Clean cel-shaded anime / semi-realistic style, crisp lineart, strong neon rim light, dark moody "Solo Leveling System" aesthetic. Front-facing bust / half-body framing, centered, slightly turned to its right, looking at the viewer. Transparent background, isolated character, no scenery, no floor.
```

## Prompts por imagen

### 1) `neutral.png` — presentando / hablando (tono neutro)
```
[BLOQUE BASE] + Calm, composed, authoritative expression; one open hand raised forward as if presenting data; serene steady cyan glow; HUD glyphs softly hovering. Neutral, informative mood.
```

### 2) `celebrate.png` — reconocimiento (tono celebrate)
```
[BLOQUE BASE] + Faint approving half-smile (cold but satisfied), a confident closed fist or subtle "well done" gesture; brighter, intensified glow with upward-floating green-cyan spark particles; rank rings shining. Triumphant, approving mood.
```

### 3) `serious.png` — severo / advertencia (tono serious)
```
[BLOQUE BASE] + Stern frown, arms crossed or one finger pointing at the viewer; glow tinted with amber/red alert (#FFA94D / #FF6B6B) over the cyan; warning glyphs flickering; piercing gaze. Strict, admonishing mood.
```

### Extra opcionales (si más adelante cableamos más triggers o quieres riqueza)

- `greeting.png` — bienvenida (al volver tras ausencia): mano al pecho o leve inclinación, gesto acogedor, glow suave.
- `thinking.png` — procesando: mano en el mentón, glifos girando, mirada lateral.

## Cómo enchufarlas (cuando tengas los PNG)

1. Crea `assets/character/` y mete `neutral.png`, `celebrate.png`, `serious.png` (sin fondo).
2. En `src/components/systemCharacter.ts`, descomenta el `source: require('../../assets/character/<pose>.png')` de cada pose.
3. Si falta una pose, el overlay cae al emblema placeholder con el glow del tono (no rompe nada).
