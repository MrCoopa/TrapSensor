#ifndef AES256_H
#define AES256_H

#include <Arduino.h>

/**
 * AES-256 ECB Encryption
 * Note: Key must be 32 bytes. Block is 16 bytes.
 */
void aes256_encrypt(uint8_t* block, const uint8_t* key);

#endif
