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
    digitalWrite(pwrPin, HIGH);
    delay(500);
    digitalWrite(pwrPin, LOW);
    delay(5000); // Wait for SIM7020 to boot
    sendATCommand("AT", "OK");
}

void sim7020_powerDown(int pwrPin) {
    sendATCommand("AT+CPOWD=1", "NORMAL POWER DOWN");
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
    if (!sendATCommand("AT+CSQ", "OK")) return false;
    if (!sendATCommand("AT+CGATT?", "+CGATT: 1")) {
        sendATCommand("AT+CGATT=1", "OK", 10000);
    }
    return true;
}

uint8_t sim7020_getRSRP() {
    SIM_SERIAL.println("AT+CSQ");
    delay(100);
    if (SIM_SERIAL.available()) {
        String res = SIM_SERIAL.readString();
        int colon = res.indexOf(":");
        if (colon != -1) {
            int rssiVal = res.substring(colon + 2, res.indexOf(",")).toInt();
            // CSQ to dBm: 0=-113, 1=-111, ..., 31=-51
            if (rssiVal == 99) return 99; // Unknown
            return (uint8_t)(113 - (rssiVal * 2)); // Return absolute dBm e.g. 70
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
