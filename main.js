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

const purpose   = hdWallet.masterKey.deriveKeyFn(84, true); // m/84'
const coinType  = purpose.deriveKeyFn(0, true);             // m/84'/0'
const account   = coinType.deriveKeyFn(0, true);            // m/84'/0'/0'
const receiving = account.deriveKeyFn(0, false);            // m/84'/0'/0'/0

console.log('Account xPub = ', account.xPub); // xpub6CEZMAuTZ4LJ7Dv4rBi5MEnUsoqyKFgbvjCGgruTe7UqcGV2XwEDuH3qpnZd51wxXTy7NQsjYiEbVKf6E3iTYwYoM747rSqQxgiCEnwroh2

console.log('wallet0 addr = ', receiving.deriveKeyFn(0, false).p2wpkhBTCAddress);  // m/84'/0'/0'/0/0  = bc1qtut25h24c8v44jrapdzkr66gl0yj5s8xevh654
console.log('wallet1 addr = ', receiving.deriveKeyFn(1, false).p2wpkhBTCAddress);  // m/84'/0'/0'/0/1  = bc1qn0654qnu76laean628ll547nvcmc74vkutnhxu
console.log('wallet2 addr = ', receiving.deriveKeyFn(2, false).p2wpkhBTCAddress);  // m/84'/0'/0'/0/2  = bc1qghuj82uqsr2mkh7x54z22vf8lfxtttfyu9tm5l
console.log('wallet3 addr = ', receiving.deriveKeyFn(3, false).p2wpkhBTCAddress);  // m/84'/0'/0'/0/3  = bc1qkgpjjjmxlcy4rf30tw60gncfrtxxhrkw4jzv8v

const wallet0 = receiving.deriveKeyFn(0, false);
console.log('wallet0 = ', wallet0);

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
  derivePath.level0.index = 84, derivePath.level0.hardened = true;
  derivePath.level1.index = 0,  derivePath.level1.hardened = true;
  derivePath.level2.index = 0,  derivePath.level2.hardened = true;
  derivePath.level3.index = 0,  derivePath.level3.hardened = false;
  derivePath.level4.index = 0,  derivePath.level4.hardened = false;
  updateDeriveBtns();
  getEl('hdw-child-index').innerHTML       = '';
  getEl('hdw-child-path').innerHTML        = '';
  getEl('hdw-child-private-key').innerHTML = '';
  getEl('hdw-child-public-key').innerHTML  = '';
  getEl('hdw-child-chain-code').innerHTML  = '';
  getEl('hdw-child-xprv').innerHTML        = '';
  getEl('hdw-child-xpub').innerHTML        = '';
  getEl('hdw-child-address').innerHTML     = '';
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







const derivePath = {
  level0: { index: 84, hardened: true },
  level1: { index: 0,  hardened: true },
  level2: { index: 0,  hardened: true },
  level3: { index: 0,  hardened: false },
  level4: { index: 0,  hardened: false },
};
let currentLevel = 0;
function calcDeriveKeys(level = 0) {
  currentLevel = level;
  const masterKey = hdWallet.masterKey;
  const purpose   = masterKey.deriveKeyFn(derivePath.level0.index, derivePath.level0.hardened);  // m/84'
  const coinType  = purpose.deriveKeyFn(  derivePath.level1.index, derivePath.level1.hardened);  // m/84'/0'
  const account   = coinType.deriveKeyFn( derivePath.level2.index, derivePath.level2.hardened);  // m/84'/0'/0'
  const receiving = account.deriveKeyFn(  derivePath.level3.index, derivePath.level3.hardened);  // m/84'/0'/0'/0
  const childWlt  = receiving.deriveKeyFn(derivePath.level4.index, derivePath.level4.hardened);  // m/84'/0'/0'/0
  return [purpose, coinType, account, receiving, childWlt][level];
}
function displayDerivedKey(child) {
  getEl('hdw-child-index').innerHTML       = child.index + '';
  getEl('hdw-child-path').innerHTML        = calcDerivedPath()[currentLevel];
  getEl('hdw-child-private-key').innerHTML = child.privateKey;
  getEl('hdw-child-public-key').innerHTML  = child.publicKey;
  getEl('hdw-child-chain-code').innerHTML  = child.chainCode;
  getEl('hdw-child-xprv').innerHTML        = child.xPrv;
  getEl('hdw-child-xpub').innerHTML        = child.xPub;
  getEl('hdw-child-address').innerHTML     = child.p2wpkhBTCAddress;
}
function calcDerivedPath() {
  const path0 = `m/${derivePath.level0.index + (derivePath.level0.hardened ? "'": "")}`;
  const path1 = path0 + `/${derivePath.level1.index + (derivePath.level1.hardened ? "'": "") }`;
  const path2 = path1 + `/${derivePath.level2.index + (derivePath.level2.hardened ? "'": "") }`;
  const path3 = path2 + `/${derivePath.level3.index + (derivePath.level3.hardened ? "'": "") }`;
  const path4 = path3 + `/${derivePath.level4.index + (derivePath.level4.hardened ? "'": "") }`;
  return [path0, path1, path2, path3, path4];
}

function updateDeriveBtns() {
  calcDerivedPath().forEach((path, ind) => {
    getEl('hdw-derived-key-calc-'+ ind).innerHTML = `Calculate Derived Key ${path}`;
    getEl('hdw-derived-key-index-' + ind).value = derivePath['level' + ind].index;
    getEl('hdw-derived-key-hardened-' + ind).checked = !!derivePath['level' + ind].hardened;
  });
}

getEl('hdw-derived-key-index-0').addEventListener('input',    (ev) => { derivePath.level0.index = Number.parseInt(ev.target.value, 10) || 0;   updateDeriveBtns(); });
getEl('hdw-derived-key-index-1').addEventListener('input',    (ev) => { derivePath.level1.index = Number.parseInt(ev.target.value, 10) || 0;   updateDeriveBtns(); });
getEl('hdw-derived-key-index-2').addEventListener('input',    (ev) => { derivePath.level2.index = Number.parseInt(ev.target.value, 10) || 0;   updateDeriveBtns(); });
getEl('hdw-derived-key-index-3').addEventListener('input',    (ev) => { derivePath.level3.index = Number.parseInt(ev.target.value, 10) || 0;   updateDeriveBtns(); });
getEl('hdw-derived-key-index-4').addEventListener('input',    (ev) => { derivePath.level4.index = Number.parseInt(ev.target.value, 10) || 0;   updateDeriveBtns(); });
getEl('hdw-derived-key-hardened-0').addEventListener('input', (ev) => { derivePath.level0.hardened = !!ev.target.checked; updateDeriveBtns(); });
getEl('hdw-derived-key-hardened-1').addEventListener('input', (ev) => { derivePath.level1.hardened = !!ev.target.checked; updateDeriveBtns(); });
getEl('hdw-derived-key-hardened-2').addEventListener('input', (ev) => { derivePath.level2.hardened = !!ev.target.checked; updateDeriveBtns(); });
getEl('hdw-derived-key-hardened-3').addEventListener('input', (ev) => { derivePath.level3.hardened = !!ev.target.checked; updateDeriveBtns(); });
getEl('hdw-derived-key-hardened-4').addEventListener('input', (ev) => { derivePath.level4.hardened = !!ev.target.checked; updateDeriveBtns(); });

getEl('hdw-derived-key-calc-0').addEventListener('click', function() { displayDerivedKey(calcDeriveKeys(0)); });
getEl('hdw-derived-key-calc-1').addEventListener('click', function() { displayDerivedKey(calcDeriveKeys(1)); });
getEl('hdw-derived-key-calc-2').addEventListener('click', function() { displayDerivedKey(calcDeriveKeys(2)); });
getEl('hdw-derived-key-calc-3').addEventListener('click', function() { displayDerivedKey(calcDeriveKeys(3)); });
getEl('hdw-derived-key-calc-4').addEventListener('click', function() { displayDerivedKey(calcDeriveKeys(4)); });

getEl('hdw-derived-key-calc-next').addEventListener('click', function() { 
  derivePath['level' + currentLevel].index += 1;
  displayDerivedKey(calcDeriveKeys(currentLevel));
  updateDeriveBtns();
});

displayDerivedKey(calcDeriveKeys(4));