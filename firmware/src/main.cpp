#include <Arduino.h>
#include "config.h"
#include "sim7020_mqtt.h"
#include "aes256.h"

// State variables
volatile bool sensorTriggered = false;
unsigned long lastKeepAlive = 0;

// Interrupt Service Routine for Reed Sensor
void IRAM_ATTR handleReedInterrupt() {
    sensorTriggered = true;
}

uint16_t readBatteryVoltage() {
    // ADC reference is usually 3.3V or calibrated VREF
    // Assuming 100k/100k voltage divider (multiply reading by 2)
    int raw = analogRead(PIN_ADC_BATT);
    float voltage = (raw * 3.3 / 1024.0) * 2.0; 
    return (uint16_t)(voltage * 1000); // return in mV
}

void setup() {
    Serial.begin(115200);
    SIM_SERIAL.begin(115200);

    pinMode(PIN_REED, INPUT_PULLUP);
    pinMode(PIN_ADC_BATT, INPUT);
    pinMode(PIN_SIM_PWR, OUTPUT);
    digitalWrite(PIN_SIM_PWR, LOW);

    attachInterrupt(digitalPinToInterrupt(PIN_REED), handleReedInterrupt, CHANGE);

    Serial.println("CatchSensor STM32 Firmware Starting...");
    
    // Initial report on boot
    sensorTriggered = true;
}

void loop() {
    unsigned long now = millis();

    // Check if we need to report (Trigger or Keep-Alive)
    if (sensorTriggered || (now - lastKeepAlive >= KEEP_ALIVE_INTERVAL)) {
        bool isTrigger = sensorTriggered;
        sensorTriggered = false;
        lastKeepAlive = now;

        Serial.println(isTrigger ? "Event: Sensor Triggered!" : "Event: Keep-Alive");

        // 1. Wake SIM
        sim7020_powerUp(PIN_SIM_PWR);

        // 2. Read Sensors
        uint16_t voltageMv = readBatteryVoltage();
        uint8_t status = digitalRead(PIN_REED) == LOW ? 0x00 : 0x01; // 0x00=triggered
        uint8_t rssiAbs = 60; 

        // 3. Encrypt Payload if enabled
        char payloadHex[33]; // Max 32 chars + null
        int payloadLen = 8;  // Default 4 bytes = 8 hex chars

        if (USE_AES) {
            uint8_t block[16] = {0};
            block[0] = status;
            block[1] = (voltageMv >> 8) & 0xFF;
            block[2] = voltageMv & 0xFF;
            block[3] = rssiAbs;
            // Rest of block is 0 (padding)

            aes256_encrypt(block, (const uint8_t*)AES_KEY);
            
            for (int i = 0; i < 16; i++) {
                sprintf(&payloadHex[i * 2], "%02X", block[i]);
            }
            payloadLen = 32;
        } else {
            sprintf(payloadHex, "%02X%04X%02X", status, voltageMv, rssiAbs);
            payloadLen = 8;
        }

        // 4. Send Data via MQTT
        String imei = sim7020_getIMEI();
        String topic = "catches/" + imei + "/data";

        if (sim7020_connectToNetwork()) {
            rssiAbs = sim7020_getRSSI();
            if (sim7020_mqttConnect(MQTT_HOST, MQTT_PORT)) {
                sim7020_mqttPublish(topic.c_str(), payloadHex, payloadLen);
                sim7020_mqttDisconnect();
            }
        }

        // 4. Power Down SIM
        sim7020_powerDown(PIN_SIM_PWR);
    }

    // 5. Enter Deep Sleep (Stop Mode)
    // In Arduino/STM32 we typically use LowPower library for this
    Serial.println("Entering Deep Sleep...");
    Serial.flush();
    
    // LowPower.stop(); // This would be the actual call with a library like STM32LowPower
    delay(1000); // Placeholder for simulation
}
