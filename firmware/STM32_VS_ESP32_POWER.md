# Vergleich: STM32 vs. ESP32 (Akkulaufzeit)

Warum haben wir uns für den STM32 (L0/L4) entschieden und nicht für den populären ESP32? Hier ist der direkte Vergleich für eine Low-Power Anwendung wie den CatchSensor.

## 1. Stromverbrauch im Tiefschlaf (Deep Sleep)
Das ist der wichtigste Wert, da der Melder zu 99,9 % der Zeit schläft.

| Bereich | STM32 (L0/L4 bare) | ESP32 (bare) | Faktor |
|---------|--------------------|--------------|--------|
| **Deep Sleep Strom** | **1 – 2 µA** | **10 – 50 µA** | ~10x bis 25x |
| **Mit Dev-Board** | ~10 µA (SB-Mods) | 50 – 150 µA | ~10x |

**Fazit:** Der ESP32 verbraucht im Schlaf so viel wie 10 bis 25 STM32 zusammen. 

## 2. Stromverbrauch im Betrieb (Active)
Wenn der Controller aufwacht, um die Sensoren zu lesen und das SIM-Modul zu steuern:

- **STM32**: ca. **2 - 4 mA** (bei 16 MHz).
- **ESP32**: ca. **40 - 70 mA** (ohne WiFi/BT).

**Fazit:** Der ESP32 "frisst" während des Datensendens (was ca. 15-30 Sek. dauert) massiv mehr Energie als der STM32.

## 3. Betriebsspannung & Regler
- **STM32**: Läuft stabil von **1,8V bis 3,6V**. Du kannst ihn direkt an die 2x AA Lithium Batterien hängen.
- **ESP32**: Braucht meist stabile **3,0V bis 3,6V**. Sinkt die Batteriespannung auf 2,8V, stürzt der ESP32 oft ab, während der STM32 fröhlich weiterarbeitet. Oft ist beim ESP32 ein LDO (Spannungsregler) nötig, dessen Eigenverbrauch ("Quiescent Current") die Batterie zusätzlich leert.

## 4. Aufwachzeit (Wake-up Latency)
- **STM32**: Ist in **Mikrosekunden** voll einsatzbereit.
- **ESP32**: Braucht nach dem Deep Sleep mehrere **Millisekunden**, um den Bootloader und das Framework (IDF/Arduino) zu laden. Auch diese Zeit kostet Energie.

---

## Zusammenfassung der Laufzeit (2x AA Lithium)
Basierend auf 3 Meldungen pro Tag:

| System | Geschätzte Laufzeit |
|--------|---------------------|
| **STM32 + SIM7020E** | **ca. 3 - 4 Jahre** |
| **ESP32 + SIM7020E** | **ca. 6 - 9 Monate** |

**Das Urteil:** Der ESP32 ist ein fantastischer Controller für WiFi-Projekte an einer Steckdose oder mit großem Akku. Für einen autarken Sensor, der Jahre im Wald überleben soll, ist der **STM32 die klar überlegene Wahl**. 🦊🏆
