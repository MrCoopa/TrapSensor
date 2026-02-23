# Layout & Assembly Guide: CatchSensor (Custom PCB)

Dieses Dokument beschreibt, wie du die Komponenten auf deinem PCB oder deiner Lochrasterplatine anordnen solltest, um maximale Stabilität und Effizienz zu erreichen.

## 1. Komponenten-Platzierung (Topologie)
Für minimale Störungen (EMI) und stabilen Betrieb folge diesem "Zonen-Konzept":

### Zone A: Power & NB-IoT (High Current)
- **Position**: Nahe am Batterie-Eingang.
- **SIM7020E**: Platziere das Funkmodul so, dass die Antenne (U.FL/SMA Connector) direkt am Platinenrand liegt.
- **Kondensator (1000µF)**: Er **muss** physisch so nah wie möglich an den VBAT/GND Pins des SIM7020E liegen. Jedes Millimeter Leiterbahn dazwischen erhöht den Widerstand und kann zum Absturz führen.

### Zone B: Mikrocontroller (Control)
- **STM32**: In der Mitte der Platine.
- **Abstand**: Halte ca. 1-2cm Abstand zur Antenne des SIM7020E, um Einstreuungen in den ADC (Batteriemessung) zu minimieren.
- **Entkopplung**: Die 100nF Keramikkondensatoren müssen direkt (!) an die VDD-Pins des STM32 gelötet werden.

### Zone C: Interfaces (Low Frequency)
- **Reed-Sensor Anschluss**: Am gegenüberliegenden Ende der Antenne.
- **Programming Header (SWD)**: Gut erreichbar am Rand.

## 2. Bestückungsplan (Beispiel Lochraster)
Wenn du auf einer Lochrasterplatine aufbaust, empfiehlt sich dieses Layout:

```text
[ ANTENNE ]  [ SIM7020E MODUL ]  [ ELKO 1000uF ]
     |              |                   |
     +--------------+-------------------+---- (VCC Schiene)
                    |
[ REED CONN ]  [ STM32 CHIP / MODUL ]  [ BATT CONN ]
                    |                   |
     +--------------+-------------------+---- (GND Schiene)
```

## 3. Verdrahtungs-Tipps
1. **Sternpunkt-Masse**: Führe die Masse (GND) von der Batterie, vom SIM7020E und vom STM32 an einem zentralen Punkt zusammen (nahe am Elko).
2. **UART-Leitungen**: Die Leitungen zwischen STM32 (PA2/PA3) und SIM7020E sollten parallel und kurz sein.
3. **Batterie-Leitungen**: Benutze für die Hauptstromversorgung (VCC/GND vom SIM7020 zur Batterie) etwas dickeren Schaltdraht oder breite Leiterbahnen.

## 4. Checkliste vor dem ersten Einschalten
- [ ] Messe den Widerstand zwischen VCC und GND (darf kein Kurzschluss sein).
- [ ] Prüfe die Polung des 1000µF Elektrolytkondensators (Minus an GND!).
- [ ] Kontrolliere, ob die 2N7002 MOSFETs richtig herum eingebaut sind (Gate/Source/Drain Verwechslungsgefahr).
- [ ] Stelle sicher, dass keine Lötspritzer die feinen Pins des STM32 oder SIM7020 kurzschließen.

---
> [!IMPORTANT]
> **Erster Test:** Schließe erst nur den STM32 an und flashe den Test-Code. Wenn der läuft, schließe das SIM7020E Modul an. So verhinderst du, dass ein Fehler in der Funk-Sektion den Controller grillt.
