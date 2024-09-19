const encoders = (function() {

  /********************************************************
   * Converts "value" from "ori" format to "des" format.
   * Possible formats:
   *  - bin = binary (string of 0s 1s)
   *  - dec = decimal (BigInt)
   *  - hex = hexadecimal (string FF=1byte)
   *  - b58 = base58
   *  - b32 = bech32
   *  - str = plain text string
   *  - rev = byte order reversed
   *  - lie = little-endian (hex with byte order reversed - 4 bytes)
   *  - com = compact-size (dynamic 1, 3, 5 or 9 bytes value encoding)
   *  - sig = Signature (Array of 2 BigInts [r, s])
   *  - der = DER Encoding (Distinguished Encoding Rules) of a signature (in hex)
   ********************************************************/
  function format(value, ori = 'dec', des = 'bin', hexSize = 0) {
    if (ori === 'dec' && des === 'bin') { return BigInt(value).toString(2); }
    if (ori === 'hex' && des === 'bin') { return BigInt('0x' + value).toString(2); }

    if (ori === 'hex' && des === 'dec') { return Number(BigInt('0x' + value)); }
    if (ori === 'bin' && des === 'dec') { return Number(BigInt('0b' + value)); }

    if (ori === 'dec' && des === 'hex') { return BigInt(value).toString(16).padStart(hexSize, '0'); }
    if (ori === 'bin' && des === 'hex') { return BigInt('0b' + value).toString(16).padStart(hexSize, '0'); }

    if (ori === 'hex' && des === 'b58') { return hexToBase58(value); }
    if (ori === 'b58' && des === 'hex') { return base58ToHex(value).padStart(hexSize, '0'); }

    if (ori === 'hex' && des === 'b32') { return bech32(value); }
    if (ori === 'b32' && des === 'hex') { return decodeBech32(value).padStart(hexSize, '0'); }

    if (ori === 'str' && des === 'hex') { return textToHex(value).padStart(hexSize, '0'); }
    if (ori === 'hex' && des === 'str') { return hexToText(value); }

    if (ori === 'hex' && des === 'rev') { return reverseHex(value, hexSize); }
    if (ori === 'dec' && des === 'rev') { return reverseHex(BigInt(value).toString(16), hexSize); }

    if (ori === 'hex' && des === 'lie') { return reverseHex(value, hexSize || 8); }
    if (ori === 'dec' && des === 'lie') { return reverseHex(BigInt(value).toString(16), hexSize || 8); }
    if (ori === 'lie' && des === 'hex') { return reverseHex(value, hexSize || 8); }
    if (ori === 'lie' && des === 'dec') { return Number(BigInt('0x' + reverseHex(value, hexSize || 8))); }

    if (ori === 'dec' && des === 'com') { return decToCompactSize(value); }
    if (ori === 'hex' && des === 'com') { return decToCompactSize(format(hex, 'hex', 'dec')); }
    if (ori === 'com' && des === 'dec') { return compactSizeToDec(value); }

    if (ori === 'sig' && des === 'der') { return derEncode(value); }

    console.error(`${ori} --> ${des} has no encoding function`);
  }


  // 68656c6c6f207468657265 ---> StV1DL6Cw83vZme
  function hexToBase58(hex_number) {
    const base58 = [1,2,3,4,5,6,7,8,9,'A','B','C','D','E','F','G','H','J','K','L','M','N','P','Q','R','S','T','U','V','W','X','Y','Z','a','b','c','d','e','f','g','h','i','j','k','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];
    let num = BigInt('0x' + hex_number);
    let remainder;
    let b58_encoded_buffer = '';
    while (num > 0) {
      remainder = num % 58n;
      b58_encoded_buffer = base58[remainder] + b58_encoded_buffer;
      num = num / 58n;
    }
    while (hex_number.match(/^00/)) {
      b58_encoded_buffer = '1' + b58_encoded_buffer;
      hex_number = hex_number.substring(2);
    }
    return b58_encoded_buffer;
  }

  // StV1DL6Cw83vZme ---> 68656c6c6f207468657265
  function base58ToHex(b58Str) {
    const base58 = ['1','2','3','4','5','6','7','8','9','A','B','C','D','E','F','G','H','J','K','L','M','N','P','Q','R','S','T','U','V','W','X','Y','Z','a','b','c','d','e','f','g','h','i','j','k','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];
    let value = BigInt(0);
    let digit = BigInt(1);
    for (t = b58Str.length - 1; t >= 0; t--) {
      const v = base58.indexOf(b58Str[t]);
      value += BigInt(v) * digit;
      digit = digit * 58n;
    }
    return value.toString(16);
  }

  function textToHex(text) {
    return text.split('').map(c => c.charCodeAt(0).toString(16).padStart('0', '2')).join('');
  }

  function hexToText(hexStr) {
    return hexStr.split('')
      .map((c,i) => c + (i%2 ? '-': ''))  // Group chars by 2
      .join('').slice(0, -1).split('-')   // Join them and remove empty last
      .map(v => String.fromCharCode(Number('0x' + v))) // Convert 2char hex to ascii
      .join('');
  }

  // A shortcut to turn a regular hex value to little-endian,
  // reversing the value of their byte position (least-significant first)
  function reverseHex(hexNum = '00', hexSize = hexNum.length) {
    const value = hexNum.padStart(hexSize, '0');
    const byteArr = value.split('').map((c,i) => (i%2 ? '' : '-') + c).join('').slice(1).split('-');
    return byteArr.reverse().join('');
  }



  /*******************************************************************************************
   *  No dependency implementation of the BECH32 encoding (BIP-173)
   *  - Input  : String representing a HEX value
   *  - Output : String representing a Bech32
   *  
   *  We will usually convert:
   *    - 20 bytes hexStr = 160 bits -------------------> 42 chars (3 prefix + 33 data + 6 checksum)
   *    - 32 bytes hexStr = 256 bits (+4 extra 0000) ---> 62 chars (3 prefix + 53 data + 6 checksum)
   * 
   *  Ex: 751e76e8199196d454941c45d1b3a323f1433bd6 => bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4
   *      65f91a53cb7120057db3d378bd0f7d944167d43a7dcbff15d6afc4823f1d3ed3 => bc1qvhu3557twysq2ldn6dut6rmaj3qk04p60h9l79wk4lzgy0ca8mfsnffz65
   * 
   * bc1 q9jr0vn8nsahtxpxdq4f9r03y5gf3hd5l 0lkjx6
   * 
   *  Based on https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki#Bech32
   *******************************************************************************************/
  function bech32(hexStr, version = 0, prefix = 'bc1') {
    const rightSize = Math.ceil((hexStr.length * 4) / 5) * 5;
    const leftSize = hexStr.length * 4;

    const bin = format(hexStr, 'hex', 'bin').padStart(leftSize, '0').padEnd(rightSize, '0');
    // console.log('8 bit = ', bin.split('').map((c,i) => (i%8 ? '': ' ') + c).join('').slice(1));
    // console.log('5 bit = ', bin.split('').map((c,i) => (i%5 ? '': ' ') + c).join('').slice(1));
    
    const bin5bit = bin.split('').map((c,i) => (i%5 ? '': ' ') + c).join('').slice(1).split(' ');
    
    // const hexPart = bin5bit.map(n => format(n, 'bin', 'hex').padStart(2, '0'));
    // console.log(hexPart.join('')); // 0e140f070d1a001912060b0d081504140311021d030c1d03040f1814060e1e16
    
    const decArr5bit = [version].concat(bin5bit.map(n => format(n, 'bin', 'dec'))); // Adding version byte (0) and turning it into a dec array
    const checksumArr = createBech32Checksum(decArr5bit); // 0c 07 09 11 0b 15  =  0c0709110b15 ---> v8f3t4
    
    const data = decArr5bit.map(c => BECH32DICT[c]).join('');       // qw508d6qejxtdg4y5r3zarvary0c5xw7k
    const checksum = checksumArr.map(c => BECH32DICT[c]).join('');  // v8f3t4
    
    return prefix + data + checksum;  // bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4
  }

   /*******************************************************************************************
   *  Decode a Bech32 string (and validate the checksum)
   *  - Input  : String representing a Bech32 (last 6 chars = checksum)
   *  - Output : String representing a HEX value
   * 
   *  We will usually convert:
   *    - 42 chars (3 prefix + 33 data + 6 checksum) ---> 20 bytes (hex)
   *    - 62 chars (3 prefix + 53 data + 6 checksum)---> 32 bytes (hex)
   * 
   *  Ex: bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4 => 751e76e8199196d454941c45d1b3a323f1433bd6
   *      bc1qvhu3557twysq2ldn6dut6rmaj3qk04p60h9l79wk4lzgy0ca8mfsnffz65 => 65f91a53cb7120057db3d378bd0f7d944167d43a7dcbff15d6afc4823f1d3ed3
   *******************************************************************************************/
  function decodeBech32(data) {    
    const decArr5bit = data.slice(3, -6).split('').map(c => BECH32DICT.indexOf(c));
    const binArr = decArr5bit.map(v => format(v, 'dec', 'bin').padStart(5, '0'));
    binArr.shift(); // remove the first 5 bits (version)
    const bin = binArr.join('');
    const maxLen = Math.floor(bin.length / 8) * 8; // trim the string into a 8 bit multiple (drop last bits if needed)
    const decodedHex = format(bin.slice(0, maxLen), 'bin', 'hex', maxLen / 4);
    
    // const dataArr = binArr.map(b => format(b, 'bin', 'dec'));
    const checksumArr = createBech32Checksum(decArr5bit);
    const checksum = checksumArr.map(c => BECH32DICT[c]).join('');  // v8f3t4
    
    if (checksum !== data.slice(-6)) {
      console.error(`Error: Bech32 checksum error. '${data.slice(-6)}' should be '${checksum}'`);
    }
    return decodedHex;    
  }

  // Private function
  // Data should be an array of integers [31, 47, 28, ...] representing the bytes to encode
  // It returns an array of 6 integers with the checksum values
  const BECH32DICT = `qpzry9x8gf2tvdw0s3jn54khce6mua7l`;
  function createBech32Checksum(data, enc = 'bech32') {
    const hrp = [3, 3, 0, 2, 3]; // 'bc'
    var values = [...hrp, ...data, 0, 0, 0, 0, 0, 0];
  
    const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
    let chk = 1;
    for (let p = 0; p < values.length; ++p) {
      let top = chk >> 25;
      chk = (chk & 0x1ffffff) << 5 ^ values[p];
      for (let i = 0; i < 5; ++i) {
        if ((top >> i) & 1) { chk ^= GENERATOR[i]; }
      }
    }

    const mod = enc === 'bech32' ? chk ^ 1 : chk ^ 0x2bc830a3;
  
    const ret = [];
    for (let p = 0; p < 6; ++p) {
      ret.push((mod >> 5 * (5 - p)) & 31);
    }
    return ret;
  }




  // Turns a decimal value into hexadecimal with compact-size format
  function decToCompactSize(value) {
    value = BigInt(value);
    if (value > 18446744073709551615n) { console.error('Invalid value', value); return ''; } // Error value
    if (value <= 252n)        { return        format(value, 'dec', 'rev', 2).toLowerCase(); }
    if (value <= 65535n)      { return 'fd' + format(value, 'dec', 'rev', 4).toLowerCase(); }
    if (value <= 4294967295n) { return 'fe' + format(value, 'dec', 'rev', 8).toLowerCase(); }
    else                      { return 'ff' + format(value, 'dec', 'rev', 16).toLowerCase(); }
  }

  // Turns a compact-size format value into a decimal (BigInt)
  function compactSizeToDec(compactHex) {
    const bytes = compactHex.length / 2; // must be 1, 3, 5 or 9
    if (bytes === 1) { return BigInt('0x' + compactHex); }
    const prefix = compactHex.slice(0, 2).toLowerCase();
    const valueHex = format(compactHex.slice(2), 'hex', 'rev');
    if (prefix === 'fd' && bytes === 3) { return BigInt('0x' + valueHex); }
    if (prefix === 'fe' && bytes === 5) { return BigInt('0x' + valueHex); }
    if (prefix === 'ff' && bytes === 9) { return BigInt('0x' + valueHex); }
    console.error('Invalid compact size value', compactHex);
    return 0;
  }



  function derEncode(signature) {
    const hex = (dec, size) => format(dec, 'dec', 'hex', size);
    const rHex = hex(signature[0]);
    const sHex = hex(signature[1]);
    // console.log('rHex = ', rHex);
    // console.log('sHex = ', sHex);
    const rSize = Math.ceil(rHex.length / 2);
    const sSize = Math.ceil(sHex.length / 2);
    const totalSize = 4 + rSize + sSize;
    let serialized = `30${hex(totalSize, 2)}`;
    serialized += `02${hex(rSize, 2)}${rHex.padStart(rSize*2, '0')}`;
    serialized += `02${hex(sSize, 2)}${sHex.padStart(sSize*2, '0')}`;
    return serialized;
  }

  
  function tests() {

    // Testing decToCompactSize
    // console.log('37 -> ',          format(37,           'dec', 'hex'), decToCompactSize(37));
    // console.log('37168 -> ',       format(37168,        'dec', 'hex'), decToCompactSize(37168));
    // console.log('37168989 -> ',    format(37168989n,    'dec', 'hex'), decToCompactSize(37168989n));
    // console.log('42949672952 -> ', format(42949672952n, 'dec', 'hex'), decToCompactSize(42949672952n));
    if (decToCompactSize(37) !== '25') { console.error(`decToCompactSize wrong value: 37 != 25`); }
    if (decToCompactSize(37168) !== 'fd3091') { console.error(`decToCompactSize wrong value: 37168 (0x9130) !== FD3091`); }
    if (decToCompactSize(37168989n) !== 'fe5d273702') { console.error(`decToCompactSize wrong value: 37168989n (0x237275D) !== FE5D273702`); }
    if (decToCompactSize(42949672952n) !== 'fff8ffffff09000000') { console.error(`decToCompactSize wrong value: 42949672952n (0x9FFFFFFF8) !== 'FFF8FFFFFF09000000`); }

    // Testing compactSizeToDec
    // console.log('25 ---> ',                 compactSizeToDec('25'));
    // console.log('FD3091 ---> ',             compactSizeToDec('FD3091'));
    // console.log('FE5d273702 ---> ',         compactSizeToDec('FE5d273702'));
    // console.log('FFf8ffffff09000000 ---> ', compactSizeToDec('FFf8ffffff09000000'));
    if (compactSizeToDec('25') !== 37n) { console.error(`compactSizeToDec wrong value: 25 != 17n`); }
    if (compactSizeToDec('fd3091') !== 37168n) { console.error(`compactSizeToDec wrong value: FD3091 != 37168n`); }
    if (compactSizeToDec('fe5d273702') !== 37168989n) { console.error(`compactSizeToDec wrong value: FE5D273702 != 37168989n`); }
    if (compactSizeToDec('fff8ffffff09000000') !== 42949672952n) { console.error(`compactSizeToDec wrong value: FFF8FFFFFF09000000 != 42949672952n`); }

    // Testing format 'hex' -> 'rev'
    const rev1 = format('b036fd0dbbdc26b454aa56104b8e2f1cf7a223c371a03b3f38f02a0fc3e73d39', 'hex', 'rev');
    if (rev1 !== '393de7c30f2af0383f3ba071c323a2f71c2f8e4b1056aa54b426dcbb0dfd36b0') { console.error(`Error with format(x, 'hex', 'rev')`); }
    
    // Testing DER Encoding derEncode(): format 'sig' -> 'der'
    const signatureTest = [
      4051293998585674784991639592782214972820158391371785981004352359465450369227n,
      14135989968836420515709829771811628865775953163796562851092287839230222744152n
    ];    
    const der1 = derEncode(signatureTest);
    if (der1 !== '3044022008f4f37e2d8f74e18c1b8fde2374d5f28402fb8ab7fd1cc5b786aa40851a70cb02201f40afd1627798ee8529095ca4b205498032315240ac322c9d8ff0f205a93a58') {
      console.error(`Error with derEncode(): format 'sig' -> 'der' => ${der1}`);
    }


    if (bech32('751e76e8199196d454941c45d1b3a323f1433bd6') !== 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4') { console.error(`Error with encoders.bech32()`); }
    if (decodeBech32('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4') !== '751e76e8199196d454941c45d1b3a323f1433bd6') {  console.error(`Error with encoders.decodeBech32()`); }
                         
    if (bech32('65f91a53cb7120057db3d378bd0f7d944167d43a7dcbff15d6afc4823f1d3ed3') !== 'bc1qvhu3557twysq2ldn6dut6rmaj3qk04p60h9l79wk4lzgy0ca8mfsnffz65') { console.error(`Error with encoders.bech32()`); }
    if (decodeBech32('bc1qvhu3557twysq2ldn6dut6rmaj3qk04p60h9l79wk4lzgy0ca8mfsnffz65') !== '65f91a53cb7120057db3d378bd0f7d944167d43a7dcbff15d6afc4823f1d3ed3') {  console.error(`Error with encoders.decodeBech32()`); }

    // Random addresses from the blockchain
    if (bech32('8d7a0a3461e3891723e5fdf8129caa0075060cff') !== 'bc1q34aq5drpuwy3wgl9lhup9892qp6svr8ldzyy7c') { console.error(`Error with encoders.bech32()`); }
    if (bech32('f60834ef165253c571b11ce9fa74e46692fc5ec1') !== 'bc1q7cyrfmck2ffu2ud3rn5l5a8yv6f0chkp0zpemf') { console.error(`Error with encoders.bech32()`); }
    if (bech32('a973213efe53a62dbdcce26c83fefa0af65593d8') !== 'bc1q49ejz0h72wnzm0wvufkg8lh6ptm9ty7cttssfv') { console.error(`Error with encoders.bech32()`); }
    if (bech32('5c499f135761818cae0155d94d17d87a46cfc1c3') !== 'bc1qt3ye7y6hvxqcetsp2hv5697c0frvlswr6f2vuj') { console.error(`Error with encoders.bech32()`); }
    if (bech32('0dc746afa71320631729eab290e851fda2eb96b4') !== 'bc1qphr5dta8zvsxx9efa2efp6z3lk3wh945egn6u6') { console.error(`Error with encoders.bech32()`); }
    if (bech32('dda52c967f572cf143ee4d808458cfee80340914') !== 'bc1qmkjje9nl2uk0zslwfkqggkx0a6qrgzg5k3hlf5') { console.error(`Error with encoders.bech32()`); }
    if (bech32('dda52c967f572cf143ee4d808458cfee80340914') !== 'bc1qmkjje9nl2uk0zslwfkqggkx0a6qrgzg5k3hlf5') { console.error(`Error with encoders.bech32()`); }
    if (bech32('dda52c967f572cf143ee4d808458cfee80340914') !== 'bc1qmkjje9nl2uk0zslwfkqggkx0a6qrgzg5k3hlf5') { console.error(`Error with encoders.bech32()`); }
    if (bech32('c87bd49e7cfb0bced6c3c53d3c531296b28384f1') !== 'bc1qepaaf8nulv9ua4krc57nc5cjj6eg8p83awa6ge') { console.error(`Error with encoders.bech32()`); }
    if (bech32('16ee7494a93f327c10afe94c04fdcb1dc3744600') !== 'bc1qzmh8f99f8ue8cy90a9xqflwtrhphg3sq76srhe') { console.error(`Error with encoders.bech32()`); }
  }

  tests();


  return { format };
}());

