const getEl = (q) => document.getElementById(q); // shortcut

const format = encoders.format;


let wallet = btcWallet.create('adf10f0b705a08a981615925eb2ce563b274547bd8c991468706e91d07feb388');
console.log(wallet);


displayWallet();

function displayWallet() {
  getEl('private-key-hex-input').value = wallet.privateKey;
  getEl('private-key-wif-input').value = wallet.wif;
  getEl('private-key-wif-comp-input').value = wallet.wifCompressed;
  getEl('private-key-dec').innerHTML = format(wallet.privateKey, 'hex', 'dec');
  
  const bin = format(wallet.privateKey, 'hex', 'bin');
  const binStr = bin.split('').map((c,i) => (i%64 ? '': '-') + (i%8 ? '': ' ') + c).join('').slice(2).split('- ').join('<br/>');
  getEl('private-key-bin').innerHTML = binStr;
  
  getEl('public-key').innerHTML = wallet.publicKey;
  getEl('public-key-uncompressed').innerHTML = wallet.uncompressedPubKey;
  getEl('public-key-coordinates').innerHTML = `x: ${wallet.pubKeyXCoordinate} / y: ${wallet.pubKeyYCoordinate}`;
  
  getEl('btc-address-p2pkh').innerHTML = wallet.p2pkhBTCAddress;
  getEl('btc-address-p2wpkh').innerHTML = wallet.p2wpkhBTCAddress;
}


getEl('clear-all-btn').addEventListener('click', () => {
  getEl('private-key-hex-input').value = '';
  getEl('private-key-wif-input').value = '';
  getEl('private-key-wif-comp-input').value = '';
  getEl('private-key-dec').innerHTML = '';
  getEl('private-key-bin').innerHTML = '';  
  getEl('public-key').innerHTML = '';
  getEl('public-key-uncompressed').innerHTML = '';
  getEl('public-key-coordinates').innerHTML = '';  
  getEl('btc-address-p2pkh').innerHTML = '';
  getEl('btc-address-p2wpkh').innerHTML = '';
});

getEl('generate-private-key-btn').addEventListener('click', () => {
  wallet = btcWallet.create(); displayWallet();
});

getEl('pk-hex-load-from').addEventListener('click', () => {
  wallet = btcWallet.create(getEl('private-key-hex-input').value); displayWallet();
});
getEl('pk-wif-load-from').addEventListener('click', () => loadFromWif(getEl('private-key-wif-input').value));
getEl('pk-wif-comp-load-from').addEventListener('click', () => loadFromWif(getEl('private-key-wif-comp-input').value));
function loadFromWif(wif) {
  const pkHex = format(wif, 'b58', 'hex').slice(2, 66);
  console.log(format(wif, 'b58', 'hex'));
  console.log(pkHex);
  wallet = btcWallet.create(pkHex); displayWallet();
}
