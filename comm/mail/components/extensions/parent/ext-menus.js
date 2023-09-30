/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

ChromeUtils.defineModuleGetter(
  this,
  "MailServices",
  "resource:///modules/MailServices.jsm"
);

var { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);
var { SelectionUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/SelectionUtils.sys.mjs"
);

var { DefaultMap, ExtensionError } = ExtensionUtils;

var { ExtensionParent } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionParent.sys.mjs"
);
var { IconDetails, StartupCache } = ExtensionParent;

var { ExtensionCommon } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionCommon.sys.mjs"
);
var { makeWidgetId } = ExtensionCommon;

const ACTION_MENU_TOP_LEVEL_LIMIT = 6;

// Map[Extension -> Map[ID -> MenuItem]]
// Note: we want to enumerate all the menu items so
// this cannot be a weak map.
var gMenuMap = new Map();

// Map[Extension -> Map[ID -> MenuCreateProperties]]
// The map object for each extension is a reference to the same
// object in StartupCache.menus.  This provides a non-async
// getter for that object.
var gStartupCache = new Map();

// Map[Extension -> MenuItem]
var gRootItems = new Map();

// Map[Extension -> ID[]]
// Menu IDs that were eligible for being shown in the current menu.
var gShownMenuItems = new DefaultMap(() => []);

// Map[Extension -> Set[Contexts]]
// A DefaultMap (keyed by extension) which keeps track of the
// contexts with a subscribed onShown event listener.
var gOnShownSubscribers = new DefaultMap(() => new Set());

// If id is not specified for an item we use an integer.
var gNextMenuItemID = 0;

// Used to assign unique names to radio groups.
var gNextRadioGroupID = 0;

// The max length of a menu item's label.
var gMaxLabelLength = 64;

var gMenuBuilder = {
  // When a new menu is opened, this function is called and
  // we populate the |xulMenu| with all the items from extensions
  // to be displayed. We always clear all the items again when
  // popuphidden fires.
  build(contextData) {
    contextData = this.maybeOverrideContextData(contextData);
    let xulMenu = contextData.menu;
    xulMenu.addEventListener("popuphidden", this);
    this.xulMenu = xulMenu;
    for (let [, root] of gRootItems) {
      this.createAndInsertTopLevelElements(root, contextData, null);
    }
    this.afterBuildingMenu(contextData);

    if (
      contextData.webExtContextData &&
      !contextData.webExtContextData.showDefaults
    ) {
      // Wait until nsContextMenu.js has toggled the visibility of the default
      // menu items before hiding the default items.
      Promise.resolve().then(() => this.hideDefaultMenuItems());
    }
  },

  maybeOverrideContextData(contextData) {
    let { webExtContextData } = contextData;
    if (!webExtContextData || !webExtContextData.overrideContext) {
      return contextData;
    }
    let contextDataBase = {
      menu: contextData.menu,
      // eslint-disable-next-line no-use-before-define
      originalViewType: getContextViewType(contextData),
      originalViewUrl: contextData.inFrame
        ? contextData.frameUrl
        : contextData.pageUrl,
      webExtContextData,
    };
    if (webExtContextData.overrideContext === "tab") {
      // TODO: Handle invalid tabs more gracefully (instead of throwing).
      let tab = tabTracker.getTab(webExtContextData.tabId);
      return {
        ...contextDataBase,
        tab,
        pageUrl: tab.linkedBrowser?.currentURI?.spec,
        onTab: true,
      };
    }
    throw new ExtensionError(
      `Unexpected overrideContext: ${webExtContextData.overrideContext}`
    );
  },

  createAndInsertTopLevelElements(root, contextData, nextSibling) {
    const newWebExtensionGroupSeparator = () => {
      let element =
        this.xulMenu.ownerDocument.createXULElement("menuseparator");
      element.classList.add("webextension-group-separator");
      return element;
    };

    let rootElements;
    if (
      contextData.onAction ||
      contextData.onBrowserAction ||
      contextData.onComposeAction ||
      contextData.onMessageDisplayAction
    ) {
      if (contextData.extension.id !== root.extension.id) {
        return;
      }
      rootElements = this.buildTopLevelElements(
        root,
        contextData,
        ACTION_MENU_TOP_LEVEL_LIMIT,
        false
      );

      // Action menu items are prepended to the menu, followed by a separator.
      nextSibling = nextSibling || this.xulMenu.firstElementChild;
      if (rootElements.length && !this.itemsToCleanUp.has(nextSibling)) {
        rootElements.push(newWebExtensionGroupSeparator());
      }
    } else if (
      contextData.inActionMenu ||
      contextData.inBrowserActionMenu ||
      contextData.inComposeActionMenu ||
      contextData.inMessageDisplayActionMenu
    ) {
      if (contextData.extension.id !== root.extension.id) {
        return;
      }
      rootElements = this.buildTopLevelElements(
        root,
        contextData,
        Infinity,
        false
      );
    } else if (contextData.webExtContextData) {
      let { extensionId, showDefaults, overrideContext } =
        contextData.webExtContextData;
      if (extensionId === root.extension.id) {
        rootElements = this.buildTopLevelElements(
          root,
          contextData,
          Infinity,
          false
        );
        // The extension menu should be rendered at the top, but after the navigation buttons.
        nextSibling =
          nextSibling || this.xulMenu.querySelector(":scope > :first-child");
        if (
          rootElements.length &&
          showDefaults &&
          !this.itemsToCleanUp.has(nextSibling)
        ) {
          rootElements.push(newWebExtensionGroupSeparator());
        }
      } else if (!showDefaults && !overrideContext) {
        // When the default menu items should be hidden, menu items from other
        // extensions should be hidden too.
        return;
      }
      // Fall through to show default extension menu items.
    }

    if (!rootElements) {
      rootElements = this.buildTopLevelElements(root, contextData, 1, true);
      if (
        rootElements.length &&
        !this.itemsToCleanUp.has(this.xulMenu.lastElementChild) &&
        this.xulMenu.firstChild
      ) {
        // All extension menu items are appended at the end.
        // Prepend separator if this is the first extension menu item.
        rootElements.unshift(newWebExtensionGroupSeparator());
      }
    }

    if (!rootElements.length) {
      return;
    }

    if (nextSibling) {
      nextSibling.before(...rootElements);
    } else {
      this.xulMenu.append(...rootElements);
    }
    for (let item of rootElements) {
      this.itemsToCleanUp.add(item);
    }
  },

  buildElementWithChildren(item, contextData) {
    const element = this.buildSingleElement(item, contextData);
    const children = this.buildChildren(item, contextData);
    if (children.length) {
      element.firstElementChild.append(...children);
    }
    return element;
  },

  buildChildren(item, contextData) {
    let groupName;
    let children = [];
    for (let child of item.children) {
      if (child.type == "radio" && !child.groupName) {
        if (!groupName) {
          groupName = `webext-radio-group-${gNextRadioGroupID++}`;
        }
        child.groupName = groupName;
      } else {
        groupName = null;
      }

      if (child.enabledForContext(contextData)) {
        children.push(this.buildElementWithChildren(child, contextData));
      }
    }
    return children;
  },

  buildTopLevelElements(root, contextData, maxCount, forceManifestIcons) {
    let children = this.buildChildren(root, contextData);

    // TODO: Fix bug 1492969 and remove this whole if block.
    if (
      children.length === 1 &&
      maxCount === 1 &&
      forceManifestIcons &&
      AppConstants.platform === "linux" &&
      children[0].getAttribute("type") === "checkbox"
    ) {
      // Keep single checkbox items in the submenu on Linux since
      // the extension icon overlaps the checkbox otherwise.
      maxCount = 0;
    }

    if (children.length > maxCount) {
      // Move excess items into submenu.
      let rootElement = this.buildSingleElement(root, contextData);
      rootElement.setAttribute("ext-type", "top-level-menu");
      rootElement.firstElementChild.append(...children.splice(maxCount - 1));
      children.push(rootElement);
    }

    if (forceManifestIcons) {
      for (let rootElement of children) {
        // Display the extension icon on the root element.
        if (
          root.extension.manifest.icons &&
          rootElement.getAttribute("type") !== "checkbox"
        ) {
          this.setMenuItemIcon(
            rootElement,
            root.extension,
            contextData,
            root.extension.manifest.icons
          );
        } else {
          this.removeMenuItemIcon(rootElement);
        }
      }
    }
    return children;
  },

  removeSeparatorIfNoTopLevelItems() {
    // Extension menu items always have have a non-empty ID.
    let isNonExtensionSeparator = item =>
      item.nodeName === "menuseparator" && !item.id;

    // itemsToCleanUp contains all top-level menu items. A separator should
    // only be kept if it is next to an extension menu item.
    let isExtensionMenuItemSibling = item =>
      item && this.itemsToCleanUp.has(item) && !isNonExtensionSeparator(item);

    for (let item of this.itemsToCleanUp) {
      if (isNonExtensionSeparator(item)) {
        if (
          !isExtensionMenuItemSibling(item.previousElementSibling) &&
          !isExtensionMenuItemSibling(item.nextElementSibling)
        ) {
          item.remove();
          this.itemsToCleanUp.delete(item);
        }
      }
    }
  },

  buildSingleElement(item, contextData) {
    let doc = contextData.menu.ownerDocument;
    let element;
    if (item.children.length) {
      element = this.createMenuElement(doc, item);
    } else if (item.type == "separator") {
      element = doc.createXULElement("menuseparator");
    } else {
      element = doc.createXULElement("menuitem");
    }

    return this.customizeElement(element, item, contextData);
  },

  createMenuElement(doc, item) {
    let element = doc.createXULElement("menu");
    // Menu elements need to have a menupopup child for its menu items.
    let menupopup = doc.createXULElement("menupopup");
    element.appendChild(menupopup);
    return element;
  },

  customizeElement(element, item, contextData) {
    let label = item.title;
    if (label) {
      let accessKey;
      label = label.replace(/&([\S\s]|$)/g, (_, nextChar, i) => {
        if (nextChar === "&") {
          return "&";
        }
        if (accessKey === undefined) {
          if (nextChar === "%" && label.charAt(i + 2) === "s") {
            accessKey = "";
          } else {
            accessKey = nextChar;
          }
        }
        return nextChar;
      });
      element.setAttribute("accesskey", accessKey || "");

      if (contextData.isTextSelected && label.includes("%s")) {
        let selection = contextData.selectionText.trim();
        // The rendering engine will truncate the title if it's longer than 64 characters.
        // But if it makes sense let's try truncate selection text only, to handle cases like
        // 'look up "%s" in MyDictionary' more elegantly.

        let codePointsToRemove = 0;

        let selectionArray = Array.from(selection);

        let completeLabelLength = label.length - 2 + selectionArray.length;
        if (completeLabelLength > gMaxLabelLength) {
          codePointsToRemove = completeLabelLength - gMaxLabelLength;
        }

        if (codePointsToRemove) {
          let ellipsis = "\u2026";
          try {
            ellipsis = Services.prefs.getComplexValue(
              "intl.ellipsis",
              Ci.nsIPrefLocalizedString
            ).data;
          } catch (e) {}
          codePointsToRemove += 1;
          selection =
            selectionArray.slice(0, -codePointsToRemove).join("") + ellipsis;
        }

        label = label.replace(/%s/g, selection);
      }

      element.setAttribute("label", label);
    }

    element.setAttribute("id", item.elementId);

    if ("icons" in item) {
      if (item.icons) {
        this.setMenuItemIcon(element, item.extension, contextData, item.icons);
      } else {
        this.removeMenuItemIcon(element);
      }
    }

    if (item.type == "checkbox") {
      element.setAttribute("type", "checkbox");
      if (item.checked) {
        element.setAttribute("checked", "true");
      }
    } else if (item.type == "radio") {
      element.setAttribute("type", "radio");
      element.setAttribute("name", item.groupName);
      if (item.checked) {
        element.setAttribute("checked", "true");
      }
    }

    if (!item.enabled) {
      element.setAttribute("disabled", "true");
    }

    let button;

    element.addEventListener(
      "command",
      async event => {
        if (event.target !== event.currentTarget) {
          return;
        }
        const wasChecked = item.checked;
        if (item.type == "checkbox") {
          item.checked = !item.checked;
        } else if (item.type == "radio") {
          // Deselect all radio items in the current radio group.
          for (let child of item.parent.children) {
            if (child.type == "radio" && child.groupName == item.groupName) {
              child.checked = false;
            }
          }
          // Select the clicked radio item.
          item.checked = true;
        }

        let { webExtContextData } = contextData;
        if (
          contextData.tab &&
          // If the menu context was overridden by the extension, do not grant
          // activeTab since the extension also controls the tabId.
          (!webExtContextData ||
            webExtContextData.extensionId !== item.extension.id)
        ) {
          item.tabManager.addActiveTabPermission(contextData.tab);
        }

        let info = await item.getClickInfo(contextData, wasChecked);
        info.modifiers = clickModifiersFromEvent(event);

        info.button = button;
        let _execute_action =
          item.extension.manifestVersion < 3
            ? "_execute_browser_action"
            : "_execute_action";

        // Allow menus to open various actions supported in webext prior
        // to notifying onclicked.
        let actionFor = {
          [_execute_action]: global.browserActionFor,
          _execute_compose_action: global.composeActionFor,
          _execute_message_display_action: global.messageDisplayActionFor,
        }[item.command];
        if (actionFor) {
          let win = event.target.ownerGlobal;
          actionFor(item.extension).triggerAction(win);
          return;
        }

        item.extension.emit(
          "webext-menu-menuitem-click",
          info,
          contextData.tab
        );
      },
      { once: true }
    );

    // eslint-disable-next-line mozilla/balanced-listeners
    element.addEventListener("click", event => {
      if (
        event.target !== event.currentTarget ||
        // Ignore menu items that are usually not clickeable,
        // such as separators and parents of submenus and disabled items.
        element.localName !== "menuitem" ||
        element.disabled
      ) {
        return;
      }

      button = event.button;
      if (event.button) {
        element.doCommand();
        contextData.menu.hidePopup();
      }
    });

    // Don't publish the ID of the root because the root element is
    // auto-generated.
    if (item.parent) {
      gShownMenuItems.get(item.extension).push(item.id);
    }

    return element;
  },

  setMenuItemIcon(element, extension, contextData, icons) {
    let parentWindow = contextData.menu.ownerGlobal;

    let { icon } = IconDetails.getPreferredIcon(
      icons,
      extension,
      16 * parentWindow.devicePixelRatio
    );

    // The extension icons in the manifest are not pre-resolved, since
    // they're sometimes used by the add-on manager when the extension is
    // not enabled, and its URLs are not resolvable.
    let resolvedURL = extension.baseURI.resolve(icon);

    if (element.localName == "menu") {
      element.setAttribute("class", "menu-iconic");
    } else if (element.localName == "menuitem") {
      element.setAttribute("class", "menuitem-iconic");
    }

    element.setAttribute("image", resolvedURL);
  },

  // Undo changes from setMenuItemIcon.
  removeMenuItemIcon(element) {
    element.removeAttribute("class");
    element.removeAttribute("image");
  },

  rebuildMenu(extension) {
    let { contextData } = this;
    if (!contextData) {
      // This happens if the menu is not visible.
      return;
    }

    // Find the group of existing top-level items (usually 0 or 1 items)
    // and remember its position for when the new items are inserted.
    let elementIdPrefix = `${makeWidgetId(extension.id)}-menuitem-`;
    let nextSibling = null;
    for (let item of this.itemsToCleanUp) {
      if (item.id && item.id.startsWith(elementIdPrefix)) {
        nextSibling = item.nextSibling;
        item.remove();
        this.itemsToCleanUp.delete(item);
      }
    }

    let root = gRootItems.get(extension);
    if (root) {
      this.createAndInsertTopLevelElements(root, contextData, nextSibling);
    }
    this.removeSeparatorIfNoTopLevelItems();
  },

  // This should be called once, after constructing the top-level menus, if any.
  afterBuildingMenu(contextData) {
    function dispatchOnShownEvent(extension) {
      // Note: gShownMenuItems is a DefaultMap, so .get(extension) causes the
      // extension to be stored in the map even if there are currently no
      // shown menu items. This ensures that the onHidden event can be fired
      // when the menu is closed.
      let menuIds = gShownMenuItems.get(extension);
      extension.emit("webext-menu-shown", menuIds, contextData);
    }

    if (
      contextData.onAction ||
      contextData.onBrowserAction ||
      contextData.onComposeAction ||
      contextData.onMessageDisplayAction
    ) {
      dispatchOnShownEvent(contextData.extension);
    } else {
      for (const extension of gOnShownSubscribers.keys()) {
        dispatchOnShownEvent(extension);
      }
    }

    this.contextData = contextData;
  },

  hideDefaultMenuItems() {
    for (let item of this.xulMenu.children) {
      if (!this.itemsToCleanUp.has(item)) {
        item.hidden = true;
      }
    }
  },

  handleEvent(event) {
    if (this.xulMenu != event.target || event.type != "popuphidden") {
      return;
    }

    delete this.xulMenu;
    delete this.contextData;

    let target = event.target;
    target.removeEventListener("popuphidden", this);
    for (let item of this.itemsToCleanUp) {
      item.remove();
    }
    this.itemsToCleanUp.clear();
    for (let extension of gShownMenuItems.keys()) {
      extension.emit("webext-menu-hidden");
    }
    gShownMenuItems.clear();
  },

  itemsToCleanUp: new Set(),
};

// Called from different action popups.
global.actionContextMenu = function (contextData) {
  contextData.originalViewType = "tab";
  gMenuBuilder.build(contextData);
};

const contextsMap = {
  onAudio: "audio",
  onEditable: "editable",
  inFrame: "frame",
  onImage: "image",
  onLink: "link",
  onPassword: "password",
  isTextSelected: "selection",
  onVideo: "video",

  onAction: "action",
  onBrowserAction: "browser_action",
  onComposeAction: "compose_action",
  onMessageDisplayAction: "message_display_action",
  inActionMenu: "action_menu",
  inBrowserActionMenu: "browser_action_menu",
  inComposeActionMenu: "compose_action_menu",
  inMessageDisplayActionMenu: "message_display_action_menu",

  onComposeBody: "compose_body",
  onTab: "tab",
  inToolsMenu: "tools_menu",
  selectedMessages: "message_list",
  selectedFolder: "folder_pane",
  selectedComposeAttachments: "compose_attachments",
  selectedMessageAttachments: "message_attachments",
  allMessageAttachments: "all_message_attachments",
};

const chromeElementsMap = {
  msgSubject: "composeSubject",
  toAddrInput: "composeTo",
  ccAddrInput: "composeCc",
  bccAddrInput: "composeBcc",
  replyAddrInput: "composeReplyTo",
  newsgroupsAddrInput: "composeNewsgroupTo",
  followupAddrInput: "composeFollowupTo",
};

const getMenuContexts = contextData => {
  let contexts = new Set();

  for (const [key, value] of Object.entries(contextsMap)) {
    if (contextData[key]) {
      contexts.add(value);
    }
  }

  if (contexts.size === 0) {
    contexts.add("page");
  }

  // New non-content contexts supported in Thunderbird are not part of "all".
  if (!contextData.onTab && !contextData.inToolsMenu) {
    contexts.add("all");
  }

  return contexts;
};

function getContextViewType(contextData) {
  if ("originalViewType" in contextData) {
    return contextData.originalViewType;
  }
  if (
    contextData.webExtBrowserType === "popup" ||
    contextData.webExtBrowserType === "sidebar"
  ) {
    return contextData.webExtBrowserType;
  }
  if (contextData.tab && contextData.menu.id === "browserContext") {
    return "tab";
  }
  return undefined;
}

async function addMenuEventInfo(
  info,
  contextData,
  extension,
  includeSensitiveData
) {
  info.viewType = getContextViewType(contextData);
  if (contextData.onVideo) {
    info.mediaType = "video";
  } else if (contextData.onAudio) {
    info.mediaType = "audio";
  } else if (contextData.onImage) {
    info.mediaType = "image";
  }
  if (contextData.frameId !== undefined) {
    info.frameId = contextData.frameId;
  }
  info.editable = contextData.onEditable || false;
  if (includeSensitiveData) {
    if (contextData.timeStamp) {
      // Convert to integer, in case the DOMHighResTimeStamp has a fractional part.
      info.targetElementId = Math.floor(contextData.timeStamp);
    }
    if (contextData.onLink) {
      info.linkText = contextData.linkText;
      info.linkUrl = contextData.linkUrl;
    }
    if (contextData.onAudio || contextData.onImage || contextData.onVideo) {
      info.srcUrl = contextData.srcUrl;
    }
    info.pageUrl = contextData.pageUrl;
    if (contextData.inFrame) {
      info.frameUrl = contextData.frameUrl;
    }
    if (contextData.isTextSelected) {
      info.selectionText = contextData.selectionText;
    }
  }
  // If the context was overridden, then frameUrl should be the URL of the
  // document in which the menu was opened (instead of undefined, even if that
  // document is not in a frame).
  if (contextData.originalViewUrl) {
    info.frameUrl = contextData.originalViewUrl;
  }

  if (contextData.fieldId) {
    info.fieldId = contextData.fieldId;
  }

  if (contextData.selectedMessages && extension.hasPermission("messagesRead")) {
    info.selectedMessages = await messageListTracker.startList(
      contextData.selectedMessages,
      extension
    );
  }
  if (extension.hasPermission("accountsRead")) {
    for (let folderType of ["displayedFolder", "selectedFolder"]) {
      if (contextData[folderType]) {
        let folder = convertFolder(contextData[folderType]);
        // If the context menu click in the folder pane occurred on a root folder
        // representing an account, do not include a selectedFolder object, but
        // the corresponding selectedAccount object.
        if (folderType == "selectedFolder" && folder.path == "/") {
          info.selectedAccount = convertAccount(
            MailServices.accounts.getAccount(folder.accountId)
          );
        } else {
          info[folderType] = traverseSubfolders(
            contextData[folderType],
            folder.accountId
          );
        }
      }
    }
  }
  if (
    (contextData.selectedMessageAttachments ||
      contextData.allMessageAttachments) &&
    extension.hasPermission("messagesRead")
  ) {
    let attachments =
      contextData.selectedMessageAttachments ||
      contextData.allMessageAttachments;
    info.attachments = attachments.map(attachment => {
      return {
        contentType: attachment.contentType,
        name: attachment.name,
        size: attachment.size,
        partName: attachment.partID,
      };
    });
  }
  if (
    contextData.selectedComposeAttachments &&
    extension.hasPermission("compose")
  ) {
    if (!("composeAttachmentTracker" in global)) {
      extensions.loadModule("compose");
    }

    info.attachments = contextData.selectedComposeAttachments.map(a =>
      global.composeAttachmentTracker.convert(a, contextData.menu.ownerGlobal)
    );
  }
}

class MenuItem {
  constructor(extension, createProperties, isRoot = false) {
    this.extension = extension;
    this.children = [];
    this.parent = null;
    this.tabManager = extension.tabManager;

    this.setDefaults();
    this.setProps(createProperties);

    if (!this.hasOwnProperty("_id")) {
      this.id = gNextMenuItemID++;
    }
    // If the item is not the root and has no parent
    // it must be a child of the root.
    if (!isRoot && !this.parent) {
      this.root.addChild(this);
    }
  }

  static mergeProps(obj, properties) {
    for (let propName in properties) {
      if (properties[propName] === null) {
        // Omitted optional argument.
        continue;
      }
      obj[propName] = properties[propName];
    }

    if ("icons" in properties) {
      if (properties.icons === null) {
        obj.icons = null;
      } else if (typeof properties.icons == "string") {
        obj.icons = { 16: properties.icons };
      }
    }
  }

  setProps(createProperties) {
    MenuItem.mergeProps(this, createProperties);

    if (createProperties.documentUrlPatterns != null) {
      this.documentUrlMatchPattern = new MatchPatternSet(
        this.documentUrlPatterns,
        {
          restrictSchemes: this.extension.restrictSchemes,
        }
      );
    }

    if (createProperties.targetUrlPatterns != null) {
      this.targetUrlMatchPattern = new MatchPatternSet(this.targetUrlPatterns, {
        // restrictSchemes default to false when matching links instead of pages
        // (see Bug 1280370 for a rationale).
        restrictSchemes: false,
      });
    }

    // If a child MenuItem does not specify any contexts, then it should
    // inherit the contexts specified from its parent.
    if (createProperties.parentId && !createProperties.contexts) {
      this.contexts = this.parent.contexts;
    }
  }

  setDefaults() {
    this.setProps({
      type: "normal",
      checked: false,
      contexts: ["all"],
      enabled: true,
      visible: true,
    });
  }

  set id(id) {
    if (this.hasOwnProperty("_id")) {
      throw new ExtensionError("ID of a MenuItem cannot be changed");
    }
    let isIdUsed = gMenuMap.get(this.extension).has(id);
    if (isIdUsed) {
      throw new ExtensionError(`ID already exists: ${id}`);
    }
    this._id = id;
  }

  get id() {
    return this._id;
  }

  get elementId() {
    let id = this.id;
    // If the ID is an integer, it is auto-generated and globally unique.
    // If the ID is a string, it is only unique within one extension and the
    // ID needs to be concatenated with the extension ID.
    if (typeof id !== "number") {
      // To avoid collisions with numeric IDs, add a prefix to string IDs.
      id = `_${id}`;
    }
    return `${makeWidgetId(this.extension.id)}-menuitem-${id}`;
  }

  ensureValidParentId(parentId) {
    if (parentId === undefined) {
      return;
    }
    let menuMap = gMenuMap.get(this.extension);
    if (!menuMap.has(parentId)) {
      throw new ExtensionError(
        `Could not find any MenuItem with id: ${parentId}`
      );
    }
    for (let item = menuMap.get(parentId); item; item = item.parent) {
      if (item === this) {
        throw new ExtensionError(
          "MenuItem cannot be an ancestor (or self) of its new parent."
        );
      }
    }
  }

  /**
   * When updating menu properties we need to ensure parents exist
   * in the cache map before children.  That allows the menus to be
   * created in the correct sequence on startup.  This reparents the
   * tree starting from this instance of MenuItem.
   */
  reparentInCache() {
    let { id, extension } = this;
    let cachedMap = gStartupCache.get(extension);
    let createProperties = cachedMap.get(id);
    cachedMap.delete(id);
    cachedMap.set(id, createProperties);

    for (let child of this.children) {
      child.reparentInCache();
    }
  }

  set parentId(parentId) {
    this.ensureValidParentId(parentId);

    if (this.parent) {
      this.parent.detachChild(this);
    }

    if (parentId === undefined) {
      this.root.addChild(this);
    } else {
      let menuMap = gMenuMap.get(this.extension);
      menuMap.get(parentId).addChild(this);
    }
  }

  get parentId() {
    return this.parent ? this.parent.id : undefined;
  }

  addChild(child) {
    if (child.parent) {
      throw new ExtensionError("Child MenuItem already has a parent.");
    }
    this.children.push(child);
    child.parent = this;
  }

  detachChild(child) {
    let idx = this.children.indexOf(child);
    if (idx < 0) {
      throw new ExtensionError(
        "Child MenuItem not found, it cannot be removed."
      );
    }
    this.children.splice(idx, 1);
    child.parent = null;
  }

  get root() {
    let extension = this.extension;
    if (!gRootItems.has(extension)) {
      let root = new MenuItem(
        extension,
        { title: extension.name },
        /* isRoot = */ true
      );
      gRootItems.set(extension, root);
    }

    return gRootItems.get(extension);
  }

  remove() {
    if (this.parent) {
      this.parent.detachChild(this);
    }
    let children = this.children.slice(0);
    for (let child of children) {
      child.remove();
    }

    let menuMap = gMenuMap.get(this.extension);
    menuMap.delete(this.id);
    // Menu items are saved if !extension.persistentBackground.
    if (gStartupCache.get(this.extension)?.delete(this.id)) {
      StartupCache.save();
    }
    if (this.root == this) {
      gRootItems.delete(this.extension);
    }
  }

  async getClickInfo(contextData, wasChecked) {
    let info = {
      menuItemId: this.id,
    };
    if (this.parent) {
      info.parentMenuItemId = this.parentId;
    }

    await addMenuEventInfo(info, contextData, this.extension, true);

    if (this.type === "checkbox" || this.type === "radio") {
      info.checked = this.checked;
      info.wasChecked = wasChecked;
    }

    return info;
  }

  enabledForContext(contextData) {
    if (!this.visible) {
      return false;
    }
    let contexts = getMenuContexts(contextData);
    if (!this.contexts.some(n => contexts.has(n))) {
      return false;
    }

    if (
      this.viewTypes &&
      !this.viewTypes.includes(getContextViewType(contextData))
    ) {
      return false;
    }

    let docPattern = this.documentUrlMatchPattern;
    // When viewTypes is specified, the menu item is expected to be restricted
    // to documents. So let documentUrlPatterns always apply to the URL of the
    // document in which the menu was opened. When maybeOverrideContextData
    // changes the context, contextData.pageUrl does not reflect that URL any
    // more, so use contextData.originalViewUrl instead.
    if (docPattern && this.viewTypes && contextData.originalViewUrl) {
      if (
        !docPattern.matches(Services.io.newURI(contextData.originalViewUrl))
      ) {
        return false;
      }
      docPattern = null; // Null it so that it won't be used with pageURI below.
    }

    let pageURI = contextData[contextData.inFrame ? "frameUrl" : "pageUrl"];
    if (pageURI) {
      pageURI = Services.io.newURI(pageURI);
      if (docPattern && !docPattern.matches(pageURI)) {
        return false;
      }
    }

    let targetPattern = this.targetUrlMatchPattern;
    if (targetPattern) {
      let targetUrls = [];
      if (contextData.onImage || contextData.onAudio || contextData.onVideo) {
        // TODO: Double check if srcUrl is always set when we need it.
        targetUrls.push(contextData.srcUrl);
      }
      if (contextData.onLink) {
        targetUrls.push(contextData.linkUrl);
      }
      if (
        !targetUrls.some(targetUrl =>
          targetPattern.matches(Services.io.newURI(targetUrl))
        )
      ) {
        return false;
      }
    }

    return true;
  }
}

// While any extensions are active, this Tracker registers to observe/listen
// for menu events from both Tools and context menus, both content and chrome.
const menuTracker = {
  menuIds: [
    "tabContextMenu",
    "folderPaneContext",
    "msgComposeAttachmentItemContext",
    "taskPopup",
  ],

  register() {
    Services.obs.addObserver(this, "on-build-contextmenu");
    for (const window of windowTracker.browserWindows()) {
      this.onWindowOpen(window);
    }
    windowTracker.addOpenListener(this.onWindowOpen);
  },

  unregister() {
    Services.obs.removeObserver(this, "on-build-contextmenu");
    for (const window of windowTracker.browserWindows()) {
      this.cleanupWindow(window);
    }
    windowTracker.removeOpenListener(this.onWindowOpen);
  },

  observe(subject, topic, data) {
    subject = subject.wrappedJSObject;
    gMenuBuilder.build(subject);
  },

  onWindowOpen(window) {
    // Register the event listener on the window, as some menus we are
    // interested in are dynamically created:
    // https://hg.mozilla.org/mozilla-central/file/83a21ab93aff939d348468e69249a3a33ccfca88/toolkit/content/editMenuOverlay.js#l96
    window.addEventListener("popupshowing", menuTracker);
  },

  cleanupWindow(window) {
    window.removeEventListener("popupshowing", this);
  },

  handleEvent(event) {
    const menu = event.target;
    const trigger = menu.triggerNode;
    const win = menu.ownerGlobal;
    switch (menu.id) {
      case "taskPopup": {
        let info = { menu, inToolsMenu: true };
        if (
          win.document.location.href ==
          "chrome://messenger/content/messenger.xhtml"
        ) {
          info.tab = tabTracker.activeTab;
          // Calendar and Task view do not have a browser/URL.
          info.pageUrl = info.tab.linkedBrowser?.currentURI?.spec;
        } else {
          info.tab = win;
        }
        gMenuBuilder.build(info);
        break;
      }
      case "tabContextMenu": {
        let triggerTab = trigger.closest("tab");
        const tab = triggerTab || tabTracker.activeTab;
        const pageUrl = tab.linkedBrowser?.currentURI?.spec;
        gMenuBuilder.build({ menu, tab, pageUrl, onTab: true });
        break;
      }
      case "folderPaneContext": {
        const tab = tabTracker.activeTab;
        const pageUrl = tab.linkedBrowser?.currentURI?.spec;
        gMenuBuilder.build({
          menu,
          tab,
          pageUrl,
          selectedFolder: win.folderPaneContextMenu.activeFolder,
        });
        break;
      }
      case "attachmentListContext": {
        let attachmentList =
          menu.ownerGlobal.document.getElementById("attachmentList");
        let allMessageAttachments = [...attachmentList.children].map(
          item => item.attachment
        );
        gMenuBuilder.build({
          menu,
          tab: menu.ownerGlobal,
          allMessageAttachments,
        });
        break;
      }
      case "attachmentItemContext": {
        let attachmentList =
          menu.ownerGlobal.document.getElementById("attachmentList");
        let attachmentInfo =
          menu.ownerGlobal.document.getElementById("attachmentInfo");

        // If we opened the context menu from the attachment info area (the paperclip,
        // "1 attachment" label, filename, or file size, just grab the first (and
        // only) attachment as our "selected" attachments.
        let selectedMessageAttachments;
        if (
          menu.triggerNode == attachmentInfo ||
          menu.triggerNode.parentNode == attachmentInfo
        ) {
          selectedMessageAttachments = [
            attachmentList.getItemAtIndex(0).attachment,
          ];
        } else {
          selectedMessageAttachments = [...attachmentList.selectedItems].map(
            item => item.attachment
          );
        }

        gMenuBuilder.build({
          menu,
          tab: menu.ownerGlobal,
          selectedMessageAttachments,
        });
        break;
      }
      case "msgComposeAttachmentItemContext": {
        let bucket = menu.ownerDocument.getElementById("attachmentBucket");
        let selectedComposeAttachments = [];
        for (let item of bucket.itemChildren) {
          if (item.selected) {
            selectedComposeAttachments.push(item.attachment);
          }
        }
        gMenuBuilder.build({
          menu,
          tab: menu.ownerGlobal,
          selectedComposeAttachments,
        });
        break;
      }
      default:
        // Fall back to the triggerNode. Make sure we are not re-triggered by a
        // sub-menu.
        if (menu.parentNode.localName == "menu") {
          return;
        }
        if (Object.keys(chromeElementsMap).includes(trigger?.id)) {
          let selectionInfo = SelectionUtils.getSelectionDetails(win);
          let isContentSelected = !selectionInfo.docSelectionIsCollapsed;
          let textSelected = selectionInfo.text;
          let isTextSelected = !!textSelected.length;
          gMenuBuilder.build({
            menu,
            tab: win,
            pageUrl: win.browser.currentURI.spec,
            onEditable: true,
            isContentSelected,
            isTextSelected,
            onTextInput: true,
            originalViewType: "tab",
            fieldId: chromeElementsMap[trigger.id],
            selectionText: isTextSelected ? selectionInfo.fullText : undefined,
          });
        }
        break;
    }
  },
};

this.menus = class extends ExtensionAPIPersistent {
  constructor(extension) {
    super(extension);

    if (!gMenuMap.size) {
      menuTracker.register();
    }
    gMenuMap.set(extension, new Map());
  }

  restoreFromCache() {
    let { extension } = this;
    // ensure extension has not shutdown
    if (!this.extension) {
      return;
    }
    for (let createProperties of gStartupCache.get(extension).values()) {
      // The order of menu creation is significant, see reparentInCache.
      let menuItem = new MenuItem(extension, createProperties);
      gMenuMap.get(extension).set(menuItem.id, menuItem);
    }
    // Used for testing
    extension.emit("webext-menus-created", gMenuMap.get(extension));
  }

  async onStartup() {
    let { extension } = this;
    if (extension.persistentBackground) {
      return;
    }
    // Using the map retains insertion order.
    let cachedMenus = await StartupCache.menus.get(extension.id, () => {
      return new Map();
    });
    gStartupCache.set(extension, cachedMenus);
    if (!cachedMenus.size) {
      return;
    }

    this.restoreFromCache();
  }

  onShutdown() {
    let { extension } = this;

    if (gMenuMap.has(extension)) {
      gMenuMap.delete(extension);
      gRootItems.delete(extension);
      gShownMenuItems.delete(extension);
      gStartupCache.delete(extension);
      gOnShownSubscribers.delete(extension);
      if (!gMenuMap.size) {
        menuTracker.unregister();
      }
    }
  }

  PERSISTENT_EVENTS = {
    onShown({ fire }) {
      let { extension } = this;
      let listener = async (event, menuIds, contextData) => {
        let info = {
          menuIds,
          contexts: Array.from(getMenuContexts(contextData)),
        };

        let nativeTab = contextData.tab;

        // The menus.onShown event is fired before the user has consciously
        // interacted with an extension, so we require permissions before
        // exposing sensitive contextual data.
        let contextUrl = contextData.inFrame
          ? contextData.frameUrl
          : contextData.pageUrl;

        let ownerDocumentUrl = contextData.menu.ownerDocument.location.href;

        let contextScheme;
        if (contextUrl) {
          contextScheme = Services.io.newURI(contextUrl).scheme;
        }

        let includeSensitiveData =
          (nativeTab &&
            extension.tabManager.hasActiveTabPermission(nativeTab)) ||
          (contextUrl && extension.allowedOrigins.matches(contextUrl)) ||
          (MESSAGE_PROTOCOLS.includes(contextScheme) &&
            extension.hasPermission("messagesRead")) ||
          (ownerDocumentUrl ==
            "chrome://messenger/content/messengercompose/messengercompose.xhtml" &&
            extension.hasPermission("compose"));

        await addMenuEventInfo(
          info,
          contextData,
          extension,
          includeSensitiveData
        );

        let tab = nativeTab && extension.tabManager.convert(nativeTab);
        fire.sync(info, tab);
      };
      gOnShownSubscribers.get(extension).add(listener);
      extension.on("webext-menu-shown", listener);
      return {
        unregister() {
          const listeners = gOnShownSubscribers.get(extension);
          listeners.delete(listener);
          if (listeners.size === 0) {
            gOnShownSubscribers.delete(extension);
          }
          extension.off("webext-menu-shown", listener);
        },
        convert(_fire) {
          fire = _fire;
        },
      };
    },
    onHidden({ fire }) {
      let { extension } = this;
      let listener = () => {
        fire.sync();
      };
      extension.on("webext-menu-hidden", listener);
      return {
        unregister() {
          extension.off("webext-menu-hidden", listener);
        },
        convert(_fire) {
          fire = _fire;
        },
      };
    },
    onClicked({ context, fire }) {
      let { extension } = this;
      let listener = async (event, info, nativeTab) => {
        let { linkedBrowser } = nativeTab || tabTracker.activeTab;
        let tab = nativeTab && extension.tabManager.convert(nativeTab);
        if (fire.wakeup) {
          // force the wakeup, thus the call to convert to get the context.
          await fire.wakeup();
          // If while waiting the tab disappeared we bail out.
          if (
            !linkedBrowser.ownerGlobal.gBrowser.getTabForBrowser(linkedBrowser)
          ) {
            console.error(
              `menus.onClicked: target tab closed during background startup.`
            );
            return;
          }
        }
        context.withPendingBrowser(linkedBrowser, () => fire.sync(info, tab));
      };

      extension.on("webext-menu-menuitem-click", listener);
      return {
        unregister() {
          extension.off("webext-menu-menuitem-click", listener);
        },
        convert(_fire, _context) {
          fire = _fire;
          context = _context;
        },
      };
    },
  };

  getAPI(context) {
    let { extension } = context;

    return {
      menus: {
        refresh() {
          gMenuBuilder.rebuildMenu(extension);
        },

        onShown: new EventManager({
          context,
          module: "menus",
          event: "onShown",
          extensionApi: this,
        }).api(),
        onHidden: new EventManager({
          context,
          module: "menus",
          event: "onHidden",
          extensionApi: this,
        }).api(),
        onClicked: new EventManager({
          context,
          module: "menus",
          event: "onClicked",
          extensionApi: this,
        }).api(),

        create(createProperties) {
          // event pages require id
          if (!extension.persistentBackground) {
            if (!createProperties.id) {
              throw new ExtensionError(
                "menus.create requires an id for non-persistent background scripts."
              );
            }
            if (gMenuMap.get(extension).has(createProperties.id)) {
              throw new ExtensionError(
                `The menu id ${createProperties.id} already exists in menus.create.`
              );
            }
          }

          // Note that the id is required by the schema. If the addon did not set
          // it, the implementation of menus.create in the child will add it for
          // extensions with persistent backgrounds, but not otherwise.
          let menuItem = new MenuItem(extension, createProperties);
          gMenuMap.get(extension).set(menuItem.id, menuItem);
          if (!extension.persistentBackground) {
            // Only cache properties that are necessary.
            let cached = {};
            MenuItem.mergeProps(cached, createProperties);
            gStartupCache.get(extension).set(menuItem.id, cached);
            StartupCache.save();
          }
        },

        update(id, updateProperties) {
          let menuItem = gMenuMap.get(extension).get(id);
          if (!menuItem) {
            return;
          }
          menuItem.setProps(updateProperties);

          // Update the startup cache for non-persistent extensions.
          if (extension.persistentBackground) {
            return;
          }

          let cached = gStartupCache.get(extension).get(id);
          let reparent =
            updateProperties.parentId != null &&
            cached.parentId != updateProperties.parentId;
          MenuItem.mergeProps(cached, updateProperties);
          if (reparent) {
            // The order of menu creation is significant, see reparentInCache.
            menuItem.reparentInCache();
          }
          StartupCache.save();
        },

        remove(id) {
          let menuItem = gMenuMap.get(extension).get(id);
          if (menuItem) {
            menuItem.remove();
          }
        },

        removeAll() {
          let root = gRootItems.get(extension);
          if (root) {
            root.remove();
          }
          // Should be empty, just extra assurance.
          if (!extension.persistentBackground) {
            let cached = gStartupCache.get(extension);
            if (cached.size) {
              cached.clear();
              StartupCache.save();
            }
          }
        },
      },
    };
  }
};
