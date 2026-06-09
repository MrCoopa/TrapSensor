# Geschäftsmodell & Kostendeckung: CatchSensor Backend

Das Problem der fixen Serverkosten bei einmaligem Hardwareverkauf ist ein Klassiker im IoT-Bereich. Hier ist eine Analyse, warum das Problem kleiner ist als gedacht, und wie du es lösen kannst.

## 1. Die "Per-Sensor" Kalkulation
Ein Standard-VPS für **5,00 € / Monat** (z.B. Hetzner CX21) kann problemlos **500 bis 1.000 Sensoren** gleichzeitig verarbeiten, da diese nur alle paar Stunden kurz "hallo" sagen.

| Anzahl Sensoren | Kosten pro Sensor / Monat | Kosten pro Sensor / 10 Jahre |
|-----------------|---------------------------|------------------------------|
| 50              | 0,10 €                   | 12,00 €                      |
| 100             | 0,05 €                   | 6,00 €                       |
| 500             | 0,01 €                   | 1,20 €                       |

**Fazit:** Wenn du im Verkaufspreis einmalig **15,00 € als "Cloud-Pauschale"** einplanst, sind deine Serverkosten für über 10 Jahre gedeckt, selbst wenn du nur 50 Geräte verkaufst.

## 2. Strategien zur Kostendeckung

### Strategie A: Das "Inklusive"-Modell (Empfohlen für den Start)
Du verkaufst den Melder für z.B. **129,00 €**.
- Darin enthalten: Hardware, SIM-Karte (10 Jahre) und **Backend-Zugang für 10 Jahre**.
- Da die Hardwarekosten bei ca. 40 € liegen, hast du ca. 90 € Marge. Davon gehen 10 € für die SIM und 15 € als Puffer für den Server weg. Bleiben **65 € Reingewinn** pro Melder.

### Strategie B: Das "Freemium"-Modell
- Die App bietet Basisfunktionen (Push-Alarm) kostenlos für 2 Jahre an.
- Erweiterte Funktionen (Jagdtagebuch-Export, teilen mit mehr als 3 Mitjägern, SMS-Alarm statt Push) kosten **10 € pro Jahr**.
- Jäger hassen Abos, aber für "Premium-Komfort" zahlen sie eher als für die nackte Funktion.

### Strategie C: Die "Self-Host" Option (Community-Ansatz)
Du verkaufst die Hardware und stellst das Backend als **Open Source** (Docker) zur Verfügung.
- Profis hosten selbst.
- Wer "keine Lust auf Technik" hat, zahlt dir eine kleine Gebühr (Managed Hosting).

## 3. Risikominimierung
- **Skalierung:** Nutze Serverlose Datenbanken oder kleine VPS, die mitwachsen.
- **Vorausbezahlung:** Nutze das eingenommene Geld der ersten Verkäufe, um den Server für 2-3 Jahre im Voraus zu decken.

---
> [!TIP]
> **Rechnung:** Bei nur 100 verkauften Geräten hast du bei 129€ Preis ca. 6.500 € Gewinn nach Hardware/SIM. Davon kannst du den 5€-Server **108 Jahre** lang bezahlen. Die fixen Kosten sind also bei einer gewissen Stückzahl vernachlässigbar! 🦊📈☁️
