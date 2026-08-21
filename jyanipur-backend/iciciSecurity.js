const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load the keys into server memory
const privateKey = fs.readFileSync(path.resolve(process.env.PRIVATE_KEY_PATH), 'utf8');
const iciciPublicKey = fs.readFileSync(path.resolve(process.env.ICICI_PUBLIC_KEY_PATH), 'utf8');

const IciciSecurity = {
  /**
   * Encrypts the payload using ICICI's Public Key
   */
  encryptPayload: (payload) => {
    const buffer = Buffer.from(JSON.stringify(payload), 'utf8');
    const encrypted = crypto.publicEncrypt(
      {
        key: iciciPublicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      buffer
    );
    return encrypted.toString('base64');
  },

  /**
   * Signs the encrypted payload with your Private Key
   */
  signPayload: (encryptedPayloadBase64) => {
    const sign = crypto.createSign('SHA256');
    sign.update(encryptedPayloadBase64);
    sign.end();
    return sign.sign(privateKey, 'base64');
  }
};

module.exports = IciciSecurity;