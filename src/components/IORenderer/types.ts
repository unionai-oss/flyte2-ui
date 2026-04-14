/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

import { JsonSchemaType } from '@/lib/literalsTypes'
import { JsonObject } from '@bufbuild/protobuf'

// Type for JSON schema that can come from the API (JsonObject) or be constructed
export type JsonSchemaInput = JsonObject & {
  properties?: Record<string, JsonSchemaType>
  required?: string[]
  default?: Record<string, unknown>
  $defs?: Record<string, JsonSchemaType>
}

export interface IORendererProps {
  isLoading: boolean
  jsonSchema?: JsonSchemaInput
  /**
   * Data to show in raw JSON view.
   * When formDataProvided is true, this is used as-is (undefined → empty object);
   * when false, undefined causes a fallback to schema defaults to avoid ambiguity.
   */
  formData?: Record<string, unknown>
  /** Set true when the parent already computed formData (e.g. from schema). Avoids redundant getFormDataFromSchemaDefaults in IORenderer. */
  formDataProvided?: boolean
  noDataMessage?: string
  expandLevel?: number
}
