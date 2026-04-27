#ifndef SIM7020_MQTT_H
#define SIM7020_MQTT_H

#include <Arduino.h>

void sim7020_powerUp(int pwrPin);
void sim7020_powerDown(int pwrPin);
String sim7020_getIMEI();
bool sim7020_connectToNetwork();
uint8_t sim7020_getRSRP();
void sim7020_getSignalStats(uint8_t &rsrp, uint8_t &rsrq, int8_t &sinr);
bool sim7020_mqttConnect(const char* host, int port);
void sim7020_mqttPublish(const char* topic, const char* payloadHex, int len);
void sim7020_mqttDisconnect();

#endif
