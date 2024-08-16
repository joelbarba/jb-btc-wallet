# JB-BTC-WALLET

This is a Vanilla Bitcoin Wallet generator, that makes all calculations with 0 dependencies from another libraries.
This is not meant for production usage! This is only for learning purposes.
The fact that no external libraries or native APIs have been used is to have a full understanding of all the operations involved in the Bitcoin Wallet software.

## JS Modules

The project is structured in the following JS modules (IEEF):

- Encoders
- Hashes
- ECDSA
- Bip-39-seed
- Sig-Wallet
- HD-Wallet

### Encoders

`jb-encoders.js`

By default all values are in hexadecimal format as a string (not the 0x value, but the hex value in a js string).
This is obviously not efficient in terms of computing, but it's easy to manipulate and debug, which is the goal of this software.

There are however other formats we need, so a "format" function is provided in this module to convert values between formats.
Here's the different formats a value can be transformed from/to:

  - bin = binary (string of 0s 1s)
  - dec = decimal (BigInt)
  - hex = hexadecimal (string 'FF' = 1byte)
  - b58 = base58
  - str = plain text string

The module exports the `format(value, formatIn, formatOut)` function, which takes 3 parameters: the value to convert from, the format from and the format to.
Example: encoders.format('F1E', 'hex', 'dec')

### Hashes

`jb-hashes.js`

This module is dependent on `jb-encoders.js`.
It contains all the hashing operations + base58Check and Bech32 needed to run the bitcoin wallet generation.
All input/output parameters are in hexadecimal strings, except base58Check and Bech32 returned values.
There is a function for each of the following operations:

  - sha256       --> (hex) => hex
  - sha512       --> (hex) => hex
  - ripemd160    --> (hex) => hex
  - hash256      --> (hex) => hex
  - hash160      --> (hex) => hex
  - base58Check  --> (hex) => b58
  - bech32       --> (hex) => bech32
  - hmac512      --> (key hex, msg hex) => hex
  - pbkdf2       --> (password hex, salt hex, iterations, dkLen) => hex

Example: hashes.sha256('AA37F');