/*
 * Copyright (C) 2023 by Fonoster Inc (https://fonoster.com)
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
export const schema = {
  $id: "https://json-schema.org/draft/2020-12/schema",
  title: "Registry Service configuration",
  description: "Configuration for an instance of the Registry Service",
  type: "object",
  properties: {
    kind: {
      enum: ["Registry", "registry"]
    },
    apiVersion: {
      enum: ["v2beta1"]
    },
    metadata: {
      description: "Resource metadata",
      type: "object"
    },
    spec: {
      description: "Operations spec for Registry",
      type: "object",
      properties: {
        requesterAddr: {
          description: "Address of service to send requests to",
          type: "string"
        },
        apiAddr: {
          description: "Address of API service",
          type: "string"
        },
        registerInterval: {
          description: "Interval to send registration requests",
          type: "number"
        },
        cache: {
          type: "object",
          properties: {
            provider: {
              enum: ["memory", "redis"]
            },
            parameters: {
              type: "string"
            }
          },
          required: ["provider"]
        },
        methods: {
          description: "Acceptable SIP Methods",
          type: "array",
          items: {
            type: "string"
          },
          uniqueItems: true
        },
        edgePorts: {
          description: "List of EdgePorts for outbound registrations",
          type: "array",
          items: {
            type: "object"
          },
          properties: {
            address: {
              type: "string"
            },
            region: {
              type: "string"
            }
          },
          required: ["address"]
        }
      },
      required: ["requesterAddr", "apiAddr", "edgePorts"]
    }
  },
  required: ["kind", "spec", "apiVersion"]
}
