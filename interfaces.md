# System Interfaces Documentation

This document outlines the external and internal interfaces used by the **CatchSensor** application.

## 1. MQTT Interfaces (Ingress)
The system listens to MQTT brokers to receive sensor data from CatchSensors.

### A. NB-IoT CatchSensors (Internal/External Broker)
*   **Protocol**: MQTT (TCP/1883)
*   **Topic**: `catches/{imei}/data`
*   **Payload Format**: Verschlüsselt (16 Bytes AES-256 ECB)
    *   **Key Derivation**: Der AES-Key wird für jeden Melder individuell aus `SHA256(IMEI + MASTER_SALT)` abgeleitet.
    *   Byte 0: **Status** (0x01 = Active, 0x00 = Triggered/Alarm)
    *   Byte 1-2: **Voltage** (UInt16BE, in mV)
    *   Byte 3: **RSSI** (UInt8, absolute value, e.g., 60 = -60dBm)
    *   Byte 4-7: **FCnt** (UInt32BE, Message Counter für Replay-Schutz)

### B. LoRaWAN CatchSensors (The Things Network Integration)
*   **Protocol**: MQTTS (TLS/8883) via TTN
*   **Topic**: `v3/{app-id}@ttn/devices/{device-id}/up`
*   **Payload Format**: JSON (TTN v3 Uplink Schema)
    *   **Primary Data**: `uplink_message.decoded_payload` (if formatter exists) OR `uplink_message.frm_payload` (Base64 Binary).
    *   **Metadata**: `uplink_message.rx_metadata` (RSSI, SNR, Gateways).
    *   **Binary Fallback**: Same structure as NB-IoT (Status, Voltage, Battery%) if payload is raw.

---

## 2. REST API (Client/Frontend)
The React frontend communicates with the backend via these HTTP endpoints.

### Authentication (`/api/auth`)
*   `POST /register`: Register new user.
*   `POST /login`: Login and receive JWT.
*   `GET /me`: Get current user profile.

### CatchSensor Management (`/api/catches`)
*   `GET /`: List all accessible CatchSensors (Owned + Shared).
*   `POST /`: Register a new CatchSensor (or claim an auto-provisioned one).
    *   Body: `{ name, alias, imei|deviceId, type }`
*   `PATCH /:id/status`: Update CatchSensor status manually.
*   `DELETE /:id`: Delete a CatchSensor.
*   `POST /simulate`: (Dev Tool) Simulate an MQTT message.

### Sharing (`/api/catches`)
*   `POST /:id/share`: Share a CatchSensor with another user by email.
*   `DELETE /:id/share/:userId`: Revoke access.
*   `GET /:id/shares`: List users who have access.

### Readings (`/api/readings`)
*   `GET /:catchSensorId`: Retrieve historical readings (last 50).

---

## 3. External Services (Egress)
The system calls out to these services to notify users.

### A. Pushover (Mobile Notifications)
*   **Service**: [pushover.net](https://pushover.net)
*   **Trigger**: Alarm (`triggered`) or Low Battery (< 20%).
*   **Data Sent**:
    *   Title (Alarm/Info)
    *   Message (CatchSensor Name)
    *   Priority (High for Alarm)
    *   Sound (Siren for Alarm)

### B. Web Push API (PWA Notifications)
*   **Protocol**: Standard Web Push Protocol (VAPID).
*   **Trigger**: Same as Pushover.
*   **Endpoints**: Dynamic (Client browser endpoints, e.g., FCM, Mozilla).
