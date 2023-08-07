/* eslint-disable @typescript-eslint/no-explicit-any */
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
import {
  MessageRequest,
  Method,
  PROCESSOR_OBJECT_PROTO,
  ProcessorConfig,
  CommonTypes as CT
} from "@routr/common"
import chai from "chai"
import sinon from "sinon"
import sinonChai from "sinon-chai"
import connectToBackend from "../src/connections"
import processor from "../src/processor"
import { findProcessor, hasMethod } from "../src/find_processor"
import { getConfig } from "../src/config/get_config"
import { ProcessorCallback, RunProcessorParams } from "../src/types"

const expect = chai.expect
chai.use(sinonChai)
const sandbox = sinon.createSandbox()

const config1: ProcessorConfig = {
  ref: "processor-ref1",
  addr: "localhost:51903",
  methods: [Method.REGISTER],
  matchFunc: (request: MessageRequest) => request.method === "REGISTER"
}

const config2: ProcessorConfig = {
  ref: "processor-ref2",
  addr: "remotehost:50055",
  methods: [Method.REGISTER, Method.INVITE],
  matchFunc: (request: MessageRequest) =>
    request.method === "REGISTER" || request.method === "INVITE"
}

const config3: ProcessorConfig = {
  ref: "processor-ref3",
  addr: "remotehost:50055",
  methods: [Method.REGISTER, Method.INVITE, Method.MESSAGE],
  matchFunc: () => true
}

const messageRequest: MessageRequest = {
  ref: "call-id",
  edgePortRef: "d001",
  method: Method.REGISTER,
  listeningPoints: [
    {
      host: "localhost",
      port: 5060,
      transport: CT.Transport.TCP
    }
  ],
  sender: {
    port: 5060,
    host: "localhost",
    transport: CT.Transport.TCP
  },
  externalAddrs: [],
  localnets: [],
  message: {} as unknown as CT.SIPMessage
}

describe("@routr/dispatcher", () => {
  afterEach(() => sandbox.restore())

  describe("find_processor", () => {
    it("checks if method of the request is enabled", () => {
      const messageRequest2 = { ...messageRequest }
      messageRequest2.method = Method.MESSAGE
      expect(hasMethod(config1, messageRequest)).to.be.equal(true)
      expect(hasMethod(config1, messageRequest2)).to.be.equal(false)
    })

    it("matches incoming request as a REGISTER", () => {
      expect(findProcessor([config1, config2])(messageRequest))
        .to.be.have.property("ref")
        .to.be.equal("processor-ref1")
    })

    it("matches incoming request as an INVITE", () => {
      const messageRequest2 = { ...messageRequest }
      messageRequest2.method = Method.INVITE
      expect(findProcessor([config1, config2])(messageRequest2))
        .to.be.have.property("ref")
        .to.be.equal("processor-ref2")
    })

    it("matches incoming request as an MESSAGE", () => {
      const messageRequest2 = { ...messageRequest }
      messageRequest2.method = Method.MESSAGE
      expect(findProcessor([config1, config2, config3])(messageRequest2))
        .to.be.have.property("ref")
        .to.be.equal("processor-ref3")
    })

    it("fails because there is not matching processor", () => {
      const messageRequest2 = { ...messageRequest }
      messageRequest2.method = Method.PUBLISH
      const error = findProcessor([config1, config2, config3])(messageRequest2)
      expect(error.toString()).to.include(
        "not matching processor found for request"
      )
    })
  })

  describe("processor", () => {
    it("callback gets invoke with an error", async () => {
      sandbox.stub(PROCESSOR_OBJECT_PROTO as any, "Processor").returns({
        processMessage: (_: unknown, callback: any) => {
          callback(new Error())
        }
      })

      await processor({ processors: [config1] })(
        { request: messageRequest } as RunProcessorParams,
        (err: Error) => {
          expect(err).to.be.null
        }
      )
    })

    it("it invokes callback with correct response", async () => {
      sandbox.stub(PROCESSOR_OBJECT_PROTO as any, "Processor").returns({
        processMessage: (request: unknown, callback: any) => {
          callback(null, request)
        }
      })

      await processor({ processors: [config1] })(
        { request: messageRequest } as RunProcessorParams,
        (err: Error, response: any) => {
          expect(response).to.be.deep.equal(messageRequest)
        }
      )
    })

    it("callback gets invoke with error 14(service unavailable)", async () => {
      sandbox.stub(PROCESSOR_OBJECT_PROTO as any, "Processor").returns({
        processMessage: (_: unknown, callback: ProcessorCallback) => {
          callback({
            code: 14
          })
        }
      })

      await processor({ processors: [config1] })(
        { request: messageRequest } as RunProcessorParams,
        (err: any) => {
          expect(err?.toString()).to.be.include(
            "processor ref = processor-ref1 is unavailable"
          )
        }
      )
    })
  })

  it("creates a connection for every processor config", () => {
    const processorObjectProtoStub = sandbox.stub(
      PROCESSOR_OBJECT_PROTO as any,
      "Processor"
    )
    connectToBackend([config1, config2])
    expect(processorObjectProtoStub).to.have.been.calledTwice
  })

  it("gets configuration from file", async () => {
    const result = getConfig(__dirname + "/../../../config/dispatcher.yaml")
    if (result._tag === "Right") {
      const config = result.right
      expect(config).to.have.property("bindAddr")
      expect(config.processors[0])
        .to.have.property("ref")
        .to.be.equal("connect-processor")
    }
  })
})
