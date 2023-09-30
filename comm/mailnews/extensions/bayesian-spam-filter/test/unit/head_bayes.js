var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);
var { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);
var { mailTestUtils } = ChromeUtils.import(
  "resource://testing-common/mailnews/MailTestUtils.jsm"
);
var { localAccountUtils } = ChromeUtils.import(
  "resource://testing-common/mailnews/LocalAccountUtils.jsm"
);

var CC = Components.Constructor;

// Ensure the profile directory is set up
do_get_profile();

function getSpec(aFileName) {
  var file = do_get_file("resources/" + aFileName);
  var uri = Services.io.newFileURI(file).QueryInterface(Ci.nsIURL);
  uri = uri.mutate().setQuery("type=application/x-message-display").finalize();
  return uri.spec;
}

registerCleanupFunction(function () {
  load("../../../../resources/mailShutdown.js");
});
