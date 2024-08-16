const getEl = (q) => document.getElementById(q); // shortcut

const format = encoders.format;


const pk = 'adf10f0b705a08a981615925eb2ce563b274547bd8c991468706e91d07feb388';
const point = ecdsa.mult(ecdsa.secp256k1.G, BigInt('0x' + pk)); // Multiply by the generator ECDSA point
console.log(point);