# Datenvolumen-Analyse: CatchSensor (NB-IoT)

Der CatchSensor ist extrem effizient. Da wir ein binäres Format (4 Bytes) und kein JSON nutzen, ist das Datenvolumen minimal.

## 1. Was wird pro Sendevorgang übertragen?
Obwohl der eigentliche Nutzwert nur **4 Bytes** groß ist, kommt durch die Netzwerkprotokolle (TCP/IP und MQTT) ein "Overhead" hinzu:

- **TCP/IP Header**: ca. 40-60 Bytes
- **MQTT Connect**: ca. 50-80 Bytes (Handshake mit dem Server)
- **MQTT Publish**: ca. 30-40 Bytes (Dein eigentlicher Status)
- **MQTT Disconnect**: ca. 2 Bytes
- **Zertifikate (optional)**: Wenn du TLS (Verschlüsselung) nutzt, kämen einmalig ca. 2-3 KB hinzu. Ohne Verschlüsselung (Port 1884) ist es weniger.

- **Gefahr für das Volumen?**: Nein. Ein unverschlüsseltes Paket hat 8 Hex-Zeichen (4 Bytes), ein verschlüsseltes Paket hat **32 Hex-Zeichen (16 Bytes)**.
- **Zusatzverbrauch**: Du sendest pro Meldung nur **24 Bytes** mehr.

## 2. Kalkulation (8-Stunden-Intervall)
- **Sendungen pro Tag**: 3 (alle 8h)
- **Verbrauch (Unverschlüsselt)**: ca. 3 KB / Tag
- **Verbrauch (Mit AES-128)**: ca. **3,1 KB / Tag**
- **Volumen pro Jahr (Mit AES)**: ca. **1,15 MB** (statt 1,1 MB)

---

## 3. Was bedeutet das für eine 1NCE SIM (500 MB)?
Eine Standard IoT-SIM von 1NCE bietet 500 MB für 10 Jahre.

- **Verfügbar pro Jahr**: 50 MB
- **Verbrauch pro Jahr**: 1,1 MB

**Fazit:** Der CatchSensor verbraucht nur ca. **2%** des verfügbaren jährlichen Volumens. Selbst wenn du die Falle 100x am Tag auslöst, würdest du das Datenlimit der SIM-Karte in 10 Jahren niemals erreichen.

> [!TIP]
> NB-IoT ist genau für diese winzigen Datenmengen optimiert. Da die Verbindung nur kurz aufgebaut wird, ist das Volumen vernachlässigbar – entscheidend ist die Batterielaufzeit!
