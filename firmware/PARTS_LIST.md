# Bill of Materials (BOM): CatchSensor (STM32 NB-IoT)

Diese Liste enthält alle Komponenten, die du für den Bau eines autarken, batteriebetriebenen CatchSensors benötigst.

## 1. Kern-Komponenten
| Bauteil | Empfehlung | Funktion |
|---------|------------|----------|
| **Mikrocontroller** | STM32L053R8 (Nucleo-64) oder STM32L432KC (Nucleo-32) | Das "Gehirn", extrem stromsparend im Deep Sleep. |
| **NB-IoT Modul** | Waveshare SIM7020E NB-IoT Board | Funkmodul zur Übertragung der Daten via MQTT. |
| **SIM-Karte** | Things Mobile oder 1NCE | **Nano-SIM Halter** (Empfohlen für Flexibilität). |

## 2. Sensorik & Interaktion
| Bauteil | Empfehlung | Funktion |
|---------|------------|----------|
| **Reed-Sensor** | Standard Reed-Kontakt (Schließer/NO) | Erkennt die Auslösung der Falle per Magnetfeld. |
| **Magnet** | Starker Neodym-Magnet (z.B. 10x5x2mm) | Wird an der Falle befestigt, um den Reed-Sensor zu schalten. |

## 3. Energieversorgung
| Bauteil | Empfehlung | Funktion |
|---------|------------|----------|
| **Batterien** | 2x Energizer Ultimate Lithium AA (L91) | Beste Wahl für Kälte und lange Lebensdauer (~3,4V total). |
| **Batteriehalter** | 2x AA Halter (geschlossen oder Clip) | Aufnahme für die Batterien. |
| **Kondensator** | 1000µF 10V (Elektrolytkondensator) | **Wichtig:** Puffer für Stromspitzen des SIM7020 beim Senden. |

## 4. Kleinteile (Elektronik)
| Bauteil | Empfehlung | Funktion |
|---------|------------|----------|
| **Widerstände** | 2x 100k Ohm (1% Toleranz) | Spannungsteiler für die Batteriemessung an Pin PA0. |
| **Antenne** | NB-IoT / LTE-M Stabantenne oder Klebeantenne | Wird meist mit dem SIM7020 Set geliefert (IPEX/U.FL). |
| **Gehäuse** | IP67 Wasserdichtes Gehäuse (ABS/Polycarbonat) | Schützt die Elektronik vor Regen und Feuchtigkeit im Wald. |

## 5. Werkzeug & Zubehör
- **Lötstation & Lötzinn**
- **Jumper-Kabel** (für Prototyping) oder **Lochrasterplatine** (für festen Aufbau)
- **Kabelverschraubung (PG7)**: Um das Kabel des Reed-Sensors wasserdicht ins Gehäuse zu führen.

---
> [!TIP]
> **Energiespartipp:** Wenn du die Nucleo-Boards für den finalen Bau benutzt, entferne die "SB62" und "SB63" Lötbrücken (siehe Board-Anleitung), um den On-Board-Debugger (ST-Link) vom Strom zu trennen. Das senkt den Stromverbrauch im Schlafmodus massiv!
