/*
 * Copyright (C) 2024 by Fonoster Inc (https://fonoster.com)
 * http://github.com/fonoster/routr
 *
 * This file is part of Routr
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *    https://opensource.org/licenses/MIT
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package io.routr.events;

// Enum for event types
public enum EventTypes {
  // Event types
  CALL_STARTED("call.started"),
  CALL_ENDED("call.ended"),
  ENDPOINT_REGISTERED("endpoint.registered");

  // Type
  private final String type;

  // Constructor
  EventTypes(String type) {
    this.type = type;
  }

  // Get type
  public String getType() {
    return type;
  }
}