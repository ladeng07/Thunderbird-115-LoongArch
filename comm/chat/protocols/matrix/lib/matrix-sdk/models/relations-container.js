"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RelationsContainer = void 0;
var _relations = require("./relations");
var _event = require("./event");
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
class RelationsContainer {
  constructor(client, room) {
    this.client = client;
    this.room = room;
    // A tree of objects to access a set of related children for an event, as in:
    // this.relations.get(parentEventId).get(relationType).get(relationEventType)
    _defineProperty(this, "relations", new Map());
  }

  /**
   * Get a collection of child events to a given event in this timeline set.
   *
   * @param eventId - The ID of the event that you'd like to access child events for.
   * For example, with annotations, this would be the ID of the event being annotated.
   * @param relationType - The type of relationship involved, such as "m.annotation", "m.reference", "m.replace", etc.
   * @param eventType - The relation event's type, such as "m.reaction", etc.
   * @throws If `eventId</code>, <code>relationType</code> or <code>eventType`
   * are not valid.
   *
   * @returns
   * A container for relation events or undefined if there are no relation events for
   * the relationType.
   */
  getChildEventsForEvent(eventId, relationType, eventType) {
    return this.relations.get(eventId)?.get(relationType)?.get(eventType);
  }
  getAllChildEventsForEvent(parentEventId) {
    const relationsForEvent = this.relations.get(parentEventId) ?? new Map();
    const events = [];
    for (const relationsRecord of relationsForEvent.values()) {
      for (const relations of relationsRecord.values()) {
        events.push(...relations.getRelations());
      }
    }
    return events;
  }

  /**
   * Set an event as the target event if any Relations exist for it already.
   * Child events can point to other child events as their parent, so this method may be
   * called for events which are also logically child events.
   *
   * @param event - The event to check as relation target.
   */
  aggregateParentEvent(event) {
    const relationsForEvent = this.relations.get(event.getId());
    if (!relationsForEvent) return;
    for (const relationsWithRelType of relationsForEvent.values()) {
      for (const relationsWithEventType of relationsWithRelType.values()) {
        relationsWithEventType.setTargetEvent(event);
      }
    }
  }

  /**
   * Add relation events to the relevant relation collection.
   *
   * @param event - The new child event to be aggregated.
   * @param timelineSet - The event timeline set within which to search for the related event if any.
   */
  aggregateChildEvent(event, timelineSet) {
    if (event.isRedacted() || event.status === _event.EventStatus.CANCELLED) {
      return;
    }
    const relation = event.getRelation();
    if (!relation) return;
    const onEventDecrypted = () => {
      if (event.isDecryptionFailure()) {
        // This could for example happen if the encryption keys are not yet available.
        // The event may still be decrypted later. Register the listener again.
        event.once(_event.MatrixEventEvent.Decrypted, onEventDecrypted);
        return;
      }
      this.aggregateChildEvent(event, timelineSet);
    };

    // If the event is currently encrypted, wait until it has been decrypted.
    if (event.isBeingDecrypted() || event.shouldAttemptDecryption()) {
      event.once(_event.MatrixEventEvent.Decrypted, onEventDecrypted);
      return;
    }
    const {
      event_id: relatesToEventId,
      rel_type: relationType
    } = relation;
    const eventType = event.getType();
    let relationsForEvent = this.relations.get(relatesToEventId);
    if (!relationsForEvent) {
      relationsForEvent = new Map();
      this.relations.set(relatesToEventId, relationsForEvent);
    }
    let relationsWithRelType = relationsForEvent.get(relationType);
    if (!relationsWithRelType) {
      relationsWithRelType = new Map();
      relationsForEvent.set(relationType, relationsWithRelType);
    }
    let relationsWithEventType = relationsWithRelType.get(eventType);
    if (!relationsWithEventType) {
      relationsWithEventType = new _relations.Relations(relationType, eventType, this.client);
      relationsWithRelType.set(eventType, relationsWithEventType);
      const room = this.room ?? timelineSet?.room;
      const relatesToEvent = timelineSet?.findEventById(relatesToEventId) ?? room?.findEventById(relatesToEventId) ?? room?.getPendingEvent(relatesToEventId);
      if (relatesToEvent) {
        relationsWithEventType.setTargetEvent(relatesToEvent);
      }
    }
    relationsWithEventType.addEvent(event);
  }
}
exports.RelationsContainer = RelationsContainer;