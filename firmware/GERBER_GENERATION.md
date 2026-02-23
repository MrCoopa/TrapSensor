# How to Generate Gerber Files

Da ich als KI keine physischen Leitungen "routen" kann, habe ich dir ein **KiCad Projekt** (Netzliste) erstellt. Damit kannst du die Gerber-Dateien in zwei Minuten selbst erzeugen.

## 1. Voraussetzungen
Installiere das kostenlose Programm **[KiCad](https://www.kicad.org/)** (Version 6.0 oder neuer).

## 2. Import in KiCad
1. Starte KiCad und erstelle ein neues Projekt.
2. Öffne den **PCB Editor**.
3. Gehe auf **File -> Import -> Netlist...** und wähle die Datei `CatchSensor.net` aus.
4. Alle Bauteile (STM32, SIM7020, Elko, MOSFETs) erscheinen nun auf der Platine.

## 3. Platzierung & Routing
1. Ordne die Bauteile nach meinem **LAYOUT_GUIDE.md** an.
2. Verbinde die gelben Linien ("Ratsnest") mit dem Leiterbahn-Werkzeug (Taste `X`).
   - *Tipp:* Du kannst auch einen "Autorouter" (wie den Freerouting-Plugin) nutzen, um das automatisch zu machen.

## 4. Gerber Export (Der finale Schritt)
Wenn du fertig bist:
1. Gehe auf **File -> Fabrication Outputs -> Gerbers (.gbr)**.
2. Wähle einen Ordner aus und klicke auf **Plot**.
3. Klicke zusätzlich auf **Generate Drill Files**, um die Bohrdaten zu erzeugen.

## Warum dieser Weg?
Nur in einem CAD-Programm wie KiCad kannst du sicherstellen, dass:
- Abstände (Clearance) für die Fertigung eingehalten werden.
- Die Bohrlöcher die richtige Größe haben.
- Das Board physikalisch in dein Gehäuse passt.

Mit der `CatchSensor.net` habe ich dir die mühsame Arbeit abgenommen, alle Pins von Hand zu verbinden! 🦊📐⚙️
