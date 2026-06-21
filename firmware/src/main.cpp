#include <Arduino.h>
#include "config.h"
#include "sim7020_mqtt.h"
#include "aes256.h"
#include "sha256.h"

#ifdef ARDUINO_ARCH_STM32
#include <STM32RTC.h>
#include <STM32LowPower.h>
STM32RTC& rtc = STM32RTC::getInstance();
#endif

// State variables
volatile bool sensorTriggered = false;
uint32_t lastKeepAliveSeconds = 0;

// Replay Protection: Persistence via Backup Registers
// BKP Register 0: fCnt (Message Counter)
// BKP Register 1: Provisioned Flag (0xFEEDFACE = Provisioned)
// BKP Registers 2...9: Individual AES-256 Key (32 bytes)

uint32_t getMessageCounter() {
#ifdef ARDUINO_ARCH_STM32
    RTC_HandleTypeDef RtcHandle;
    RtcHandle.Instance = RTC;
    return HAL_RTCEx_BKUPRead(&RtcHandle, RTC_BKP_DR0);
#else
    return 0; // Fallback for simulation
#endif
}

void incrementMessageCounter() {
#ifdef ARDUINO_ARCH_STM32
    uint32_t current = getMessageCounter();
    RTC_HandleTypeDef RtcHandle;
    RtcHandle.Instance = RTC;
    HAL_RTCEx_BKUPWrite(&RtcHandle, RTC_BKP_DR0, current + 1);
#endif
}

bool isDeviceProvisioned() {
#ifdef ARDUINO_ARCH_STM32
    RTC_HandleTypeDef RtcHandle;
    RtcHandle.Instance = RTC;
    return HAL_RTCEx_BKUPRead(&RtcHandle, RTC_BKP_DR1) == 0xFEEDFACE;
#else
    return false;
#endif
}

void saveProvisionedFlag(uint8_t val) {
#ifdef ARDUINO_ARCH_STM32
    RTC_HandleTypeDef RtcHandle;
    RtcHandle.Instance = RTC;
    HAL_RTCEx_BKUPWrite(&RtcHandle, RTC_BKP_DR1, val == 1 ? 0xFEEDFACE : 0x00);
#endif
}

void getIndividualKey(uint8_t* keyOut) {
#ifdef ARDUINO_ARCH_STM32
    RTC_HandleTypeDef RtcHandle;
    RtcHandle.Instance = RTC;
    for (int i = 0; i < 8; i++) {
        uint32_t val = HAL_RTCEx_BKUPRead(&RtcHandle, RTC_BKP_DR2 + i);
        keyOut[i*4 + 0] = (val >> 24) & 0xFF;
        keyOut[i*4 + 1] = (val >> 16) & 0xFF;
        keyOut[i*4 + 2] = (val >> 8) & 0xFF;
        keyOut[i*4 + 3] = val & 0xFF;
    }
#endif
}

void saveIndividualKey(const uint8_t* keyIn) {
#ifdef ARDUINO_ARCH_STM32
    RTC_HandleTypeDef RtcHandle;
    RtcHandle.Instance = RTC;
    for (int i = 0; i < 8; i++) {
        uint32_t val = (uint32_t)keyIn[i*4 + 0] << 24 | (uint32_t)keyIn[i*4 + 1] << 16 | (uint32_t)keyIn[i*4 + 2] << 8 | (uint32_t)keyIn[i*4 + 3];
        HAL_RTCEx_BKUPWrite(&RtcHandle, RTC_BKP_DR2 + i, val);
    }
    HAL_RTCEx_BKUPWrite(&RtcHandle, RTC_BKP_DR1, 0xFEEDFACE);
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
void handleReedInterrupt() {
    sensorTriggered = true;
}

uint16_t readBatteryVoltage() {
    // Enable the voltage divider by driving PA4 HIGH
    pinMode(PIN_ADC_CTRL, OUTPUT);
    digitalWrite(PIN_ADC_CTRL, HIGH);
    delayMicroseconds(500); // Wait for the voltage to stabilize

    int raw = analogRead(PIN_ADC_BATT);

    // Disable the voltage divider to prevent power leakage
    digitalWrite(PIN_ADC_CTRL, LOW);
    pinMode(PIN_ADC_CTRL, INPUT_ANALOG); // Set back to analog input (high impedance)

    float voltage = (raw * 3.3 / 1024.0) * 2.0; 
    return (uint16_t)(voltage * 1000); // return in mV
}

void setup() {
    Serial.begin(115200);
    SIM_SERIAL.begin(115200);

#ifdef ARDUINO_ARCH_STM32
    rtc.begin(); // Required to access backup registers
    if (rtc.getEpoch() == 0) {
        rtc.setEpoch(1451606400); // Set default epoch to Jan 1, 2016 if not set
    }
    LowPower.begin();
    lastKeepAliveSeconds = rtc.getEpoch();
#else
    lastKeepAliveSeconds = millis() / 1000;
#endif

    pinMode(PIN_REED, INPUT_PULLUP);
    pinMode(PIN_ADC_BATT, INPUT);
    pinMode(PIN_ADC_CTRL, OUTPUT);
    digitalWrite(PIN_ADC_CTRL, LOW);
    pinMode(PIN_SIM_PWR, OUTPUT);
    digitalWrite(PIN_SIM_PWR, LOW);

#ifdef ARDUINO_ARCH_STM32
    LowPower.attachInterruptWakeup(PIN_REED, handleReedInterrupt, CHANGE, DEEP_SLEEP_MODE);
#else
    attachInterrupt(digitalPinToInterrupt(PIN_REED), handleReedInterrupt, CHANGE);
#endif

    Serial.println("CatchSensor STM32 Firmware Starting...");
    
    // Initial report on boot
    sensorTriggered = true;
}

void loop() {
    uint32_t nowSeconds;
#ifdef ARDUINO_ARCH_STM32
    nowSeconds = rtc.getEpoch();
#else
    nowSeconds = millis() / 1000;
#endif

    uint32_t intervalSeconds = KEEP_ALIVE_INTERVAL / 1000;

    // Check if we need to report (Trigger or Keep-Alive)
    if (sensorTriggered || (nowSeconds - lastKeepAliveSeconds >= intervalSeconds)) {
        bool isTrigger = sensorTriggered;
        sensorTriggered = false;
        lastKeepAliveSeconds = nowSeconds;

        Serial.println(isTrigger ? "Event: Sensor Triggered!" : "Event: Keep-Alive");

        // 1. Read Sensors (measure battery and status before network load/sag)
        uint16_t voltageMv = readBatteryVoltage();
        uint8_t status = digitalRead(PIN_REED) == LOW ? 0x00 : 0x01; // 0x00=triggered

        // 2. Wake SIM
        sim7020_powerUp(PIN_SIM_PWR);
        String imei = sim7020_getIMEI();

        // 3. Connect to Network
        bool connected = sim7020_connectToNetwork();
        uint8_t rsrpAbs = 60; 
        uint8_t rsrqAbs = 15;
        int8_t sinrSigned = 0;

        if (connected) {
            // Get latest signal stats
            sim7020_getSignalStats(rsrpAbs, rsrqAbs, sinrSigned);

            // Sync RTC time from SIM7020
            uint8_t d = 0, m = 0, y = 0, hh = 0, mm = 0, ss = 0;
            if (sim7020_getTime(d, m, y, hh, mm, ss)) {
                if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && hh < 24 && mm < 60 && ss < 60) {
#ifdef ARDUINO_ARCH_STM32
                    rtc.setTime(hh, mm, ss);
                    rtc.setDate(d, m, y);
                    Serial.print("RTC Synced to Network Time: ");
                    Serial.printf("%02d.%02d.20%02d %02d:%02d:%02d\n", d, m, y, hh, mm, ss);
#endif
                }
            }
        }

        // 4. Encrypt Payload if enabled
        char payloadHex[65]; // Support up to 64 hex chars (32 bytes)
        int payloadLen = 8; 

        if (USE_AES) {
            uint8_t activeKey[32] = {0};
            bool provisioned = isDeviceProvisioned();
            
#if USE_TOFU
            if (!provisioned) {
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
                
                if (connected && sim7020_mqttConnect(MQTT_HOST, MQTT_PORT)) {
                    sim7020_mqttPublish(("catches/" + imei + "/provision").c_str(), payloadHex, 64);
                    saveIndividualKey(newKey); // Adjust this to save 32 bytes
                    saveProvisionedFlag(1);
                    Serial.println("TOFU: 32-byte handshake sent and individual key saved.");
                    sim7020_mqttDisconnect();
                }
                sim7020_powerDown(PIN_SIM_PWR);
                return; 
            }
#endif

            uint32_t counter = getMessageCounter();
            incrementMessageCounter();
            
#if defined(MASTER_SALT)
            if (imei != "UNKNOWN_IMEI" && strlen(MASTER_SALT) > 0) {
                String inputStr = imei + MASTER_SALT;
                sha256_hash((const uint8_t*)inputStr.c_str(), inputStr.length(), activeKey);
                Serial.print("AES: Using derived key (Master Salt). FCnt: "); Serial.println(counter);
            } else {
                if (provisioned) {
                    getIndividualKey(activeKey);
                    Serial.print("AES: Using individual key. FCnt: "); Serial.println(counter);
                } else {
                    memcpy(activeKey, AES_KEY, 32);
                    Serial.print("AES: Using global key. FCnt: "); Serial.println(counter);
                }
            }
#else
            if (provisioned) {
                getIndividualKey(activeKey); // Uses 16-byte key (AES-128 logic)
                Serial.print("AES: Using individual key. FCnt: "); Serial.println(counter);
            } else {
                memcpy(activeKey, AES_KEY, 32);
                Serial.print("AES: Using global key. FCnt: "); Serial.println(counter);
            }
#endif

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

            // Inject 32-bit Unix epoch timestamp into unused padding bytes 10-13
            uint32_t timestamp = 0;
#ifdef ARDUINO_ARCH_STM32
            timestamp = (uint32_t)rtc.getEpoch();
#else
            timestamp = nowSeconds;
#endif
            block[10] = (timestamp >> 24) & 0xFF;
            block[11] = (timestamp >> 16) & 0xFF;
            block[12] = (timestamp >> 8) & 0xFF;
            block[13] = timestamp & 0xFF;

            // Use aes128 or aes256 based on key size
            if (provisioned) {
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

        // 5. Send Data via MQTT
        if (connected) {
            String deviceId = imei;
#if defined(MASTER_SALT)
            if (imei != "UNKNOWN_IMEI" && strlen(MASTER_SALT) > 0) {
                uint8_t hashBytes[32];
                String inputStr = imei + MASTER_SALT;
                sha256_hash((const uint8_t*)inputStr.c_str(), inputStr.length(), hashBytes);
                char hashHex[17] = {0};
                for (int i = 0; i < 8; i++) {
                    sprintf(&hashHex[i * 2], "%02X", hashBytes[i]);
                }
                deviceId = String(hashHex);
            }
#endif
            String topic = "catches/" + deviceId + "/data";

            if (sim7020_mqttConnect(MQTT_HOST, MQTT_PORT)) {
                sim7020_mqttPublish(topic.c_str(), payloadHex, payloadLen);
                sim7020_mqttDisconnect();
            }
        }

        // 6. Power Down SIM
        sim7020_powerDown(PIN_SIM_PWR);
    }

    Serial.println("Entering Deep Sleep...");
    Serial.flush();

#ifdef ARDUINO_ARCH_STM32
    // De-initialize UARTs to prevent parasitic leakage current
    SIM_SERIAL.end();
    Serial.end();
    
    // Set UART pins to analog input (high impedance)
    pinMode(PA2, INPUT_ANALOG); // SIM_SERIAL TX
    pinMode(PA3, INPUT_ANALOG); // SIM_SERIAL RX

    // Calculate remaining sleep time to match the next keep-alive
    uint32_t currentEpoch = rtc.getEpoch();
    uint32_t nextKeepAlive = lastKeepAliveSeconds + intervalSeconds;
    uint32_t sleepMs = 0;
    
    if (nextKeepAlive > currentEpoch) {
        sleepMs = (nextKeepAlive - currentEpoch) * 1000;
    }

    // Put MCU into deep sleep
    if (sleepMs > 0) {
        LowPower.deepSleep(sleepMs);
    }

    // Re-initialize UARTs after waking up
    Serial.begin(115200);
    SIM_SERIAL.begin(115200);
#else
    delay(1000); 
#endif
}
