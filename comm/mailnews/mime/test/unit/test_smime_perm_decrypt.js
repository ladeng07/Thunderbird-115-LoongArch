/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests to ensure signed and/or encrypted S/MIME messages are
 * processed correctly, and the signature status is treated as good
 * or bad as expected.
 */

var { MessageInjection } = ChromeUtils.import(
  "resource://testing-common/mailnews/MessageInjection.jsm"
);
var { PromiseTestUtils } = ChromeUtils.import(
  "resource://testing-common/mailnews/PromiseTestUtils.jsm"
);
var { PromiseUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/PromiseUtils.sys.mjs"
);
var { SmimeUtils } = ChromeUtils.import(
  "resource://testing-common/mailnews/smimeUtils.jsm"
);
const { EnigmailPersistentCrypto } = ChromeUtils.import(
  "chrome://openpgp/content/modules/persistentCrypto.jsm"
);
var { setTimeout } = ChromeUtils.importESModule(
  "resource://gre/modules/Timer.sys.mjs"
);

let gCertValidityResult = 0;

/**
 * @implements nsICertVerificationCallback
 */
class CertVerificationResultCallback {
  constructor(callback) {
    this.callback = callback;
  }
  verifyCertFinished(prErrorCode, verifiedChain, hasEVPolicy) {
    gCertValidityResult = prErrorCode;
    this.callback();
  }
}

function testCertValidity(cert, date) {
  let prom = new Promise((resolve, reject) => {
    const certificateUsageEmailRecipient = 0x0020;
    let result = new CertVerificationResultCallback(resolve);
    let flags = Ci.nsIX509CertDB.FLAG_LOCAL_ONLY;
    const certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
      Ci.nsIX509CertDB
    );
    certdb.asyncVerifyCertAtTime(
      cert,
      certificateUsageEmailRecipient,
      flags,
      "Alice@example.com",
      date,
      result
    );
  });
  return prom;
}

add_setup(async function () {
  let messageInjection = new MessageInjection({ mode: "local" });
  gInbox = messageInjection.getInboxFolder();
  SmimeUtils.ensureNSS();

  SmimeUtils.loadPEMCertificate(
    do_get_file(smimeDataDirectory + "TestCA.pem"),
    Ci.nsIX509Cert.CA_CERT
  );
  SmimeUtils.loadCertificateAndKey(
    do_get_file(smimeDataDirectory + "Alice.p12"),
    "nss"
  );
  SmimeUtils.loadCertificateAndKey(
    do_get_file(smimeDataDirectory + "Bob.p12"),
    "nss"
  );
});

var gInbox;

var smimeDataDirectory = "../../../data/smime/";

let smimeHeaderSink = {
  expectResults(maxLen) {
    // dump("Restarting for next test\n");
    this._deferred = PromiseUtils.defer();
    this._expectedEvents = maxLen;
    this.countReceived = 0;
    this._results = [];
    this.haveSignedBad = false;
    this.haveEncryptionBad = false;
    this.resultSig = null;
    this.resultEnc = null;
    this.resultSigFirst = undefined;
    return this._deferred.promise;
  },
  signedStatus(aNestingLevel, aSignedStatus, aSignerCert) {
    console.log("signedStatus " + aSignedStatus + " level " + aNestingLevel);
    // dump("Signed message\n");
    Assert.equal(aNestingLevel, 1);
    if (!this.haveSignedBad) {
      // override with newer allowed
      this.resultSig = {
        type: "signed",
        status: aSignedStatus,
        certificate: aSignerCert,
      };
      if (aSignedStatus != 0) {
        this.haveSignedBad = true;
      }
      if (this.resultSigFirst == undefined) {
        this.resultSigFirst = true;
      }
    }
    this.countReceived++;
    this.checkFinished();
  },
  encryptionStatus(aNestingLevel, aEncryptedStatus, aRecipientCert) {
    console.log(
      "encryptionStatus " + aEncryptedStatus + " level " + aNestingLevel
    );
    // dump("Encrypted message\n");
    Assert.equal(aNestingLevel, 1);
    if (!this.haveEncryptionBad) {
      // override with newer allowed
      this.resultEnc = {
        type: "encrypted",
        status: aEncryptedStatus,
        certificate: aRecipientCert,
      };
      if (aEncryptedStatus != 0) {
        this.haveEncryptionBad = true;
      }
      if (this.resultSigFirst == undefined) {
        this.resultSigFirst = false;
      }
    }
    this.countReceived++;
    this.checkFinished();
  },
  checkFinished() {
    if (this.countReceived == this._expectedEvents) {
      if (this.resultSigFirst) {
        if (this.resultSig) {
          this._results.push(this.resultSig);
        }
        if (this.resultEnc) {
          this._results.push(this.resultEnc);
        }
      } else {
        if (this.resultEnc) {
          this._results.push(this.resultEnc);
        }
        if (this.resultSig) {
          this._results.push(this.resultSig);
        }
      }
      this._deferred.resolve(this._results);
    }
  },
  QueryInterface: ChromeUtils.generateQI(["nsIMsgSMIMEHeaderSink"]),
};

/**
 * Note on FILENAMES taken from the NSS test suite:
 * - env: CMS enveloped (encrypted)
 * - dsig: CMS detached signature (with multipart MIME)
 * - sig: CMS opaque signature (content embedded inside signature)
 * - bad: message text does not match signature
 * - mismatch: embedded content is different
 *
 * Control variables used for checking results:
 * - env: If true, we expect a report to encryptionStatus() that message
 *        is encrypted.
 */

var gMessages = [{ filename: "alice.env.eml", enc: true }];

var gDecFolder;

add_task(async function copy_messages() {
  for (let msg of gMessages) {
    let promiseCopyListener = new PromiseTestUtils.PromiseCopyListener();

    MailServices.copy.copyFileMessage(
      do_get_file(smimeDataDirectory + msg.filename),
      gInbox,
      null,
      true,
      0,
      "",
      promiseCopyListener,
      null
    );

    await promiseCopyListener.promise;
    promiseCopyListener = null;
  }
  gInbox.server.rootFolder.createSubfolder("decrypted", null);
  gDecFolder = gInbox.server.rootFolder.getChildNamed("decrypted");
});

add_task(async function check_smime_message() {
  let hdrIndex = 0;

  for (let msg of gMessages) {
    console.log("checking " + msg.filename);

    let numExpected = 1;

    let eventsExpected = numExpected;

    let hdr = mailTestUtils.getMsgHdrN(gInbox, hdrIndex);
    let uri = hdr.folder.getUriForMsg(hdr);
    let sinkPromise = smimeHeaderSink.expectResults(eventsExpected);

    let conversion = apply_mime_conversion(uri, smimeHeaderSink);
    await conversion.promise;

    let contents = conversion._data;
    // dump("contents: " + contents + "\n");

    // Check that we're also using the display output.
    Assert.ok(contents.includes("<html>"));

    await sinkPromise;

    let r = smimeHeaderSink._results;
    Assert.equal(r.length, numExpected);

    if (msg.enc) {
      Assert.equal(r[0].type, "encrypted");
      Assert.equal(r[0].status, 0);
      Assert.equal(r[0].certificate, null);
    }

    await EnigmailPersistentCrypto.cryptMessage(
      hdr,
      gDecFolder.URI,
      false,
      null
    );

    eventsExpected = 0;

    hdr = mailTestUtils.getMsgHdrN(gDecFolder, hdrIndex);
    uri = hdr.folder.getUriForMsg(hdr);
    sinkPromise = smimeHeaderSink.expectResults(eventsExpected);

    conversion = apply_mime_conversion(uri, smimeHeaderSink);
    await conversion.promise;

    contents = conversion._data;
    // dump("contents: " + contents + "\n");

    // Check that we're also using the display output.
    Assert.ok(contents.includes("<html>"));

    // A message without S/MIME content didn't produce any events,
    // so we must manually force this check.
    smimeHeaderSink.checkFinished();
    await sinkPromise;

    // If the result length is 0, it wasn't decrypted.
    Assert.equal(smimeHeaderSink._results.length, 0);

    hdrIndex++;
  }
});
