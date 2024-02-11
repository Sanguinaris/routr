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
import chai from "chai"
import sinon from "sinon"
import sinonChai from "sinon-chai"
import MemoryStore from "../src/memory_store"
import * as Routes from "./route_examples"

const expect = chai.expect
chai.use(sinonChai)
const sandbox = sinon.createSandbox()

describe("@routr/location/memory_store", () => {
  afterEach(() => sandbox.restore())

  it("puts value in a collection", async () => {
    const store = new MemoryStore()
    store.put("sip:voice@sip.local", Routes.voiceBackendRoute01)
    store.put("sip:voice@sip.local", Routes.voiceBackendRoute02)
    store.put("sip:voice@sip.local", Routes.voiceBackendRoute02)
    store.put("sip:conference@sip.local", Routes.conferenceBackendRoute01)
    store.put("sip:conference@sip.local", Routes.conferenceBackendRoute01)
    expect(store.size()).to.be.equal(2)
    expect((await store.get("sip:voice@sip.local")).length).to.be.equal(2)
    expect((await store.get("sip:conference@sip.local")).length).to.be.equal(1)
  })

  it("test removing all routes for an aor", async () => {
    const store = new MemoryStore()
    store.put("sip:voice@sip.local", Routes.voiceBackendRoute01)
    store.put("sip:voice@sip.local", Routes.voiceBackendRoute02)
    store.put("sip:voice@sip.local", Routes.voiceBackendRoute02)
    await store.delete("sip:voice@sip.local")
    expect(await store.get("sip:voice@sip.local")).to.be.empty
  })

  it("sets an expire route and clean the collection", async () => {
    const store = new MemoryStore()
    store.put("sip:voice@sip.local", Routes.voiceBackendRoute01)
    store.put("sip:voice@sip.local", Routes.voiceBackendRoute02)
    store.put("sip:voice@sip.local", Routes.voiceBackendRoute02)
    store.put("sip:conference@sip.local", Routes.conferenceBackendRoute01)
    store.put("sip:conference@sip.local", Routes.conferenceWithExpiredRoute)
    store.cleanup()
    expect(store.size()).to.be.equal(2)
    expect((await store.get("sip:conference@sip.local")).length).to.be.equal(1)
  })
})
