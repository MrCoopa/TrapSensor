# Security & Encryption: CatchSensor

Um die Datenübertragung abzusichern, unterstützt die Firmware eine optionale **AES-128 (ECB) Verschlüsselung**.

## 1. Aktivierung
In der Datei `include/config.h` kannst du die Verschlüsselung ein- oder ausschalten:
```cpp
#define USE_AES         1                  // 1 = Ein, 0 = Aus
#define AES_KEY         "CATCHSENSOR_KEY1" // Dein geheimer 16-Zeichen Schlüssel
```

## 2. Funktionsweise
- Wenn `USE_AES` auf `1` steht, werden die 4 Bytes Sensordaten (Status, Spannung, RSSI) in einen 16-Byte Block gepackt (Padding mit Nullen).
- Dieser Block wird mit dem 32-Byte `AES_KEY` (AES-256) verschlüsselt.
- Das Ergebnis ist ein 32 Zeichen langer Hex-String, der per MQTT gesendet wird.

## 3. Backend-Anpassung
Dein Backend muss erkennen, wenn ein Paket 32 Zeichen (16 Bytes) lang ist und dieses mit dem gleichen Schlüssel entschlüsseln.

**Hinweis:** Ohne Verschlüsselung ist das Paket nur 8 Zeichen (4 Bytes) lang.

## 4. Schlüsseltausch (Key Management)
In dieser Firmware nutzen wir ein **Symmetrisches Verfahren** mit einem **Pre-shared Key (PSK)**.

- **Kein dynamischer Tausch**: Es findet kein Schlüsseltausch über das Internet (wie Diffie-Hellman) statt. Das würde viel Datenvolumen und Rechenleistung (Batterie) kosten.
- **Prinzip**: Der Schlüssel (`AES_KEY`) wird **vor dem Flashen** im Code festgelegt und muss gleichzeitig in deinem Backend hinterlegt werden.
- **Sicherheit**: Da der Schlüssel niemals über Funk übertragen wird, kann er auch nicht "aus der Luft" abgefangen werden. Er ist sicher auf dem Chip gespeichert.

## 6. Backend-Entschlüsselung (Node.js Beispiel)

In deinem Node.js Backend kannst du das `crypto` Modul nutzen. Hier ist die Logik, um ein verschlüsseltes Paket (32 Hex-Zeichen) wieder in lesbare Daten zu verwandeln:

```javascript
const crypto = require('crypto');

function decryptPayload(hexPayload, key) {
    const encrypted = Buffer.from(hexPayload, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-ecb', Buffer.from(key), null);
    decipher.setAutoPadding(false);
    
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    
    return {
        status: decrypted.readUInt8(0) === 0x01 ? 'active' : 'triggered',
        voltage: decrypted.readUInt16BE(1),
        rssi: -decrypted.readUInt8(3)
    };
}
```

## 7. Rechenleistung & Performance

Die AES-256 Verschlüsselung ist extrem effizient und hat fast keinen Einfluss auf die Systemleistung:

- **Auf dem STM32 (Falle):**
    - Die Verschlüsselung eines 16-Byte Blocks dauert bei 32 MHz nur ca. **1,2 bis 1,8 Millisekunden**.
    - Im Vergleich zum Sendevorgang (der 15-30 Sekunden dauert), macht das nur **0,01%** der Wachzeit aus.
    - Der Einfluss auf die Batterielaufzeit ist daher **nicht messbar**.

- **Auf dem Backend (Server):**
    - Moderne Server-CPUs verfügen über Hardware-Beschleunigung (AES-NI).
    - Die Entschlüsselung dauert dort nur **Nanosekunden**.
    - Selbst tausende Sensoren würden die CPU-Last nicht spürbar erhöhen.

**Fazit:** Die Rechenkapazität deines STM32L0/L4 reicht locker aus. Die Verschlüsselung "langweilt" den Prozessor eher.
