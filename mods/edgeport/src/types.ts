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
export interface Transport {
  protocol: string
  bindAddr?: string
  port: number
}

export interface EdgePortConfig {
  spec: {
    bindAddr: string
    transport: Transport[]
    processor: {
      addr: string
    }
    externalAddrs?: string[]
    localnets: string[]
    securityContext?: {
      debugging: boolean
      keyStore: string
      trustStore: string
      trustStorePassword: string
      keyStorePassword: string
      keyStoreType: string
      client: {
        authType: string
        protocols: string[]
      }
    }
  }
}

export declare interface SipStack {
  createListeningPoint: (
    bindAddr: string,
    port: number,
    proto: string
  ) => unknown
  createSipProvider: (lp: ListeningPoint) => SipProvider
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getClass: any
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export declare interface ListeningPoint {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export declare interface Java {}

export declare interface SipProvider {
  addListeningPoint: (lp: ListeningPoint) => void
  addSipListener: (lp: unknown) => void
}
