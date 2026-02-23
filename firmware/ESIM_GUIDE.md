# eSIM Guide: CatchSensor (MFF2 Embedded SIM)

Anstatt einer klassischen Plastik-SIM-Karte kannst du für den CatchSensor auch eine **eSIM im MFF2-Format** nutzen. Das bietet vor allem im Außeneinsatz große Vorteile.

## 1. Was ist eine MFF2 eSIM?
Es handelt sich um einen winzigen Chip (ca. 5x6 mm), der direkt auf die Platine gelötet wird. Es gibt keinen Plastik-Träger und keinen mechanischen SIM-Halter mehr.

### Vorteile:
- **Vibrationsfest:** In der Natur (Wind, Tiere, Erschütterungen) können SIM-Halter manchmal Kontaktprobleme bekommen. Ein gelöteter Chip ist absolut sicher.
- **Platzsparend:** Der MFF2-Chip ist viel kleiner als ein Nano-SIM-Halter.
- **Korrosionsschutz:** Da keine offenen Kontakte vorhanden sind, ist das System widerstandsfähiger gegen Feuchtigkeit.

## 2. Hardware-Anpassung
Der SIM7020E unterstützt MFF2 nativ. Du musst lediglich auf deinem PCB den Platz für den SIM-Halter durch ein **MFF2-Footprint** ersetzen.

- **VCC, GND, RST, CLK, DATA**: Die Anschlüsse sind identisch mit der normalen SIM.
- **Bezugsquelle**: Anbieter wie **1NCE** oder **Things Mobile** verkaufen ihre Tarife auch direkt als MFF2-Chips ("Industrial SIMs").

## 3. Software
Für den STM32 und den SIM7020E macht es **keinen Unterschied**. Die AT-Kommandos bleiben exakt gleich. Das Modul erkennt den Chip am SIM-Bus genau wie eine normale Karte.

## 4. Wann solltest du eSIM nutzen?
- **Ja**, wenn du ein eigenes PCB designst und maximale Zuverlässigkeit für 10 Jahre willst.
- **Nein**, wenn du die Flexibilität willst, den Anbieter jederzeit durch einfaches Umstecken zu wechseln.

## 5. Anbieter wechseln: Das eUICC-Thema
Hier muss man zwischen zwei Varianten unterscheiden:

### Variante A: Standard MFF2 (Fest programmiert)
Die meisten MFF2-Spezialchips (z.B. von 1NCE) sind fest auf diesen Anbieter eingestellt. Wenn du den Anbieter wechseln willst, müsstest du den Chip **auslöten** und einen neuen einlöten. Das ist ein "Vendor Lock-in".

### Variante B: eUICC (Echte eSIM mit Remote Provisioning)
Wenn der MFF2-Chip den **eUICC-Standard** unterstützt, kannst du den Anbieter **per Funk (Over-the-Air)** wechseln, ohne die Hardware anzufassen.
- **Vorteil:** Maximale Zukunftssicherheit.
- **Nachteil:** Diese Chips und die zugehörigen Management-Plattformen sind für Privatpersonen aktuell schwerer zu bekommen und oft teurer in der Einrichtung.

## Fazit für den CatchSensor
Für dein Projekt ist die **Nano-SIM im Halter** am flexibelsten. Wenn du aber eine Serie von 50 Stück baust und weißt, dass du 10 Jahre bei einem Anbieter bleibst, ist die **gelötete MFF2 (Variante A)** die stabilste und günstigste Wahl. 🦊🔄⚙️
