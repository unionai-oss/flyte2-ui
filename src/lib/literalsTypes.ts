/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */

export type JsonSchemaProperty = {
  title?: string
  description?: string
  type: string
  format?: string
  enum?: (string | number)[]
  default?: unknown
}

export type JsonSchemaObject = {
  title?: string
  description?: string
  type: string
  format?: string
  properties?: Record<string, JsonSchemaProperty | JsonSchemaObject>
  items?: JsonSchemaType
  additionalProperties?: JsonSchemaType
  oneOf?: Array<{
    type: string
    properties: Record<string, JsonSchemaProperty | JsonSchemaObject>
  }>
  default?: unknown
}

export type JsonSchemaType = JsonSchemaObject | JsonSchemaProperty

export type LiteralTypeCase =
  | 'blob'
  | 'simple'
  | 'schema'
  | 'collectionType'
  | 'mapValueType'
  | 'enumType'
  | 'structuredDatasetType'
  | 'unionType'
