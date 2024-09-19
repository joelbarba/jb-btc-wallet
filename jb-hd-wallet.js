

const btcHDWallet = (function() {



// --------------------------------------------------------
// HD Wallet:

/*************************************************************************************
   * Create a new BTC Hierarchical Deterministic wallet
   * 
   * It returns an object with all the wallet values calculated:
   *   - seedPhraseMnemonic   : string[12~24] - Private key
   *   - passphrase           : string - Phasephrase protecting the master seed generation from words
   *   - seedPhraseHex        : 16~32 bytes (HEX): Seed Phrase in HEX value
   *   - masterSeedHex        : 64 bytes (HEX): Master seed value (after PBKDF2 with passphrase)
   *   - masterKey            : {} Object with the master extended keys
   *      - chainCode : 32 bytes (HEX) - The Chaincode of the extended key
   *      - xPrvHex   : 64 bytes (HEX) - Private Extended Key in HEX value (private key + chaincode)
   *      - xPubHex   : 64 bytes (HEX) - Public Extended Key in HEX value (public key + chaincode)
   *      - xPrv      : 78 byte (Base58) - Private ext key serialized (address format)
   *      - xPub      : 78 byte (Base58) - Public ext key serialized (address format)
   *      - ...wallet : {} Object with the Single Sig Wallet for this key (jb-sig-wallet instance)
   *      - children  : []
   *      - deriveKeyFn : (index, hardened) => childKey
   * 
   *************************************************************************************/
  function create(numWords = 12, passphrase = '') {
    const words = bip39seed.generateSeedPhrase(numWords);
    return loadSeedPhrase(words, passphrase);
  }

  function loadSeedPhrase(words, passphrase = '') {
    const hdWallet = {
      seedPhraseMnemonic : words,
      passphrase         : passphrase,
      seedPhraseHex      : bip39seed.phraseToHex(words),
      masterSeedHex      : bip39seed.phraseToSeed(words, passphrase),
    };

    const key = '426974636f696e2073656564'; // Bitcoin seed
    const data = hdWallet.masterSeedHex;
    const xPrvHex = hashes.hmac512(key, data);       // 9964f8fca205bf821e70a8ce911c7d057f3df1323cd6106a0bef57cb4b72c9fa 5a2d53f8ec7397cf4c8a51fd28c7fd96311982e5d693ae0c8ab2764a4c7d7fef
    const privateKey = xPrvHex.slice(0, 64);         // 9964f8fca205bf821e70a8ce911c7d057f3df1323cd6106a0bef57cb4b72c9fa
    const chainCode = xPrvHex.slice(64, 128);        // 5a2d53f8ec7397cf4c8a51fd28c7fd96311982e5d693ae0c8ab2764a4c7d7fef 

    // Wrapping this calculation into a function so we can make it recursive
    // to generate the HD key tree through the deriveKeyFn() function
    function calcAllKeys(privateKey, chainCode, index = 0, depth = 0, parentPubKey = '') {
      const wallet = btcWallet.create(privateKey);
      const xPrvHex = privateKey + chainCode;        //   9964f8fca205bf821e70a8ce911c7d057f3df1323cd6106a0bef57cb4b72c9fa 5a2d53f8ec7397cf4c8a51fd28c7fd96311982e5d693ae0c8ab2764a4c7d7fef
      const xPubHex = wallet.publicKey + chainCode;  // 02da94de331f507e93a2dfea5b91a0c75a3b39893501a171f2eb55b44b0515b50f 5a2d53f8ec7397cf4c8a51fd28c7fd96311982e5d693ae0c8ab2764a4c7d7fef
      const xPrv = xKeyEncode('xprv', depth, index, privateKey,       chainCode, parentPubKey);
      const xPub = xKeyEncode('xpub', depth, index, wallet.publicKey, chainCode, parentPubKey);
      const children = []; // Private derived keys (by calculation order)

      const deriveKeyFn = (index = 0, hardened = true) => {
        if (hardened && index < 2147483648) { index = index + 2147483648; }
        let child = children.find(k => k.index === index);
        if (!child) {
          const { privateKey, chainCode } = derivePrivateKey(xPrvHex, index, hardened);
          child = calcAllKeys(privateKey, chainCode, index, depth + 1, wallet.publicKey);
          children.push(child);
        }
        return child;
      };

      return { ...wallet, index, chainCode, xPrvHex, xPubHex, xPrv, xPub, children, deriveKeyFn };
    }

    hdWallet.masterKey = calcAllKeys(privateKey, chainCode);



    return hdWallet;
  }



  /****************************************************************************
   * Converts a xKey into its base58 address format
   * Parameters:
   * - keyType      xprv / xpub / yprv / ypub / zprv / zpub
   * - depthLevel   0 to 255 (how many childs from master key). 0 = master key
   * - index        from 0 to 2147483647 (normal)
   *                from 2147483648 to 4294967295 (hardened)
   * - key          The key in hex  (32 bytes, 64 chars)
   * - chainCode    The chain code  (32 bytes, 64 chars)
   *                The last 32 bytes from the HMAC-SHA512 of the parentKey
   * - parentPubKey The parent public key in hex (32 bytes, 64 chars)
   */
  function xKeyEncode(keyType = 'xprv', depthLevel = 0, index = 0, key, chainCode = '', parentPubKey = '') {
    if (depthLevel === 0 && index > 0) { console.error('For master key (depth = 0) index should be alwas 0'); }

    switch (keyType) {
      case 'xprv': version = '0488ade4'; break;
      case 'xpub': version = '0488b21e'; break;
      case 'yprv': version = '049d7878'; break;
      case 'ypub': version = '049d7cb2'; break;
      case 'zprv': version = '04b2430c'; break;
      case 'zpub': version = '04b24746'; break;
      default: throw new Error('Wrong key type: ', keyType);
    }

    const keyPrefix = keyType === 'xprv' ? '00' : '';
    const depth = format(depthLevel, 'dec', 'hex').padStart(2, '0');
    const indexHex = format(index, 'dec', 'hex').padStart(8, '0');

    // 0 for master, hash of the parent for others
    const fingerprint = (depthLevel > 0 ? hashes.hash160(parentPubKey) : '00').padStart(8, '0').slice(0, 8);
    
    // console.log(version + depth + fingerprint + indexHex + chainCode + keyPrefix + key);
    const xKey = hashes.base58Check(version + depth + fingerprint + indexHex + chainCode + keyPrefix + key);

    return xKey;
  }
  // 0488ADE4 00 00000000 00000000 5a2d53f8ec7397cf4c8a51fd28c7fd96311982e5d693ae0c8ab2764a4c7d7fef00 9964f8fca205bf821e70a8ce911c7d057f3df1323cd6106a0bef57cb4b72c9fa fabd1124
  // prefix depth fingerp index    chain code                                                         key                                                              checksum


  /****************************************************************************
   * Returns the raw hex value, and all the parameters (type, depth, index, fingerprint, chainCode)
   * Parameters:
   * - xKey         Key in base58 address format
   */
  function xKeyDecode(xKeyB58) {
    const xKey = format(xKeyB58, 'b58', 'hex').padStart(164, '0');
    const prefix = xKey.slice(0, 8).toUpperCase();
    if (prefix !== '0488ADE4' && prefix !== '0488B21E') { console.error('Wrong prefix', prefix); }

    const keyType = prefix === '0488ADE4' ? 'xprv' : 'xpub';
    const depth       = xKey.slice(8, 10);  // 1 byte
    const fingerprint = xKey.slice(10, 18); // 4 bytes
    const index       = xKey.slice(18, 26); // 4 bytes
    const chainCode   = xKey.slice(26, 90); // 32 bytes
    const keyHex      = xKey.slice(90, 156); // 32 bytes
    const checksum    = xKey.slice(156, 165); // 4 bytes

    return { keyType, fingerprint, chainCode, keyHex, depth: format(depth, 'hex', 'dec'), index: format(index, 'hex', 'dec') };
  }


  /****************************************************************************
   * Derives a Private Extended Key
   * Parameters:
   * - xPrivateKey  String with the private extended key in HEX (key + chainCode)
   * - index        Number with the index to derive
   * - hardened     Boolean. If true, it adds 2147483648 to the index and derives it as a hardened key
   * 
   * It returns an object with the derived key: { privateKey, chainCode }
   */
  function derivePrivateKey(xPrivateKey, index = 0, hardened = true) {
    // const orderOfTheCurve = 115792089237316195423570985008687907852837564279074904382605163141518161494337n; // https://en.bitcoin.it/wiki/Secp256k1
    const orderOfTheCurve = ecdsa.secp256k1.n;
    // const orderOfTheCurve = ecdsa.secp256k1.p;
    const privateKey = xPrivateKey.slice(0, 64);
    const chainCode = xPrivateKey.slice(64, 128);

    let data = '';
    if (hardened && index < 2147483648) { index = index + 2147483648; }
    if (index >= 2147483648) { data = '00' + privateKey; }         // Hardened child -> Use private key
    else { data = btcWallet.create(privateKey).publicKey; } // Normal child ---> Use public key

    data += format(index, 'dec', 'hex').padStart(8, '0');

    const hash = hashes.hmac512(chainCode, data).padStart(128, '0'); // 32 + 32 bytes

    const tmpKey = hash.slice(0, 64);
    const childChainCode = hash.slice(64, 128);

    // Check the chain code is valid.
    if (BigInt('0x' + childChainCode) >= orderOfTheCurve) { console.error('Chain code >= than the order of the curve. Try the another index'); }

    const childPrivateKey = ((BigInt('0x' + privateKey) + BigInt('0x' + tmpKey)) % orderOfTheCurve).toString(16);

    return {
      privateKey : childPrivateKey,  // 17ebd9ac3a8e5c33c60f0cd629f9b1a3c133d4e29e99968c9c2087dc1bfc90be
      chainCode  : childChainCode,   // 730b85e24e52b54b3778670353ff8bab40a0986329574db9143e368187f09a38
      // publicKey  : btcWallet.create(childPrivateKey).publicKey,
    };
  }


    /****************************************************************************
   * Derives a Public Extended Key
   * Parameters:
   * - xPublicKey   String with the public extended key in HEX (key + chainCode)
   * - index        Number with the index to derive (up to 2147483648)
   * 
   * It returns an object with the derived key: { publicKey, chainCode }
   */
  function derivePublicKey(xPublicKey, index = 0) {

    const publicKey = xPublicKey.slice(0, 66);
    const chainCode = xPublicKey.slice(66, 130);

    if (index > 2147483647) { console.error(`Index > 2147483647. You can't derive hardened public keys`); }

    const data = publicKey + format(index, 'dec', 'hex').padStart(8, '0');

    const hmac = hashes.hmac512(chainCode, data).padStart(128, '0'); // 32 + 32 bytes
    const tmpKey = hmac.slice(0, 64);
    const childChainCode = hmac.slice(64, 128);

    const hmacPoint = ecdsa.mult(ecdsa.secp256k1.G, BigInt('0x' + tmpKey)); // Multiply by the generator to get the ECDSA point

    // Calculate the point on the curve for the public key ---> y = sqr(x^3 + 7 mod p)
    const pubKeyPoint = ecdsa.pubKeyPoint(publicKey);

    const [x, y] = ecdsa.add(hmacPoint, pubKeyPoint); // Calculate the new point
    const compressedPubKey = (y % 2n ? '03' : '02') + format(x, 'dec', 'hex').padStart(64, '0');

    // console.log('tmpKey = ',tmpKey); // e1dde4bbf9d5041dda826af7939b7f6f5649d44268f3164c0b11d83b9a07583e
    // console.log('hmacPoint X = ', format(hmacPoint[0], 'dec', 'hex')); // 7eba3dbbee2a3a863ec2c6397b6f4dae85a30bd27a4d1b1943ad11d38a6e59c0
    // console.log('hmacPoint Y = ', format(hmacPoint[1], 'dec', 'hex')); // d090751acd30dcdb7c207cf6dd6113484f04615bcfc8e0c94d7c82180bad5d21

    // console.log('xCoor = ', format(xCoor, 'dec', 'hex'), xCoor); // f04bb78709714ba33f339e8ec85ae9be93aaf25bb9bfe9b709f5d8bd3f6981     424565874414105439244757653515886121327899861494244147126131044061240322433n
    // console.log('yCoor = ', format(yCoor, 'dec', 'hex'), yCoor); // 837d50e6fb41a7c59e8f98649e0bb15618552451189b31edb7cb504247d8e1af 59474397414461065864848183731514014285902670767319989111961758316958542520751n

    // console.log('Calculated point [x, y] = ', x, y);
    // console.log('Derived Pubic Key = ', compressedPubKey);
    // console.log('Derived Chain Code = ', childChainCode);

    return { publicKey : compressedPubKey, chainCode : childChainCode };
  }





  tests();
  return { 
    create,           // (numWords, passphrase) => wallet             Creates a new random wallet
    loadSeedPhrase,   // (words[], passphrase) => wallet              Creates a wallet from a seed phrase (list of words)
    xKeyEncode,       // (keyType, depthLevel, index, key, chainCode, parentPubKey) => string   Converts an extended key into its base58 address format
    xKeyDecode,       // (xKey) => ...                                Returns the raw hex value, and all the parameters of the key
    derivePrivateKey, // (xPrivateKey, index, hardened) => { privateKey, chainCode }    Derives a Private Extended Key
    derivePublicKey,  // (xPrivateKey, index) => { publicKey, chainCode }               Derives a Public Extended Key
  };



  // ------------------------------------------------------------------------------------
  // Tests
  function tests() {

  }
  

}());



// 0304597b05d601aa0016a02286d88aedb74f0fe0da4f200cbfa244583fdb0c9a8c
// 0304597b05d601aa0016a02286d88aedb74f0fe0da4f200cbfa244583fdb0c9a8c