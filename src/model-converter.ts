import type { DMMF } from '@prisma/generator-helper'
import type { Model, Field } from './types'

function encodeType(baseType: string, isList: boolean): string {
  return isList ? `${baseType}[]` : baseType
}

function toMutableKeys(
  fields: readonly string[] | undefined,
): string | string[] | undefined {
  if (!fields || fields.length === 0) return undefined
  if (fields.length === 1) return fields[0]
  return [...fields]
}

export function convertDMMFToModels(datamodel: DMMF.Datamodel): Model[] {
  return datamodel.models.map((dmmfModel) => {
    const fields: Field[] = []

    for (const field of dmmfModel.fields) {
      if (field.kind === 'scalar' || field.kind === 'enum') {
        fields.push({
          name: field.name,
          dbName: field.dbName ?? field.name,
          type: encodeType(String(field.type), Boolean(field.isList)),
          isId: Boolean(field.isId),
          isRequired: field.isRequired,
          isRelation: false,
          relatedModel: undefined,
          foreignKey: undefined,
          references: undefined,
          relationName: undefined,
          isForeignKeyLocal: undefined,
        })
        continue
      }

      if (field.kind === 'object') {
        const fromFields = field.relationFromFields ?? []
        const toFields = field.relationToFields ?? []
        const isFkLocal = fromFields.length > 0

        let foreignKey: string | string[] | undefined
        let references: string | string[] | undefined

        if (isFkLocal) {
          foreignKey = toMutableKeys(fromFields)
          references = toMutableKeys(toFields)
        } else if (field.relationName) {
          const relatedModel = datamodel.models.find(
            (m) => m.name === String(field.type),
          )

          if (relatedModel) {
            const inverseField = relatedModel.fields.find(
              (f) =>
                f.kind === 'object' &&
                f.relationName === field.relationName &&
                f.relationFromFields &&
                f.relationFromFields.length > 0,
            )

            if (inverseField) {
              foreignKey = toMutableKeys(inverseField.relationFromFields)
              references = toMutableKeys(inverseField.relationToFields)
            }
          }
        }

        fields.push({
          name: field.name,
          dbName: field.name,
          type: encodeType(String(field.type), Boolean(field.isList)),
          isRequired: field.isRequired,
          isRelation: true,
          relatedModel: String(field.type),
          foreignKey,
          references,
          relationName: field.relationName,
          isForeignKeyLocal: isFkLocal,
        })
      }
    }

    const compositePk = dmmfModel.primaryKey?.fields
    const primaryKey =
      Array.isArray(compositePk) && compositePk.length > 0
        ? { fields: compositePk.map(String) }
        : undefined

    return {
      name: dmmfModel.name,
      tableName: dmmfModel.dbName || dmmfModel.name,
      fields,
      primaryKey,
    }
  })
}