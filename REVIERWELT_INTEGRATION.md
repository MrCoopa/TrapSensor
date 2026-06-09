# Integration: CatchSensor & Revierwelt

Die Anbindung an **Revierwelt** macht für dein Produkt extrem viel Sinn. In Deutschland ist es die marktführende Plattform für Revierverwaltung, und viele Jäger wollen nicht für jeden Sensor eine eigene App nutzen, sondern alles zentral an einem Ort haben.

## 1. Warum Revierwelt-Anbindung?
- **Zentralisierung:** Der Jäger sieht seine Fallen, Wildkameras, Kirrungen und Abschüsse in einer einzigen App.
- **Gesetzliche Dokumentation:** Revierwelt erstellt automatisch rechtskonforme Fangbücher.
- **Verkaufsargument:** Ein Melder, der "Revierwelt-ready" ist, lässt sich deutlich teurer und leichter an professionelle Pächter verkaufen.

## 2. Technische Umsetzung (Wege der Integration)

### Weg A: Die "E-Mail-Brücke" (Einfach & Schnell)
Das ist der Standardweg für viele Drittanbieter:
- Dein CatchSensor-Backend schickt bei jedem Fang eine speziell formatierte E-Mail an `portal@revierwelt.de`.
- Im Betreff oder Text steht die Geräte-ID.
- Revierwelt erkennt die Nachricht und löst den Alarm im System aus.

### Weg B: Direkte API-Partnerschaft (Professionell)
Revierwelt bietet Herstellern an, ihre Geräte direkt zu integrieren (ähnlich wie MinkPolice oder TRAPMASTER).
- Dein Server sendet die Daten direkt per Webhook (HTTP POST) an die Revierwelt-Schnittstelle.
- **Vorteil:** Keine Verzögerung durch E-Mails, höchste Zuverlässigkeit.
- **Aufwand:** Hierfür müsste man Kontakt mit dem Revierwelt-Support aufnehmen, um als "Hersteller" gelistet zu werden.

## 3. Strategische Empfehlung
- **Phase 1:** Implementiere im Backend eine Option "Revierwelt-Weiterleitung", bei der der User seine Revierwelt-ID einträgt. Dein Server schickt dann die E-Mail/den Webhook.
- **Phase 2:** Wenn du die erste Serie von z.B. 50 Geräten verkaufst, trittst du an Revierwelt heran, um als offiziell unterstütztes Gerät (Select-Menü in der App) gelistet zu werden.

---
> [!IMPORTANT]
> **Marketing-Tipp:** Du kannst den CatchSensor als "Preis-Leistungs-Sieger für Revierwelt-Nutzer" bewerben. Profi-Melder mit Revierwelt-Anbindung kosten oft über 200€ – du kannst das für die Hälfte anbieten. 🦊🦌🐗🔄
