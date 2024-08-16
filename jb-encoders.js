const encoders = (function() {
  return { format };

  /********************************************************
   * Converts "value" from "ori" format to "des" format.
   * Possible formats:
   *  - bin = binary (string of 0s 1s)
   *  - dec = decimal (BigInt)
   *  - hex = hexadecimal (string FF=1byte)
   *  - b58 = base58
   *  - str = plain text string
   ********************************************************/
  function format(value, ori = 'dec', des = 'bin') {  
    if (ori === 'dec' && des === 'bin') { return BigInt(value).toString(2); }
    if (ori === 'hex' && des === 'bin') { return BigInt('0x' + value).toString(2); }

    if (ori === 'hex' && des === 'dec') { return Number(BigInt('0x' + value)); }
    if (ori === 'bin' && des === 'dec') { return Number(BigInt('0b' + value)); }

    if (ori === 'dec' && des === 'hex') { return BigInt(value).toString(16); }
    if (ori === 'bin' && des === 'hex') { return BigInt('0b' + value).toString(16); }

    if (ori === 'hex' && des === 'b58') { return hexToBase58(value); }
    if (ori === 'b58' && des === 'hex') { return base58ToHex(value); }

    if (ori === 'str' && des === 'hex') { return textToHex(value); }
    if (ori === 'hex' && des === 'str') { return hexToText(value); }

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

}());


