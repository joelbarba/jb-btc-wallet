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
  function mod(x) {
    x = x % secp256k1.p;
    if (x < 0) { x += secp256k1.p; } 
    return x;
  };

  function inverse(a) {
    const next = { a, m: secp256k1.p, y: 1n, z: 0n };
    while (next.a > 1) {
      const curr = { ...next };
      const q = curr.m / curr.a;
      next.z = curr.y;
      next.y = curr.z - (q * curr.y);
      next.a = curr.m % curr.a;
      next.m = curr.a;
    }
    return mod(next.y);
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
  };


  // ------------------------------------------------------------------------------------
  // Tests
  function tests() {
  }
  

}());

