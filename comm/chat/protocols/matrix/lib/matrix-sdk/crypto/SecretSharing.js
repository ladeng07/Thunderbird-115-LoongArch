"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SecretSharing = void 0;
var _uuid = require("uuid");
var _utils = require("../utils");
var _event = require("../@types/event");
var _logger = require("../logger");
var olmlib = _interopRequireWildcard(require("./olmlib"));
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); } /*
                                                                                                                                                                                                                                                                                                                                                                                          Copyright 2019-2023 The Matrix.org Foundation C.I.C.
                                                                                                                                                                                                                                                                                                                                                                                          
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
class SecretSharing {
  constructor(baseApis, cryptoCallbacks) {
    this.baseApis = baseApis;
    this.cryptoCallbacks = cryptoCallbacks;
    _defineProperty(this, "requests", new Map());
  }

  /**
   * Request a secret from another device
   *
   * @param name - the name of the secret to request
   * @param devices - the devices to request the secret from
   */
  request(name, devices) {
    const requestId = this.baseApis.makeTxnId();
    const deferred = (0, _utils.defer)();
    this.requests.set(requestId, {
      name,
      devices,
      deferred
    });
    const cancel = reason => {
      // send cancellation event
      const cancelData = {
        action: "request_cancellation",
        requesting_device_id: this.baseApis.deviceId,
        request_id: requestId
      };
      const toDevice = new Map();
      for (const device of devices) {
        toDevice.set(device, cancelData);
      }
      this.baseApis.sendToDevice("m.secret.request", new Map([[this.baseApis.getUserId(), toDevice]]));

      // and reject the promise so that anyone waiting on it will be
      // notified
      deferred.reject(new Error(reason || "Cancelled"));
    };

    // send request to devices
    const requestData = {
      name,
      action: "request",
      requesting_device_id: this.baseApis.deviceId,
      request_id: requestId,
      [_event.ToDeviceMessageId]: (0, _uuid.v4)()
    };
    const toDevice = new Map();
    for (const device of devices) {
      toDevice.set(device, requestData);
    }
    _logger.logger.info(`Request secret ${name} from ${devices}, id ${requestId}`);
    this.baseApis.sendToDevice("m.secret.request", new Map([[this.baseApis.getUserId(), toDevice]]));
    return {
      requestId,
      promise: deferred.promise,
      cancel
    };
  }
  async onRequestReceived(event) {
    const sender = event.getSender();
    const content = event.getContent();
    if (sender !== this.baseApis.getUserId() || !(content.name && content.action && content.requesting_device_id && content.request_id)) {
      // ignore requests from anyone else, for now
      return;
    }
    const deviceId = content.requesting_device_id;
    // check if it's a cancel
    if (content.action === "request_cancellation") {
      /*
      Looks like we intended to emit events when we got cancelations, but
      we never put anything in the _incomingRequests object, and the request
      itself doesn't use events anyway so if we were to wire up cancellations,
      they probably ought to use the same callback interface. I'm leaving them
      disabled for now while converting this file to typescript.
      if (this._incomingRequests[deviceId]
          && this._incomingRequests[deviceId][content.request_id]) {
          logger.info(
              "received request cancellation for secret (" + sender +
              ", " + deviceId + ", " + content.request_id + ")",
          );
          this.baseApis.emit("crypto.secrets.requestCancelled", {
              user_id: sender,
              device_id: deviceId,
              request_id: content.request_id,
          });
      }
      */
    } else if (content.action === "request") {
      if (deviceId === this.baseApis.deviceId) {
        // no point in trying to send ourself the secret
        return;
      }

      // check if we have the secret
      _logger.logger.info("received request for secret (" + sender + ", " + deviceId + ", " + content.request_id + ")");
      if (!this.cryptoCallbacks.onSecretRequested) {
        return;
      }
      const secret = await this.cryptoCallbacks.onSecretRequested(sender, deviceId, content.request_id, content.name, this.baseApis.checkDeviceTrust(sender, deviceId));
      if (secret) {
        _logger.logger.info(`Preparing ${content.name} secret for ${deviceId}`);
        const payload = {
          type: "m.secret.send",
          content: {
            request_id: content.request_id,
            secret: secret
          }
        };
        const encryptedContent = {
          algorithm: olmlib.OLM_ALGORITHM,
          sender_key: this.baseApis.crypto.olmDevice.deviceCurve25519Key,
          ciphertext: {},
          [_event.ToDeviceMessageId]: (0, _uuid.v4)()
        };
        await olmlib.ensureOlmSessionsForDevices(this.baseApis.crypto.olmDevice, this.baseApis, new Map([[sender, [this.baseApis.getStoredDevice(sender, deviceId)]]]));
        await olmlib.encryptMessageForDevice(encryptedContent.ciphertext, this.baseApis.getUserId(), this.baseApis.deviceId, this.baseApis.crypto.olmDevice, sender, this.baseApis.getStoredDevice(sender, deviceId), payload);
        const contentMap = new Map([[sender, new Map([[deviceId, encryptedContent]])]]);
        _logger.logger.info(`Sending ${content.name} secret for ${deviceId}`);
        this.baseApis.sendToDevice("m.room.encrypted", contentMap);
      } else {
        _logger.logger.info(`Request denied for ${content.name} secret for ${deviceId}`);
      }
    }
  }
  onSecretReceived(event) {
    if (event.getSender() !== this.baseApis.getUserId()) {
      // we shouldn't be receiving secrets from anyone else, so ignore
      // because someone could be trying to send us bogus data
      return;
    }
    if (!olmlib.isOlmEncrypted(event)) {
      _logger.logger.error("secret event not properly encrypted");
      return;
    }
    const content = event.getContent();
    const senderKeyUser = this.baseApis.crypto.deviceList.getUserByIdentityKey(olmlib.OLM_ALGORITHM, event.getSenderKey() || "");
    if (senderKeyUser !== event.getSender()) {
      _logger.logger.error("sending device does not belong to the user it claims to be from");
      return;
    }
    _logger.logger.log("got secret share for request", content.request_id);
    const requestControl = this.requests.get(content.request_id);
    if (requestControl) {
      // make sure that the device that sent it is one of the devices that
      // we requested from
      const deviceInfo = this.baseApis.crypto.deviceList.getDeviceByIdentityKey(olmlib.OLM_ALGORITHM, event.getSenderKey());
      if (!deviceInfo) {
        _logger.logger.log("secret share from unknown device with key", event.getSenderKey());
        return;
      }
      if (!requestControl.devices.includes(deviceInfo.deviceId)) {
        _logger.logger.log("unsolicited secret share from device", deviceInfo.deviceId);
        return;
      }
      // unsure that the sender is trusted.  In theory, this check is
      // unnecessary since we only accept secret shares from devices that
      // we requested from, but it doesn't hurt.
      const deviceTrust = this.baseApis.crypto.checkDeviceInfoTrust(event.getSender(), deviceInfo);
      if (!deviceTrust.isVerified()) {
        _logger.logger.log("secret share from unverified device");
        return;
      }
      _logger.logger.log(`Successfully received secret ${requestControl.name} ` + `from ${deviceInfo.deviceId}`);
      requestControl.deferred.resolve(content.secret);
    }
  }
}
exports.SecretSharing = SecretSharing;