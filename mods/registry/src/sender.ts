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
import * as grpc from "@grpc/grpc-js"
import { CommonRequester as CR, CommonErrors as CE } from "@routr/common"
import { RegistrationRequest, SendMessageResponse } from "./types"

export const sendRegisterMessage = (requesterAddr: string) => {
  return (
    request: RegistrationRequest
  ): Promise<CE.ServiceUnavailableError | SendMessageResponse> => {
    const client = new CR.REQUESTER_PROTO.v2beta1.Requester(
      requesterAddr,
      grpc.credentials.createInsecure()
    )

    return new Promise((resolve, reject) => {
      client.sendMessage(
        request,
        (err: { code: number }, response: SendMessageResponse) => {
          if (err?.code === grpc.status.UNAVAILABLE) {
            return reject(new CE.ServiceUnavailableError(requesterAddr))
          } else if (err) {
            return reject(err)
          }
          resolve({ trunkRef: request.trunkRef, ...response })
        }
      )
    })
  }
}
