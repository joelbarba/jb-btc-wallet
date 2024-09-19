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
    const uncompressedPubKey = '04' + xHex.padStart(64, '0') + yHex.padStart(64, '0');
    const compressedPubKey = (y % 2n ? '03' : '02') + xHex.padStart(64, '0');
    
    // console.log(`Uncompresed Public Key (65 bytes - hex) = ${uncompressedPubKey}`);
    // console.log(`Compresed Public Key (63 bytes - hex) = ${compressedPubKey}`);
    // Uncompresed Public key = 04 f04bb78709714ba33f339e8ec85ae9be93aaf25bb9bfe9b709f5d8bd3f6981af 837d50e6fb41a7c59e8f98649e0bb15618552451189b31edb7cb504247d8e1af
    //   Compresed Public key = 03 f04bb78709714ba33f339e8ec85ae9be93aaf25bb9bfe9b709f5d8bd3f6981af

    const wif = hashes.base58Check('80' + privateKey);                   // 5K8tgooFmJFsxmLgWbNJQK83f6Y9FGQPqvJmNxcWbsdYShu4x1j
    const wifCompressed = hashes.base58Check('80' + privateKey + '01');  // L33q8hZAAXAfw8hsPch1otz6j9STPxzFpvHQsvTjevUHmyXyWqtZ


    const pubKeyHashHex = hashes.hash160(compressedPubKey);  // 2c86f64cf3876eb304cd055251be24a2131bb69f
    // console.log('hash160 = ', pubKeyHashHex);
    
    // const p2pkhBTCAddress = hashes.base58Check('00' + pubKeyHashHex);
    const p2pkhBTCAddress = hashToAddress(pubKeyHashHex, 'P2PKH'); // Base58 check encoding
    // console.log('P2PKH BTC Address = ', p2pkhBTCAddress); // BTC Address = 154SQmoY2UQtAjkyR1J91jaoftkraaL8Xe

    const p2wpkhBTCAddress = hashToAddress(pubKeyHashHex, 'P2WPKH'); // Bech32 encoding
    // console.log('P2WPKH BTC Address = ', p2wpkhBTCAddress); // BTC Address = bc1qqt3j5sxusxfddn47l23ksmuyzl8dh2yg0rmh2c


    
    return {
      privateKey          : privateKey,          // 32 bytes (HEX) - Private key
      publicKey           : compressedPubKey,    // 33 bytes (HEX) - Compressed Public key
      uncompressedPubKey  : uncompressedPubKey,  // 65 bytes (HEX) - Unompressed Public key
      pubKeyHash          : pubKeyHashHex,       // 20 bytes (HEX) - Public key hash of the compressed public key
      pubKeyXCoordinate   : xHex,                // 32 bytes (HEX) - X Coordinate of the ECDSA public key point
      pubKeyYCoordinate   : yHex,                // 32 bytes (HEX) - Y Coordinate of the ECDSA public key point
      p2pkhBTCAddress     : p2pkhBTCAddress,     // 34 chars (Base58) - BTC Address (for P2PKH locking script)   1...
      p2wpkhBTCAddress    : p2wpkhBTCAddress,    // 42 chars (Bech32) - BTC Address (for P2WPKH locking script)  bc1...
      wif                 : wif,                 // 51 chars (Base58) - Private key WIF format, with uncompress public key indicator
      wifCompressed       : wifCompressed,       // 52 chars (Base58) - Private key WIF format, with compress public key indicator
    };
  }

  // Converts a public key hash into a BTC Address (legacy / segWit)
  function hashToAddress(pubKeyHashHex, script = 'P2WPKH') {
    if (script === 'P2PKH')  { return hashes.base58Check('00' + pubKeyHashHex); } // 1... address
    if (script === 'P2SH')   { return hashes.base58Check('05' + pubKeyHashHex); } // 3... address
    if (script === 'P2WPKH') { return encoders.format(pubKeyHashHex, 'hex', 'b32'); } // bc1... address (42 char)
    if (script === 'P2WSH')  { return encoders.format(pubKeyHashHex, 'hex', 'b32'); } // bc1... address (62 char)
    console.error(`Error: Unknown script`, script);
    return '';    
  }

  // It takes a BTC Address and returns its Public Key Hash
  function addressToHash(btcAddress) {
    if (btcAddress.slice(0, 3) === 'bc1') { // Segwit address P2WPKH "bc1.."
      return encoders.format(btcAddress, 'b32', 'hex');
    }

    if (btcAddress.slice(0, 1) === '1' || btcAddress.slice(0, 1) === '3') { // Legacy address P2PKH "1..." / P2SH "3..."
      const hexAddr = encoders.format(btcAddress, 'b58', 'hex').padStart(50, '0');
      const prefix        = hexAddr.slice(0, 2);
      const publicKeyHash = hexAddr.slice(2, -8);
      const checksum      = hexAddr.slice(-8);
      const calculatedChecksum = hashes.hash256(prefix + publicKeyHash).slice(0, 8);
      if (checksum !== calculatedChecksum) {
        console.error(`Invalid checksum for address`, btcAddress);
      }
      return publicKeyHash;
    }

    console.error(`Error: Unknown address`, btcAddress);
    return '';
  }

  // Validates the address, and returns the script type and hash
  function checkAddress(btcAddress) {
    const char12 = btcAddress.slice(0, 2);
    if ((char12 === '02' || char12 === '03') && btcAddress.length === 66) {
      return { scriptName: 'P2PK', isSegWit: false };  // Here the btcAddress is not an address but the public Key
    }
    let scriptName = '';
    if (btcAddress.slice(0, 1) === '1' && btcAddress.length === 34)   { scriptName = 'P2PKH'; }
    if (btcAddress.slice(0, 1) === '3' && btcAddress.length === 34)   { scriptName = 'P2SH'; }
    if (btcAddress.slice(0, 3) === 'bc1' && btcAddress.length === 42) { scriptName = 'P2WPKH'; }
    if (btcAddress.slice(0, 3) === 'bc1' && btcAddress.length === 62) { scriptName = 'P2WSH'; }
    if (!scriptName) { return { error: 'Unkown address type' }; }
    const hash = addressToHash(btcAddress);
    const addr = hashToAddress(hash, scriptName);
    if (btcAddress !== addr) { return { error: 'Invalid address' }; }
    return { scriptName, hash, isSegWit: btcAddress.slice(0, 3) === 'bc1' };
  }



  tests();
  return {
    create,
    hashToAddress,
    addressToHash,
    checkAddress,
  };




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

    // Test Public Key Hash <--> BTC Address conversions
    const addr1 = '175A5YsPUdM71mnNCC3i8faxxYJgBonjWL'; pkh1 = '4299ff317fcd12ef19047df66d72454691797bfc';
    if (addressToHash(addr1) !== pkh1) { console.error(`Error: btcWallet.addressToHash wrong pub key hash. It should be:`, pkh1); }
    if (hashToAddress(pkh1, 'P2PKH') !== addr1) { console.error(`Error: btcWallet.hashToAddress wrong address. It should be`, addr1); }
    const addr2 = '1HQ9JGeF1X3HWWJYF3cyYFBuQWpmb1hJkN'; pkh2 = 'b3e2819b6262e0b1f19fc7229d75677f347c91ac';
    if (addressToHash(addr2) !== pkh2) { console.error(`Error: btcWallet.addressToHash wrong pub key hash. It should be:`, pkh2); }
    if (hashToAddress(pkh2, 'P2PKH') !== addr2) { console.error(`Error: btcWallet.hashToAddress wrong address. It should be`, addr2); }

    const pkh3 = '751e76e8199196d454941c45d1b3a323f1433bd6';
    const legacyAddr = '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH';
    const segwitAddr = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
    if (hashToAddress(pkh3, 'P2PKH')  !== legacyAddr) { console.error(`Error: btcWallet.hashToAddress should be`, legacyAddr); }
    if (hashToAddress(pkh3, 'P2WPKH') !== segwitAddr) { console.error(`Error: btcWallet.hashToAddress should be`, segwitAddr); }
    if (addressToHash(legacyAddr) !== pkh3) { console.error(`Error: btcWallet.addressToHash should be`, pkh3); }
    if (addressToHash(segwitAddr) !== pkh3) { console.error(`Error: btcWallet.addressToHash should be`, pkh3); }


    const runAddrTest = (hash, addr, script) => {
      if (hashToAddress(hash, script) !== addr) { console.error(`Error: btcWallet.hashToAddress wrong address. It should be:`, addr); }
      if (addressToHash(addr) !== hash) { console.error(`Error: btcWallet.addressToHash wrong hash. It should be:`, hash); }
    };

    // Random addresses from the blockchain
    runAddrTest('7ef0ba49ca25feeb5e95a16b9f93a5e69975d84d', '1CaCXDyNQnLHbrVM9R7HSg8cJ3ZjJsfmJz', 'P2PKH');
    runAddrTest('3fb6479536b8e89b7c2da51f86b59c996bc7f95b', '16osw6Xt1MBFNdGQ2qYdifPWRJUQCzEZnT', 'P2PKH');
    runAddrTest('81c83c34bea4d8153143410c2548246e08770e7c', '1CqE3LACnxLnsMZkj6LWDgq2wPjj8pkbfz', 'P2PKH');
    runAddrTest('12990f6e63182a73966c4cff45007aade8815e30', '12hLXGWusojWiv2m3rtEjC5TttsschMp1H', 'P2PKH');
    runAddrTest('f98da2aa4951144efad108571b2f1548daab5e4e', '1PkWvmTzmc7LhJgUx1s3UQWSZoMJjGfMhZ', 'P2PKH');
    runAddrTest('4ce0416e03b2283ae2a79161345453d8b5c5c081', '181V18ZPGUV7Q5FY7426JUV2ztqXDubDFK', 'P2PKH');
    runAddrTest('f2ea57dc9a60d534007d4e617e87bddfd8c8f528', '1P9RFsjGmi92PE9j3byUrZyv3TkydjzeHq', 'P2PKH');
    runAddrTest('f13eb2331b7bb38fea4273bbe7bd69da9d5f6cf3', '1NzaxS4Ebwcom7C8hYTLA4x5ScLwNm36UV', 'P2PKH');
    runAddrTest('828c1e95983fce344adfa09a984066a68cd0d25c', '1CuGhcM5d7vnMBJXL31QBsoyUk4kpJqNMp', 'P2PKH');
    runAddrTest('ff6dcbc5aecff8b2c3aae73549fac1df89c4aff2', '1QHaqgBYDTzHtcCMAdTro8DKiESDUq7vb7', 'P2PKH');
    runAddrTest('e6194861f82d30758570e7fc5bafb04309f915bc', '3NffdLiEwqhMGXzuZvSQk2Qi9MMVRAugPV', 'P2SH');
    runAddrTest('4a1154d50b03292b3024370901711946cb7cccc3', '38Segwituno6sUoEkh57ycM6K7ej5gvJhM', 'P2SH');
    runAddrTest('8d7a0a3461e3891723e5fdf8129caa0075060cff', 'bc1q34aq5drpuwy3wgl9lhup9892qp6svr8ldzyy7c', 'P2WPKH');
    runAddrTest('f60834ef165253c571b11ce9fa74e46692fc5ec1', 'bc1q7cyrfmck2ffu2ud3rn5l5a8yv6f0chkp0zpemf', 'P2WPKH');
    runAddrTest('a973213efe53a62dbdcce26c83fefa0af65593d8', 'bc1q49ejz0h72wnzm0wvufkg8lh6ptm9ty7cttssfv', 'P2WPKH');
    runAddrTest('5c499f135761818cae0155d94d17d87a46cfc1c3', 'bc1qt3ye7y6hvxqcetsp2hv5697c0frvlswr6f2vuj', 'P2WPKH');
    runAddrTest('0dc746afa71320631729eab290e851fda2eb96b4', 'bc1qphr5dta8zvsxx9efa2efp6z3lk3wh945egn6u6', 'P2WPKH');
    runAddrTest('dda52c967f572cf143ee4d808458cfee80340914', 'bc1qmkjje9nl2uk0zslwfkqggkx0a6qrgzg5k3hlf5', 'P2WPKH');
    runAddrTest('dda52c967f572cf143ee4d808458cfee80340914', 'bc1qmkjje9nl2uk0zslwfkqggkx0a6qrgzg5k3hlf5', 'P2WPKH');
    runAddrTest('dda52c967f572cf143ee4d808458cfee80340914', 'bc1qmkjje9nl2uk0zslwfkqggkx0a6qrgzg5k3hlf5', 'P2WPKH');
    runAddrTest('c87bd49e7cfb0bced6c3c53d3c531296b28384f1', 'bc1qepaaf8nulv9ua4krc57nc5cjj6eg8p83awa6ge', 'P2WPKH');
    runAddrTest('16ee7494a93f327c10afe94c04fdcb1dc3744600', 'bc1qzmh8f99f8ue8cy90a9xqflwtrhphg3sq76srhe', 'P2WPKH');

  }
  

}());


