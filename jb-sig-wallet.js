// const privateKey = 'adf10f0b705a08a981615925eb2ce563b274547bd8c991468706e91d07feb388';
// const pkDec = format(privateKey, 'hex', 'dec');
// const [x, y] = secp256k1.mult(secp256k1.G, pkDec);
// console.log(`Public Key coordinates = [${x}, ${y}]`);
// // x = 108688863850010992446657959300066847059942364542526501664289547279677522543023
// // y =  59474397414461065864848183731514014285902670767319989111961758316958542520751

// const xHex = format(x, 'dec', 'hex');
// const yHex = format(y, 'dec', 'hex');
// const uncompressedPubKey = '04' + xHex.padStart(32, '0') + yHex.padStart(32, '0');
// const compressedPubKey = (y % 2n === 0 ? '02' : '03') + xHex.padStart(32, '0');

// console.log(`Uncompresed Public Key (65 bytes - hex) = ${uncompressedPubKey}`);
// console.log(`Compresed Public Key (63 bytes - hex) = ${compressedPubKey}`);

// // x = f04bb78709714ba33f339e8ec85ae9be93aaf25bb9bfe9b709f5d8bd3f6981af
// // y = 837d50e6fb41a7c59e8f98649e0bb15618552451189b31edb7cb504247d8e1af

// // Uncompresed Public key = 04 f04bb78709714ba33f339e8ec85ae9be93aaf25bb9bfe9b709f5d8bd3f6981af 837d50e6fb41a7c59e8f98649e0bb15618552451189b31edb7cb504247d8e1af
// //   Compresed Public key = 03 f04bb78709714ba33f339e8ec85ae9be93aaf25bb9bfe9b709f5d8bd3f6981af

// // 03f04bb78709714ba33f339e8ec85ae9be93aaf25bb9bfe9b709f5d8bd3f6981af  ---> BTC Address = 154SQmoY2UQtAjkyR1J91jaoftkraaL8Xe


// // pubKey = 03f04bb78709714ba33f339e8ec85ae9be93aaf25bb9bfe9b709f5d8bd3f6981af
// //          h = SHA-256(pubKey) = ff17c4d1981c5adf7d5644939f4ff1148b39551ae4f00b6416a671c7b107003d
// //          RIPEMD(h) = 2c86f64cf3876eb304cd055251be24a2131bb69f

// // pubKeyHashHex = hash160(pubKey) = RIPEMD(SHA-256(pubKey)) = 2c86f64cf3876eb304cd055251be24a2131bb69f

// // P2PKH BTC Address = hashes.base58Check(pubKeyHashHex) = 54SQmoY2UQtAjkyR1J91jaoftkrYrsVB5


// const pubKey = compressedPubKey;
// const pubKeyHashHex = hash160(pubKey);
// // const pubKeyHashHex = hash160('03f04bb78709714ba33f339e8ec85ae9be93aaf25bb9bfe9b709f5d8bd3f6981af');
// console.log('hash160 = ', pubKeyHashHex); // 2c86f64cf3876eb304cd055251be24a2131bb69f

// const btcAddress = hashes.base58Check('00' + pubKeyHashHex);
// console.log('P2PKH BTC Address = ', btcAddress); // BTC Address = 154SQmoY2UQtAjkyR1J91jaoftkraaL8Xe
// //                                                                154SQmoY2UQtAjkyR1J91jaoftkraaL8Xe

// WIF = 5K8tgooFmJFsxmLgWbNJQK83f6Y9FGQPqvJmNxcWbsdYShu4x1j
//       5K8tgooFmJFsxmLgWbNJQK83f6Y9FGQPqvJmNxcWbsdYShu4x1j 


const btcWallet = (function() {

  /*************************************************************************************
   * Create a new BTC simple wallet
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
    const w = create('adf10f0b705a08a981615925eb2ce563b274547bd8c991468706e91d07feb388');
    if (w.publicKey !== '03f04bb78709714ba33f339e8ec85ae9be93aaf25bb9bfe9b709f5d8bd3f6981af') {
      console.error(`ecdsa publick key generation error: ${w.publicKey}`);
    }
    if (w.uncompressedPubKey !== '04f04bb78709714ba33f339e8ec85ae9be93aaf25bb9bfe9b709f5d8bd3f6981af837d50e6fb41a7c59e8f98649e0bb15618552451189b31edb7cb504247d8e1af') {
      console.error(`ecdsa publick key (uncompressed) error: ${w.uncompressedPubKey}`);
    }
    if (w.pubKeyXCoordinate !== 'f04bb78709714ba33f339e8ec85ae9be93aaf25bb9bfe9b709f5d8bd3f6981af'
     || w.pubKeyYCoordinate !== '837d50e6fb41a7c59e8f98649e0bb15618552451189b31edb7cb504247d8e1af') {
      console.error(`ecdsa publick key [x,y] coordinates error: [${w.pubKeyXCoordinate}, ${w.pubKeyYCoordinate}]`);
    }
    if (w.p2pkhBTCAddress !== '154SQmoY2UQtAjkyR1J91jaoftkraaL8Xe') {
      console.error(`ecdsa p2pkh BTC Address error: ${w.p2pkhBTCAddress}`);
    }

    const K = ecdsa.inverse(13n);
    if (K !== 44535418937429305932142686541803041482026917179092524630560609233811090258332n) {
      console.error(`ecdsa.inverse wrong calculation: ${K}`); 
    }
    
    const G2 = ecdsa.double(ecdsa.secp256k1.G);
    if (G2[0] !== 89565891926547004231252920425935692360644145829622209833684329913297188986597n
    || G2[1] !== 12158399299693830322967808612713398636155367887041628176798871954788371653930n) {
      console.error(`ecdsa.double wrong calculation: ${G2}`); 
    }
    
    const addp1p2 = ecdsa.add([
      40631213407379827575265766493429005347588857316732582912598191893989929267328n,
      29613989991824758332972045223789054229768260472030754834148036238889907723631n
    ], [
      109774007293811363826334463997415812892590708168913585869623228734183832035089n,
      43870201733820643122143680194234559722597448414671888825031981355067220453045n
    ]);
    if (addp1p2[0] !== 79852390998374804644922924374058465716830610037562356511654115649947869215508n
    || addp1p2[1] !==  4691683076180717909424958162512004606742231180693651236251856717081917735880n) {
      console.error(`ecdsa.add wrong calculation: ${addp1p2}`); 
    }

    const gMult = ecdsa.mult(ecdsa.secp256k1.G, 3983);
    if (gMult[0] !== 72052332595704364945663194170211165490438307829559460115419852919413047912134n
    || gMult[1] !== 106410347513708270939804397697451158076144899064773257987530407926827066730784n) {
      console.error(`ecdsa.mult wrong calculation: ${gMult}`); 
    }

  }
  

}());

