

const btcHDWallet = (function() {

  /*************************************************************************************
   * Create a new BTC Hierarchical Deterministic wallet
   * 
   *  - Param1: Primary key (hex - 32 bytes). If not provided, a random one is generated
   * 
   * It returns an object with all the wallet values calculated:
   *   - privateKey          : 32 bytes (HEX) - Private key
   *   - publicKey           : 33 bytes (HEX) - Compressed Public key
   *   - uncompressedPubKey  : 65 bytes (HEX) - Unompressed Public key
   *   - pubKeyXCoordinate   : 32 bytes (HEX) - X Coordinate of the ECDSA public key point
   *   - pubKeyYCoordinate   : 32 bytes (HEX) - Y Coordinate of the ECDSA public key point
   *   - p2pkhBTCAddress     : 34 chars (Base58) - BTC Address (for P2PKH locking script)
   *   - p2wpkhBTCAddress    : 42 chars (Bech32) - BTC Address (for P2WPKH locking script)  bc1...
   *   - wif                 : 51 chars (Base58) - Private key WIF format, with uncompress public key indicator
   *   - wifCompressed       : 52 chars (Base58) - Private key WIF format, with compress public key indicator
   * 
   *************************************************************************************/
  function create(privateKey) {
    // privateKey = 'adf10f0b705a08a981615925eb2ce563b274547bd8c991468706e91d07feb388';

    if (!privateKey) {
      const randomBytes = crypto.getRandomValues(new Uint8Array(32));
      privateKey = [...randomBytes].map(v => v.toString(16).padStart(2, '0')).join('');
    }

    const pkDec = BigInt('0x' + privateKey); // hex -> dec (as BigInt)
    const [x, y] = ecdsa.mult(ecdsa.secp256k1.G, pkDec);
    // console.log(`Public Key coordinates = [${x}, ${y}]`);
    // x = 108688863850010992446657959300066847059942364542526501664289547279677522543023
    // y =  59474397414461065864848183731514014285902670767319989111961758316958542520751
    
    const xHex = encoders.format(x, 'dec', 'hex'); // f04bb78709714ba33f339e8ec85ae9be93aaf25bb9bfe9b709f5d8bd3f6981af
    const yHex = encoders.format(y, 'dec', 'hex'); // 837d50e6fb41a7c59e8f98649e0bb15618552451189b31edb7cb504247d8e1af
    const uncompressedPubKey = '04' + xHex.padStart(32, '0') + yHex.padStart(32, '0');
    const compressedPubKey = (y % 2n ? '03' : '02') + xHex.padStart(32, '0');
    
    // console.log(`Uncompresed Public Key (65 bytes - hex) = ${uncompressedPubKey}`);
    // console.log(`Compresed Public Key (63 bytes - hex) = ${compressedPubKey}`);
    // Uncompresed Public key = 04 f04bb78709714ba33f339e8ec85ae9be93aaf25bb9bfe9b709f5d8bd3f6981af 837d50e6fb41a7c59e8f98649e0bb15618552451189b31edb7cb504247d8e1af
    //   Compresed Public key = 03 f04bb78709714ba33f339e8ec85ae9be93aaf25bb9bfe9b709f5d8bd3f6981af

    const wif = hashes.base58Check('80' + privateKey);                   // 5K8tgooFmJFsxmLgWbNJQK83f6Y9FGQPqvJmNxcWbsdYShu4x1j
    const wifCompressed = hashes.base58Check('80' + privateKey + '01');  // L33q8hZAAXAfw8hsPch1otz6j9STPxzFpvHQsvTjevUHmyXyWqtZ


    const pubKeyHashHex = hashes.hash160(compressedPubKey);  // 2c86f64cf3876eb304cd055251be24a2131bb69f
    // console.log('hash160 = ', pubKeyHashHex);
    
    const p2pkhBTCAddress = hashes.base58Check('00' + pubKeyHashHex);          // 154SQmoY2UQtAjkyR1J91jaoftkraaL8Xe
    // console.log('P2PKH BTC Address = ', p2pkhBTCAddress); // BTC Address = 154SQmoY2UQtAjkyR1J91jaoftkraaL8Xe

    const p2wpkhBTCAddress = 'bc1' + hashes.bech32(pubKeyHashHex);
    // console.log('P2WPKH BTC Address = ', p2wpkhBTCAddress); // BTC Address = bc1qqt3j5sxusxfddn47l23ksmuyzl8dh2yg0rmh2c


    
    return {
      privateKey          : privateKey,          // 32 bytes (HEX) - Private key
      publicKey           : compressedPubKey,    // 33 bytes (HEX) - Compressed Public key
      uncompressedPubKey  : uncompressedPubKey,  // 65 bytes (HEX) - Unompressed Public key
      pubKeyXCoordinate   : xHex,                // 32 bytes (HEX) - X Coordinate of the ECDSA public key point
      pubKeyYCoordinate   : yHex,                // 32 bytes (HEX) - Y Coordinate of the ECDSA public key point
      p2pkhBTCAddress     : p2pkhBTCAddress,     // 34 chars (Base58) - BTC Address (for P2PKH locking script)   1...
      p2wpkhBTCAddress    : p2wpkhBTCAddress,    // 42 chars (Bech32) - BTC Address (for P2WPKH locking script)  bc1...
      wif                 : wif,                 // 51 chars (Base58) - Private key WIF format, with uncompress public key indicator
      wifCompressed       : wifCompressed,       // 52 chars (Base58) - Private key WIF format, with compress public key indicator
    };
  }

  tests();
  return { create };




  // ------------------------------------------------------------------------------------
  // Tests
  function tests() {

  }
  

}());

