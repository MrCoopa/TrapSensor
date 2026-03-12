#include <Arduino.h>
#include "config.h"
#include "sim7020_mqtt.h"
#include "aes256.h"

#ifdef ARDUINO_ARCH_STM32
#include <STM32RTC.h>
STM32RTC& rtc = STM32RTC::getInstance();
#endif

// State variables
volatile bool sensorTriggered = false;
unsigned long lastKeepAlive = 0;

// Replay Protection: Persistence via Backup Registers
// BKP Register 0 is used for the counter. Value is preserved during Stop mode.
uint32_t getMessageCounter() {
#ifdef ARDUINO_ARCH_STM32
    return HAL_RTCEx_BKPRRead(&rtc.getHandle(), RTC_BKP_DR0);
#else
    return 0; // Fallback for simulation
#endif
}

void incrementMessageCounter() {
#ifdef ARDUINO_ARCH_STM32
    uint32_t current = getMessageCounter();
    HAL_RTCEx_BKPRWrite(&rtc.getHandle(), RTC_BKP_DR0, current + 1);
#endif
}

// Interrupt Service Routine for Reed Sensor
void IRAM_ATTR handleReedInterrupt() {
    sensorTriggered = true;
}

uint16_t readBatteryVoltage() {
    int raw = analogRead(PIN_ADC_BATT);
    float voltage = (raw * 3.3 / 1024.0) * 2.0; 
    return (uint16_t)(voltage * 1000); // return in mV
}

void setup() {
    Serial.begin(115200);
    SIM_SERIAL.begin(115200);

#ifdef ARDUINO_ARCH_STM32
    rtc.begin(); // Required to access backup registers
#endif

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
        int payloadLen = 8; 

        if (USE_AES) {
            uint32_t counter = getMessageCounter();
            incrementMessageCounter();
            Serial.print("AES: Encrypting with FCnt: "); Serial.println(counter);

            uint8_t block[16] = {0};
            block[0] = status;
            block[1] = (voltageMv >> 8) & 0xFF;
            block[2] = voltageMv & 0xFF;
            block[3] = rssiAbs;
            
            // Message Counter (FCnt) in Bytes 4-7 (UInt32BE)
            block[4] = (counter >> 24) & 0xFF;
            block[5] = (counter >> 16) & 0xFF;
            block[6] = (counter >> 8) & 0xFF;
            block[7] = counter & 0xFF;

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

    Serial.println("Entering Deep Sleep...");
    Serial.flush();
    delay(1000); 
}
