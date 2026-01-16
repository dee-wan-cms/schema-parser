import type { DMMF } from '@prisma/generator-helper'
import type { Model, Field } from './types'

function encodeType(baseType: string, isList: boolean): string {
  return isList ? `${baseType}[]` : baseType
}

export function convertDMMFToModels(datamodel: DMMF.Datamodel): Model[] {
  return datamodel.models.map((dmmfModel) => {
    const fields: Field[] = []

    for (const field of dmmfModel.fields) {
      if (field.kind === 'scalar') {
        fields.push({
          name: field.name,
          type: encodeType(String(field.type), Boolean(field.isList)),
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
        const fk = field.relationFromFields?.[0]
        const refs = field.relationToFields?.[0]
        const isFkLocal = Boolean(
          field.relationFromFields && field.relationFromFields.length > 0,
        )

        fields.push({
          name: field.name,
          type: encodeType(String(field.type), Boolean(field.isList)),
          isRequired: field.isRequired,
          isRelation: true,
          relatedModel: String(field.type),
          foreignKey: fk,
          references: refs,
          relationName: field.relationName,
          isForeignKeyLocal: isFkLocal,
        })
      }
    }

    return {
      name: dmmfModel.name,
      tableName: dmmfModel.dbName || dmmfModel.name,
      fields,
    }
  })
}
