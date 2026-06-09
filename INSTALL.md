# 🦊 CatchSensor: Vollständiger Installations-Guide

Dieser Guide führt dich Schritt für Schritt durch die Einrichtung von CatchSensor – von der lokalen Entwicklung bis zum produktiven Server-Deployment und der Android-App.

---

## 1. Voraussetzungen

Bevor du startest, stelle sicher, dass folgende Software installiert ist:
- **Node.js** (v20 oder neuer) & **npm**
- **Docker & Docker Compose** (für Server-Deployment)
- **Git**
- **Android Studio** (nur für den Build der Android-App)

---

## 2. Vorbereitung (Konten & Keys)

### Firebase (für Native Push-Benachrichtigungen)
1. Gehe zur [Firebase Console](https://console.firebase.google.com/).
2. Erstelle ein neues Projekt (z.B. "CatchSensor").
3. Füge eine **Android-App** hinzu (Paketname: `com.catchsensor.app`).
4. Lade die `google-services.json` herunter und verschiebe sie nach `client/android/app/`.
5. Gehe zu **Projekteinstellungen → Servicekonten** und klicke auf **"Neuen privaten Schlüssel generieren"**.
6. Speichere die Datei als `serviceAccountKey.json` im Verzeichnis `backend/`.

> **Für Docker/Portainer:** Die Datei wird als Base64-Umgebungsvariable übergeben (siehe Abschnitt 6).

### The Things Network (für LoRaWAN)
1. Erstelle eine Applikation in der [TTN Console](https://eu1.cloud.thethings.network/).
2. Notiere dir die MQTT-Zugangsdaten (Username & API-Key).
3. Trage diese in die zentrale `.env` ein.

---

## 3. Umgebungsvariablen für Portainer (Vollliste)

In Portainer müssen diese Variablen im Stack-Editor (Environment tab) gesetzt werden. Hier ist die vollständige Liste aller relevanten Variablen:

### Basis-System
```env
PORT=5000                         # Standard-Port der App
DB_HOST=catchsensor_db            # Docker-Service Name der DB
DB_NAME=catchsensor               # Name der Datenbank
DB_USER=root                      # DB-Nutzer
DB_PASS=root                      # DB-Passwort
JWT_SECRET=please_change_this_for_production # Dein JWT Schlüssel
VITE_API_URL=https://catchsensor.home # URL für das Frontend-Build
APP_BASE_URL=https://catchsensor.home # Basis-URL für Benachrichtigungen
```

### Interner MQTT Broker (Aedes)
Für NB-IoT Melder, die direkt mit dem Server kommunizieren.
```env
INTERNAL_MQTT_USER=alex           # Benutzername (bitte anpassen)
INTERNAL_MQTT_PASS=geheim         # Passwort (Verpflichtend!)
```

### Verschlüsselung (E2E)
```env
MASTER_SALT=dein_sehr_langes_geheimnis # Basis für Sensorschlüssel (WICHTIG!)
AES_SECRET_KEY=...                  # Legacy (wird durch Master Salt ersetzt)
```

### LoRaWAN via The Things Network (TTN)
```env
TTN_MQTT_BROKER=eu1.cloud.thethings.network
TTN_MQTT_PORT=8883                # 8883 (SSL/mqtts)
TTN_MQTT_USER=...@ttn          # Deine TTN Application ID
TTN_MQTT_PASS=...
```

### Benachrichtigungen (Native Push & Pushover)
```env
# Firebase Cloud Messaging (Base64 des JSON-Keys — siehe Abschnitt 6)
FIREBASE_SERVICE_ACCOUNT_B64=... (hier den generierten Base64-Code einfügen)

# Globales Pushover (Server-seitiger Zweitkanal)
PUSHOVER_USER=...
PUSHOVER_TOKEN=...
```

### Externer NB-IoT Broker (Optional)
Nur falls Melder NICHT den internen Broker nutzen, sondern einen externen Server.
```env
NBIOT_MQTT_BROKER=your-external-broker.com
NBIOT_MQTT_USER=...
NBIOT_MQTT_PASS=...
```

---

## 4. Lokale Entwicklung

### Backend
1. `cd backend`
2. `npm install`
3. `npm start` (Das Backend lädt automatisch die `.env` aus dem Hauptverzeichnis).

### Frontend
1. `cd client`
2. `npm install`
3. `npm run dev`

---

## 5. Android-App Build & Sync

Um die Android-App mit deinen Einstellungen zu bauen:
1. Stelle sicher, dass die `VITE_API_URL` in der `.env` korrekt ist.
2. `cd client`
3. `npm run build`
4. `npx cap sync android`
5. Öffne den Ordner `client/android` in **Android Studio**.
6. Verbinde dein Handy und klicke auf **Run**.

---

## 6. Produktion (Docker & Portainer)

CatchSensor ist für den Betrieb mit Docker optimiert.

### Docker Compose
1. `docker compose up --build -d`
2. Die App ist nun unter `http://deine-ip:5000` erreichbar.

### Nginx Proxy Manager (Empfohlen)
Um HTTPS und die Domain `https://catchsensor.home` zu nutzen:
- Erstelle einen Proxy Host in NPM.
- Ziel: `http://catchsensor_app:5000`.
- Aktiviere **Websockets Support**.
- Erstelle ein SSL-Zertifikat.

### Portainer-spezifische Einstellungen
Bei der Nutzung von Portainer (Git-Stack):
1. **Keine `.env` Datei im Repo**: Portainer benötigt die Variablen im UI.
2. Gehe in deinem Stack auf **"Environment variables"**.
3. Füge alle Variablen aus der `.env` dort manuell hinzu.
4. Portainer injiziert diese dann automatisch in den Container.

### Firebase Key für Portainer (Base64)
Da `serviceAccountKey.json` nicht ins Git-Repo eingecheckt wird, wird sie als Base64-Umgebungsvariable übergeben:

**Schritt 1** — Base64-String in PowerShell generieren (auf dem Entwicklungs-PC):
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("backend\serviceAccountKey.json")) | Set-Clipboard
```

**Schritt 2** — In Portainer als Umgebungsvariable hinzufügen:
- Name: `FIREBASE_SERVICE_ACCOUNT_B64`
- Wert: *(aus Zwischenablage einfügen)*

**Schritt 3** — Stack updaten. In den Container-Logs sollte erscheinen:
```
Push Service: Firebase credentials loaded from env var. ✅
Push Service: Firebase Admin SDK initialized successfully. ✅
```

---

## 7. Troubleshooting

### Login schlägt fehl (Android)
- Prüfe, ob dein Handy die Domain `catchsensor.home` auflösen kann (DNS-Eintrag im Router nötig).
- Prüfe, ob das SSL-Zertifikat vom Handy akzeptiert wird.

### Keine Push-Benachrichtigungen
- Prüfe in den Container-Logs ob `Firebase Admin SDK initialized` erscheint.
- Falls nicht: `FIREBASE_SERVICE_ACCOUNT_B64` fehlt oder ist ungültig (siehe Abschnitt 6).
- Lokal: Prüfe ob `backend/serviceAccountKey.json` vorhanden ist.
- Prüfe in der App unter **Setup → Debug**, ob das FCM-Token registriert wurde.

---
*Viel Erfolg bei der Fangjagd! Bei Fragen hilft die [README.md](README.md) weiter.*
