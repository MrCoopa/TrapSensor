#include "sim7020_mqtt.h"
#include "config.h"

// Helper to send AT command and wait for expected response
bool sendATCommand(const char* cmd, const char* expected, uint32_t timeout = 2000) {
    SIM_SERIAL.println(cmd);
    uint32_t start = millis();
    String response = "";
    while (millis() - start < timeout) {
        if (SIM_SERIAL.available()) {
            char c = SIM_SERIAL.read();
            response += c;
            if (response.indexOf(expected) != -1) return true;
        }
    }
    return false;
}

void sim7020_powerUp(int pwrPin) {
    // Check if already awake (e.g. if it didn't enter PSM yet or is already awake)
    if (sendATCommand("AT", "OK", 300)) {
        return;
    }
    // Pulse PWR_KEY to wake from PSM / power up
    digitalWrite(pwrPin, HIGH);
    delay(500);
    digitalWrite(pwrPin, LOW);
    
    // Wait up to 5 seconds for response
    uint32_t start = millis();
    while (millis() - start < 5000) {
        if (sendATCommand("AT", "OK", 300)) {
            return;
        }
    }
}

void sim7020_powerDown(int pwrPin) {
    // In PSM mode, we do not power down the module. 
    // We just let it enter PSM automatically when idle.
}

String sim7020_getIMEI() {
    SIM_SERIAL.println("AT+GSN"); // Read IMEI
    delay(100);
    String imei = "";
    while (SIM_SERIAL.available()) {
        char c = SIM_SERIAL.read();
        if (isDigit(c)) imei += c;
    }
    return imei.length() >= 15 ? imei : "UNKNOWN_IMEI";
}

bool sim7020_connectToNetwork() {
    // Configure PSM mode with T3412 (Periodic TAU) = 40 hours and T3324 (Active Time) = 2 seconds
    sendATCommand("AT+CPSMS=1,,,\"01000100\",\"00000001\"", "OK");
    if (!sendATCommand("AT+CSQ", "OK")) return false;
    if (!sendATCommand("AT+CGATT?", "+CGATT: 1")) {
        sendATCommand("AT+CGATT=1", "OK", 10000);
    }
    return true;
}

void sim7020_getSignalStats(uint8_t &rsrp, uint8_t &rsrq, int8_t &sinr) {
    SIM_SERIAL.println("AT+CENG?");
    delay(200);
    if (SIM_SERIAL.available()) {
        String res = SIM_SERIAL.readString();
        // Format: +CENG: 0,"earfcn,pci,rsrp,rsrq,snr,ecl"
        int quote = res.indexOf("\"");
        if (quote != -1) {
            String stats = res.substring(quote + 1, res.lastIndexOf("\""));
            // Split by comma
            int comma1 = stats.indexOf(",");
            int comma2 = stats.indexOf(",", comma1 + 1);
            int comma3 = stats.indexOf(",", comma2 + 1);
            int comma4 = stats.indexOf(",", comma3 + 1);
            int comma5 = stats.indexOf(",", comma4 + 1);

            if (comma3 != -1 && comma4 != -1) {
                rsrp = (uint8_t)abs(stats.substring(comma2 + 1, comma3).toInt());
                rsrq = (uint8_t)abs(stats.substring(comma3 + 1, comma4).toInt());
                if (comma5 != -1) {
                    sinr = (int8_t)stats.substring(comma4 + 1, comma5).toInt();
                }
                return;
            }
        }
    }
    // Fallback to CSQ if CENG fails
    rsrp = sim7020_getRSRP();
    rsrq = 15; // Unknown
    sinr = 0;  // Unknown
}

uint8_t sim7020_getRSRP() {
    SIM_SERIAL.println("AT+CSQ");
    delay(100);
    if (SIM_SERIAL.available()) {
        String res = SIM_SERIAL.readString();
        int colon = res.indexOf(":");
        if (colon != -1) {
            int rssiVal = res.substring(colon + 2, res.indexOf(",")).toInt();
            if (rssiVal == 99) return 99;
            return (uint8_t)(113 - (rssiVal * 2));
        }
    }
    return 60;
}

bool sim7020_mqttConnect(const char* host, int port) {
    char buf[128];
    // Start MQTT service
    sendATCommand("AT+CMQNEW?", "OK");
    
    // Create connection (MQTT, client id)
    sprintf(buf, "AT+CMQNEW=\"%s\",\"%d\",12000,1024", host, port);
    if (!sendATCommand(buf, "+CMQNEW: 0")) return false;

    // Connect (id, version, keepalive, cleansess, will)
    if (!sendATCommand("AT+CMQCON=0,3,\"CatchSensorSTM32\",600,1,0", "OK")) return false;
    
    return true;
}

void sim7020_mqttPublish(const char* topic, const char* payloadHex, int len) {
    char cmd[512];
    // MQTT Publish: id, qos, retained, duplicated, topic, payload
    sprintf(cmd, "AT+CMQPUB=0,\"%s\",0,0,0,%d,\"%s\"", topic, len, payloadHex);
    sendATCommand(cmd, "OK");
}

void sim7020_mqttDisconnect() {
    sendATCommand("AT+CMQDISCON=0", "OK");
}

bool sim7020_getTime(uint8_t &day, uint8_t &month, uint8_t &year, uint8_t &hours, uint8_t &minutes, uint8_t &seconds) {
    SIM_SERIAL.println("AT+CCLK?");
    delay(150); // Give module time to output response
    String response = "";
    while (SIM_SERIAL.available()) {
        response += (char)SIM_SERIAL.read();
    }
    
    int quote = response.indexOf("\"");
    if (quote != -1) {
        String timeStr = response.substring(quote + 1, response.lastIndexOf("\""));
        if (timeStr.length() >= 17) {
            year = (uint8_t)timeStr.substring(0, 2).toInt();
            month = (uint8_t)timeStr.substring(3, 5).toInt();
            day = (uint8_t)timeStr.substring(6, 8).toInt();
            hours = (uint8_t)timeStr.substring(9, 11).toInt();
            minutes = (uint8_t)timeStr.substring(12, 14).toInt();
            seconds = (uint8_t)timeStr.substring(15, 17).toInt();
            return true;
        }
    }
    return false;
}
