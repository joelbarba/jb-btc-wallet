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

Example: 
```javascript
encoders.format('F1E', 'hex', 'dec');
```

### Hashes

`jb-hashes.js`

This module is dependent on `jb-encoders.js`.

It contains all the hashing operations + base58Check and Bech32 needed to run the bitcoin wallet generation.

All input/output parameters are in hexadecimal strings, except base58Check and Bech32 returned values.
There is a function for each of the following operations:

```
  - sha256       --> (hex) => hex
  - sha512       --> (hex) => hex
  - ripemd160    --> (hex) => hex
  - hash256      --> (hex) => hex
  - hash160      --> (hex) => hex
  - base58Check  --> (hex) => b58
  - bech32       --> (hex) => bech32
  - hmac512      --> (key hex, msg hex) => hex
  - pbkdf2       --> (password hex, salt hex, iterations, dkLen) => hex
```

Example:
```javascript
hashes.sha256('AA37F');
```

### ECDSA

`jb-ecdsa.js`

This module is dependent on `jb-encoders.js` and `jb-hashes.js`.

This module contains the main constants and methods to use ECDSA (Elliptic Curve Digital Signature Algorithm).

It exports an object to access the constant values of the Bitcoin Elliptic Curve: `ecdsa.secp256k1`. And the main functions to perform operations on the curve:

```
  - mod       --> (value) => value                 Modulus operation on secp256k1.p
  - inverse   --> (value) => value                 Inverse operation K^-1
  - double    --> ([x, y]) => [x, y]               Dobules the coordinates of the given point
  - add       --> ([x1, y1], [x2, y2]) => [x, y]   Adds 2 points
  - mult      --> ([x, y], mul) => [x, y]          Multiplies a point by a value
  - modPow    --> (value, exp, mod) => value       Modular power operation
  - modSqrt   --> (value) => value                 Modular Square Root operation
```

Example:
```javascript
const pk = 'adf10f0b705a08a981615925eb2ce563b274547bd8c991468706e91d07feb388';
const point = ecdsa.mult(ecdsa.secp256k1.G, BigInt('0x' + pk));
console.log(point); // Coordinates of G * point
```

### Sig Wallet

`jb-sig-wallet.js`

This module is dependent on `jb-encoders.js`, `jb-hashes.js` and `jb-ecdsa.js`.

It contains a `create()` function that generates an object with a Single Sig BTC Wallet.

You can optionally pass in a private key (in hex string format) so it initializes the wallet from that key.
The values on the object are:

```
- privateKey          : 32 bytes (HEX) - Private key
- publicKey           : 33 bytes (HEX) - Compressed Public key
- uncompressedPubKey  : 65 bytes (HEX) - Unompressed Public key
- pubKeyXCoordinate   : 32 bytes (HEX) - X Coordinate of the ECDSA public key point
- pubKeyYCoordinate   : 32 bytes (HEX) - Y Coordinate of the ECDSA public key point
- p2pkhBTCAddress     : 34 chars (Base58) - BTC Address (for P2PKH locking script)
- p2wpkhBTCAddress    : 42 chars (Bech32) - BTC Address (for P2WPKH locking script)  bc1...
- wif                 : 51 chars (Base58) - Private key WIF format, with uncompress public key indicator
- wifCompressed       : 52 chars (Base58) - Private key WIF format, with compress public key indicator
```

Example:
```javascript
const wallet = btcWallet.create('adf10f0b705a08a981615925eb2ce563b274547bd8c991468706e91d07feb388');
```
