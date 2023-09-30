/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const EXPORTED_SYMBOLS = ["MailStringUtils"];

var MailStringUtils = {
  /**
   * Convert a ByteString to a Uint8Array.
   *
   * @param {ByteString} str - The input string.
   * @returns {Uint8Array} The output Uint8Array.
   */
  byteStringToUint8Array(str) {
    let arr = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      arr[i] = str.charCodeAt(i);
    }
    return arr;
  },

  /**
   * Convert a Uint8Array to a ByteString.
   *
   * @param {Uint8Array} arr - The input Uint8Array.
   * @returns {ByteString} The output string.
   */
  uint8ArrayToByteString(arr) {
    let str = "";
    for (let i = 0; i < arr.length; i += 65536) {
      str += String.fromCharCode.apply(null, arr.subarray(i, i + 65536));
    }
    return str;
  },

  /**
   * Convert a ByteString to a string.
   *
   * @param {ByteString} str - The ByteString to convert.
   * @returns {string} The converted string.
   */
  byteStringToString(str) {
    return new TextDecoder().decode(this.byteStringToUint8Array(str));
  },

  /**
   * Convert a string to a ByteString.
   *
   * @param {string} str - The string to convert.
   * @returns {ByteString} The converted ByteString.
   */
  stringToByteString(str) {
    return this.uint8ArrayToByteString(new TextEncoder().encode(str));
  },

  /**
   * Detect the text encoding of a ByteString.
   *
   * @param {ByteString} str - The input string.
   * @returns {string} The output charset name.
   */
  detectCharset(str) {
    // Check the BOM.
    let charset = "";
    if (str.length >= 2) {
      let byte0 = str.charCodeAt(0);
      let byte1 = str.charCodeAt(1);
      let byte2 = str.charCodeAt(2);
      if (byte0 == 0xfe && byte1 == 0xff) {
        charset = "UTF-16BE";
      } else if (byte0 == 0xff && byte1 == 0xfe) {
        charset = "UTF-16LE";
      } else if (byte0 == 0xef && byte1 == 0xbb && byte2 == 0xbf) {
        charset = "UTF-8";
      }
    }
    if (charset) {
      return charset;
    }

    // Use mozilla::EncodingDetector.
    let compUtils = Cc[
      "@mozilla.org/messengercompose/computils;1"
    ].createInstance(Ci.nsIMsgCompUtils);
    return compUtils.detectCharset(str);
  },

  /**
   * Read and detect the charset of a file, then convert the file content to
   * DOMString. If you're absolutely sure it's a UTF-8 encoded file, use
   * IOUtils.readUTF8 instead.
   *
   * @param {string} path - An absolute file path.
   * @returns {DOMString} The file content.
   */
  async readEncoded(path) {
    let arr = await IOUtils.read(path);
    let str = this.uint8ArrayToByteString(arr);
    let charset = this.detectCharset(str);
    return new TextDecoder(charset).decode(arr);
  },
};
