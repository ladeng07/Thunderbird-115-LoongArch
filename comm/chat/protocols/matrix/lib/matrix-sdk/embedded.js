"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RoomWidgetClient = void 0;
var _matrixWidgetApi = require("matrix-widget-api");
var _event = require("./models/event");
var _event2 = require("./@types/event");
var _logger = require("./logger");
var _client = require("./client");
var _sync = require("./sync");
var _slidingSyncSdk = require("./sliding-sync-sdk");
var _user = require("./models/user");
var _utils = require("./utils");
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /*
                                                                                                                                                                                                                                                                                                                                                                                          Copyright 2022 The Matrix.org Foundation C.I.C.
                                                                                                                                                                                                                                                                                                                                                                                          
                                                                                                                                                                                                                                                                                                                                                                                          Licensed under the Apache License, Version 2.0 (the "License");
                                                                                                                                                                                                                                                                                                                                                                                          you may not use this file except in compliance with the License.
                                                                                                                                                                                                                                                                                                                                                                                          You may obtain a copy of the License at
                                                                                                                                                                                                                                                                                                                                                                                          
                                                                                                                                                                                                                                                                                                                                                                                              http://www.apache.org/licenses/LICENSE-2.0
                                                                                                                                                                                                                                                                                                                                                                                          
                                                                                                                                                                                                                                                                                                                                                                                          Unless required by applicable law or agreed to in writing, software
                                                                                                                                                                                                                                                                                                                                                                                          distributed under the License is distributed on an "AS IS" BASIS,
                                                                                                                                                                                                                                                                                                                                                                                          WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
                                                                                                                                                                                                                                                                                                                                                                                          See the License for the specific language governing permissions and
                                                                                                                                                                                                                                                                                                                                                                                          limitations under the License.
                                                                                                                                                                                                                                                                                                                                                                                          */
/**
 * A MatrixClient that routes its requests through the widget API instead of the
 * real CS API.
 * @experimental This class is considered unstable!
 */
class RoomWidgetClient extends _client.MatrixClient {
  constructor(widgetApi, capabilities, roomId, opts) {
    super(opts);

    // Request capabilities for the functionality this client needs to support
    this.widgetApi = widgetApi;
    this.capabilities = capabilities;
    this.roomId = roomId;
    _defineProperty(this, "room", void 0);
    _defineProperty(this, "widgetApiReady", new Promise(resolve => this.widgetApi.once("ready", resolve)));
    _defineProperty(this, "lifecycle", void 0);
    _defineProperty(this, "syncState", null);
    _defineProperty(this, "onEvent", async ev => {
      ev.preventDefault();

      // Verify the room ID matches, since it's possible for the client to
      // send us events from other rooms if this widget is always on screen
      if (ev.detail.data.room_id === this.roomId) {
        const event = new _event.MatrixEvent(ev.detail.data);
        await this.syncApi.injectRoomEvents(this.room, [], [event]);
        this.emit(_client.ClientEvent.Event, event);
        this.setSyncState(_sync.SyncState.Syncing);
        _logger.logger.info(`Received event ${event.getId()} ${event.getType()} ${event.getStateKey()}`);
      } else {
        const {
          event_id: eventId,
          room_id: roomId
        } = ev.detail.data;
        _logger.logger.info(`Received event ${eventId} for a different room ${roomId}; discarding`);
      }
      await this.ack(ev);
    });
    _defineProperty(this, "onToDevice", async ev => {
      ev.preventDefault();
      const event = new _event.MatrixEvent({
        type: ev.detail.data.type,
        sender: ev.detail.data.sender,
        content: ev.detail.data.content
      });
      // Mark the event as encrypted if it was, using fake contents and keys since those are unknown to us
      if (ev.detail.data.encrypted) event.makeEncrypted(_event2.EventType.RoomMessageEncrypted, {}, "", "");
      this.emit(_client.ClientEvent.ToDeviceEvent, event);
      this.setSyncState(_sync.SyncState.Syncing);
      await this.ack(ev);
    });
    if (capabilities.sendEvent?.length || capabilities.receiveEvent?.length || capabilities.sendMessage === true || Array.isArray(capabilities.sendMessage) && capabilities.sendMessage.length || capabilities.receiveMessage === true || Array.isArray(capabilities.receiveMessage) && capabilities.receiveMessage.length || capabilities.sendState?.length || capabilities.receiveState?.length) {
      widgetApi.requestCapabilityForRoomTimeline(roomId);
    }
    capabilities.sendEvent?.forEach(eventType => widgetApi.requestCapabilityToSendEvent(eventType));
    capabilities.receiveEvent?.forEach(eventType => widgetApi.requestCapabilityToReceiveEvent(eventType));
    if (capabilities.sendMessage === true) {
      widgetApi.requestCapabilityToSendMessage();
    } else if (Array.isArray(capabilities.sendMessage)) {
      capabilities.sendMessage.forEach(msgType => widgetApi.requestCapabilityToSendMessage(msgType));
    }
    if (capabilities.receiveMessage === true) {
      widgetApi.requestCapabilityToReceiveMessage();
    } else if (Array.isArray(capabilities.receiveMessage)) {
      capabilities.receiveMessage.forEach(msgType => widgetApi.requestCapabilityToReceiveMessage(msgType));
    }
    capabilities.sendState?.forEach(({
      eventType,
      stateKey
    }) => widgetApi.requestCapabilityToSendState(eventType, stateKey));
    capabilities.receiveState?.forEach(({
      eventType,
      stateKey
    }) => widgetApi.requestCapabilityToReceiveState(eventType, stateKey));
    capabilities.sendToDevice?.forEach(eventType => widgetApi.requestCapabilityToSendToDevice(eventType));
    capabilities.receiveToDevice?.forEach(eventType => widgetApi.requestCapabilityToReceiveToDevice(eventType));
    if (capabilities.turnServers) {
      widgetApi.requestCapability(_matrixWidgetApi.MatrixCapabilities.MSC3846TurnServers);
    }
    widgetApi.on(`action:${_matrixWidgetApi.WidgetApiToWidgetAction.SendEvent}`, this.onEvent);
    widgetApi.on(`action:${_matrixWidgetApi.WidgetApiToWidgetAction.SendToDevice}`, this.onToDevice);

    // Open communication with the host
    widgetApi.start();
  }
  async startClient(opts = {}) {
    this.lifecycle = new AbortController();

    // Create our own user object artificially (instead of waiting for sync)
    // so it's always available, even if the user is not in any rooms etc.
    const userId = this.getUserId();
    if (userId) {
      this.store.storeUser(new _user.User(userId));
    }

    // Even though we have no access token and cannot sync, the sync class
    // still has some valuable helper methods that we make use of, so we
    // instantiate it anyways
    if (opts.slidingSync) {
      this.syncApi = new _slidingSyncSdk.SlidingSyncSdk(opts.slidingSync, this, opts, this.buildSyncApiOptions());
    } else {
      this.syncApi = new _sync.SyncApi(this, opts, this.buildSyncApiOptions());
    }
    this.room = this.syncApi.createRoom(this.roomId);
    this.store.storeRoom(this.room);
    await this.widgetApiReady;

    // Backfill the requested events
    // We only get the most recent event for every type + state key combo,
    // so it doesn't really matter what order we inject them in
    await Promise.all(this.capabilities.receiveState?.map(async ({
      eventType,
      stateKey
    }) => {
      const rawEvents = await this.widgetApi.readStateEvents(eventType, undefined, stateKey, [this.roomId]);
      const events = rawEvents.map(rawEvent => new _event.MatrixEvent(rawEvent));
      await this.syncApi.injectRoomEvents(this.room, [], events);
      events.forEach(event => {
        this.emit(_client.ClientEvent.Event, event);
        _logger.logger.info(`Backfilled event ${event.getId()} ${event.getType()} ${event.getStateKey()}`);
      });
    }) ?? []);
    this.setSyncState(_sync.SyncState.Syncing);
    _logger.logger.info("Finished backfilling events");

    // Watch for TURN servers, if requested
    if (this.capabilities.turnServers) this.watchTurnServers();
  }
  stopClient() {
    this.widgetApi.off(`action:${_matrixWidgetApi.WidgetApiToWidgetAction.SendEvent}`, this.onEvent);
    this.widgetApi.off(`action:${_matrixWidgetApi.WidgetApiToWidgetAction.SendToDevice}`, this.onToDevice);
    super.stopClient();
    this.lifecycle.abort(); // Signal to other async tasks that the client has stopped
  }

  async joinRoom(roomIdOrAlias) {
    if (roomIdOrAlias === this.roomId) return this.room;
    throw new Error(`Unknown room: ${roomIdOrAlias}`);
  }
  async encryptAndSendEvent(room, event) {
    let response;
    try {
      response = await this.widgetApi.sendRoomEvent(event.getType(), event.getContent(), room.roomId);
    } catch (e) {
      this.updatePendingEventStatus(room, event, _event.EventStatus.NOT_SENT);
      throw e;
    }
    room.updatePendingEvent(event, _event.EventStatus.SENT, response.event_id);
    return {
      event_id: response.event_id
    };
  }
  async sendStateEvent(roomId, eventType, content, stateKey = "") {
    return await this.widgetApi.sendStateEvent(eventType, stateKey, content, roomId);
  }
  async sendToDevice(eventType, contentMap) {
    await this.widgetApi.sendToDevice(eventType, false, (0, _utils.recursiveMapToObject)(contentMap));
    return {};
  }
  async queueToDevice({
    eventType,
    batch
  }) {
    // map: user Id → device Id → payload
    const contentMap = new _utils.MapWithDefault(() => new Map());
    for (const {
      userId,
      deviceId,
      payload
    } of batch) {
      contentMap.getOrCreate(userId).set(deviceId, payload);
    }
    await this.widgetApi.sendToDevice(eventType, false, (0, _utils.recursiveMapToObject)(contentMap));
  }
  async encryptAndSendToDevices(userDeviceInfoArr, payload) {
    // map: user Id → device Id → payload
    const contentMap = new _utils.MapWithDefault(() => new Map());
    for (const {
      userId,
      deviceInfo: {
        deviceId
      }
    } of userDeviceInfoArr) {
      contentMap.getOrCreate(userId).set(deviceId, payload);
    }
    await this.widgetApi.sendToDevice(payload.type, true, (0, _utils.recursiveMapToObject)(contentMap));
  }

  // Overridden since we get TURN servers automatically over the widget API,
  // and this method would otherwise complain about missing an access token
  async checkTurnServers() {
    return this.turnServers.length > 0;
  }

  // Overridden since we 'sync' manually without the sync API
  getSyncState() {
    return this.syncState;
  }
  setSyncState(state) {
    const oldState = this.syncState;
    this.syncState = state;
    this.emit(_client.ClientEvent.Sync, state, oldState);
  }
  async ack(ev) {
    await this.widgetApi.transport.reply(ev.detail, {});
  }
  async watchTurnServers() {
    const servers = this.widgetApi.getTurnServers();
    const onClientStopped = () => {
      servers.return(undefined);
    };
    this.lifecycle.signal.addEventListener("abort", onClientStopped);
    try {
      for await (const server of servers) {
        this.turnServers = [{
          urls: server.uris,
          username: server.username,
          credential: server.password
        }];
        this.emit(_client.ClientEvent.TurnServers, this.turnServers);
        _logger.logger.log(`Received TURN server: ${server.uris}`);
      }
    } catch (e) {
      _logger.logger.warn("Error watching TURN servers", e);
    } finally {
      this.lifecycle.signal.removeEventListener("abort", onClientStopped);
    }
  }
}
exports.RoomWidgetClient = RoomWidgetClient;