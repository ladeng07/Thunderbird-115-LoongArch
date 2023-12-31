/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {encodeABTermValue} = ChromeUtils.import("resource:///modules/ABQueryUtils.jsm");
const {MailServices} = ChromeUtils.import("resource:///modules/MailServices.jsm");
const {PluralForm} = ChromeUtils.import("resource://gre/modules/PluralForm.jsm");

var searchSessionContractID = "@mozilla.org/messenger/searchSession;1";
var gSearchSession;

var nsMsgSearchScope = Ci.nsMsgSearchScope;
var nsMsgSearchOp = Ci.nsMsgSearchOp;
var nsMsgSearchAttrib = Ci.nsMsgSearchAttrib;
var nsIAbDirectory = Ci.nsIAbDirectory;

var gStatusText;
var gSearchBundle;
var gAddressBookBundle;

var gSearchStopButton;
var gPropertiesButton;
var gComposeButton;
var gSearchPhoneticName = "false";

var gSearchAbViewListener = {
  onSelectionChanged: function() {
    UpdateCardView();
  },
  onCountChanged: function(aTotal) {
    let statusText;
    if (aTotal == 0) {
      statusText = gAddressBookBundle.getString("noMatchFound");
    } else {
      statusText = PluralForm
        .get(aTotal, gAddressBookBundle.getString("matchesFound1"))
        .replace("#1", aTotal);
    }

    gStatusText.setAttribute("label", statusText);
  }
};

function searchOnLoad()
{
  setHelpFileURI("chrome://communicator/locale/help/suitehelp.rdf");
  UpgradeAddressBookResultsPaneUI("mailnews.ui.advanced_directory_search_results.version");

  initializeSearchWidgets();
  initializeSearchWindowWidgets();

  gSearchBundle = document.getElementById("bundle_search");
  gSearchStopButton.setAttribute("label", gSearchBundle.getString("labelForSearchButton"));
  gSearchStopButton.setAttribute("accesskey", gSearchBundle.getString("labelForSearchButton.accesskey"));
  gAddressBookBundle = document.getElementById("bundle_addressBook");
  gSearchSession = Cc[searchSessionContractID].createInstance(Ci.nsIMsgSearchSession);

  // initialize a flag for phonetic name search
  gSearchPhoneticName =
        GetLocalizedStringPref("mail.addr_book.show_phonetic_fields");

  if (window.arguments && window.arguments[0])
    SelectDirectory(window.arguments[0].directory);
  else
    SelectDirectory(document.getElementById("abPopup-menupopup")
                            .firstChild.value);

  // initialize globals, see abCommon.js, InitCommonJS()
  abList = document.getElementById("abPopup");

  onMore(null);
}

function searchOnUnload()
{
  CloseAbView();
}

function initializeSearchWindowWidgets()
{
  gSearchStopButton = document.getElementById("search-button");
  gPropertiesButton = document.getElementById("propertiesButton");
  gComposeButton = document.getElementById("composeButton");
  gStatusText = document.getElementById('statusText');
  // matchAll doesn't make sense for address book search
  hideMatchAllItem();
}

function onSearchStop()
{
}

function onAbSearchReset(event)
{
  gPropertiesButton.setAttribute("disabled","true");
  gComposeButton.setAttribute("disabled","true");

  CloseAbView();

  onReset(event);
  gStatusText.setAttribute("label", "");
}

function SelectDirectory(aURI)
{
  var selectedAB = aURI;

  if (!selectedAB)
    selectedAB = kPersonalAddressbookURI;

  // set popup with address book names
  var abPopup = document.getElementById('abPopup');
  if ( abPopup )
    abPopup.value = selectedAB;

  setSearchScope(GetScopeForDirectoryURI(selectedAB));
}

function GetScopeForDirectoryURI(aURI)
{
  var directory = MailServices.ab.getDirectory(aURI);
  var booleanAnd = gSearchBooleanRadiogroup.selectedItem.value == "and";

  if (directory.isRemote) {
    if (booleanAnd)
      return nsMsgSearchScope.LDAPAnd;
    else
      return nsMsgSearchScope.LDAP;
  }
  else {
    if (booleanAnd)
      return nsMsgSearchScope.LocalABAnd;
    else
      return nsMsgSearchScope.LocalAB;
  }
}

function onEnterInSearchTerm()
{
  // on enter
  // if not searching, start the search
  // if searching, stop and then start again
  if (gSearchStopButton.getAttribute("label") == gSearchBundle.getString("labelForSearchButton")) {
     onSearch();
  }
  else {
     onSearchStop();
     onSearch();
  }
}

function onSearch()
{
    gStatusText.setAttribute("label", "");
    gPropertiesButton.setAttribute("disabled","true");
    gComposeButton.setAttribute("disabled","true");

    gSearchSession.clearScopes();

    var currentAbURI = document.getElementById('abPopup').getAttribute('value');

    gSearchSession.addDirectoryScopeTerm(GetScopeForDirectoryURI(currentAbURI));
    gSearchSession.searchTerms = saveSearchTerms(gSearchSession.searchTerms, gSearchSession);

    var searchUri = currentAbURI + "?(";

    for (let i = 0; i < gSearchSession.searchTerms.length; i++) {
      let searchTerm = gSearchSession.searchTerms[i];

      // get the "and" / "or" value from the first term
      if (i == 0) {
       if (searchTerm.booleanAnd)
         searchUri += "and";
       else
         searchUri += "or";
      }

      var attrs;

      switch (searchTerm.attrib) {
       case nsMsgSearchAttrib.Name:
         if (gSearchPhoneticName != "true")
           attrs = ["DisplayName","FirstName","LastName","NickName"];
         else
           attrs = ["DisplayName","FirstName","LastName","NickName","PhoneticFirstName","PhoneticLastName"];
         break;
       case nsMsgSearchAttrib.DisplayName:
         attrs = ["DisplayName"];
         break;
       case nsMsgSearchAttrib.Email:
         attrs = ["PrimaryEmail"];
         break;
       case nsMsgSearchAttrib.PhoneNumber:
         attrs = ["HomePhone","WorkPhone","FaxNumber","PagerNumber","CellularNumber"];
         break;
       case nsMsgSearchAttrib.Organization:
         attrs = ["Company"];
         break;
       case nsMsgSearchAttrib.Department:
         attrs = ["Department"];
         break;
       case nsMsgSearchAttrib.City:
         attrs = ["WorkCity"];
         break;
       case nsMsgSearchAttrib.Street:
         attrs = ["WorkAddress"];
         break;
       case nsMsgSearchAttrib.Nickname:
         attrs = ["NickName"];
         break;
       case nsMsgSearchAttrib.WorkPhone:
         attrs = ["WorkPhone"];
         break;
       case nsMsgSearchAttrib.HomePhone:
         attrs = ["HomePhone"];
         break;
       case nsMsgSearchAttrib.Fax:
         attrs = ["FaxNumber"];
         break;
       case nsMsgSearchAttrib.Pager:
         attrs = ["PagerNumber"];
         break;
       case nsMsgSearchAttrib.Mobile:
         attrs = ["CellularNumber"];
         break;
       case nsMsgSearchAttrib.Title:
         attrs = ["JobTitle"];
         break;
       case nsMsgSearchAttrib.AdditionalEmail:
         attrs = ["SecondEmail"];
         break;
       default:
         dump("XXX " + searchTerm.attrib + " not a supported search attr!\n");
         attrs = ["DisplayName"];
         break;
      }

      var opStr;

      switch (searchTerm.op) {
      case nsMsgSearchOp.Contains:
        opStr = "c";
        break;
      case nsMsgSearchOp.DoesntContain:
        opStr = "!c";
        break;
      case nsMsgSearchOp.Is:
        opStr = "=";
        break;
      case nsMsgSearchOp.Isnt:
        opStr = "!=";
        break;
      case nsMsgSearchOp.BeginsWith:
        opStr = "bw";
        break;
      case nsMsgSearchOp.EndsWith:
        opStr = "ew";
        break;
      case nsMsgSearchOp.SoundsLike:
        opStr = "~=";
        break;
      default:
        opStr = "c";
        break;
      }

      // currently, we can't do "and" and "or" searches at the same time
      // (it's either all "and"s or all "or"s)
      var max_attrs = attrs.length;

      for (var j=0;j<max_attrs;j++) {
       // append the term(s) to the searchUri
       searchUri += "(" + attrs[j] + "," + opStr + "," + encodeABTermValue(searchTerm.value.str) + ")";
      }
    }

    searchUri += ")";
    SetAbView(searchUri);
}

// used to toggle functionality for Search/Stop button.
function onSearchButton(event)
{
    if (event.target.label == gSearchBundle.getString("labelForSearchButton"))
        onSearch();
    else
        onSearchStop();
}

function GetAbViewListener()
{
  return gSearchAbViewListener;
}

function onProperties()
{
  AbEditSelectedCard();
}

function onCompose()
{
  AbNewMessage();
}

function AbResultsPaneDoubleClick(card)
{
  AbEditCard(card);
}

function UpdateCardView()
{
  var numSelected = GetNumSelectedCards();

  if (!numSelected) {
    gPropertiesButton.setAttribute("disabled","true");
    gComposeButton.setAttribute("disabled","true");
    return;
  }

  gComposeButton.removeAttribute("disabled");

  if (numSelected == 1)
    gPropertiesButton.removeAttribute("disabled");
  else
    gPropertiesButton.setAttribute("disabled","true");
}
