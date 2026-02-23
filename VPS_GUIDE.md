# VPS Hosting Guide: CatchSensor

Um den CatchSensor autark und professionell zu betreiben, empfiehlt sich ein **VPS (Virtual Private Server)**. Hier ist alles, was du für die Auswahl und Einrichtung wissen musst.

## 1. Empfohlene VPS Spezifikationen
Da wir Docker und eine MariaDB nutzen, sollte der Server nicht zu klein sein:

| Komponente | Empfehlung (Minimum) | Grund |
|------------|-----------------------|-------|
| **CPU** | 1-2 vCore | Reicht locker für Node.js und MQTT. |
| **RAM** | **2 GB - 4 GB** | **Wichtig:** MariaDB und der MQTT-Broker brauchen stabilen Arbeitsspeicher. 4GB sind ideal für Puffer. |
| **Storage** | 20 GB SSD | Datenbank-Logs und System brauchen Platz. |
| **OS** | **Ubuntu 22.04 LTS** | Bester Support für Docker und Anleitungen. |

---

## 2. Empfohlene Anbieter (Preis/Leistung)
Für den Betrieb in Europa (Datenschutz & Latenz):
1. **Hetzner (Empfehlung):** Cloud-Modell `CX11` (ca. 4€/Monat) oder `CX21`. Exzellent in Deutschland.
2. **Netcup:** Sehr günstige VPS-Tarife.
3. **DigitalOcean:** Einfach zu bedienen, aber etwas teurer (ca. 6-12$).

---

## 3. Deployment-Strategie
Dein Projekt ist bereits für **Docker** vorbereitet. Das macht den Umzug auf einen VPS kinderleicht:

1. **Docker installieren:** Ein Befehl auf dem VPS genügt.
2. **Repository klonen:** Dein Code wird via Git auf den Server geladen.
3. **Nginx Proxy Manager (NPM):** In deiner `docker-compose.yml` ist NPM bereits vorgesehen. Er kümmert sich um:
   - Kostenlose **SSL-Zertifikate** (HTTPS).
   - Die Weiterleitung von `deine-domain.de` auf den CatchSensor.
   - Den Zugriff auf das Dashboard.

---

## 4. Offene Ports (Sicherheit/Firewall)
Du musst folgende Ports in der Firewall deines VPS-Anbieters öffnen:
- **80 / 443:** Für das Web-Interface.
- **1884:** Für die NB-IoT Sensoren (MQTT unverschlüsselt).
- **1885:** Für verschlüsseltes MQTT (MQTTS), falls gewünscht.
- **22:** Für SSH (Dein Zugang).

---
> [!TIP]
> **Domain:** Besorg dir eine günstige `.de` oder `.com` Domain (ca. 10€/Jahr). Das macht die Einrichtung der SSL-Zertifikate viel einfacher und professioneller!

Möchtest du, dass ich dir eine Schritt-für-Schritt Liste der Befehle erstelle, die du auf einem frischen Ubuntu-Server eingeben musst? 🚀🦊☁️
