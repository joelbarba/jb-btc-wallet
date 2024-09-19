const getEl = (q) => document.getElementById(q); // shortcut
const format = encoders.format; // shortcut
const hexReg = /[0-9A-Fa-f]{6}/g;


// Testing address destinations:
// P2PK:   024aeaf55040fa16de37303d13ca1dde85f4ca9baa36e2963a27a1c0c1165fe2b1
// P2PKH:  1HQ9JGeF1X3HWWJYF3cyYFBuQWpmb1hJkN
// P2WPKH: bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4
// P2WSH:  bc1qvhu3557twysq2ldn6dut6rmaj3qk04p60h9l79wk4lzgy0ca8mfsnffz65


const utxo = { txid: '', vout: 0, amount: 0, scriptPubKey: '', privateKey: '' };

// Load a default TX (legacy)
utxo.txid = '4ba5cfbbeb418055e412682dddb01ccec683a80dd9e12792a273f3b20d4a99b7';
utxo.privateKey = 'f94a840f1e1a901843a75dd07ffcc5c84478dc4f987797474c9393ac53ab55e6';
// Load a default TX (segwit)
// utxo.txid = '6ae73833e5f58616445bfe35171e89b23c5b59ef585637537f6ba34a019449ac'; utxo.vout = 1;
// utxo.privateKey = '7306f5092467981e66eff98b6b03bfe925922c5ecfaf14c4257ef18e81becf1f';
getEl('utxo-txid-input').value = utxo.txid;
getEl('utxo-vout-input').value = utxo.vout;
getEl('utxo-private-key-input').value = utxo.privateKey;
getEl('tx-amount-input').value = 0;
getEl('tx-btc-address-input').value = '1HQ9JGeF1X3HWWJYF3cyYFBuQWpmb1hJkN';
updateTxInfo();


getEl('tx-clear').addEventListener('click', () => {
  utxo.txid = ''; utxo.vout = 0; utxo.amount = 0; utxo.scriptPubKey = ''; utxo.privateKey = '';
  getEl('utxo-txid-input').value = utxo.txid;
  getEl('utxo-vout-input').value = utxo.vout;
  getEl('utxo-raw-input').value = '';
  getEl('utxo-scriptpubkey-input').value = utxo.scriptPubKey;
  getEl('utxo-private-key-input').value = utxo.privateKey;
  getEl('tx-amount-input').value = 0;
  getEl('tx-btc-address-input').value = '';
  getEl('tx-data-info').innerHTML = '';
  getEl('utxo-spent-warning').innerHTML = '';
  updateTxInfo();
});
getEl('utxo-txid-input').addEventListener('input', ev => {
  if (hexReg.test(ev.target.value)) { utxo.txid = ev.target.value; }
  getEl('utxo-link').href = `https://learnmeabitcoin.com/explorer/tx/${utxo.txid}`;
});
getEl('utxo-vout-input').addEventListener('input', ev => {
  if (!Number.isNaN(Number(ev.target.value))) {
    utxo.vout = ev.target.value;
    utxo.amount = 0; utxo.scriptPubKey = '';
    const rawTx = getEl('utxo-raw-input').value;
    if (rawTx) { loadUtxoOutput(btcTx.loadFromRaw(rawTx)); }
    getEl('utxo-scriptpubkey-input').value = utxo.scriptPubKey;
    updateTxInfo();
  } 
});
getEl('utxo-scriptpubkey-input').addEventListener('input', ev => { utxo.scriptPubKey = ev.target.value; printUtxoScriptpubkeyInfo(); });
getEl('utxo-private-key-input').addEventListener('input', ev => { utxo.privateKey = ev.target.value; checkUtxoPrivateKey(); });

getEl('utxo-load-utxo-from').addEventListener('click', async () => {
  try {
    if (!utxo.txid) { return console.error(`No TXID`); }
    const response = await fetch(`https://blockchain.info/rawtx/${utxo.txid}?format=hex`);
    if (!response.ok) { throw new Error(`Response status: ${response.status}`); }
    const rawTx = await response.text();
    getEl('utxo-raw-input').value = rawTx;
    const prevTx = btcTx.loadFromRaw(rawTx);
    console.log(`Full tx of the selected UTXO:`, prevTx);
    loadUtxoOutput(prevTx);
  } catch (error) { console.error(error.message); }
});
getEl('utxo-load-raw').addEventListener('click', () => {
  const rawTx = getEl('utxo-raw-input').value;
  const prevTx = btcTx.loadFromRaw(rawTx);
  console.log(`Full tx of the selected UTXO:`,  prevTx);
  utxo.txid = prevTx.txId;
  getEl('utxo-txid-input').value = utxo.txid;
  loadUtxoOutput(prevTx);
  updateTxInfo();
});
getEl('utxo-check-btn').addEventListener('click', async () => {
  try { // Load the TX from the blockchain, and check if the TXID:VOUT was already spent
    if (utxo.txid && (utxo.vout + '')) {
      const response = await fetch(`https://blockchain.info/rawtx/${utxo.txid}`);
      if (!response.ok) { throw new Error(`Response status: ${response.status}`); }
      const txData = await response.json();
      const isSpent = !!txData.out[utxo.vout].spent;
      getEl('utxo-spent-warning').innerHTML = isSpent ? `WARNING: TXID:VOUT already spent`: `OK: Not spent yet`;
      getEl('utxo-spent-warning').style = `margin: 0 10px; color: ${isSpent ? 'red': 'green'}`;
      
      if (isSpent && utxo.scriptPubKey) { // Find out where it was spent
        const scriptName = btcTx.guessLockScript(utxo.scriptPubKey); let pkh = '';
        if (scriptName === 'P2PKH')  { pkh = utxo.scriptPubKey.slice(6, -4); }
        if (scriptName === 'P2WPKH') { pkh = utxo.scriptPubKey.slice(4); }
        if (pkh) {
          const address = btcWallet.hashToAddress(pkh, scriptName); 
          const response = await fetch(`https://blockchain.info/rawaddr/${address}`);
          if (!response.ok) { throw new Error(`Response status: ${response.status}`); }
          const addrData = await response.json();
          console.log(addrData);
          const nextTxId = addrData.txs.find(tx => tx.inputs.filter(i => i.prev_out.addr === address))?.hash;
          if (nextTxId) {
            const url = `https://learnmeabitcoin.com/explorer/tx/${nextTxId}`;
            getEl('utxo-spent-warning').innerHTML += ` here: <a target="blank" href="${url}">TXID: ${nextTxId}</a>`;
          }
        }        
      }
      
    }
  } catch (error) { console.error(error.message); }
});

function loadUtxoOutput(prevTx) {
  getEl('utxo-vout-size').innerHTML = `max vout = ${prevTx.outputs.length - 1} --> (total outputs = ${prevTx.outputs.length})`;
  if (utxo.vout < prevTx.outputs.length) {
    utxo.amount = prevTx.outputs[utxo.vout].amount;
    utxo.scriptPubKey = prevTx.outputs[utxo.vout].scriptPubKey;
    getEl('utxo-vout-input').style = `max-width: 70px;`;
  } else {
    getEl('utxo-vout-input').style = `max-width: 70px; background: red;`;
    console.error(`Wrong VOUT. The transaction has no output ${utxo.vout}. Max: ${prevTx.outputs.length - 1}`);
  }
  getEl('utxo-scriptpubkey-input').value = utxo.scriptPubKey;
  updateTxInfo();
}

function updateTxInfo() {
  printUtxoAmountInfo();
  printUtxoScriptpubkeyInfo();
  checkUtxoPrivateKey();
  onAmountChange();
  onAddressChange();
}
function printUtxoAmountInfo() {
  let text = `${utxo.amount} sats = ${(utxo.amount / 100000000).toFixed(8)} btc`;
  text += ` = 0x${format(utxo.amount, 'dec', 'lie')} (in little-endian)`;
  getEl('utxo-output-amount').innerHTML = text;
}
function printUtxoScriptpubkeyInfo() {
  const script = utxo.scriptPubKey;
  const scriptName = btcTx.guessLockScript(script);
  let pkh = '', addr = '', desc = 'Unknown';
  if (scriptName === 'P2PK')   { desc = `${scriptName} (Pay to Public Key) - Legacy`; }
  if (scriptName === 'P2PKH')  { desc = `${scriptName} (Pay to Public Key Hash) - Legacy`; }
  if (scriptName === 'P2MS')   { desc = `${scriptName} (Pay to Multisig) - Legacy`; }
  if (scriptName === 'P2SH')   { desc = `${scriptName} (Pay to Script Hash) - Legacy`; }
  if (scriptName === 'P2WPKH') { desc = `${scriptName} (Pay to Witness Public Key Hash) - SegWit`; }
  if (scriptName === 'P2WSH')  { desc = `${scriptName} (Pay to Witness Script Hash) - SegWit`; }
  if (scriptName === 'P2PKH')  { pkh = script.slice(6, -4); } // 76a914ce72abfd0e6d9354a660c18f2825eb392f060fdc88ac
  if (scriptName === 'P2WPKH') { pkh = script.slice(4); }     // 0014aa966f56de599b4094b61aa68a2b3df9e97e9c48
  if (pkh) { addr = btcWallet.hashToAddress(pkh, scriptName); }
  const size = Math.ceil(script.length / 2);
  getEl('utxo-script-size').innerHTML = `${size} bytes (0x${format(size, 'dec', 'hex')})`;
  getEl('utxo-script-hrdata').innerHTML = script ? `Script -------> ${btcTx.translateScript(script || '').join(' + ')}` : '';
  getEl('utxo-script-type').innerHTML   = script ? `Script Type --> ${desc}` : '';
  getEl('utxo-script-pkh').innerHTML    = pkh    ? `PubKeyHash ---> ${pkh}`  : '';
  getEl('utxo-script-addr').innerHTML   = addr   ? `BTC Address --> ${addr}` : '';
}
function checkUtxoPrivateKey() {
  getEl('utxo-private-key-check').innerHTML = '';
  if (utxo.privateKey && utxo.scriptPubKey) {
    const scriptName = btcTx.guessLockScript(utxo.scriptPubKey);
    let pkh = '';
    if (scriptName === 'P2PKH')  { pkh = utxo.scriptPubKey.slice(6, -4); } // 76a914ce72abfd0e6d9354a660c18f2825eb392f060fdc88ac
    if (scriptName === 'P2WPKH') { pkh = utxo.scriptPubKey.slice(4); }     // 0014aa966f56de599b4094b61aa68a2b3df9e97e9c48
    if (pkh) {
      const walletPubKeyHash = btcWallet.create(utxo.privateKey).pubKeyHash;
      const isValid = pkh === walletPubKeyHash;
      checkTxt = (isValid ? `✔ (valid)` : `x (invalid)`) + ` - pubKeyHash = ${walletPubKeyHash}`;
      getEl('utxo-private-key-check').innerHTML = checkTxt;
      getEl('utxo-private-key-check').style = `color: ${isValid ? 'green': 'red' }`;
      return isValid;
    }
  }
  return false;
}



getEl('tx-amount-input').addEventListener('input', ev => onAmountChange(ev.target.value));
getEl('tx-btc-address-input').addEventListener('input', ev => onAddressChange(ev.target.value));
function onAmountChange(value = getEl('tx-amount-input').value) {
  const sats = Number(value);
  if (!Number.isNaN(Number(sats))) {
    const btcValue = (sats / 100000000).toFixed(8);
    getEl('tx-output-amount-lie').innerHTML = `sats = ${btcValue} btc = 0x${format(sats, 'dec', 'lie')} (little-endian)`;
    const fee = utxo.amount - sats;
    getEl('tx-output-fee').innerHTML = `${fee} sats = ${(fee / 100000000).toFixed(8)} btc`;
    getEl('tx-amount-input').style = `max-width: 100px; ${fee < 0 ? 'background: red': ''};`;
  }
}
function onAddressChange(txAddress = getEl('tx-btc-address-input').value) {
  const info = btcWallet.checkAddress(txAddress);
  if (info.error) { getEl('tx-btc-address-info').innerHTML = info.error; }
  else { getEl('tx-btc-address-info').innerHTML = `(${info.scriptName}) - hash = ${info.hash}`; }
}

getEl('tx-create-transaction').addEventListener('click', () => {
  const textarea = getEl('tx-raw-input');
  
  // Validate amount
  const sats = Number(getEl('tx-amount-input').value);
  if (Number.isNaN(Number(sats))) { textarea.value = 'Wrong amount ' + sats; return; }
  if (sats > utxo.amount) { textarea.value = `Wrong amount ${sats} (max ${utxo.amount})`; return; }

  // Validate address
  const btcAddress = getEl('tx-btc-address-input').value;
  const info = btcWallet.checkAddress(btcAddress);
  if (info.error) { textarea.value = `${info.error}: ${btcAddress}`; return; }

  // Validate utxo private key
  if (!checkUtxoPrivateKey()) { textarea.value = `Error: Wrong private key to unlock the UTXO`; return; }

  // Generate the output (new locking script)
  const newLockScript = info.scriptName;
  if (['P2PK', 'P2PKH', 'P2WPKH', 'P2SH', 'P2WSH'].indexOf(newLockScript) < 0) {
    textarea.value = `${newLockScript}: locking to this type of script still not implemented...`; return;
  }
  const newTx = btcTx.create();
  const output = newTx.addOutput(newLockScript, sats, btcAddress);

  // Additional OP_RETURN message
  const msgHex = format(getEl('tx-message-input').value || '', 'str', 'hex');
  if (msgHex) { newTx.addOutput('OP_RETURN', 0, msgHex); }

  // Generate the input (unlock/sign the UTXO)
  const utxoScriptName = btcTx.guessLockScript(utxo.scriptPubKey);
  if (['P2PK', 'P2PKH', 'P2WPKH'].indexOf(utxoScriptName) < 0) {
    textarea.value = `${utxoScriptName}: signature (unlock) still not implemented...`; return;
  }
  const input = newTx.addInput(utxo.txid, utxo.vout).sign(utxo, utxo.privateKey);

  textarea.value = newTx.getRawTx();
  console.log('New TX:', newTx);

  let txData = ``, br = `<br/>`;
  txData += `TXID ----------------------> ${newTx.txId} / (reverted) = ${format(newTx.txId, 'hex', 'rev')}`;
  txData += br + `isSegWit ------------------> ${newTx.isSegWit} ${newTx.isSegWit ? '(because it unlocks a segwit input)':''}`;
  if (input.scriptSig) { txData += br + `inputs[0].scriptSig -------> (${utxoScriptName}): ${btcTx.translateScript(input.scriptSig).join(' + ')}`; }
  if (newTx.witness?.length > 0) { txData += br + `witness[0] ----------------> (signature): ${newTx.witness[0]}`; }
  if (newTx.witness?.length > 1) { txData += br + `witness[1] ----------------> (publicKey): ${newTx.witness[1]}`; }
  txData += br + `outputs[0].scriptPubKey ---> (${newLockScript}): ${btcTx.translateScript(output.scriptPubKey).join(' + ')} -----> ${output.scriptPubKey}`;
  if (msgHex) { txData += br + `outputs[1].scriptPubKey ---> (OP_RETURN): ${newTx.outputs[1].scriptPubKey}`; }

  getEl('tx-data-info').innerHTML = txData;
});




// -------------------------------------- Single Sig Wallet --------------------------------------

let wallet = btcWallet.create('adf10f0b705a08a981615925eb2ce563b274547bd8c991468706e91d07feb388');
console.log('Sig Wallet', wallet);

displayWallet();``

function displayWallet() {
  getEl('private-key-hex-input').value = wallet.privateKey;
  getEl('private-key-wif-input').value = wallet.wif;
  getEl('private-key-wif-comp-input').value = wallet.wifCompressed;
  getEl('private-key-dec').innerHTML = BigInt('0x' + wallet.privateKey);
  
  const bin = format(wallet.privateKey, 'hex', 'bin');
  const binStr = bin.split('').map((c,i) => (i%64 ? '': '-') + (i%8 ? '': ' ') + c).join('').slice(2).split('- ').join('<br/>');
  getEl('private-key-bin').innerHTML = binStr;
  
  getEl('public-key').innerHTML = wallet.publicKey;
  getEl('public-key-uncompressed').innerHTML = wallet.uncompressedPubKey;
  getEl('public-key-coordinates').innerHTML = `x: ${wallet.pubKeyXCoordinate} / y: ${wallet.pubKeyYCoordinate}`;
  
  getEl('sig-wallet-public-key-hash').innerHTML = wallet.pubKeyHash;
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
  getEl('sig-wallet-public-key-hash').innerHTML = '';
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
  getEl('hdw-master-public-key-hash').innerHTML = '';
  getEl('hdw-master-chain-code').innerHTML = '';
  getEl('hdw-master-xprv').innerHTML = '';
  getEl('hdw-master-xpub').innerHTML = '';
  derivePath.level0.index = 84, derivePath.level0.hardened = true;
  derivePath.level1.index = 0,  derivePath.level1.hardened = true;
  derivePath.level2.index = 0,  derivePath.level2.hardened = true;
  derivePath.level3.index = 0,  derivePath.level3.hardened = false;
  derivePath.level4.index = 0,  derivePath.level4.hardened = false;
  updateDeriveBtns();
  getEl('hdw-child-index').innerHTML            = '';
  getEl('hdw-child-path').innerHTML             = '';
  getEl('hdw-child-private-key').innerHTML      = '';
  getEl('hdw-child-public-key').innerHTML       = '';
  getEl('hdw-child-public-key-hash').innerHTML  = '';
  getEl('hdw-child-chain-code').innerHTML       = '';
  getEl('hdw-child-xprv').innerHTML             = '';
  getEl('hdw-child-xpub').innerHTML             = '';
  getEl('hdw-child-address').innerHTML          = '';
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
  getEl('hdw-master-public-key-hash').innerHTML = hdWallet.masterKey.pubKeyHash;
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
  const derivePath = calcDerivedPath()[currentLevel];
  getEl('hdw-child-index').innerHTML            = child.index + '';
  getEl('hdw-child-path').innerHTML             = derivePath;
  getEl('hdw-child-private-key').innerHTML      = child.privateKey;
  getEl('hdw-child-public-key').innerHTML       = child.publicKey;
  getEl('hdw-child-public-key-hash').innerHTML  = child.pubKeyHash;
  getEl('hdw-child-chain-code').innerHTML       = child.chainCode;
  getEl('hdw-child-xprv').innerHTML             = child.xPrv;
  getEl('hdw-child-xpub').innerHTML             = child.xPub;
  getEl('hdw-child-address').innerHTML          = child.p2wpkhBTCAddress;
  console.log('Derived Wallet', derivePath, child);
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





