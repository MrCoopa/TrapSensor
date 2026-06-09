#ifndef AES128_H
#define AES128_H

#include <Arduino.h>

/**
 * AES-128 ECB Encryption
 * Note: For a 4-byte payload, we pad it to a 16-byte block.
 * Input: 16 bytes (padded), Key: 16 bytes
 */
void aes128_encrypt(uint8_t* block, const uint8_t* key);

#endif
