const getEl = (q) => document.getElementById(q); // shortcut
const format = encoders.format; // shortcut



// -------------------------------------- Single Sig Wallet --------------------------------------

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


// -------------------------------------- HD Wallet --------------------------------------



let hdWallet = btcHDWallet.loadSeedPhrase(['ripple', 'hat', 'helmet', 'develop', 'betray', 'panda', 'radio', 'zebra', 'payment', 'silver', 'physical', 'barely']);
console.log('HD Wallet', hdWallet);

displayHDWallet();


document.getElementById('generate-hd-wallet-btn').addEventListener('click', function newHDWallet() {
  const numWords = Number.parseInt(getEl('hd-wallet-phrase-size').value, 10) || 12;
  hdWallet = btcHDWallet.create(numWords);
  displayHDWallet();
});

document.getElementById('hdw-btn-load-from-sphex').addEventListener('click', function() {
  const words = bip39.hexToPhrase(getEl('seed-phrase-hex-input').value);
  hdWallet = btcHDWallet.loadSeedPhrase(words);
  displayHDWallet();
});

document.getElementById('hdw-btn-load-from-phrase').addEventListener('click', function() {
  const words = getEl('seed-phrase-words-input').value.split(' ');
  hdWallet = btcHDWallet.loadSeedPhrase(words);
  displayHDWallet();
});

document.getElementById('hdw-btn-recalc-seed').addEventListener('click', function() {
  const words = getEl('seed-phrase-words-input').value.split(' ');
  const passphrase = getEl('seed-phrase-passphrase').value;
  hdWallet = btcHDWallet.loadSeedPhrase(words, passphrase);
  displayHDWallet();
});

document.getElementById('clear-hd-wallet-btn').addEventListener('click', function() {
  getEl('hd-wallet-phrase-size').value = '';
  getEl('seed-phrase-hex-input').value = '';
  getEl('seed-phrase-words-input').value = '';
  getEl('hdw-sp-label').innerHTML = `Seed Phrase (HEX) ---------------> `;
  getEl('seed-phrase-ascii-hex-val').innerHTML = '';
  getEl('hdw-master-seed').innerHTML = '';
  for (let t = 0; t < 24; t++) { getEl(`hdw-sp-word${t + 1}`).innerHTML = ''; }
  getEl('hdw-master-private-key').innerHTML = '';
  getEl('hdw-master-public-key').innerHTML = '';
  getEl('hdw-master-chain-code').innerHTML = '';
  getEl('hdw-master-xprv').innerHTML = '';
  getEl('hdw-master-xpub').innerHTML = '';
});


function displayHDWallet() {
  const words = hdWallet.seedPhraseMnemonic;
  getEl('hd-wallet-phrase-size').value = hdWallet.seedPhraseMnemonic.length + '';
  getEl('seed-phrase-hex-input').value = hdWallet.seedPhraseHex;
  getEl('seed-phrase-words-input').value = words.join(' ');
  getEl('hdw-sp-label').innerHTML = `Seed Phrase (HEX - ${hdWallet.seedPhraseHex.length / 2} bytes) ----> `;
  getEl('seed-phrase-ascii-hex-val').innerHTML = format(words.join(' '), 'str', 'hex');
  getEl('hdw-master-seed').innerHTML = hdWallet.masterSeedHex;
  
  // display seed phrase words
  const lenW = Math.max(...words.map(v => v.length));
  const colW = words.length / 3;
  for (let t = 0; t < 24; t++) {     
    const el = getEl(`hdw-sp-word${t + 1}`);
    if (el) {
      if (t >= hdWallet.seedPhraseMnemonic.length) {
        el.innerHTML = '';
      } else {
        const ind = ((t * colW) % words.length) + Math.ceil((t + 1) / 3) - 1;
        const word = hdWallet.seedPhraseMnemonic[ind];
        const dec = bip39seed.wordList.indexOf(word);
        el.innerHTML = `${ind + 1}`.padStart(2, '0') + '. ';
        el.innerHTML += (word + ' ').padEnd(lenW + 2, '-') + '> ';
        el.innerHTML += (dec + '').padStart(4, '0') + ' = ';
        el.innerHTML += `${format(dec, 'dec', 'bin').padStart(11, '0')} `;
      }
    }
  }

  getEl('hdw-master-private-key').innerHTML = hdWallet.masterKey.privateKey;
  getEl('hdw-master-public-key').innerHTML = hdWallet.masterKey.publicKey;
  getEl('hdw-master-chain-code').innerHTML = hdWallet.masterKey.chainCode;
  getEl('hdw-master-xprv').innerHTML = hdWallet.masterKey.xPrv;
  getEl('hdw-master-xpub').innerHTML = hdWallet.masterKey.xPub;
}


document.getElementById('hdw-derived-key-calc').addEventListener('click', function() {
  const index = Number.parseInt(getEl('hdw-derived-key-index').value, 10);
  const hardened = !!getEl('hdw-derived-key-hardened').checked;

  const child = hdWallet.masterKey.deriveKeyFn(index, hardened);
  getEl('hdw-child-index').innerHTML       = child.index + '';
  getEl('hdw-child-private-key').innerHTML = child.privateKey;
  getEl('hdw-child-public-key').innerHTML  = child.publicKey;
  getEl('hdw-child-chain-code').innerHTML  = child.chainCode;
  getEl('hdw-child-xprv').innerHTML        = child.xPrv;
  getEl('hdw-child-xpub').innerHTML        = child.xPub;
});
