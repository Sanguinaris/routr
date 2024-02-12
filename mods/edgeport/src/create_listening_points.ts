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
import { EdgePortConfig, ListeningPoint, SipStack } from "./types"

/**
 * Creates "listening" points for all the given transport.
 *
 * @param {SipStack} sipStack - SipStack to create LPs for
 * @param {EdgePortConfig} config - Edgeport configuration
 * @return {ListeningPoint[]}
 */
export default function createListeningPoints(
  sipStack: SipStack,
  config: EdgePortConfig
): Array<ListeningPoint> {
  const listeningPoints: Array<ListeningPoint> = []
  config.spec.transport?.forEach((trans) => {
    const proto = trans.protocol.toLowerCase()

    // If none was found we use the global bindAddr
    if (trans.bindAddr === undefined) {
      trans.bindAddr = config.spec.bindAddr
    }

    try {
      const lp = sipStack.createListeningPoint(
        trans.bindAddr,
        trans.port,
        proto
      )
      listeningPoints.push(lp)
    } catch (e) {
      throw new Error(
        `unable to bind ${proto}://${trans.bindAddr}:${trans.port}`
      )
    }
  })

  return listeningPoints
}
