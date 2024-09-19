const btcTx = (function() {
  const format = encoders.format;

  function create(tx) {
    tx = tx || {
      version  : 1,
      marker   : 0,
      flag     : 1,
      locktime : 0,
      inputs   : [
        // { txid: 'b036fd0dbbdc26b454aa56104b8e2f1cf7a223c371a03b3f38f02a0fc3e73d39', vout: 0,
        //   scriptSig: '4830450221009c0019582e97ad740c8ead4b8...d2be29ff200f61c3f229e75f89d348',
        //   sequence: 'FFFFFFFF'
        // }
      ],
      outputs: [
        // { amount: 18193173267, scriptPubKey: '76a91456c78deb3627490bb61ee9c583f3837d84d3d2d688ac', },
        // { amount: 10366244,    scriptPubKey: '76a9148f8094807a90a7a175bc51e9885ebebf92cf51f388ac', },
      ],
      segwit: [],
      isSegWit : false,
    };

    tx.refreshTxId = function() { tx.txId = calcTxId(tx); return tx.txId; }; // should run it when changing data
    
  
    tx.getRawTx = function() { return getRawTx(tx); };
    tx.loadFromRaw = function(rawTx) { tx = loadFromRaw(rawTx); return tx; };
  

    // Adds an output to the transaction, with the amount and the locking script (scriptPubKey)
    // Depending on the scriptName, data = Btc Address / Script Hash / Message / Public Key
    tx.addOutput = function(scriptName = 'P2WPKH', amountSats = 0, data) {
      let scriptPubKey = '';
      if (scriptName === 'P2PK')      { scriptPubKey = lock_P2PK_Script(data);   } // data = public key
      if (scriptName === 'P2PKH')     { scriptPubKey = lock_P2PKH_Script(data);  } // data = btc address
      if (scriptName === 'P2WPKH')    { scriptPubKey = lock_P2WPKH_Script(data); } // data = btc address
      if (scriptName === 'P2SH')      { scriptPubKey = lock_P2SH_Script(data);   } // data = script hash
      if (scriptName === 'P2WSH')     { scriptPubKey = lock_P2WSH_Script(data);  } // data = script hash
      if (scriptName === 'OP_RETURN') { scriptPubKey = lockDataScript(data);     } // data = data
      const output = { amount: amountSats, scriptPubKey };
      tx.outputs.push(output);
      tx.refreshTxId();
      return output;
    }
  
    // Adds an input, alonside a sign() function that creates the signature and the unlocking scriptSig
    tx.addInput = function(txid, vout, sequence = 'FFFFFFFF') {
      const input = { txid, vout, scriptSig: '', sequence };
      input.sign = function(utxo, privateKey) {
        const scriptName = validateUnlockingKey(utxo.scriptPubKey, privateKey)
        if (!scriptName) { return input; }

        input.scriptSig = '';
        inputInd = tx.inputs.indexOf(input);
        if (scriptName === 'P2PK') { // Legacy script in the utxo (pay to public key)
          const signature = signTx(tx, inputInd, utxo.scriptPubKey, privateKey);
          input.scriptSig = unlockP2PKScript(signature);
          
        } else if (scriptName === 'P2PKH') { // Legacy script in the utxo (pay to public key hash)
          const signature = signTx(tx, inputInd, utxo.scriptPubKey, privateKey);
          input.scriptSig = unlockP2PKHScript(signature, btcWallet.create(privateKey).publicKey);

        } else if (scriptName === 'P2WPKH') { // SegWit script in the utxo (pay to witness public key hash)
          tx.isSegWit = true; tx.version = 2; // If it contains inputs from a segwit, it is a segwit tx          
          const publicKey = btcWallet.create(privateKey).publicKey;
          const signature = signSegWitTx(tx, inputInd, utxo.scriptPubKey, utxo.amount, privateKey, publicKey);
          tx.witness = tx.witness || []; // Assuming only 1 input
          tx.witness.push(signature);
          tx.witness.push(publicKey);

        } else if (scriptName === 'P2MS')  { console.error(`${scriptName} Not suported`); // TODO: Pay to multisig
        } else if (scriptName === 'P2SH')  { console.error(`${scriptName} Not suported`); // TODO: Pay to script hash
        } else if (scriptName === 'P2WSH') { console.error(`${scriptName} Not suported`); // TODO: Pay to witness script hash

        } else { console.error(`Unknown script in the utxo`, utxo); }        
        tx.refreshTxId();
        return input;
      }
      tx.inputs.push(input);
      tx.refreshTxId();
      return input;
    }

    tx.txId = calcTxId(tx);
    return tx;
  }


  // Generates the raw HEX value of the transaction
  function getRawTx(tx) {    
    let rawTx = '';
    rawTx += format(tx.version, 'dec', 'lie');          // Version
    if (tx.isSegWit) { rawTx += format(tx.marker, 'dec', 'hex', 2); } // Marker
    if (tx.isSegWit) { rawTx += format(tx.flag,   'dec', 'hex', 2); } // Flag
    rawTx += format(tx.inputs.length, 'dec', 'com');    // Input count
    for (let t = 0; t < tx.inputs.length; t++) {
      // console.log('Input', t);
      const input = tx.inputs[t];
      const scriptSig = input.scriptSig || '';
      const scriptSize = Math.ceil(scriptSig.length / 2);
      rawTx += format(input.txid, 'hex', 'rev');        // TXID
      rawTx += format(input.vout, 'dec', 'lie');        // VOUT
      rawTx += format(scriptSize, 'dec', 'com');        // ScriptSig size
      rawTx += scriptSig;                               // ScriptSig
      rawTx += format(input.sequence, 'hex', 'lie');    // Sequence
    }

    rawTx += format(tx.outputs.length, 'dec', 'com');   // Output count
    for (let t = 0; t < tx.outputs.length; t++) {
      // console.log('Output', t);
      const output = tx.outputs[t];
      const scriptPubKey = output.scriptPubKey || '';
      const scriptSize = Math.ceil(scriptPubKey.length / 2);
      rawTx += format(output.amount, 'dec', 'lie', 16); // Amount
      rawTx += format(scriptSize, 'dec', 'com');        // ScriptPubKey size
      rawTx += scriptPubKey;                            // ScriptPubKey
    }

    if (tx.isSegWit) {                                  // Witness
      rawTx += format(tx.witness.length, 'dec', 'com');
      for (let t = 0; t < tx.witness.length; t++) {
        const item = tx.witness[t];
        const size = Math.ceil(item.length / 2);
        rawTx += format(size, 'dec', 'com');
        rawTx += item.padStart(size * 2, '0');
      }
    } 

    rawTx += format(tx.locktime, 'dec', 'lie');         // Locktime
    return rawTx.toLowerCase();
  }

  // Returns a tx object from a raw HEX transaction
  function loadFromRaw(rawTx) {
    rawTx = rawTx.toLowerCase();

    // helpers to de-serialize
    const bytesArr = rawTx.split('').map((c,i) => (i%2 ? '' : '-') + c).join('').slice(1).split('-');
    const getNext = (numBytes) => { r = ''; for (let t=0; t<numBytes; t++) { r += bytesArr.shift(); }; return r; }
    const getLittleEndian = () => format(getNext(4), 'lie', 'dec');
    const getCompactSize = () => {
      const prefix = getNext(1);
      if (prefix === 'ff') { return format(prefix + getNext(8), 'com', 'dec'); }
      if (prefix === 'fd') { return format(prefix + getNext(4), 'com', 'dec'); }
      if (prefix === 'fe') { return format(prefix + getNext(2), 'com', 'dec'); }
      return format(prefix, 'com', 'dec');
    }

    const tx = {
      version  : 0,
      locktime : 0,
      inputs   : [],
      outputs  : [],
      isSegWit : false,
    };

    tx.version = getLittleEndian();

    let inputCount = getCompactSize();
    if (inputCount === 0) { // In that case inputCount is actually the marker field
      tx.isSegWit = true;
      tx.marker = 0;
      tx.flag = getNext();
      inputCount = getCompactSize();
    }

    for (let t = 0n; t < inputCount; t++) {
      const txid = format(getNext(32), 'hex', 'rev');
      const vout = getLittleEndian();
      const scriptSize = getCompactSize();
      const scriptSig = getNext(scriptSize);
      const sequence = format(getNext(4), 'lie', 'hex');
      tx.inputs.push({ txid, vout, scriptSig, sequence });
    }

    const outputCount = getCompactSize();
    for (let t = 0n; t < outputCount; t++) {
      const amount = format(getNext(8), 'lie', 'dec');
      const scriptSize = getCompactSize();
      const scriptPubKey = getNext(scriptSize);
      tx.outputs.push({ amount, scriptPubKey });
    }

    if (tx.isSegWit) {
      tx.witness = [];
      for (let t = 0n; t < inputCount; t++) {
        const stackItems = getCompactSize();
        for (let t = 0; t < stackItems; t++) {
          const itemSize = getCompactSize();
          const item = getNext(itemSize);
          tx.witness.push(item);
        }
      }
    }

    tx.locktime = getLittleEndian();

    tx.txId = calcTxId(tx);
    if (bytesArr.length) { console.error(`Inconsistent tx. More data to de-serialize:`, bytesArr.join('')); }
    return create(tx);
  }

  // It calculates the TXID
  function calcTxId(tx) {
    const partialTx = { version: tx.version, inputs: tx.inputs, outputs: tx.outputs, locktime: tx.locktime };
    const rawTx = getRawTx(partialTx);
    const txIdRev = hashes.hash256(rawTx); // Value used in raw transaction data (txid byte-reverted)
    const txId = format(txIdRev, 'hex', 'rev') // Real TXID value (Used externally on block explorers)
    return txId;
  }

  // Generates the signature to unlock a UTXO
  // - tx ----------------> The object with the transaction to sign (outputs should be already set)
  // - inputInd ----------> The index of the input in the tx.inputs[] to sign
  // - utxoScriptPubKey --> The locking script of the UTXO (the TXID:VOUT the input is pointing at)
  // - privateKey       --> The private key used to lock the UTXO
  function signTx(tx, inputInd, utxoScriptPubKey, privateKey) {
    const publicKey = btcWallet.create(privateKey).publicKey;
    const txPlaceholder = JSON.parse(JSON.stringify(tx));
    txPlaceholder.inputs.forEach(input => input.scriptSig = '');  // Empty all scriptSigs
    txPlaceholder.inputs[inputInd].scriptSig = utxoScriptPubKey;  // Copy the utxo's locking script
    let txData = getRawTx(txPlaceholder); // Serialize the placeholder tx
    txData += '01000000'; // Add sighash SIGHASH_ALL = 01
    const txDataHash = hashes.hash256(txData);

    // const sigArr = ecdsa.sign(txDataHash, privateKey, BigInt(format('75bcd15', 'hex', 'dec'))); // <---- THIS IS JUST FOR TESTING, REMOVE IT !!!!!!!!!
    const sigArr = ecdsa.sign(txDataHash, privateKey);

    // Sanity check, to verify the signature has no errors
    const validSignature = ecdsa.verifySig(txDataHash, sigArr, publicKey);
    if (!validSignature) { console.error(`Error signing the transaction: invalid signature:`, sigArr); return; }

    const derSig = format(sigArr, 'sig', 'der'); // DER Encode
    const signature = derSig + '01'; // Add sighash SIGHASH_ALL = 01

    return signature;
  }

  // Generates the signature to unlock a UTXO
  // - tx ----------------> The object with the transaction to sign (outputs should be already set)
  // - inputInd ----------> The index of the input in the tx.inputs[] to sign
  // - utxoScriptPubKey --> The locking script of the UTXO (the TXID:VOUT the input is pointing at)
  // - amount           --> The amount of sats locked in the output tx reference
  // - privateKey       --> The private key used to lock the UTXO
  // - publicKey        --> The public key used to lock the UTXO
  function signSegWitTx(tx, inputInd, utxoScriptPubKey, amount, privateKey, publicKey) {
    const version = '02000000';
    const inputsHash = hashes.hash256(tx.inputs.map(i => format(i.txid, 'hex', 'rev', 64) + format(i.vout, 'dec', 'lie')).join(''));
    const seqsHash   = hashes.hash256(tx.inputs.map(i => i.sequence).join(''));
    const inputTxIdVout = format(tx.inputs[inputInd].txid, 'hex', 'rev', 64) + format(tx.inputs[inputInd].vout, 'dec', 'lie');
    const pubKeyHash = utxoScriptPubKey.slice(4).padStart(20, '0');
    const scriptcode = `1976a914${pubKeyHash}88ac`;
    const amountRaw = format(amount, 'dec', 'lie', 16);
    const sequence = 'ffffffff';
    const outputsHash = hashes.hash256(tx.outputs.map(o => {
      return format(o.amount, 'dec', 'lie', 16) + format(Math.ceil(o.scriptPubKey.length / 2), 'dec', 'com') + o.scriptPubKey;
    }).join(''));
    const locktime = '00000000';
    const SIGHASH_ALL = '01000000';
    
    const preimage = version + inputsHash + seqsHash + inputTxIdVout + scriptcode + amountRaw + sequence + outputsHash + locktime + SIGHASH_ALL;
    const txDataHash = hashes.hash256(preimage);
    
    // const sigArr = ecdsa.sign(txDataHash, privateKey, BigInt(format('75bcd15', 'hex', 'dec'))); // <---- THIS IS JUST FOR TESTING, REMOVE IT !!!!!!!!!
    const sigArr = ecdsa.sign(txDataHash, privateKey);
    
    // Sanity check, to verify the signature has no errors
    const validSignature = ecdsa.verifySig(txDataHash, sigArr, publicKey);
    if (!validSignature) { console.error(`Error signing the transaction: invalid signature:`, sigArr); }
    
    const derSig = format(sigArr, 'sig', 'der'); // DER Encode
    const signature = derSig + '01'; // Add sighash SIGHASH_ALL = 01

    return signature;
  }


  // Given a locking script, try to determine what standard it is (P2PK, P2PKH, P2MS, P2SH...)
  function guessLockScript(scriptPubKey) {
    scriptPubKey = scriptPubKey.toLowerCase();
    const byte1 = scriptPubKey.slice(0, 2);
    const byte2 = scriptPubKey.slice(2, 4);
    const isPushOp = (hex) => Number('0x' + hex) <= 75;
    const isOpNum = (hex) => Number('0x' + hex) >= 81 && Number('0x' + hex) <= 96; // 0x51 - 0x60

    const OP_DUP = opCodeToHex('OP_DUP');                     // 0x76
    const OP_HASH160 = opCodeToHex('OP_HASH160');             // 0xa9
    const OP_CHECKSIG = opCodeToHex('OP_CHECKSIG');           // 0xac
    const OP_EQUALVERIFY = opCodeToHex('OP_EQUALVERIFY');     // 0x88
    const OP_EQUAL = opCodeToHex('OP_EQUAL');                 // 0x87
    const OP_CHECKMULTISIG = opCodeToHex('OP_CHECKMULTISIG'); // 0xae
    const OP_RETURN = opCodeToHex('OP_RETURN');               // 0x6a
    const OP_0 = opCodeToHex('OP_0');                         // 0x00
    const OP_PUSHBYTES_20 = opCodeToHex('OP_PUSHBYTES_20');   // 0x14
    const OP_PUSHBYTES_32 = opCodeToHex('OP_PUSHBYTES_32');   // 0x20

    // P2PK ---> OP_PUSHBYTES_XX + ... + OP_CHECKSIG
    if (isPushOp(byte1) && scriptPubKey.slice(-2) === 'ac') { return 'P2PK'; }

    // P2PKH --> OP_DUP + OP_HASH160 + ... + OP_EQUALVERIFY + OP_CHECKSIG
    if (byte1 === '76' && byte2 === 'a9' && scriptPubKey.slice(-4) === '88ac') { return 'P2PKH'; }

    // P2MS --> OP_[M] + OP_PUSHBYTES_XX ... + OP_CHECKMULTISIG
    if (isOpNum(byte1) && isPushOp(byte2) && scriptPubKey.slice(-2) === 'ae') { return 'P2PKH'; }

    // P2SH --> OP_HASH160 + OP_PUSHBYTES_XX ... + OP_EQUAL
    if (byte1 === 'a9' && isPushOp(byte2) && scriptPubKey.slice(-2) === '87') { return 'P2SH'; }

    // OP_RETURN (data storing)
    if (byte1 === '6a') { return 'OP_RETURN'; }

    // P2WPKH --> OP_0 + OP_PUSHBYTES_20
    if (byte1 === '00' && byte2 === '14') { return 'P2WPKH'; }

    // P2WSH --> OP_0 + OP_PUSHBYTES_32
    if (byte1 === '00' && byte2 === '20') { return 'P2WSH'; }

    return '???';
  }

  // Given a locking script, validate if the private key can unlock it
  function validateUnlockingKey(utxoScriptPubKey, privateKey) {
    const scriptName = guessLockScript(utxoScriptPubKey); // Try to guess what is the locking script
    const wallet = btcWallet.create(privateKey);
    if (scriptName === 'P2PK') {
      const pubKey = utxoScriptPubKey.slice(0, -2);
      if (pubKey !== wallet.publicKey) {
        console.error(`You are trying to sing a UTXO with the wrong Private Key. Your public key (${wallet.publicKey}) does not match the tx's (${pubKey})`);
        return false;
      }
    }
    if (scriptName === 'P2PKH') {
      const pubKeyHash = utxoScriptPubKey.slice(6, -4);
      if (pubKeyHash !== wallet.pubKeyHash) {
        console.error(`You are trying to sing a UTXO with the wrong Private Key. Your public key hash (${wallet.pubKeyHash}) does not match the tx's (${pubKeyHash})`);
        return false;
      }
    }
    if (scriptName === 'P2MS') { /* TODO */ }
    if (scriptName === 'P2SH') { /* TODO */ }

    if (scriptName === 'OP_RETURN') {
      console.error(`You are trying to sing a UTXO with OP_RETURN. That is impossible`);
      return false;
    }
    return scriptName;
  }

  // Generates the P2PK locking script
  function lock_P2PK_Script(publicKey) {
    // OP_PUSHBYTES_20 <pubKey>
    // OP_CHECKSIG
    const publicKeySize = Math.ceil(publicKey.length / 2);
    let script = '';
    script += opCodeToHex('OP_PUSHBYTES_' + publicKeySize) + publicKey;
    script += opCodeToHex('OP_CHECKSIG');
    return script.toLowerCase();
  }

  // Generates the P2PKH locking script
  function lock_P2PKH_Script(btcAddress) { // btc address starting with "1"
    // OP_DUP
    // OP_HASH160
    // OP_PUSHBYTES_20 <pubKeyHash>
    // OP_EQUALVERIFY
    // OP_CHECKSIG
    // const pubKeyHash = hashes.hash160(publicKey);
    // const pubKeyHash = addressToHash(btcAddress);
    const pubKeyHash = btcWallet.addressToHash(btcAddress);
    const pubKeyHashSize = Math.ceil(pubKeyHash.length / 2);
    let script = opCodeToHex('OP_DUP');
    script += opCodeToHex('OP_HASH160');
    script += opCodeToHex('OP_PUSHBYTES_' + pubKeyHashSize) + pubKeyHash;
    script += opCodeToHex('OP_EQUALVERIFY');
    script += opCodeToHex('OP_CHECKSIG');
    return script.toLowerCase(); // "76a914b3e2819b6262e0b1f19fc7229d75677f347c91ac88ac"
  }

  // Generates the P2WPKH locking script
  function lock_P2WPKH_Script(btcAddress) { // btc address starting with "bc1"
    // OP_0
    // OP_PUSHBYTES_20 <pubKeyHash>
    const pubKeyHash = btcWallet.addressToHash(btcAddress);
    const pubKeyHashSize = Math.ceil(pubKeyHash.length / 2);
    let script = opCodeToHex('OP_0');
    script += opCodeToHex('OP_PUSHBYTES_' + pubKeyHashSize) + pubKeyHash;
    return script.toLowerCase(); // "0014aa966f56de599b4094b61aa68a2b3df9e97e9c48"
  }

  // Generates the P2SH locking script
  function lock_P2SH_Script(scriptHash) { // btc address starting with "3v"
    // OP_HASH160
    // OP_PUSHBYTES_20 <redeem script hash>
    // OP_EQUAL
    const hashSize = Math.ceil(scriptHash.length / 2); // should be always 20 bytes
    let script = opCodeToHex('OP_HASH160');
    script += opCodeToHex('OP_PUSHBYTES_' + hashSize) + scriptHash;
    script += opCodeToHex('OP_EQUAL');
    return script.toLowerCase(); // "3NffdLiEwqhMGXzuZvSQk2Qi9MMVRAugPV"
  }

  // Generates the P2WSH locking script
  function lock_P2WSH_Script(scriptHash) { // btc address starting with "bc1"
    // OP_0 
    // OP_PUSHBYTES_32 <witness script hash>
    const hashSize = Math.ceil(scriptHash.length / 2); // should be always 32 bytes
    let script = opCodeToHex('OP_0');
    script += opCodeToHex('OP_PUSHBYTES_' + hashSize) + scriptHash;
    return script.toLowerCase(); // ""
  }

  // Generates the OP_RETURN locking script to add data
  function lockDataScript(dataHex) {
    // OP_RETURN
    // OP_PUSHBYTES_XX <data>
    const dataSize = Math.ceil(dataHex.length / 2);
    let script = opCodeToHex('OP_RETURN');
    script += opCodeToHex('OP_PUSHBYTES_' + dataSize) + dataHex;
    return script.toLowerCase();
  }

  // Generates the unlocking script for P2PK, to be added into a input.scriptSig
  function unlockP2PKScript(signature) {
    // OP_PUSHBYTES_72 <signature> 
    const sigSize = Math.ceil(signature.length / 2);
    let scriptSig = opCodeToHex('OP_PUSHBYTES_' + sigSize);
    scriptSig += signature.padStart(sigSize * 2, '0');
    return scriptSig;
  }

  // Generates the unlocking script for P2PKH, to be added into a input.scriptSig
  function unlockP2PKHScript(signature, publicKey) {
    // OP_PUSHBYTES_72 <signature> 
    // OP_PUSHBYTES_65 <publicKey>
    const sigSize = Math.ceil(signature.length / 2);
    const pubKeySize = Math.ceil(publicKey.length / 2);
    let scriptSig = opCodeToHex('OP_PUSHBYTES_' + sigSize);
    scriptSig += signature.padStart(sigSize * 2, '0');
    scriptSig += opCodeToHex('OP_PUSHBYTES_' + pubKeySize);
    scriptSig += publicKey.padStart(pubKeySize * 2, '0');  
    return scriptSig;
  }


  // It returns a human-readable version of an encoded script, in a string array
  function translateScript(scriptHex) {
    const script = [];
    const raw = scriptHex.toUpperCase();

    // helpers to de-serialize
    const bytesArr = raw.split('').map((c,i) => (i%2 ? '' : '-') + c).join('').slice(1).split('-');
    const getNext = (numBytes = 1) => { r = ''; for (let t=0; t<numBytes; t++) { r += bytesArr.shift(); }; return r; }

    let max = 1000;
    while (bytesArr.length > 0 && --max > 0) {
      const opHex = getNext();
      const op = hexToOpCode(opHex);
      script.push(op);
      if (op.split('_')[1] === 'PUSHBYTES') {
        const bytes = Number(op.split('_')[2]);
        const data = getNext(bytes);
        script.push(data.toLowerCase());
      }
    }
    return script;
  }



  function hexToOpCode(hex) { return Object.keys(OP_CODES).find(key => OP_CODES[key] === hex) || ''; }
  function opCodeToHex(opCode) { return OP_CODES[opCode]; }
  const OP_CODES = {
    'OP_NOP'      : '61',
    'OP_IF'       : '63',
    'OP_NOTIF'    : '64',
    'OP_ELSE'     : '67',
    'OP_ENDIF'    : '68',
    'OP_VERIFY'   : '69',
    'OP_RETURN'   : '6A',
    'OP_SIZE'     : '82',
    'OP_CAT'      : '7E',
    'OP_EQUAL'    : '87',
    'OP_EQUALVERIFY'          : '88',
    'OP_CHECKLOCKTIMEVERIFY'  : 'B1',
    'OP_CHECKSEQUENCEVERIFY'  : 'B2',
    'OP_0'                    : '00',
    'OP_FALSE'                : '00',
    'OP_1NEGATE'              : '4F',
    'OP_TRUE'                 : '51',
    'OP_1' : '51', 'OP_2' : '52', 'OP_3' : '53', 'OP_4' : '54',
    'OP_5' : '55', 'OP_6' : '56', 'OP_7' : '57', 'OP_8' : '58',
    'OP_9' : '59', 'OP_10': '5A', 'OP_11': '5B', 'OP_12': '5C',
    'OP_13': '5D', 'OP_14': '5E', 'OP_15': '5F', 'OP_16': '60',
    'OP_PUSHBYTES_1'  : '01', 'OP_PUSHBYTES_2'  : '02', 'OP_PUSHBYTES_3'  : '03', 'OP_PUSHBYTES_4'  : '04',
    'OP_PUSHBYTES_5'  : '05', 'OP_PUSHBYTES_6'  : '06', 'OP_PUSHBYTES_7'  : '07', 'OP_PUSHBYTES_8'  : '08',
    'OP_PUSHBYTES_9'  : '09', 'OP_PUSHBYTES_10' : '0A', 'OP_PUSHBYTES_11' : '0B', 'OP_PUSHBYTES_12' : '0C',
    'OP_PUSHBYTES_13' : '0D', 'OP_PUSHBYTES_14' : '0E', 'OP_PUSHBYTES_15' : '0F', 'OP_PUSHBYTES_16' : '10',
    'OP_PUSHBYTES_17' : '11', 'OP_PUSHBYTES_18' : '12', 'OP_PUSHBYTES_19' : '13', 'OP_PUSHBYTES_20' : '14',
    'OP_PUSHBYTES_21' : '15', 'OP_PUSHBYTES_22' : '16', 'OP_PUSHBYTES_23' : '17', 'OP_PUSHBYTES_24' : '18',
    'OP_PUSHBYTES_25' : '19', 'OP_PUSHBYTES_26' : '1A', 'OP_PUSHBYTES_27' : '1B', 'OP_PUSHBYTES_28' : '1C',
    'OP_PUSHBYTES_29' : '1D', 'OP_PUSHBYTES_30' : '1E', 'OP_PUSHBYTES_31' : '1F', 'OP_PUSHBYTES_32' : '20',
    'OP_PUSHBYTES_33' : '21', 'OP_PUSHBYTES_34' : '22', 'OP_PUSHBYTES_35' : '23', 'OP_PUSHBYTES_36' : '24',
    'OP_PUSHBYTES_37' : '25', 'OP_PUSHBYTES_38' : '26', 'OP_PUSHBYTES_39' : '27', 'OP_PUSHBYTES_40' : '28',
    'OP_PUSHBYTES_41' : '29', 'OP_PUSHBYTES_42' : '2A', 'OP_PUSHBYTES_43' : '2B', 'OP_PUSHBYTES_44' : '2C',
    'OP_PUSHBYTES_45' : '2D', 'OP_PUSHBYTES_46' : '2E', 'OP_PUSHBYTES_47' : '2F', 'OP_PUSHBYTES_48' : '30',
    'OP_PUSHBYTES_49' : '31', 'OP_PUSHBYTES_50' : '32', 'OP_PUSHBYTES_51' : '33', 'OP_PUSHBYTES_52' : '34',
    'OP_PUSHBYTES_53' : '35', 'OP_PUSHBYTES_54' : '36', 'OP_PUSHBYTES_55' : '37', 'OP_PUSHBYTES_56' : '38',
    'OP_PUSHBYTES_57' : '39', 'OP_PUSHBYTES_58' : '3A', 'OP_PUSHBYTES_59' : '3B', 'OP_PUSHBYTES_60' : '3C',
    'OP_PUSHBYTES_61' : '3D', 'OP_PUSHBYTES_62' : '3E', 'OP_PUSHBYTES_63' : '3F', 'OP_PUSHBYTES_64' : '40',
    'OP_PUSHBYTES_65' : '41', 'OP_PUSHBYTES_66' : '42', 'OP_PUSHBYTES_67' : '43', 'OP_PUSHBYTES_68' : '44',
    'OP_PUSHBYTES_69' : '45', 'OP_PUSHBYTES_70' : '46', 'OP_PUSHBYTES_71' : '47', 'OP_PUSHBYTES_72' : '48',
    'OP_PUSHBYTES_73' : '49', 'OP_PUSHBYTES_74' : '4A', 'OP_PUSHBYTES_75' : '4B',
    'OP_PUSHDATA1'    : '4C', 'OP_PUSHDATA2'    : '4D', 'OP_PUSHDATA4'    : '4E',
    'OP_TOALTSTACK'          : '6B', 'OP_FROMALTSTACK'    : '6C',
    'OP_IFDUP'               : '73', 'OP_DEPTH'           : '75', 'OP_DROP'           : '57',
    'OP_DUP'                 : '76', 'OP_NIP'             : '77', 'OP_OVER'           : '78',
    'OP_PICK'                : '79', 'OP_ROLL'            : '7A', 'OP_ROT'            : '7B',
    'OP_SWAP'                : '7C', 'OP_TUCK'            : '7D', 'OP_2DROP'          : '6D',
    'OP_2DUP'                : '6E', 'OP_3DUP'            : '6F', 'OP_2OVER'          : '70',
    'OP_2ROT'                : '71', 'OP_2SWAP'           : '72', 
    'OP_1ADD'                : '8B', 'OP_1SUB'            : '8C', 'OP_NEGATE'         : '8F',
    'OP_ABS'                 : '90', 'OP_NOT'             : '91', 'OP_0NOTEQUAL'      : '92',
    'OP_ADD'                 : '93', 'OP_SUB'             : '94', 'OP_BOOLAND'        : '9A',
    'OP_BOOLOR'              : '9B', 'OP_NUMEQUAL'        : '9C',
    'OP_NUMEQUALVERIFY'      : '9D', 'OP_NUMNOTEQUAL'     : '9E', 'OP_LESSTHAN'       : '9F',
    'OP_GREATERTHAN'         : 'A0', 'OP_LESSTHANOREQUAL' : 'A1', 'OP_GREATERTHANOREQUAL' : 'A2',
    'OP_MIN'                 : 'A3', 'OP_MAX'             : 'A4', 'OP_WITHIN'         : 'A5',
    'OP_RIPEMD160'           : 'A6', 'OP_SHA1'            : 'A7', 'OP_SHA256'         : 'A8',
    'OP_HASH160'             : 'A9', 'OP_HASH256'         : 'AA', 'OP_CODESEPARATOR'  : 'AB',
    'OP_CHECKSIG'            : 'AC', 'OP_CHECKSIGVERIFY'  : 'AD', 'OP_CHECKMULTISIG'  : 'AE',
    'OP_CHECKMULTISIGVERIFY' : 'AF', 'OP_CHECKSIGADD'     : 'BA',
  };

  tests();

  return {
    create,
    loadFromRaw,
    guessLockScript,
    validateUnlockingKey,
    translateScript,
  };

  function tests() {
    console.log(translateScript('0014aa966f56de599b4094b61aa68a2b3df9e97e9c48'));
    console.log(translateScript('76a914ce72abfd0e6d9354a660c18f2825eb392f060fdc88ac'));


    // Legacy TX Test: Unlock a P2PKH and lock it to a P2PKH
    const utxo1 = {
      txid: '4ba5cfbbeb418055e412682dddb01ccec683a80dd9e12792a273f3b20d4a99b7', vout: 0, 
      amount: 20000, scriptPubKey: '76a9144299ff317fcd12ef19047df66d72454691797bfc88ac',
      privateKey: 'f94a840f1e1a901843a75dd07ffcc5c84478dc4f987797474c9393ac53ab55e6',  // Key used to lock the UTXO
      publicKey: '024aeaf55040fa16de37303d13ca1dde85f4ca9baa36e2963a27a1c0c1165fe2b1', // Key used to lock the UTXO
    };
    const tx1 = create();
    tx1.addOutput('P2PKH', 15000, '1HQ9JGeF1X3HWWJYF3cyYFBuQWpmb1hJkN'); // output to a new btc legacy address
    let input1 = tx1.addInput(utxo1.txid, utxo1.vout);
    input1.sign(utxo1, utxo1.privateKey); // unlock the UTXO
    // We can't test this unless we fix the signature, due to sign random k
    tx1.inputs[0].scriptSig = '473044022008f4f37e2d8f74e18c1b8fde2374d5f28402fb8ab7fd1cc5b786aa40851a70cb02201f40afd1627798ee8529095ca4b2'
                            + '05498032315240ac322c9d8ff0f205a93a580121024aeaf55040fa16de37303d13ca1dde85f4ca9baa36e2963a27a1c0c1165fe2b1';
    tx1.refreshTxId();
    const rawTx1 = '0100000001b7994a0db2f373a29227e1d90da883c6ce1cb0dd2d6812e4558041ebbbcfa54b000000006a473044022008f4f37e2d8f74e18c1b8fde2374d5f28402fb8ab7fd1cc5b786aa40851a70cb02201f40afd1627798ee8529095ca4b205498032315240ac322c9d8ff0f205a93a580121024aeaf55040fa16de37303d13ca1dde85f4ca9baa36e2963a27a1c0c1165fe2b1ffffffff01983a0000000000001976a914b3e2819b6262e0b1f19fc7229d75677f347c91ac88ac00000000';
    if (tx1.getRawTx() !== rawTx1) { console.error(`Error: Wrong tx data`, tx1.getRawTx()); }
    if (tx1.txId !== '1d5308ff12cb6fdb670c3af673a6a1317e21fa14fc863d5827f9d704cd5e14dc') { console.error(`Error: Wrong TXID:`, tx1.txId); }

    // Legacy TX Test: Unlock a P2PKH and lock it to a P2KH + OP_RETURN
    const tx2 = create();
    const msgHex = encoders.format('Joel Barba understands Bitcoin!', 'str', 'hex');
    tx2.addOutput('P2PK', 8000, '024aeaf55040fa16de37303d13ca1dde85f4ca9baa36e2963a27a1c0c1165fe2b1'); // output to a public key
    tx2.addOutput('OP_RETURN', 0, msgHex);
    tx2.addInput(utxo1.txid, utxo1.vout).sign(utxo1, utxo1.privateKey); // unlock the UTXO
    // We can't test this unless we fix the signature, due to sign random k
    tx2.inputs[0].scriptSig = '473044022008f4f37e2d8f74e18c1b8fde2374d5f28402fb8ab7fd1cc5b786aa40851a70cb0220386d1fc238f74ad13bcf2803fd09'
                            + '7569629afb6f3e543395c7359c7773f8c5940121024aeaf55040fa16de37303d13ca1dde85f4ca9baa36e2963a27a1c0c1165fe2b1';
    tx2.refreshTxId();
    if (tx2.txId !== 'ce39a8cab582ab20b38512807b6503919a32324e9e0e6a82aa4f16cde6c39df1') { console.error(`Error: Wrong TXID:`, tx2.txId); }
    // console.log(tx2.getRawTx());

    // SegWit Tx Test: Unlock a P2WPKH and lock it to a P2PKH
    const utxo2 = {
      txid: '6ae73833e5f58616445bfe35171e89b23c5b59ef585637537f6ba34a019449ac', vout: 1, 
      amount: 30000, scriptPubKey: '0014aa966f56de599b4094b61aa68a2b3df9e97e9c48',
      privateKey: '7306f5092467981e66eff98b6b03bfe925922c5ecfaf14c4257ef18e81becf1f',  // Key used to lock the UTXO
      publicKey: '03eed0d937090cae6ffde917de8a80dc6156e30b13edd5e51e2e50d52428da1c87', // Key used to lock the UTXO
    };
    const tx3 = create();
    tx3.addOutput('P2PKH', 20000, '1Kpba4DhuggSnjCs5aVMVUnwzMqt6ubrwe'); // output to a new legacy address
    tx3.addInput(utxo2.txid, utxo2.vout).sign(utxo2, utxo2.privateKey); // unlock the segwit UTXO    
    // We can't test this unless we fix the signature, due to sign random k
    tx3.witness[0] = '3044022008f4f37e2d8f74e18c1b8fde2374d5f28402fb8ab7fd1cc5b786aa40851a70cb022032b1374d1a0f125eae4f69d1bc0b7f896c964cfdba329f38a952426cf427484c01';
    tx3.refreshTxId();
    const rawTx3 = '02000000000101ac4994014aa36b7f53375658ef595b3cb2891e1735fe5b441686f5e53338e76a0100000000ffffffff01204e0000000000001976a914ce72abfd0e6d9354a660c18f2825eb392f060fdc88ac02473044022008f4f37e2d8f74e18c1b8fde2374d5f28402fb8ab7fd1cc5b786aa40851a70cb022032b1374d1a0f125eae4f69d1bc0b7f896c964cfdba329f38a952426cf427484c012103eed0d937090cae6ffde917de8a80dc6156e30b13edd5e51e2e50d52428da1c8700000000';
    if (tx3.getRawTx() !== rawTx3) { console.error(`Error: Wrong tx data`, tx3.getRawTx()); }
    if (tx3.txId !== '04f7bc0296fe70799762e628445fa9f0ccc2a2646ee5b369047d86ff964bd74e') { console.error(`Error: Wrong TXID:`, tx3.txId); }

    // SegWit Tx Test: Unlock a P2WPKH and lock it to a P2WPKH
    const tx4 = create();
    tx4.addOutput('P2PKH', 12000, 'bc1q9jr0vn8nsahtxpxdq4f9r03y5gf3hd5l0lkjx6'); // output to a new segwit address
    tx4.addInput(utxo2.txid, utxo2.vout).sign(utxo2, utxo2.privateKey); // unlock the segwit UTXO
    // We can't test this unless we fix the signature, due to sign random k
    tx4.witness[0] = '3044022008f4f37e2d8f74e18c1b8fde2374d5f28402fb8ab7fd1cc5b786aa40851a70cb022032b1374d1a0f125eae4f69d1bc0b7f896c964cfdba329f38a952426cf427484c01';
    tx4.refreshTxId();
    const rawTx4 = '02000000000101ac4994014aa36b7f53375658ef595b3cb2891e1735fe5b441686f5e53338e76a0100000000ffffffff01e02e0000000000001976a9142c86f64cf3876eb304cd055251be24a2131bb69f88ac02473044022008f4f37e2d8f74e18c1b8fde2374d5f28402fb8ab7fd1cc5b786aa40851a70cb022032b1374d1a0f125eae4f69d1bc0b7f896c964cfdba329f38a952426cf427484c012103eed0d937090cae6ffde917de8a80dc6156e30b13edd5e51e2e50d52428da1c8700000000';
    if (tx4.getRawTx() !== rawTx4) { console.error(`Error: Wrong tx data`, tx4.getRawTx()); }
    if (tx4.txId !== '14ac2a58bc7e094d01314974489eaa3da8693aee4eb51b9af93d860d0b2e478a') { console.error(`Error: Wrong TXID:`, tx4.txId); }
  }

}());




