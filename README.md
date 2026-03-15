# 🦊 CatchSensor: Professional IoT Trap Monitoring

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)]()
[![License](https://img.shields.io/badge/license-ISC-green.svg)]()
[![Platform](https://img.shields.io/badge/platform-NB--IoT%20%7C%20LoRaWAN-orange.svg)]()
[![Security](https://img.shields.io/badge/security-AES--256-red.svg)]()

**CatchSensor** is a production-ready, self-hosted IoT ecosystem designed for professional trap monitoring. It is specifically optimized for **predator hunting (Raubwildjagd)** and **pest control**, providing 24/7 legal security and reliability in the field.

---

## 📖 Table of Contents
1. [Key Features](#-key-features)
2. [System Architecture](#️-system-architecture)
3. [Installation Guide (DE)](#-installation-guide-de)
4. [System Interfaces (Schnittstellen)](#-system-interfaces-schnittstellen)
5. [Notification Engine](#-notification-engine)
6. [Firmware & Hardware](#-firmware--hardware)
7. [Security (AES-256)](#-security-aes-256)

---

## 🚀 Key Features

### 🛡️ Security & Reliability
- **AES-256 Encryption:** Military-grade E2E encryption. Data is encrypted on the sensor and decrypted only at your backend.
- **Dual Protocol Support:** Native support for **NB-IoT (SIM7020E)** and **LoRaWAN (TTN)**.
- **Digital Watchdog:** Automated background service monitoring battery health and connection status.

### 🦌 Professional Hunting Integration
- **Revierwelt Webhook:** Direct integration with Germany's leading hunting management platform.
- **Legal Compliance:** Detailed automated logging for legal trap control requirements.
- **CatchSharing:** Granular permission levels for hunting groups.

### 📱 Modern User Experience
- **Real-Time Dashboard:** Socket.IO powered updates.
- **PWA Support:** Installable standalone app.
- **Notification Multi-Channel:** FCM (Android), Pushover, and Revierwelt.

---

## 🏗️ System Architecture

| Layer | Technology |
|---|---|
| **Firmware** | C++ (PlatformIO), STM32 L0/L4, SIM7020E |
| **Frontend** | React + Vite, Tailwind CSS, Lucide Icons |
| **Mobile** | Capacitor (Android) |
| **Backend** | Node.js + Express, Aedes MQTT Broker |
| **Database** | MariaDB / MySQL via Sequelize ORM |
| **Infra** | Docker Compose, Nginx Proxy Manager |

---

## 🛠 Installation Guide (DE)

### 1. Voraussetzungen
- **Node.js** (v20+) & **Docker** mit Compose.
- **Firebase Account** (für Push-Benachrichtigungen).
- **Domain** (optional, für HTTPS via Nginx Proxy Manager).

### 2. Lokale Einrichtung (Entwicklung)
```bash
# Repo klonen
git clone https://github.com/MrCoopa/CatchSensor.git
cd CatchSensor

# Backend Setup
cd backend && npm install

# Frontend Setup
cd ../client && npm install && npm run dev
```

### 3. Produktion (Docker Compose)
Kopiere die `.env.example` nach `.env` und passe die Werte an. Starte dann:
```bash
docker compose up -d --build
```
Die App ist unter `http://localhost:5000` erreichbar.

### 4. Umgebungsvariablen (Auszug)
| Variable | Beschreibung |
|---|---|
| `DB_PASS` | Passwort für die MariaDB. |
| `JWT_SECRET` | Schlüssel für Nutzer-Tokens. |
| `INTERNAL_MQTT_PASS` | Passwort für den NB-IoT Broker. |
| `FIREBASE_SERVICE_ACCOUNT_B64` | Base64-String der Google Firebase JSON. |

---

## 🔌 System Interfaces (Schnittstellen)

### 1. MQTT Ingress (Sensordaten)
- **Topic**: `catches/{imei}/data`
- **Payload (NB-IoT)**:
    - **Verschlüsselt (Standard)**: 16-Byte AES-256 Block (32 Hex-Zeichen).
    - **Unverschlüsselt**: 4-Byte Binary (8 Hex-Zeichen).
- **Datenstruktur (innerhalb des Blocks)**:
    - Byte 0: `Status` (0x01=Ok, 0x00=Alarm)
    - Byte 1-2: `Voltage` (mV, UInt16BE)
    - Byte 3: `RSSI` (Absoluter Wert)
    - Byte 4-7: **Message Counter (FCnt)** (UInt32BE) - *Nur bei Verschlüsselung.*

### 2. REST API (Backend)
| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/login` | `POST` | Authentifizierung & JWT Erhalt. |
| `/api/catches` | `GET` | Liste aller eigenen/geteilten Fallen. |
| `/api/catches/:id/share` | `POST` | Falle mit anderem Nutzer teilen. |
| `/api/catches/:id/acknowledge` | `POST` | Aktuellen Alarm quittieren. |
| `/api/catches/:id/resync` | `POST` | Sicherheitszähler nach Batteriewechsel zurücksetzen. |

### 3. Real-Time (WebSockets)
Das Frontend nutzt **Socket.IO**, um Statusänderungen (z.B. Falle ausgelöst) in Millisekunden anzuzeigen, ohne die Seite neu zu laden.

---

## 🔔 Notification Engine
CatchSensor unterstützt drei Kanäle:
1. **FCM (Native Android)**: Direktes Push via Firebase.
2. **Pushover**: Sekundärer Kanal für kritische Alarme.
3. **Revierwelt**: Automatisches Auslösen von Fangmeldungen in Revierwelt.

---

## ⚙️ Firmware & Hardware

### Hardware Specs
- **MCU**: STM32L051 / STM32L432 (Ultra Low Power).
- **Modem**: SIM7020E (NB-IoT).
- **Sensor**: Reed-Kontakt (Gegen GND schaltend).

### Pin-Belegung
- `PB1`: Reed-Sensor (Interrupt).
- `PA0`: Batterie-Messung (ADC).
- `PA2/PA3`: UART zum SIM-Modul.

---

## 🔐 Security (AES-256 & Replay Protection)

CatchSensor nutzt eine mehrstufige Sicherheitsarchitektur, um Manipulationen und Daten-Einsicht zu verhindern:

### 1. Ende-zu-Ende Verschlüsselung (E2EE)
Jeder Sensor verschlüswelt seine Daten mit **AES-256 (ECB Mode)**. Der Schlüssel (`AES_KEY`) ist nur auf dem Gerät und dem Backend bekannt. 
- **Vorteil**: Selbst bei Zugriff auf den MQTT-Broker sind die Daten für Dritte unlesbar ("Datensalat").

### 2. Replay Protection via Message Counter (FCnt)
# 🦊 CatchSensor: Professional IoT Trap Monitoring

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)]()
[![License](https://img.shields.io/badge/license-ISC-green.svg)]()
[![Platform](https://img.shields.io/badge/platform-NB--IoT%20%7C%20LoRaWAN-orange.svg)]()
[![Security](https://img.shields.io/badge/security-AES--256-red.svg)]()

**CatchSensor** is a production-ready, self-hosted IoT ecosystem designed for professional trap monitoring. It is specifically optimized for **predator hunting (Raubwildjagd)** and **pest control**, providing 24/7 legal security and reliability in the field.

---

## 📖 Table of Contents
1. [Key Features](#-key-features)
2. [System Architecture](#️-system-architecture)
3. [Installation Guide (DE)](#-installation-guide-de)
4. [System Interfaces (Schnittstellen)](#-system-interfaces-schnittstellen)
5. [Notification Engine](#-notification-engine)
6. [Firmware & Hardware](#-firmware--hardware)
7. [Security (AES-256)](#-security-aes-256)

---

## 🚀 Key Features

### 1. Ende-zu-Ende Verschlüsselung (E2EE)
Jeder Sensor verschlüsselt seine Daten mit **AES-256 (ECB Mode)**. Der individuelle Schlüssel wird deterministisch aus der **IMEI** des Geräts und einem globalen **MASTER_SALT** (SHA-256) abgeleitet.
- **Vorteil**: Kein komplexer Handshake (TOFU) nötig. Schlüssel sind sofort nach dem Flashen des Salts auf beiden Seiten synchron.
- **Sicherheit**: Selbst bei Zugriff auf den MQTT-Broker sind die Daten für Dritte unlesbar.

### 🦌 Professional Hunting Integration
- **Revierwelt Webhook:** Direct integration with Germany's leading hunting management platform.
- **Legal Compliance:** Detailed automated logging for legal trap control requirements.
- **CatchSharing:** Granular permission levels for hunting groups.

### 📱 Modern User Experience
- **Real-Time Dashboard:** Socket.IO powered updates.
- **PWA Support:** Installable standalone app.
- **Notification Multi-Channel:** FCM (Android), Pushover, and Revierwelt.

---

## 🏗️ System Architecture

| Layer | Technology |
|---|---|
| **Firmware** | C++ (PlatformIO), STM32 L0/L4, SIM7020E |
| **Frontend** | React + Vite, Tailwind CSS, Lucide Icons |
| **Mobile** | Capacitor (Android) |
| **Backend** | Node.js + Express, Aedes MQTT Broker |
| **Database** | MariaDB / MySQL via Sequelize ORM |
| **Infra** | Docker Compose, Nginx Proxy Manager |

---

## 🛠 Installation Guide (DE)

### 1. Voraussetzungen
- **Node.js** (v20+) & **Docker** mit Compose.
- **Firebase Account** (für Push-Benachrichtigungen).
- **Domain** (optional, für HTTPS via Nginx Proxy Manager).

### 2. Lokale Einrichtung (Entwicklung)
```bash
# Repo klonen
git clone https://github.com/MrCoopa/CatchSensor.git
cd CatchSensor

# Backend Setup
cd backend && npm install

# Frontend Setup
cd ../client && npm install && npm run dev
```

### 3. Produktion (Docker Compose)
Kopiere die `.env.example` nach `.env` und passe die Werte an. Starte dann:
```bash
docker compose up -d --build
```
Die App ist unter `http://localhost:5000` erreichbar.

### 4. Umgebungsvariablen (Auszug)
| Variable | Beschreibung |
|---|---|
| `DB_PASS` | Passwort für die MariaDB. |
| `JWT_SECRET` | Schlüssel für Nutzer-Tokens. |
| `INTERNAL_MQTT_USER` | Benutzername für den NB-IoT Broker. |
| `INTERNAL_MQTT_PASS` | Passwort für den NB-IoT Broker (Verpflichtend). |
| `MASTER_SALT` | Geheimnis zur Berechnung der Sensorschlüssel (WICHTIG). |
| `FIREBASE_SERVICE_ACCOUNT_B64` | Base64-String der Google Firebase JSON. |

---

## 🔌 System Interfaces (Schnittstellen)

### 1. MQTT Ingress (Sensordaten)
- **Topic**: `catches/{imei}/data`
- **Payload (NB-IoT)**:
    - **Verschlüsselt (Standard)**: 16-Byte AES-256 Block (32 Hex-Zeichen).
    - **Unverschlüsselt**: 4-Byte Binary (8 Hex-Zeichen).
- **Datenstruktur (innerhalb des Blocks)**:
    - Byte 0: `Status` (0x01=Ok, 0x00=Alarm)
    - Byte 1-2: `Voltage` (mV, UInt16BE)
    - Byte 3: `RSSI` (Absoluter Wert)
    - Byte 4-7: **Message Counter (FCnt)** (UInt32BE) - *Nur bei Verschlüsselung.*

### 2. REST API (Backend)
| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/login` | `POST` | Authentifizierung & JWT Erhalt. |
| `/api/catches` | `GET` | Liste aller eigenen/geteilten Fallen. |
| `/api/catches/:id/share` | `POST` | Falle mit anderem Nutzer teilen. |
| `/api/catches/:id/acknowledge` | `POST` | Aktuellen Alarm quittieren. |
| `/api/catches/:id/resync` | `POST` | Sicherheitszähler nach Batteriewechsel zurücksetzen. |

### 3. Real-Time (WebSockets)
Das Frontend nutzt **Socket.IO**, um Statusänderungen (z.B. Falle ausgelöst) in Millisekunden anzuzeigen, ohne die Seite neu zu laden.

---

## 🔔 Notification Engine
CatchSensor unterstützt drei Kanäle:
1. **FCM (Native Android)**: Direktes Push via Firebase.
2. **Pushover**: Sekundärer Kanal für kritische Alarme.
3. **Revierwelt**: Automatisches Auslösen von Fangmeldungen in Revierwelt.

---

## ⚙️ Firmware & Hardware

### Hardware Specs
- **MCU**: STM32L051 / STM32L432 (Ultra Low Power).
- **Modem**: SIM7020E (NB-IoT).
- **Sensor**: Reed-Kontakt (Gegen GND schaltend).

### Pin-Belegung
- `PB1`: Reed-Sensor (Interrupt).
- `PA0`: Batterie-Messung (ADC).
- `PA2/PA3`: UART zum SIM-Modul.

---

## 🔐 Security (AES-256 & Replay Protection)

CatchSensor nutzt eine mehrstufige Sicherheitsarchitektur, um Manipulationen und Daten-Einsicht zu verhindern:

### 1. Ende-zu-Ende Verschlüsselung (E2EE)
Jeder Sensor verschlüsselt seine Daten mit **AES-256 (ECB Mode)**. Der individuelle Schlüssel wird deterministisch aus der **IMEI** des Geräts und einem globalen **MASTER_SALT** (SHA-256) abgeleitet.
- **Vorteil**: Kein komplexer Handshake (TOFU) nötig. Schlüssel sind sofort nach dem Flashen des Salts auf beiden Seiten synchron.
- **Sicherheit**: Selbst bei Zugriff auf den MQTT-Broker sind die Daten für Dritte unlesbar.

### 2. Replay Protection via Message Counter (FCnt)
Um das Abfangen und Wiederholen (Replay) von Nachrichten zu verhindern, enthält jedes Paket einen **monoton steigenden 4-Byte Zähler**.
- **Logik**: Das Backend akzeptiert nur Nachrichten, deren Zähler (`FCnt`) größer ist als der letzte gespeicherte Wert.
- **Persistence**: Der Zähler wird auf dem Gerät in den **STM32 Backup-Registern** gespeichert. Er überlebt den Deep Sleep, ohne den Flash-Speicher zu verschleißen.

### 3. Battery Reset Handling (Manual Resync)
Wenn die Batterie gewechselt wird, startet der Zähler im Gerät wieder bei `0`. 
- **Verfahren**: Das Backend erkennt den Zähler-Sprung auf `0` und blockiert den Zugriff (Flag: `resyncRequired`). 
- **Lösung**: Der Nutzer muss den Batteriewechsel im Dashboard manuell bestätigen (Endpoint: `/api/catches/:id/resync`), um den Zähler im Backend zurückzusetzen.

---

*Für detaillierte Hardware-Pläne siehe [PCB_DESIGN_GUIDE.md](file:///d:/CatchSensor/CatchSensor/firmware/PCB_DESIGN_GUIDE.md).*
