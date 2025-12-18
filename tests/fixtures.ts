// tests/fixtures/dmmf.ts
import type { DMMF } from '@prisma/generator-helper'

const field = (
  name: string,
  type: string,
  opts: Partial<DMMF.Field> = {}
): DMMF.Field => ({
  name,
  kind: 'scalar',
  isList: false,
  isRequired: true,
  type,
  isId: name === 'id',
  isUnique: name === 'id' || name === 'email',
  isReadOnly: false,
  hasDefaultValue: name === 'id',
  ...opts,
})

const relationField = (
  name: string,
  type: string,
  opts: {
    isList?: boolean
    relationName: string
    fromFields?: string[]
    toFields?: string[]
  }
): DMMF.Field => ({
  name,
  kind: 'object',
  isList: opts.isList ?? false,
  isRequired: !opts.isList,
  type,
  relationName: opts.relationName,
  relationFromFields: opts.fromFields ?? [],
  relationToFields: opts.toFields ?? [],
  isId: false,
  isUnique: false,
  isReadOnly: false,
  hasDefaultValue: false,
})

const model = (
  name: string,
  fields: DMMF.Field[],
  dbName?: string
): DMMF.Model => ({
  name,
  dbName: dbName ?? null,
  schema: null,
  fields,
  primaryKey: null,
  uniqueFields: [],
  uniqueIndexes: [],
  isGenerated: false,
})

export const POST_FIELDS: DMMF.Field[] = [
  field('id', 'Int'),
  field('title', 'String'),
  field('content', 'String'),
  field('status', 'String'),
  field('views', 'Int'),
  field('published', 'Boolean'),
  field('authorId', 'Int'),
]

export const USER_FIELDS: DMMF.Field[] = [
  field('id', 'Int'),
  field('email', 'String'),
  field('name', 'String'),
  field('role', 'String'),
  field('verified', 'Boolean'),
]

export const POST_MODEL = model('Post', POST_FIELDS, 'posts')
export const USER_MODEL = model('User', USER_FIELDS, 'users')

export const POST_WITH_RELATIONS = model('Post', [
  ...POST_FIELDS,
  relationField('author', 'User', {
    relationName: 'PostToUser',
    fromFields: ['authorId'],
    toFields: ['id'],
  }),
])

export const USER_WITH_RELATIONS = model('User', [
  ...USER_FIELDS,
  relationField('posts', 'Post', {
    isList: true,
    relationName: 'PostToUser',
  }),
])

export const BLOG_DATAMODEL: DMMF.Datamodel = {
  models: [USER_WITH_RELATIONS, POST_WITH_RELATIONS],
  enums: [],
  types: [],
  indexes: [],
}

export const MINIMAL_DATAMODEL: DMMF.Datamodel = {
  models: [POST_MODEL],
  enums: [],
  types: [],
  indexes: [],
}

export const EMPTY_DATAMODEL: DMMF.Datamodel = {
  models: [],
  enums: [],
  types: [],
  indexes: [],
}

export const withDoc = (m: DMMF.Model, doc: string): DMMF.Model => ({
  ...m,
  documentation: doc,
})