#ifndef CONFIG_H
#define CONFIG_H

// ── User Settings ───────────────────────────────────────────────────────────
#define MQTT_HOST       "192.168.1.100"    // IP deines Backends
#define MQTT_PORT       1884

// ── Security Settings ───────────────────────────────────────────────────────
#define USE_AES         1                  // Setze auf 1 zum Aktivieren
#define AES_KEY         "CATCHSENSOR_KEY_32_CHARS_LONG!!!" // Globaler Fallback
#define MASTER_SALT     "CATCHSENSOR_SALT_2026_SECURE_!" // Neu: Für algorithmische Derivierung
#define USE_TOFU        0                  // Legacy: Trust-On-First-Use deaktiviert

// ── Timing ──────────────────────────────────────────────────────────────────
#define KEEP_ALIVE_INTERVAL (8 * 60 * 1000) // 8 Minuten (Testweise verkürzt) oder 8h (8*60*60*1000)

// ── Hardware Pins ───────────────────────────────────────────────────────────
#ifdef STM32L0
    #define PIN_REED         PB1
    #define PIN_ADC_BATT     PA0
    #define PIN_ADC_CTRL     PA4
    #define PIN_SIM_PWR      PA1
    #define SIM_SERIAL       Serial1  // PA2 (TX), PA3 (RX)
#else // STM32L4
    #define PIN_REED         PB1
    #define PIN_ADC_BATT     PA0
    #define PIN_ADC_CTRL     PA4
    #define PIN_SIM_PWR      PA1
    #define SIM_SERIAL       Serial1
#endif

#endif
