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
import { Helper as H, MessageRequest, CommonTypes } from "@routr/common"

export const getHeaderValue = (request: MessageRequest, name: string) =>
  request.message.extensions.find(
    (ext: CommonTypes.Extension) =>
      ext.name.toLowerCase() === name?.toLowerCase()
  )?.value || null

export const updateHeader = (
  request: MessageRequest,
  header: { name: string; value: string }
): MessageRequest => {
  const r = H.deepCopy(request)
  r.message.extensions = request.message.extensions.map(
    (ext: CommonTypes.Extension) => {
      return ext.name == header.name ? header : ext
    }
  )
  return r
}

export const addHeader = (
  request: MessageRequest,
  header: { name: string; value: string }
): MessageRequest => {
  const r = H.deepCopy(request)
  r.message.extensions = [...request.message.extensions, header]
  return r
}

export const removeHeader = (
  request: MessageRequest,
  name: string
): MessageRequest => {
  const r = H.deepCopy(request)
  r.message.extensions = request.message.extensions.filter(
    (ext: CommonTypes.Extension) => ext.name !== name
  )
  return r
}
