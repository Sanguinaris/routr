#!/usr/bin/env node
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
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("./tracer").init("dispatcher")
import Processor, {
  Helper as H,
  MessageRequest,
  Response
} from "@routr/processor"
import { offer, answer, del, query } from "./client"
import { CommonErrors as CE } from "@routr/common"
import { Direction, RTPEFunction } from "./types"
import { getLogger } from "@fonoster/logger"
import {
  getDirectionFromRequest,
  getDirectionFromResponse,
  shouldNotHandleRequest
} from "./utils"

const logger = getLogger({ service: "rtprelay", filePath: __filename })

/**
 * Creates a new rtprelay service.
 *
 * @param {string} bindAddr - The address to bind to.
 * @param {object} rtpeConfig - The address of the rtpengine server.
 */
export default function rtprelay(
  bindAddr: string,
  rtpeConfig: { host: string; port: number }
) {
  new Processor({
    bindAddr,
    name: "rtprelay-middleware"
  }).listen(async (req: MessageRequest, res: Response) => {
    try {
      if (shouldNotHandleRequest(req)) {
        return res.send(req)
      }

      const direction = H.isTypeResponse(req)
        ? getDirectionFromResponse(req)
        : getDirectionFromRequest(req)

      const sendRequest = async (f: RTPEFunction, invertTags = false) => {
        const r = await f(rtpeConfig, invertTags)(req)

        if (r.result === "error") {
          throw new CE.BadRequestError(r["error-reason"])
        }

        req.message.body = r.sdp

        return res.send(req)
      }

      const queryResponse = await query(rtpeConfig)(req)
      const isNewCall = queryResponse.result === "error"

      logger.verbose("request", {
        direction,
        isNewCall,
        type: H.isTypeRequest(req) ? req.method : req.message.responseType
      })

      if (H.isInviteWithSDP(req)) {
        return await sendRequest(offer)
      } else if (H.isAckWithSDP(req)) {
        return await sendRequest(answer, true)
      } else if (H.isRinging(req) && direction === Direction.WEB_TO_PHONE) {
        // FIXME: This was added to prevent the ringing message from being sent to the
        // caller while the call is being established. This is a temporary fix
        req.message.body = ""
      } else if (H.isResponseWithSDP(req) && isNewCall) {
        return await sendRequest(offer, true)
      } else if (H.isResponseWithSDP(req)) {
        return await sendRequest(answer)
      } else if (H.isBye(req)) {
        return await sendRequest(del)
      }

      res.send(req)
    } catch (e) {
      logger.error(e)
      res.sendInternalServerError()
    }
  })
}
