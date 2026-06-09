# Akkulaufzeit-Analyse: CatchSensor (NB-IoT)

Dank der extremen Stromspar-Modi des STM32 und der hohen Kapazität von Lithium-Batterien erreicht der CatchSensor eine beachtliche Laufzeit.

## 1. Annahmen
- **Batterien**: 2x AA Lithium (Energizer Ultimate) = ca. **3000 mAh** Kapazität.
- **Intervall**: 3 Meldungen pro Tag (alle 8 Stunden).
- **Technik**: STM32 im Stop Mode, SIM7020E komplett ausgeschaltet (Power Down).

## 2. Stromverbrauch-Kalkulation
| Zustand | Stromverbrauch (ca.) | Dauer pro Tag | Verbrauch pro Tag |
|---------|-----------------------|---------------|-------------------|
| **Deep Sleep** | 20 µA (0,02 mA) | 23h 59min | **0,48 mAh** |
| **Senden (NB-IoT)** | 100 mA (Schnitt) | 3x 15 Sek. = 45 Sek. | **1,25 mAh** |
| **Summe Gesamt** | | | **ca. 1,73 mAh** |

## 3. Geschätzte Laufzeit
Theoretisch: 3000 mAh / 1,73 mAh/Tag = **1734 Tage**.

Da Batterien eine Selbstentladung haben und Kälte die Kapazität reduziert, rechnen wir mit einem **Sicherheitsfaktor von 30%**:
- **Realistische Laufzeit: ca. 1200 Tage (~3,3 Jahre)**.

## 4. Faktoren, die die Laufzeit beeinflussen
- **Netzqualität**: Wenn das NB-IoT Signal schwach ist, braucht das Modul länger zum Einwählen (statt 15 Sek. vielleicht 45 Sek.). Das verkürzt die Laufzeit.
- **Häufigkeit der Auslösung**: Jede tatsächliche Auslösung der Falle kostet so viel Strom wie ein Keep-Alive (ca. 0,4 mAh). Bei 10 Fängen im Monat ist das vernachlässigbar.
- **Umgebungstemperatur**: Lithium-Batterien halten Frost sehr gut aus, aber bei -20°C sinkt die verfügbare Energie dennoch leicht.

---
## Tipps für maximale Ausdauer
1. **LDO weglassen**: Jedes Bauteil zwischen Batterie und Chips "stiehlt" Strom. Der direkte Anschluss (wie im Schematic Guide) ist am effizientesten.
2. **Debug-LEDs**: Deaktiviere alle permanent leuchtenden LEDs auf dem Board. Eine LED verbraucht oft 2-5 mA – das ist das 250-fache des gesamten schlafenden Sensors!
3. **Schwebende Pins**: Alle ungenutzten Pins am STM32 sollten im Code auf "Analog Input" oder "Output Low" gesetzt werden, um parasitäre Kriechströme zu verhindern.

**Fazit:** Mit deinem Setup (2x AA Lithium + NB-IoT) musst du die Batterien vermutlich nur **alle 3 Jahre** wechseln. 🦊🔋✨
