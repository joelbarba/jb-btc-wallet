# JB-BTC-WALLET

This is a Vanilla Bitcoin Wallet generator. It makes all calculations with 0 dependencies from any external library.

This is obviously not meant for production usage! but for learning purposes only.

The fact that no external libraries or native APIs have been used is to have a full understanding of all the operations involved in the Bitcoin Wallet software.

You can find a running instance here: [https://jb-btc-wallet.netlify.app/](https://jb-btc-wallet.netlify.app/)
Even though values are exactly the same as if you'd use a comercial wallet, do not use any of these wallets with real bitcoins. Always protect your data.

## JS Modules

The project is structured in the following JS modules (scoped instances from IIEF):

- Encoders (`jb-encoders.js`)
- Hashes (`jb-hashes.js`)
- ECDSA (`jb-ecdsa.js`)
- Bip39-seed (`jb-bip39-seed.js`)
- Sig-Wallet (`jb-sig-wallet.js`)
- HD-Wallet (`jb-hd-wallet.js`)


### Encoders

By default all values are in hexadecimal format as a string (not the 0x value, but the hex value in a js string).

This is obviously not efficient in terms of computing, but it's easy to manipulate and debug, which is the goal of this software.

There are however other formats we need, so a "format" function is provided in this module to convert values between formats.

Here's the different formats a value can be transformed from/to:

  - bin = binary (string of 0s 1s)
  - dec = decimal (BigInt)
  - hex = hexadecimal (string 'FF' = 1byte)
  - b58 = base58
  - b32 = bech32
  - str = plain text string
  - rev = hex with byte order reversed
  - lie = little-endian (hex with byte order reversed pad to 4 bytes)
  - com = compact-size (dynamic 1, 3, 5 or 9 bytes value encoding)
  - sig = ecdsa signature (Array of 2 BigInts [r, s])
  - der = DER Encoding (Distinguished Encoding Rules) of a signature (in hex)  

The module exports the `format(value, formatIn, formatOut)` function, which takes 3 parameters: the value to convert from, the format from and the format to.

Example: 
```javascript
encoders.format('F1E', 'hex', 'dec');
```



### Hashes

This module is dependent on `jb-encoders.js` ----> `jb-hashes.js`.

It contains all the hashing operations + base58Check needed to run the bitcoin wallet generation.

All input/output parameters are in hexadecimal strings, except base58Check returned values.
There is a function for each of the following operations:

```
  - sha256       --> (hex) => hex
  - sha512       --> (hex) => hex
  - ripemd160    --> (hex) => hex
  - hash256      --> (hex) => hex
  - hash160      --> (hex) => hex
  - base58Check  --> (hex) => b58
  - hmac512      --> (key hex, msg hex) => hex
  - pbkdf2       --> (password hex, salt hex, iterations, dkLen) => hex
```

Example:
```javascript
hashes.sha256('AA37F');
```



### ECDSA

This module is dependent on (`jb-encoders.js`, `jb-hashes.js`) ----> `jb-ecdsa.js`.

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



### BIP 39 Seed

This module is dependent on (`jb-encoders.js`, `jb-hashes.js`) ----> `jb-bip39-seed.js`.

It contains the methods to handle the english word list to represent [BIP 39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) Mnemonic Seed Phrase.

The methods allow to generate a new random seed, or convert an existing seed from a mnemonic sentence (word list) to a seed value (64 bytes hexadecimal value), computed through a `PBKDF2` with an optional passphrase.

```
- wordList[]          --> Array with the 2048 english words
- generateSeedPhrase  --> (numOfWords) => words[]     To generate a new random seed phrase (returns an array with words)
- hexToPhrase         --> (hexStr) => words[]         Returns the mnemonic seed phrase (words) from its hex value
- phraseToHex         --> (words[]) => hexStr         Converts the mnemonic seed phrase array of words to its hex value
- phraseToSeed        --> (words[], pass) => seedHex  Generates the "seed" (hex) from the "seed phrase" (array of words)
```

Example:
```javascript
const words = ['ripple', 'hat', 'helmet', 'develop', 'betray', 'panda', 
               'radio', 'zebra', 'payment', 'silver', 'physical', 'barely'];
const hex = bip39seed.phraseToHex(words);
const seed = bip39seed.phraseToSeed(words, 'myPassphrase');
```



### Sig Wallet

This module is dependent on (`jb-encoders.js`, `jb-hashes.js`, `jb-ecdsa.js`) ----> `jb-sig-wallet.js`.

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
const pk = 'adf10f0b705a08a981615925eb2ce563b274547bd8c991468706e91d07feb388';
const wallet = btcWallet.create(pk);
```


### HD Wallet

This module is dependent on (`jb-encoders.js`, `jb-hashes.js`, `jb-ecdsa.js`, `jb-bip39-seed.js`) ----> `jb-hd-wallet.js`.

It contains a `create()` function that generates an object with a Hierarchical Deterministic BTC Wallet.

It also contains a `loadSeedPhrase(words[])` function where you can create the wallet from an existing seed phrase mnemonic (list of words).
You can use 12, 15, 18, 21 or 24 words seed phrase, from [the BIP39 english words list](https://github.com/bitcoinjs/bip39/blob/master/src/wordlists/english.json)

It also provides a function to encode extended keys from its raw hex format to base58 address: `xKeyEncode(keyType, depthLevel, index, key, chainCode, parentPubKey) => string`.

And another function to decode them back: `xKeyDecode(xKey)`.

The values on the wallet object created:

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

- seedPhraseMnemonic   : string[12~24] - Private key
- passphrase           : string - Phasephrase protecting the master seed generation from words
- seedPhraseHex        : 16~32 bytes (HEX): Seed Phrase in HEX value
- masterSeedHex        : 64 bytes (HEX): Master seed value (after PBKDF2 with passphrase)
- masterKey            : {} Object with the master extended keys
   - chainCode : 32 bytes (HEX) - The Chaincode of the extended key
   - xPrvHex   : 64 bytes (HEX) - Private Extended Key in HEX value (private key + chaincode)
   - xPubHex   : 64 bytes (HEX) - Public Extended Key in HEX value (public key + chaincode)
   - xPrv      : 78 byte (Base58) - Private ext key serialized (address format)
   - xPub      : 78 byte (Base58) - Public ext key serialized (address format)
   - ...wallet : {} Object with the Single Sig Wallet for this key (jb-sig-wallet instance)
   - children  : [] Array with all calculated derived keys
   - deriveKeyFn : (index, hardened) => childKey
```

Example:
```javascript
const seedPhrase = 'almost wrap clip enrich drip edge pink sketch rich addict tell column'.split(' ');
let hdWallet = btcHDWallet.loadSeedPhrase(seedPhrase);

const purpose   = hdWallet.masterKey.deriveKeyFn(84, true); // m/84'
const coinType  = purpose.deriveKeyFn(0, true);             // m/84'/0'
const account   = coinType.deriveKeyFn(0, true);            // m/84'/0'/0'
const receiving = account.deriveKeyFn(0, false);            // m/84'/0'/0'/0

console.log('Account xPub = ', account.xPub); // xpub6CEZ....
console.log(`m/84'/0'/0'/0/0 = `, receiving.deriveKeyFn(0, false).p2wpkhBTCAddress);
console.log(`m/84'/0'/0'/0/1 = `, receiving.deriveKeyFn(1, false).p2wpkhBTCAddress);
console.log(`m/84'/0'/0'/0/2 = `, receiving.deriveKeyFn(2, false).p2wpkhBTCAddress);
console.log(`m/84'/0'/0'/0/3 = `, receiving.deriveKeyFn(3, false).p2wpkhBTCAddress);
```

Both the masterKey and every derived key have a `deriveKeyFn` linked that can be used as a shortcut to derive themselves into their list of childs.
These are always derived as extended privated keys.

You can also derive keys independently using the module functions:
- `derivePrivateKey(xPrivateKey, index, hardened) => { privateKey, chainCode }` To derive private extended keys
- `derivePublicKey(xPrivateKey, index) => { publicKey, chainCode }` To derive public extended keys
