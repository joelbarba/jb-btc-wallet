const ecdsa = (function() {

  // These are the constants to define the Secp256k1 Elliptic Curve used by Bitcoin: https://en.bitcoin.it/wiki/Secp256k1
  const secp256k1 = {
    // const p = BigInt(2**256) - BigInt(2**32) - BigInt(2**9) - BigInt(2**8) - BigInt(2**7) - BigInt(2**6) - BigInt(2**4) - 1n;
    p: 115792089237316195423570985008687907853269984665640564039457584007908834671663n,  // secp256k1 modulo
    n: 115792089237316195423570985008687907852837564279074904382605163141518161494337n,  // order (number of points on the curve)
    a: 0n,
    b: 7n,
    G: [ // Generator Point
      55066263022277343669578718895168534326250603453777594175500187360389116729240n, // Gx
      32670510020758816978083085130507043184471273380659243275938904335757337482424n  // Gy
    ],
  };

  // Apply mod p, and make sure it's > 0
  function mod(x, modVal = secp256k1.p) {
    x = x % modVal;
    if (x < 0) { x += modVal; } 
    return x;
  };

  function inverse(a, modVal = secp256k1.p) {
    const next = { a, m: modVal, y: 1n, z: 0n };
    while (next.a > 1) {
      const curr = { ...next };
      const q = curr.m / curr.a;
      next.z = curr.y;
      next.y = curr.z - (q * curr.y);
      next.a = curr.m % curr.a;
      next.m = curr.a;
    }
    return mod(next.y, modVal);
  };

  function double([x, y]) {
    const s = mod(((3n * (x**2n)) + secp256k1.a) * inverse(2n * y));  // slope of the tangent
    const x2 = mod((s**2n) - (2n * x));
    const y2 = mod((s * (x - x2)) - y);
    return [x2, y2];
  };

  function add([x1, y1], [x2, y2]) {
    if (x1 === x2 && y1 === y2) { return double([x1, y1]); } // If same point, just double it
    const diffX = mod(x1 - x2);
    const diffY = mod(y1 - y2);
    const s = mod(diffY * inverse(diffX));
    const x3 = mod((s ** 2n) - x1 - x2);
    const y3 = mod((s * mod(x1 - x3)) - y1);
    return [x3, y3];
  };

  function mult([x, y], multiplier) {
    const bin = encoders.format(multiplier, 'dec', 'bin');

    let x2 = x;
    let y2 = y;

    for (let ind = 1; ind < bin.length; ind++) {
      [x2, y2] = double([x2, y2]);

      if (bin[ind] === '1') {
        [x2, y2] = add([x2, y2], [x, y]);
      }
    }

    return [x2, y2];
  };


  // Function to calculate (base^exp) % mod
  function modPow(base, exp, mod) {
    let result = 1n;
    base = base % mod;
    while (exp > 0n) {
      if (exp % 2n === 1n) { result = (result * base) % mod; }
      exp = exp >> 1n;
      base = (base * base) % mod;
    }
    return result;
  }

  // Function to calculate modular square root using the Tonelli-Shanks algorithm
  function modSqrt(a) {
    const p = secp256k1.p;

    // Check if a is a quadratic residue mod p
    if (modPow(a, (p - 1n) / 2n, p) !== 1n) { throw new Error('No square root exists'); }
    
    // Check if p ≡ 3 (mod 4)
    if (p % 4n === 3n) { return modPow(a, (p + 1n) / 4n, p); }

    // Tonelli-Shanks algorithm
    let s = p - 1n;
    let e = 0n;
    while (s % 2n === 0n) {
      s /= 2n;
      e += 1n;
    }

    let n = 2n;
    while (modPow(n, (p - 1n) / 2n, p) !== p - 1n) { n += 1n; }

    let x = modPow(a, (s + 1n) / 2n, p);
    let b = modPow(a, s, p);
    let g = modPow(n, s, p);
    let r = e;

    while (true) {
      let t = b;
      let m = 0n;
      for (m = 0n; m < r; m++) {
        if (t === 1n) break;
        t = modPow(t, 2n, p);
      }

      if (m === 0n) return x;

      let gs = modPow(g, 2n ** (r - m - 1n), p);
      g = (gs * gs) % p;
      x = (x * gs) % p;
      b = (b * g) % p;
      r = m;
    }
  }
 

  // Calculate a point on the curve for the public key ---> y = sqr(x^3 + 7 mod p)
  // The compress public key starts with 02 or 03, to tell if Y is even or odd.
  function pubKeyPoint(publicKey) {
    const xCoor = BigInt('0x' + publicKey.slice(2, 66));
    const yy = (xCoor ** 3n + 7n) % secp256k1.p;
    let yCoor = modSqrt(yy, secp256k1.p);

    // Use the other root if the parity doesn't match
    const isPubKeyOdd = publicKey.slice(0, 2) === '03';
    const isYOdd = yCoor % 2n === 1n;
    if (isPubKeyOdd !== isYOdd) { yCoor = secp256k1.p - yCoor; }

    const pubKeyPoint = [xCoor, yCoor];
    return pubKeyPoint;
  }

  // Sign a message with a private key
  function sign(msgHex, privateKeyHex, k) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    k = k || BigInt('0x' + [...randomBytes].map(v => v.toString(16).padStart(2, '0')).join(''));
    // const k = 12345n; // 0x3039
    // console.log('k = ', format(k, 'dec', 'hex'));
  
    const [x, y] = mult(secp256k1.G, k);
    let r = x % secp256k1.n;
  
    // s = k-1*(z + privateKey * r) mod n
    const d = BigInt('0x' + privateKeyHex);
    const z = BigInt('0x' + msgHex);
 
    let inverseK = inverse(k, secp256k1.n);
    const sHigh = (inverseK * (z + d * r)) % secp256k1.n;
    let s = sHigh;
    if (s > secp256k1.n / 2n) { s = secp256k1.n - sHigh; } // check if we need to convert it to the low value
  
    return [r, s];
  }

  function verifySig(msgHex, signature, pubKeyHex) {
    const z = BigInt('0x' + msgHex);
    const [r, s] = signature;
    const inverseS = inverse(s, secp256k1.n);
    const point1 = mult(secp256k1.G, inverseS * z);    
    
    const q = pubKeyPoint(pubKeyHex);
    const point2 = mult(q, inverseS * r);
    // console.log('pubKeyPoint q =', q);
    
    const point3 = add(point1, point2);
    // console.log('Point 3[x] = ', point3[0]);
    return point3[0] === r;
  }


  // tests();

  return {
    secp256k1,    // Object with the elliptic curve parameters
    mod,          // (value) => value                 Modulus operation on secp256k1.p
    inverse,      // (value) => value                 Inverse operation K^-1
    double,       // ([x, y]) => [x, y]               Dobules the coordinates of the given point
    add,          // ([x1, y1], [x2, y2]) => [x, y]   Adds 2 points
    mult,         // ([x, y], mul) => [x, y]          Multiplies a point by a value
    modPow,       // (value, exp, mod) => value       Modular power operation
    modSqrt,      // (value) => value                 Modular Square Root operation (Tonelli-Shanks algorithm)
    pubKeyPoint,  // (pubHex) => [x, y]               Returns the [x, y] point coordinates of a compressed public key
    sign,         // (msgHex, pkHex) => [r, s]        Signs a message and returns the [r, s] signing values
    verifySig,    // (msgHex, signature, pubKeyHex)   Verifies (true/false) the message against the signature and it's compressed public key
  };


  // ------------------------------------------------------------------------------------
  // Tests
  function tests() {

    function signVerify() {
      const msgHex = 'e46bf164b0960d3a3b5612cbac4a691c31b71e26d45c7f8ade7be23727809775';
      const privateKey = 'f94a840f1e1a901843a75dd07ffcc5c84478dc4f987797474c9393ac53ab55e6';
      const pubKey = '024aeaf55040fa16de37303d13ca1dde85f4ca9baa36e2963a27a1c0c1165fe2b1';
  
      const signature = sign(msgHex, privateKey);
      // console.log('Signature = ', signature);
      const isRight = verifySig(msgHex, signature, pubKey);
      // console.log('Verification = ', isRight);
      if (!isRight) { console.error('ECDSA Sign / Verify error'); }

      // We mustn't do this, but because of k randomness, the only way to test is by forcing k = 12345 = 0x3039:
      const [r, s] = sign(msgHex, privateKey, 12345n);
      if (r !== 108607064596551879580190606910245687803607295064141551927605737287325610911759n) { console.error(`Error ecdsa.sign() wrong r value`, r); }
      if (s !== 42001087466938150539821028832855854854604982353441333885146378571977282687206n)  { console.error(`Error ecdsa.sign() wrong s value`, s); }
      // z = 103318048148376957923607078689899464500752411597387986125144636642406244063093n;
      // d = 112757557418114203588093402336452206775565751179231977388358956335153294300646n;
    }

    signVerify();
  }
  
  

}());

