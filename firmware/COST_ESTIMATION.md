# Kostenschätzung: CatchSensor (STM32 + NB-IoT)

Hier ist eine Kalkulation für den Bau eines Melders, basierend auf aktuellen Marktpreisen.

## 1. Einzelstück (Prototyp auf PCB)
Wenn du Komponenten einzeln bei Händlern wie Amazon, eBay oder deutschen Elektronikshops kaufst:

| Bauteil | Preis (ca.) |
|---------|-------------|
| STM32 (L0/L4 bare chip) | 4,00 € |
| SIM7020E Modul | 8,00 € |
| 1NCE oder Things Mobile (ca. 10€) | 10,00 € |
| 2x AA Lithium Batterien | 5,00 € |
| PCB (Anteil bei 5er Bestellung) | 2,00 € |
| IP67 Gehäuse | 6,00 € |
| Kleinteile (Antenne, Reed, MOSFETs, Elko) | 5,00 € |
| **Summe Einzelstück** | **ca. 40,00 €** |

---

## 2. Kleinserie (10+ Stück)
Wenn du direkt bei Großhändlern (z.B. LCSC, AliExpress) bestellst, sinken die Preise massiv:

| Bauteil | Preis (ca.) |
|---------|-------------|
| STM32 (Mengenrabatt) | 2,50 € |
| SIM7020E (Mengenrabatt) | 5,50 € |
| 1NCE oder Things Mobile | 10,00 € |
| 2x AA Lithium (Großpackung) | 3,50 € |
| PCB (Bleibt günstig) | 1,00 € |
| IP67 Gehäuse (Direktimport) | 3,00 € |
| Kleinteile (Bulk) | 2,00 € |
| **Summe pro Stück** | **ca. 27,50 €** |

---

## 3. Einmalige Fixkosten
- **Versandkosten** (Backpfeifen-Effekt bei vielen kleinen Bestellungen): ca. 15-20 €
- **Werkzeug** (Lötstation etc.), falls nicht vorhanden.

## Analyse & Fazit
- **Der größte Posten:** Die SIM-Karte (10 €) und das Funkmodul (8 €). Das sind Fixkosten für die Konnektivität.
- **Laufende Kosten:** Nahezu 0,00 € (dank IoT-Tarifen wie Things Mobile oder 1NCE).
- **Batteriekosten:** Da Lithium-Zellen ca. 2-3 Jahre halten sollten, liegen die Wartungskosten bei ca. 1,50 € pro Jahr.

**Tipp:** Wenn du 5 Stück gleichzeitig baust, liegst du wahrscheinlich bei etwa **30-35 € pro Melder** inklusive Versand. Das ist für einen autarken NB-IoT Melder ein sehr guter Preis! 🦊💰✨

> [!NOTE]
> **Privatkunden-Info:** Da 1NCE primär an Geschäftskunden verkauft, ist **Things Mobile** die beste Wahl für Privatpersonen. Die Kosten sind fast identisch (ca. 10€ für die SIM inkl. Startguthaben), und sie lässt sich problemlos als Privatperson registrieren.
