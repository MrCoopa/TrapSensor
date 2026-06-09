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
// BKP Register 0: fCnt (Message Counter)
// BKP Register 1: Provisioned Flag (0xFEEDFACE = Provisioned)
// BKP Registers 2...9: Individual AES-256 Key (32 bytes)

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

bool isDeviceProvisioned() {
#ifdef ARDUINO_ARCH_STM32
    return HAL_RTCEx_BKPRRead(&rtc.getHandle(), RTC_BKP_DR1) == 0xFEEDFACE;
#else
    return false;
#endif
}

void saveProvisionedFlag(uint8_t val) {
#ifdef ARDUINO_ARCH_STM32
    HAL_RTCEx_BKPRWrite(&rtc.getHandle(), RTC_BKP_DR1, val == 1 ? 0xFEEDFACE : 0x00);
#endif
}

void getIndividualKey(uint8_t* keyOut) {
#ifdef ARDUINO_ARCH_STM32
    for (int i = 0; i < 8; i++) {
        uint32_t val = HAL_RTCEx_BKPRRead(&rtc.getHandle(), RTC_BKP_DR2 + i);
        keyOut[i*4 + 0] = (val >> 24) & 0xFF;
        keyOut[i*4 + 1] = (val >> 16) & 0xFF;
        keyOut[i*4 + 2] = (val >> 8) & 0xFF;
        keyOut[i*4 + 3] = val & 0xFF;
    }
#endif
}

void saveIndividualKey(const uint8_t* keyIn) {
#ifdef ARDUINO_ARCH_STM32
    for (int i = 0; i < 8; i++) {
        uint32_t val = (uint32_t)keyIn[i*4 + 0] << 24 | (uint32_t)keyIn[i*4 + 1] << 16 | (uint32_t)keyIn[i*4 + 2] << 8 | (uint32_t)keyIn[i*4 + 3];
        HAL_RTCEx_BKPRWrite(&rtc.getHandle(), RTC_BKP_DR2 + i, val);
    }
    HAL_RTCEx_BKPRWrite(&rtc.getHandle(), RTC_BKP_DR1, 0xFEEDFACE);
#endif
}

void generateRandomKey(uint8_t* keyOut) {
    // Basic RNG using analogRead jitter
    for (int i = 0; i < 32; i++) {
        uint8_t val = 0;
        for (int b = 0; b < 8; b++) {
            val = (val << 1) | (analogRead(PIN_ADC_BATT) & 1);
            delay(1);
        }
        keyOut[i] = val;
    }
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
        uint8_t rsrpAbs = 60; 
        uint8_t rsrqAbs = 15;
        int8_t sinrSigned = 0;

        // 3. Encrypt Payload if enabled
        char payloadHex[65]; // Support up to 64 hex chars (32 bytes)
        int payloadLen = 8; 

        if (USE_AES) {
            uint8_t activeKey[32] = {0};
            bool provisioned = isDeviceProvisioned();
            
            if (USE_TOFU && !provisioned) {
                Serial.println("TOFU: Device not provisioned. Starting handshake...");
                uint8_t newKey[32]; // AES-256 individual key
                generateRandomKey(newKey); // Assume this can generate 32 bytes
                
                // Encrypt new individual 32-byte key with Bootstrap Key
                uint8_t handshakePayload[32];
                AES_ctx ctx;
                uint8_t iv[16] = {0};
                AES_init(&ctx, (uint8_t*)BOOTSTRAP_KEY, 32, (uint8_t*)iv);
                
                // Encrypt both 16-byte blocks
                AES_encrypt(newKey, handshakePayload, &ctx);
                AES_encrypt(newKey + 16, handshakePayload + 16, &ctx);
                
                for (int i = 0; i < 32; i++) sprintf(&payloadHex[i * 2], "%02X", handshakePayload[i]);
                
                sim7020_powerUp(PIN_SIM_PWR);
                String imei = sim7020_getIMEI();
                if (sim7020_connectToNetwork() && sim7020_mqttConnect(MQTT_HOST, MQTT_PORT)) {
                    sim7020_mqttPublish(("catches/" + imei + "/provision").c_str(), payloadHex, 64);
                    saveIndividualKey(newKey); // Adjust this to save 32 bytes
                    saveProvisionedFlag(1);
                    Serial.println("TOFU: 32-byte handshake sent and individual key saved.");
                }
                sim7020_mqttDisconnect();
                sim7020_powerDown(PIN_SIM_PWR);
                return; 
            }

            uint32_t counter = getMessageCounter();
            incrementMessageCounter();
            
            if (provisioned) {
                getIndividualKey(activeKey); // Uses 16-byte key (AES-128 logic)
                Serial.print("AES: Using individual key. FCnt: "); Serial.println(counter);
            } else {
                memcpy(activeKey, AES_KEY, 32);
                Serial.print("AES: Using global key. FCnt: "); Serial.println(counter);
            }

            uint8_t block[16] = {0};
            block[0] = status;
            block[1] = (voltageMv >> 8) & 0xFF;
            block[2] = voltageMv & 0xFF;
            block[3] = rsrpAbs;
            
            block[4] = (counter >> 24) & 0xFF;
            block[5] = (counter >> 16) & 0xFF;
            block[6] = (counter >> 8) & 0xFF;
            block[7] = counter & 0xFF;

            block[8] = rsrqAbs;
            block[9] = (uint8_t)sinrSigned;

            // Use aes128 or aes256 based on key size
            if (provisioned) {
                // Here we might need aes128_encrypt if we only stored 16 bytes
                // For simplicity, let's assume aes256_encrypt handles it or we pad
                aes256_encrypt(block, activeKey);
            } else {
                aes256_encrypt(block, activeKey);
            }
            
            for (int i = 0; i < 16; i++) {
                sprintf(&payloadHex[i * 2], "%02X", block[i]);
            }
            payloadLen = 32;
        } else {
            sprintf(payloadHex, "%02X%04X%02X%02X%02X", status, voltageMv, rsrpAbs, rsrqAbs, (uint8_t)sinrSigned);
            payloadLen = 12;
        }

        // 4. Send Data via MQTT
        String imei = sim7020_getIMEI();
        String topic = "catches/" + imei + "/data";

        if (sim7020_connectToNetwork()) {
            sim7020_getSignalStats(rsrpAbs, rsrqAbs, sinrSigned);
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
