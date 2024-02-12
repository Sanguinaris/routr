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
import { CacheProvider, LocationConfig } from "../types"
import { Helper as H } from "@routr/common"
import { schema } from "./schema"
import Ajv from "ajv"
import * as E from "fp-ts/Either"
import { InvalidSchemaConfiguration } from "../errors"

const ajv = new Ajv()
const validate = ajv.compile(schema)

export const getConfig = (
  path: string
): E.Either<InvalidSchemaConfiguration, LocationConfig> => {
  const c = H.readConfigFile(path) as Record<string, unknown>

  if (!validate({ ...c })) {
    return E.left(
      new InvalidSchemaConfiguration(JSON.stringify(validate.errors[0].message))
    )
  }

  const config = c.spec as LocationConfig

  if (!config.cache?.provider) {
    config.cache = {
      provider: CacheProvider.MEMORY
    }
  }

  if (
    config.cache?.provider === CacheProvider.REDIS &&
    !config.cache?.parameters
  ) {
    config.cache = {
      provider: CacheProvider.REDIS,
      parameters: "host=localhost,port=6379"
    }
  }

  return E.right(config as LocationConfig)
}
