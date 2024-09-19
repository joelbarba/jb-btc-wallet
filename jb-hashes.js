
const hashes = (function() {
  return {
    sha256,      // (hex) => hex
    sha512,      // (hex) => hex
    ripemd160,   // (hex) => hex
    hash256,     // (hex) => hex
    hash160,     // (hex) => hex
    base58Check, // (hex) => b58
    hmac512,     // (key hex, msg hex) => hex
    pbkdf2,      // (password hex, salt hex, iterations, dkLen) => hex
  };

  function hash256(hex) { return sha256(sha256(hex)); }    // hash256 = sha256 + sha256
  function hash160(hex) { return ripemd160(sha256(hex)); } // hash160 = sha256 + ripemd160

  /*******************************************************************************************
   *  Adds a checksum (4 first digits of sha-256)
   * 
   *  - Input  : String representing a HEX value
   *  - Output : String representing a Base58 value
   * 
   *  Used to generate BTC Addresses and others (https://learnmeabitcoin.com/technical/keys/base58/)
   *******************************************************************************************/
  function base58Check(hexStr) { return encoders.format(hexStr + hash256(hexStr).slice(0, 8), 'hex', 'b58'); }

  

  /*******************************************************************************************
   *  No dependency implementation of the SHA-256
   * 
   *  - Input  : String representing a HEX value
   *  - Output : String representing a HEX value
   * 
   *  Ex: const hash = sha256('f03f04bb');
   * 
   *  Based on https://geraintluff.github.io/sha256/
   *  Other option to consider: https://www.movable-type.co.uk/scripts/sha256.html
   *  I use this because it is synchronous, instead of the native (crypto.subtle.digest("SHA-256", data)) 
   *******************************************************************************************/
  function sha256(hexStr) {
    function rightRotate(value, amount) {
      return (value>>>amount) | (value<<(32 - amount));
    };

    function hexBytesToString(hexStr) { // convert string of hex numbers to a string of chars (eg '616263' -> 'abc').
      const str = hexStr.replace(' ', ''); // allow space-separated groups
      return str=='' ? '' : str.match(/.{2}/g).map(byte => String.fromCharCode(parseInt(byte, 16))).join('');
    }

    let ascii = hexBytesToString(hexStr);
    
    var mathPow = Math.pow;
    var maxWord = mathPow(2, 32);
    var lengthProperty = 'length'
    var i, j; // Used as a counter across the whole file
    var result = ''

    var words = [];
    var asciiBitLength = ascii[lengthProperty]*8;
    
    //* caching results is optional - remove/add slash from front of this line to toggle
    // Initial hash value: first 32 bits of the fractional parts of the square roots of the first 8 primes
    // (we actually calculate the first 64, but extra values are just ignored)
    var hash = sha256.h = sha256.h || [];
    // Round constants: first 32 bits of the fractional parts of the cube roots of the first 64 primes
    var k = sha256.k = sha256.k || [];
    var primeCounter = k[lengthProperty];

    var isComposite = {};
    for (var candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) {
          isComposite[i] = candidate;
        }
        hash[primeCounter] = (mathPow(candidate, .5)*maxWord)|0;
        k[primeCounter++] = (mathPow(candidate, 1/3)*maxWord)|0;
      }
    }
    
    ascii += '\x80' // Append Ƈ' bit (plus zero padding)
    while (ascii[lengthProperty]%64 - 56) ascii += '\x00' // More zero padding
    for (i = 0; i < ascii[lengthProperty]; i++) {
      j = ascii.charCodeAt(i);
      if (j>>8) return; // ASCII check: only accept characters in range 0-255
      words[i>>2] |= j << ((3 - i)%4)*8;
    }
    words[words[lengthProperty]] = ((asciiBitLength/maxWord)|0);
    words[words[lengthProperty]] = (asciiBitLength)
    
    // process each chunk
    for (j = 0; j < words[lengthProperty];) {
      var w = words.slice(j, j += 16); // The message is expanded into 64 words as part of the iteration
      var oldHash = hash;
      // This is now the undefinedworking hash", often labelled as variables a...g
      // (we have to truncate as well, otherwise extra entries at the end accumulate
      hash = hash.slice(0, 8);
      
      for (i = 0; i < 64; i++) {
        var i2 = i + j;
        // Expand the message into 64 words
        // Used below if 
        var w15 = w[i - 15], w2 = w[i - 2];

        // Iterate
        var a = hash[0], e = hash[4];
        var temp1 = hash[7]
          + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) // S1
          + ((e&hash[5])^((~e)&hash[6])) // ch
          + k[i]
          // Expand the message schedule if needed
          + (w[i] = (i < 16) ? w[i] : (
              w[i - 16]
              + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15>>>3)) // s0
              + w[i - 7]
              + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2>>>10)) // s1
            )|0
          );
        // This is only used once, so *could* be moved below, but it only saves 4 bytes and makes things unreadble
        var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) // S0
          + ((a&hash[1])^(a&hash[2])^(hash[1]&hash[2])); // maj
        
        hash = [(temp1 + temp2)|0].concat(hash); // We don't bother trimming off the extra ones, they're harmless as long as we're truncating when we do the slice()
        hash[4] = (hash[4] + temp1)|0;
      }
      
      for (i = 0; i < 8; i++) {
        hash[i] = (hash[i] + oldHash[i])|0;
      }
    }
    
    for (i = 0; i < 8; i++) {
      for (j = 3; j + 1; j--) {
        var b = (hash[i]>>(j*8))&255;
        result += ((b < 16) ? 0 : '') + b.toString(16);
      }
    }
    return result;
  }



  /*******************************************************************************************
   *  No dependency implementation of the SHA-512
   * 
   *  - Input  : String representing a HEX value
   *  - Output : String representing a HEX value
   * 
   *  Ex: const hash = sha512('426974636f696e2073656564'); // 'Bitcoin seed'
   * 
   *  Based on https://www.movable-type.co.uk/scripts/sha512.html
   * 
   * Can also be calculated asynchronously with native api:
   *  Node: crypto.createHash('sha512').update('Bitcoin seed').digest('hex');
   *  Web:  crypto.subtle.digest('SHA-512', new TextEncoder('utf-8').encode('Bitcoin seed')).then(r => Array.prototype.map.call(new Uint8Array(r), x => x.toString(16)))
   *    = a5caab7814ea078e87c040b717a38e803254db883137948b70d713b3ccaada535dec54a64c3b0e88f47d62146034bc07a6697dcc04a2a2876f4815c4670358c8
   *******************************************************************************************/
  function sha512(hexStr) {

    // JavaScript has no support for 64-bit integers; this provides methods required to support 64-bit unsigned integers
    // All string manipulation is radix 16. Note n >>> 0 coerces n to unsigned 32-bit value.
    function newLong(hi, lo) {
      return {
        hi: hi >>> 0,
        lo: lo >>> 0,
        toString: function() {
          const hi = ('00000000' + this.hi.toString(16)).slice(-8);
          const lo = ('00000000' + this.lo.toString(16)).slice(-8);    
          return hi + lo;
        },
        add: function(that) {
          const lo = this.lo + that.lo;
          const hi = this.hi + that.hi + (lo>0x100000000 ? 1 : 0); // carry top bit if lo > 2^32    
          return newLong(hi >>> 0, lo >>> 0);
        },
        and: function(that) { return newLong(this.hi & that.hi, this.lo & that.lo); },
        xor: function(that) { return newLong(this.hi ^ that.hi, this.lo ^ that.lo); },
        not: function()     { return newLong(~this.hi, ~this.lo); },
        shr: function(n) {
          if (n ==  0) return this;
          if (n == 32) return newLong(0, this.hi);
          if (n >  32) return newLong(0, this.hi >>> n-32);
          /* n < 32 */ return newLong(this.hi >>> n, this.lo >>> n | this.hi << (32-n));
        },
      };
    }
    function newLongFromStr(str) {
      const hi = parseInt(str.slice(0, -8), 16);
      const lo = parseInt(str.slice(-8), 16);
      return newLong(hi, lo);
    }

    //Rotates right (circular right shift) value x by n positions [§3.2.4].
    function rotr(x, n) { // emulates (x >>> n) | (x << (64-n)
      if (n == 0) return x;
      if (n == 32) return newLong(x.lo, x.hi);

      let hi = x.hi, lo = x.lo;

      if (n > 32) {
        [ lo, hi ] = [ hi, lo ]; // swap hi/lo
        n -= 32;
      }

      const hi1 = (hi >>> n) | (lo << (32-n));
      const lo1 = (lo >>> n) | (hi << (32-n));

      return newLong(hi1, lo1);
    }

    function Σ0(x) { return rotr(x, 28).xor(rotr(x, 34)).xor(rotr(x, 39)); }
    function Σ1(x) { return rotr(x, 14).xor(rotr(x, 18)).xor(rotr(x, 41)); }
    function sigma0(x) { return rotr(x,  1).xor(rotr(x,  8)).xor(x.shr(7)); }
    function sigma1(x) { return rotr(x, 19).xor(rotr(x, 61)).xor(x.shr(6)); }
    function Ch(x, y, z)  { return (x.and(y)).xor(x.not().and(z)); }         // 'choice'
    function Maj(x, y, z) { return (x.and(y)).xor(x.and(z)).xor(y.and(z)); } // 'majority'


      
    const K = [ // constants [§4.2.3]
      '428a2f98d728ae22', '7137449123ef65cd', 'b5c0fbcfec4d3b2f', 'e9b5dba58189dbbc',
      '3956c25bf348b538', '59f111f1b605d019', '923f82a4af194f9b', 'ab1c5ed5da6d8118',
      'd807aa98a3030242', '12835b0145706fbe', '243185be4ee4b28c', '550c7dc3d5ffb4e2',
      '72be5d74f27b896f', '80deb1fe3b1696b1', '9bdc06a725c71235', 'c19bf174cf692694',
      'e49b69c19ef14ad2', 'efbe4786384f25e3', '0fc19dc68b8cd5b5', '240ca1cc77ac9c65',
      '2de92c6f592b0275', '4a7484aa6ea6e483', '5cb0a9dcbd41fbd4', '76f988da831153b5',
      '983e5152ee66dfab', 'a831c66d2db43210', 'b00327c898fb213f', 'bf597fc7beef0ee4',
      'c6e00bf33da88fc2', 'd5a79147930aa725', '06ca6351e003826f', '142929670a0e6e70',
      '27b70a8546d22ffc', '2e1b21385c26c926', '4d2c6dfc5ac42aed', '53380d139d95b3df',
      '650a73548baf63de', '766a0abb3c77b2a8', '81c2c92e47edaee6', '92722c851482353b',
      'a2bfe8a14cf10364', 'a81a664bbc423001', 'c24b8b70d0f89791', 'c76c51a30654be30',
      'd192e819d6ef5218', 'd69906245565a910', 'f40e35855771202a', '106aa07032bbd1b8',
      '19a4c116b8d2d0c8', '1e376c085141ab53', '2748774cdf8eeb99', '34b0bcb5e19b48a8',
      '391c0cb3c5c95a63', '4ed8aa4ae3418acb', '5b9cca4f7763e373', '682e6ff3d6b2b8a3',
      '748f82ee5defb2fc', '78a5636f43172f60', '84c87814a1f0ab72', '8cc702081a6439ec',
      '90befffa23631e28', 'a4506cebde82bde9', 'bef9a3f7b2c67915', 'c67178f2e372532b',
      'ca273eceea26619c', 'd186b8c721c0c207', 'eada7dd6cde0eb1e', 'f57d4f7fee6ed178',
      '06f067aa72176fba', '0a637dc5a2c898a6', '113f9804bef90dae', '1b710b35131c471b',
      '28db77f523047d84', '32caab7b40c72493', '3c9ebe0a15c9bebc', '431d67c49c100d4c',
      '4cc5d4becb3e42b6', '597f299cfc657e2a', '5fcb6fab3ad6faec', '6c44198c4a475817',
    ].map(k => newLongFromStr(k));
    
    const H = [ // initial hash value [§5.3.5]
        '6a09e667f3bcc908', 'bb67ae8584caa73b', '3c6ef372fe94f82b', 'a54ff53a5f1d36f1',
        '510e527fade682d1', '9b05688c2b3e6c1f', '1f83d9abfb41bd6b', '5be0cd19137e2179',
    ].map(h => newLongFromStr(h));


    // convert string of hex numbers to a string of chars (eg '616263' -> 'abc').
    const str = hexStr.replace(' ', ''); // allow space-separated groups
    const textStr = str == '' ? '' : str.match(/.{2}/g).map(byte => String.fromCharCode(parseInt(byte, 16))).join('');

    const msg = textStr + String.fromCharCode(0x80);  // add trailing '1' bit (+ 0's padding) to string [§5.1.2]

    // convert string msg into 1024-bit blocks (array of 16 uint64) [§5.2.2]
    const l = msg.length / 8 + 2; // length (in 64-bit longs) of msg + ‘1’ + appended length
    const N = Math.ceil(l / 16);  // number of 16-long (1024-bit) blocks required to hold 'l' ints
    const M = new Array(N);       // message M is N×16 array of 64-bit integers

    for (let i = 0; i < N; i++) {
        M[i] = new Array(16);
        for (let j = 0; j < 16; j++) { // encode 8 chars per uint64 (128 per block), big-endian encoding
            const lo = (msg.charCodeAt(i*128+j*8+0)<<24) | (msg.charCodeAt(i*128+j*8+1)<<16)
                     | (msg.charCodeAt(i*128+j*8+2)<< 8) | (msg.charCodeAt(i*128+j*8+3)<< 0);
            const hi = (msg.charCodeAt(i*128+j*8+4)<<24) | (msg.charCodeAt(i*128+j*8+5)<<16)
                     | (msg.charCodeAt(i*128+j*8+6)<< 8) | (msg.charCodeAt(i*128+j*8+7)<< 0);
            M[i][j] = newLong(lo, hi);
        } // note running off the end of msg is ok 'cos bitwise ops on NaN return 0
    }
    // add length (in bits) into final pair of 64-bit integers (big-endian) [§5.1.2]
    M[N-1][14] = newLong(0, 0); // tooo hard... limit msg to 2 million terabytes
    // note: most significant word would be (len-1)*8 >>> 32, but since JS converts
    // bitwise-op args to 32 bits, we need to simulate this by arithmetic operators
    const lenHi = ((msg.length-1)*8) / Math.pow(2, 32);
    const lenLo = ((msg.length-1)*8) >>> 0; // note '>>> 0' coerces number to unsigned 32-bit integer
    M[N-1][15] = newLong(Math.floor(lenHi), lenLo);
    
    // HASH COMPUTATION [§6.4.2]
    for (let i = 0; i < N; i++) {
      const W = new Array(80);

      // 1 - prepare message schedule 'W'
      for (let t = 0;  t < 16; t++) W[t] = M[i][t];
      for (let t = 16; t < 80; t++) {
        W[t] = (sigma1(W[t-2]).add(W[t-7]).add(sigma0(W[t-15])).add(W[t-16]));
      }

      // 2 - initialise working variables a, b, c, d, e, f, g, h with previous hash value
      let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];

      // 3 - main loop (note 'addition modulo 2^64')
      for (let t=0; t<80; t++) {
          const T1 = h.add(Σ1(e)).add(Ch(e, f, g)).add(K[t]).add(W[t]);
          const T2 = Σ0(a).add(Maj(a, b, c));
          h = g;
          g = f;
          f = e;
          e = d.add(T1);
          d = c;
          c = b;
          b = a;
          a = T1.add(T2);
      }

      // 4 - compute the new intermediate hash value
      H[0] = H[0].add(a);
      H[1] = H[1].add(b);
      H[2] = H[2].add(c);
      H[3] = H[3].add(d);
      H[4] = H[4].add(e);
      H[5] = H[5].add(f);
      H[6] = H[6].add(g);
      H[7] = H[7].add(h);
    }

    // convert H0..H7 to hex strings (with leading zeros)
    for (let h = 0; h < H.length; h++) H[h] = H[h].toString();

    return H.join('');
  }


  /*******************************************************************************************
   *  No dependency implementation of the RIPEMD-160 hash
   *  - Input  : String representing a HEX value
   *  - Output : String representing a HEX value
   * 
   *  Ex: const hash = ripemd160('f03f04bb');
   * 
   *  Based on https://gist.github.com/cmdruid/aaff38ec96c0741d40d279f791b50862
   *******************************************************************************************/
  function ripemd160(hexStr) {

    function bytesToBigInt(bytes) {
      let num = 0n;
      for (let i = bytes.length - 1; i >= 0; i--) {
        num = (num * 256n) + BigInt(bytes[i]);
      }
      return BigInt(num);
    }
    
    function bigIntToBytes(num, size) {
      let bytes = [];
      while (num > 0) {
        const byte = num & 0xffn;
        bytes.push(byte);
        num = (num - byte) / 256n;
      }
      bytes = bytes.map(n => Number(n));
      if (size) {
        const uint8 = new Uint8Array(size);
        uint8.set(bytes);
        bytes = [...uint8];
      }
      return bytes;
    }
    
    function bytesToHex(bytes) {
      const hex = [];
      for (let i = 0; i < bytes.length; i++) { hex.push(bytes[i].toString(16).padStart(2, '0'));
      }
      return hex.join('');
    }  
    
    const ML = [  // Message schedule indexes for the left path.
      0n, 1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n, 10n, 11n, 12n, 13n, 14n, 15n,
      7n, 4n, 13n, 1n, 10n, 6n, 15n, 3n, 12n, 0n, 9n, 5n, 2n, 14n, 11n, 8n,
      3n, 10n, 14n, 4n, 9n, 15n, 8n, 1n, 2n, 7n, 0n, 6n, 13n, 11n, 5n, 12n,
      1n, 9n, 11n, 10n, 0n, 8n, 12n, 4n, 13n, 3n, 7n, 15n, 14n, 5n, 6n, 2n,
      4n, 0n, 5n, 9n, 7n, 12n, 2n, 10n, 14n, 1n, 3n, 8n, 11n, 6n, 15n, 13n
    ];
    const MR = [  // Message schedule indexes for the right path.
      5n, 14n, 7n, 0n, 9n, 2n, 11n, 4n, 13n, 6n, 15n, 8n, 1n, 10n, 3n, 12n,
      6n, 11n, 3n, 7n, 0n, 13n, 5n, 10n, 14n, 15n, 8n, 12n, 4n, 9n, 1n, 2n,
      15n, 5n, 1n, 3n, 7n, 14n, 6n, 9n, 11n, 8n, 12n, 2n, 10n, 0n, 4n, 13n,
      8n, 6n, 4n, 1n, 3n, 11n, 15n, 0n, 5n, 12n, 2n, 13n, 9n, 7n, 10n, 14n,
      12n, 15n, 10n, 4n, 1n, 5n, 8n, 7n, 6n, 2n, 13n, 14n, 0n, 3n, 9n, 11n
    ];
    const RL = [  // Rotation counts for the left path.
      11n, 14n, 15n, 12n, 5n, 8n, 7n, 9n, 11n, 13n, 14n, 15n, 6n, 7n, 9n, 8n,
      7n, 6n, 8n, 13n, 11n, 9n, 7n, 15n, 7n, 12n, 15n, 9n, 11n, 7n, 13n, 12n,
      11n, 13n, 6n, 7n, 14n, 9n, 13n, 15n, 14n, 8n, 13n, 6n, 5n, 12n, 7n, 5n,
      11n, 12n, 14n, 15n, 14n, 15n, 9n, 8n, 9n, 14n, 5n, 6n, 8n, 6n, 5n, 12n,
      9n, 15n, 5n, 11n, 6n, 8n, 13n, 12n, 5n, 12n, 13n, 14n, 11n, 8n, 5n, 6n
    ];
    const RR = [  // Rotation counts for the right path.
      8n, 9n, 9n, 11n, 13n, 15n, 15n, 5n, 7n, 7n, 8n, 11n, 14n, 14n, 12n, 6n,
      9n, 13n, 15n, 7n, 12n, 8n, 9n, 11n, 7n, 7n, 12n, 7n, 6n, 15n, 13n, 11n,
      9n, 7n, 15n, 11n, 8n, 6n, 6n, 14n, 12n, 13n, 5n, 14n, 13n, 13n, 7n, 5n,
      15n, 5n, 8n, 11n, 14n, 14n, 6n, 14n, 6n, 9n, 12n, 9n, 12n, 5n, 15n, 8n,
      8n, 5n, 12n, 9n, 12n, 5n, 14n, 6n, 8n, 13n, 6n, 5n, 15n, 13n, 11n, 11n
    ]
    const KL = [0n, 0x5a827999n, 0x6ed9eba1n, 0x8f1bbcdcn, 0xa953fd4en];  // K constants for the left path.
    const KR = [0x50a28be6n, 0x5c4dd124n, 0x6d703ef3n, 0x7a6d76e9n, 0n];  // K constants for the right path.
    
    function fi(x, y, z, i) { // The f1, f2, f3, f4, and f5 functions from the specification.
      switch (true) {
        case (i === 0n): return x ^ y ^ z;
        case (i === 1n): return (x & y) | (~x & z);
        case (i === 2n): return (x | ~y) ^ z;
        case (i === 3n): return (x & z) | (y & ~z);
        case (i === 4n): return x ^ (y | ~z);
        default: throw new TypeError('Unknown I value: ' + i);
      }
    }
    
    function rol(x, i) { return ((x << i) | ((x & 0xffffffffn) >> (32n - i))) & 0xffffffffn; } // Rotate the bottom 32 bits of x left by i bits.
    
    function compress(h0, h1, h2, h3, h4, block) {
      const x = []; // Compress state (h0, h1, h2, h3, h4) with block.
      let rnd, elt, ert; 
      let al = h0, bl = h1, cl = h2, dl = h3, el = h4; // Init left side of the array.
      let ar = h0, br = h1, cr = h2, dr = h3, er = h4; // Init right side of the array.
    
      // Message variables
      for (let i = 0; i < 16; i++) {
        const num = bytesToBigInt(block.slice(4 * i, 4 * (i + 1)));
        x.push(num);
      }
    
      // Iterate over the 80 rounds of the compression.
      for (let i = 0; i < 80; i++) {
        rnd = BigInt(i) >> 4n;    
        al = rol(al + fi(bl, cl, dl, rnd) + x[ML[i]] + KL[rnd], RL[i]) + el; // Perform left side of the transformation.
        elt = el; el = dl; dl = rol(cl, 10n); cl = bl; bl = al; al = elt;  // Perform right side of the transformation.
        ar = rol(ar + fi(br, cr, dr, 4n - rnd) + x[MR[i]] + KR[rnd], RR[i]) + er; 
        ert = er; er = dr; dr = rol(cr, 10n); cr = br; br = ar; ar = ert;
      }
      // Compose old state, left transform, and right transform into new state.
      return [h1 + cl + dr, h2 + dl + er, h3 + el + ar, h4 + al + br, h0 + bl + cr]
    }




    const data = Uint8Array.from(hexStr.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

    let state = [0x67452301n, 0xefcdab89n, 0x98badcfen, 0x10325476n, 0xc3d2e1f0n]; // Initialize state.

    // Process full 64-byte blocks in the input.
    for (let b = 0; b < (data.length >> 6); b++) {
      state = compress(...state, data.slice(64 * b, 64 * (b + 1)))
    }

    // Construct final blocks (with padding and size)
    const zfill = new Array((119 - data.length) & 63).fill(0);
    const pad = [0x80n, ...zfill];
    const fin = [...data.slice(data.length & ~63), ...pad, ...bigIntToBytes(BigInt(8 * data.length), 8)];

    // Process final blocks.
    for (let i = 0; i < (fin.length >> 6); i++) {
      state = compress(...state, fin.slice(64 * i, 64 * (i + 1)))
    }
    
    const ret = []; // Produce output.
    for (let i = 0; i < state.length; i++) { ret.push(...bigIntToBytes(state[i] & 0xffffffffn, 4)) }

    const res = Uint8Array.from(ret);

    return bytesToHex(res);
  }




  // Private function
  // Performs the XOR op betwee 2 values represented in hex in a string
  function xor(hexStrA, hexStrB) {
    let res = '';
    for (let t = 0; t < Math.max(hexStrA.length, hexStrB.length); t++) {
      const numA = Number('0x' + (hexStrA[t] || '0'));
      const numB = Number('0x' + (hexStrB[t] || '0'));
      // BigInt(value).toString(16)
      // res += format(numA ^ numB, 'dec', 'hex'); // ^ = XOR
      res += Number(numA ^ numB).toString(16); // ^ = XOR
    }
    return res;
  }


  /*******************************************************************************************
   *  No dependency implementation of the HMAC-SHA512
   *  - Input1 : Message represented in HEX (string)
   *  - Input2 : Key represented in HEX (string)
   *  - Output : 64 bytes value represented in HEX (string)
   * 
   *  Ex:           Bitcoin seed                hello
   *       hmac512('426974636f696e2073656564', '68656c6c6f');  // = 2fe972c...5d3f93
   * 
   * It can also be asynchronously calculated with the native api of NodeJS:
   *    crypto.createHmac("sha512", 'Bitcoin seed').update('hello').digest('hex')
   * 
   * Or:
   *    window.crypto.subtle.importKey(
   *     "raw", enc.encode("Bitcoin seed"), { name: "HMAC", hash: { name: "SHA-512"} },false, ["sign", "verify"]
   *    ).then(key => window.crypto.subtle.sign("HMAC", key, enc.encode("hello")).then(signature => {
   *       var b = new Uint8Array(signature);
   *       var str = Array.prototype.map.call(b, x => x.toString(16).padStart(2, '0')).join("")
   *       console.log(str);
   *    })});
   *******************************************************************************************/
  function hmac512(keyHexStr, dataHexStr) {
    const blockSizeBytes = 128; // 128 bytes = 1024 bits
    const blockSizeHex = 128 * 2; // 2 hex chars = 1 byte

    // const zero = Array(blockSizeBytes).fill('00000000').join('');
    const ipad = Array(blockSizeBytes).fill('36').join('');  // 54 = 36 = 00110110  x 128 = 1024 bits (256 hex chars)
    const opad = Array(blockSizeBytes).fill('5c').join('');  // 92 = 5c = 01011100  x 128 = 1024 bits (256 hex chars)

    // If the key is not 8 bit multiple, append a left '0'
    if (keyHexStr.length % 2 === 1) { keyHexStr = '0' + keyHexStr; }

    // If the key is too long, hash it to 64 bytes
    if (keyHexStr.length > blockSizeHex) { keyHexStr = sha512(keyHexStr); }

    // If too short, add 0s to make the key exactly 128 bytes long
    if (keyHexStr.length < blockSizeHex) { keyHexStr += Array(blockSizeHex - keyHexStr.length).fill('0').join(''); }

    // console.log('keyHexStr = ', keyHexStr);
    
    const ikeypad = xor(keyHexStr, ipad);  // 128 bytes of xor with the key
    const okeypad = xor(keyHexStr, opad);  // 128 bytes of xor with the key

    const hash1 = sha512(ikeypad + dataHexStr); // 64 bytes
    const hash2 = sha512(okeypad + hash1); // 64 bytes

    return hash2;
  }



  /*******************************************************************************************
   *  No dependency implementation of the PBKDF2 (Password-Based Key Derivation Function 2)
   *  - Input1 : password in HEX (string)
   *  - Input2 : Key in HEX (string)
   *  - Output : Derived key in HEX (string)
   * 
   *  Ex:          seed phrase          mnemonic
   *       pbkdf2('70756e63682073...', '6d6e656d6f6e6963');  // = e1ca8...e882
   * 
   * It can also be asynchronously calculated with the native web api:
   *    await window.crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: iterations, hash: 'SHA-512' }, key, dkLen * 8);
   *******************************************************************************************/
  function pbkdf2(passwordHexStr, saltHex, iterations = 2048, dkLen = 64) {
    // console.log('password = ', encoders.format(passwordHexStr, 'hex', 'str'));
    // console.log('salt = ',     encoders.format(saltHex, 'hex', 'str'));

    const hLen = 64; // SHA-512 output length in bytes
    const totalBlocks = Math.ceil(dkLen / hLen); // Total number of blocks to concatenate

    let result = ''; // Derived key (concatenation of all blocks)

    for (let blockNum = 1; blockNum <= totalBlocks; blockNum++) {
      const blockNumHex = Number(blockNum).toString(16).padStart(8, '0').slice(-8); // Block number in 4 byte hex format

      let block = hmac512(passwordHexStr, saltHex + blockNumHex);
      let u = block; // u1
      // console.log(`U1 = ${u}`);

      for (let c = 1; c < iterations; c++) {
        u = hmac512(passwordHexStr, u);
        block = xor(block, u);
        // console.log(`U${c+1} = ${u}`);
        // console.log(`block = ${block}`);
      }

      result += block;
    }

    return result.slice(0, dkLen * 2);  // 1 byte = 2 hex chars
  }

}());








// ------------------------------------------------------------------------------------
// Tests
// hashes.tests = function() {

//   const ripe160hash = hashes.ripemd160('03f04bb78709714ba33f339e8ec85ae9be93aaf25bb9bfe9b709f5d8bd3f6981af');
//   if (ripe160hash !== '1aca2960bba847a441c370f2b8432033274067c8') {
//      console.error(`ripemd160() wrong value: ${ripe160hash}`); 
//   }

//   const h512test = hashes.sha512('426974636f696e2073656564');
//   if (h512test !== 'a5caab7814ea078e87c040b717a38e803254db883137948b70d713b3ccaada535dec54a64c3b0e88f47d62146034bc07a6697dcc04a2a2876f4815c4670358c8') {
//      console.error(`sha512() wrong value: ${h512test}`); 
//   }

//   const hmac512test = hashes.hmac512('426974636f696e2073656564', '68656c6c6f');
//   if (hmac512test !== '2fe972cb27e70fc17734bdeeebd4183356aed1f3d3690074d956be314b480dcd47c5f9f11b8f1d1a30593b84fd28f69731155ea88713cb8790ad52e4b65d3f93') {
//      console.error(`hmac512() wrong value: ${hmac512test}`); 
//   }

//   // password = punch shock entire north file identify,   salt = 'mnemonic'
//   const pbkdf2test = hashes.pbkdf2('70756e63682073686f636b20656e74697265206e6f7274682066696c65206964656e74696679', '6d6e656d6f6e6963');
//   if (pbkdf2test !== 'e1ca8d8539fb054eda16c35dcff74c5f88202b88cb03f2824193f4e6c5e87dd2e24a0edb218901c3e71e900d95e9573d9ffbf870b242e927682e381d109ae882') {
//      console.error(`hmac512() wrong value: ${pbkdf2test}`); 
//   }
// };
// hashes.tests();