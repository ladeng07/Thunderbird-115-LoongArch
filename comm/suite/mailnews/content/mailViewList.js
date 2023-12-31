/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var gMailListView;
var gListBox;
var gEditButton;
var gDeleteButton;
var gMailViewListController =
{
  supportsCommand: function(aCommand)
  {
    switch (aCommand)
    {
      case "cmd_new":
      case "cmd_edit":
      case "cmd_delete":
        return true;
    }
    return false;
  },

  isCommandEnabled: function(aCommand)
  {
    switch (aCommand)
    {
      case "cmd_new":
        return true;
      case "cmd_edit":
      case "cmd_delete":
        return gListBox.selectedIndex >= 0;
    }
    return false;
  },

  doCommand: function(aCommand)
  {
    switch (aCommand)
    {
      case "cmd_new":
        OnNewMailView();
        break;
      case "cmd_edit":
        OnEditMailView();
        break;
      case "cmd_delete":
        OnDeleteMailView();
        break;
    }
  },

  onEvent: function(aEvent) {},

  onCommandUpdate: function()
  {
    for (let command of ["cmd_new", "cmd_edit", "cmd_delete"])
      goUpdateCommand(command);
  }
};

function MailViewListOnLoad()
{
  gMailListView = Cc["@mozilla.org/messenger/mailviewlist;1"]
                    .getService(Ci.nsIMsgMailViewList);
  gListBox = document.getElementById('mailViewList');

  window.controllers.insertControllerAt(0, gMailViewListController);

  // Construct list view based on current mail view list data
  RefreshListView(null);
  gEditButton = document.getElementById('editButton');
  gDeleteButton = document.getElementById('deleteButton');
}

function MailViewListOnUnload()
{
  window.controllers.removeController(gMailViewListController);
}

function RefreshListView(aSelectedMailView)
{
  // remove any existing items in the view...
  for (let index = gListBox.getRowCount(); index > 0; index--)
    gListBox.getItemAtIndex(index - 1).remove();

  var numItems = gMailListView.mailViewCount;
  for (let index = 0; index < numItems; index++)
  {
    let mailView = gMailListView.getMailViewAt(index);
    gListBox.appendItem(mailView.prettyName, index);
    if (aSelectedMailView && (mailView.prettyName == aSelectedMailView.prettyName))
      gListBox.selectedIndex = index;
  }
}

function OnNewMailView()
{
  window.openDialog('chrome://messenger/content/mailViewSetup.xul',
                    '',
                    'centerscreen,resizable,modal,titlebar,chrome',
                    {onOkCallback: RefreshListView});
}

function OnDeleteMailView()
{
  let bundle = Services.strings.createBundle("chrome://messenger/locale/messenger.properties");

  let ps = Services.prompt;
  if (!ps.confirm(window, bundle.GetStringFromName("confirmViewDeleteTitle"),
                  bundle.GetStringFromName("confirmViewDeleteMessage")))
    return;

  // get the selected index
  var selectedIndex = gListBox.selectedIndex;
  if (selectedIndex >= 0)
  {
    var mailView = gMailListView.getMailViewAt(selectedIndex);
    if (mailView)
    {
      gMailListView.removeMailView(mailView);
      // now remove it from the view...
      gListBox.selectedItem.remove();

      // select the next item in the list..
      if (selectedIndex < gListBox.getRowCount())
        gListBox.selectedIndex = selectedIndex;
      else
        gListBox.selectedIndex = gListBox.getRowCount() - 1;

      gMailListView.save();
    }
  }
}

function OnEditMailView()
{
  // get the selected index
  var selectedIndex = gListBox.selectedIndex;
  if (selectedIndex >= 0)
  {
    let selMailView = gMailListView.getMailViewAt(selectedIndex);
    // open up the mail view setup dialog passing in the mail view as an argument
    let args = {mailView: selMailView, onOkCallback: RefreshListView};
    window.openDialog('chrome://messenger/content/mailViewSetup.xul',
                      '',
                      'centerscreen,modal,resizable,titlebar,chrome',
                      args);
  }
}

function OnMailViewSelect(aEvent)
{
  gMailViewListController.onCommandUpdate();
}

function OnMailViewDoubleClick(aEvent)
{
  if (aEvent.button == 0 && aEvent.target.selected)
    OnEditMailView();
}
