# CatchSensor STM32 Firmware (NB-IoT)

Diese Firmware ermöglicht es einem STM32 (L0/L4), den Status einer Falle über einen Reed-Sensor zu überwachen und per NB-IoT (SIM7020E) an das CatchSensor-Backend zu melden.

## Features
- **Low-Power**: Nutzt den Deep Sleep des STM32.
- **Interrupt driven**: Wacht sofort auf, wenn der Reed-Sensor ausgelöst wird.
- **Batterie-Überwachung**: Misst die Spannung über einen ADC-Pin.
- **NB-IoT (MQTT)**: Effiziente Datenübertragung via SIM7020E.
- **AES-256 Verschlüsselung**: Sicherer Schutz der Fangdaten (Payload).
- **Keep-Alive**: Sendet alle 8 Stunden einen Statusbericht (auch ohne Auslösung).

## Voraussetzungen
- **Hardware**: STM32 L0/L4, SIM7020E Modul, Reed-Kontakt.
- **Entwicklungsumgebung**: [PlatformIO](https://platformio.org/) (VS Code Extension).

## Einrichtung
1. Öffne den Ordner `firmware/` in PlatformIO.
2. Passe die Einstellungen in `include/config.h` an:
   - `MQTT_HOST`: Die IP-Adresse oder Domain deines Backends.
3. Wähle dein Board in der `platformio.ini` (STM32L0 oder L4).
4. **Build & Upload** auf deinen STM32.

> [!NOTE]
> Die **IMEI** wird automatisch vom SIM7020E Modul ausgelesen. Du musst sie nicht manuell im Code eintragen.

## Pin-Belegung (Standard)
| Funktion | Pin | Hinweis |
|----------|-----|---------|
| Reed-Sensor | PB1 | Gegen GND schaltend (Pull-up aktiv) |
| Batterie-ADC | PA0 | Über 100k/100k Spannungsteiler |
| SIM UART TX | PA2 | An SIM RX |
| SIM UART RX | PA3 | An SIM TX |
| SIM PWR_KEY | PA1 | Zum Aufwecken des Moduls |

## Payload Format (Binary 4-Bytes)
Das Backend erwartet: `[Status:1, Voltage_mV:2, RSSI_abs:1]`
- `Status`: 0x01 (Aktiv), 0x00 (Gefangen).
- `Voltage`: uint16_t (mV, Big-Endian).
- `RSSI`: uint8_t (Absoluter dBm-Wert).
