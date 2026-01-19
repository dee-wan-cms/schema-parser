import { describe, it, expect } from 'vitest'
import type { DMMF } from '@prisma/generator-helper'
import { processModelDirectives } from '../src/directives'

const BLOG_DATAMODEL: DMMF.Datamodel = {
  models: [
    {
      name: 'User',
      dbName: 'users',
      schema: null,
      fields: [
        {
          name: 'id',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          type: 'Int',
          isId: true,
          isUnique: true,
          isReadOnly: false,
          hasDefaultValue: true,
        },
        {
          name: 'email',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          type: 'String',
          isId: false,
          isUnique: true,
          isReadOnly: false,
          hasDefaultValue: false,
        },
        {
          name: 'name',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          type: 'String',
          isId: false,
          isUnique: false,
          isReadOnly: false,
          hasDefaultValue: false,
        },
        {
          name: 'posts',
          kind: 'object',
          isList: true,
          isRequired: false,
          type: 'Post',
          relationName: 'PostToUser',
          relationFromFields: [],
          relationToFields: [],
          isId: false,
          isUnique: false,
          isReadOnly: false,
          hasDefaultValue: false,
        },
      ],
      primaryKey: null,
      uniqueFields: [],
      uniqueIndexes: [],
      isGenerated: false,
    },
    {
      name: 'Post',
      dbName: 'posts',
      schema: null,
      fields: [
        {
          name: 'id',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          type: 'Int',
          isId: true,
          isUnique: true,
          isReadOnly: false,
          hasDefaultValue: true,
        },
        {
          name: 'title',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          type: 'String',
          isId: false,
          isUnique: false,
          isReadOnly: false,
          hasDefaultValue: false,
        },
        {
          name: 'content',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          type: 'String',
          isId: false,
          isUnique: false,
          isReadOnly: false,
          hasDefaultValue: false,
        },
        {
          name: 'status',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          type: 'String',
          isId: false,
          isUnique: false,
          isReadOnly: false,
          hasDefaultValue: false,
        },
        {
          name: 'views',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          type: 'Int',
          isId: false,
          isUnique: false,
          isReadOnly: false,
          hasDefaultValue: false,
        },
        {
          name: 'published',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          type: 'Boolean',
          isId: false,
          isUnique: false,
          isReadOnly: false,
          hasDefaultValue: false,
        },
        {
          name: 'authorId',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          type: 'Int',
          isId: false,
          isUnique: false,
          isReadOnly: false,
          hasDefaultValue: false,
        },
        {
          name: 'author',
          kind: 'object',
          isList: false,
          isRequired: true,
          type: 'User',
          relationName: 'PostToUser',
          relationFromFields: ['authorId'],
          relationToFields: ['id'],
          isId: false,
          isUnique: false,
          isReadOnly: false,
          hasDefaultValue: false,
        },
        {
          name: 'comments',
          kind: 'object',
          isList: true,
          isRequired: false,
          type: 'Comment',
          relationName: 'CommentToPost',
          relationFromFields: [],
          relationToFields: [],
          isId: false,
          isUnique: false,
          isReadOnly: false,
          hasDefaultValue: false,
        },
      ],
      primaryKey: null,
      uniqueFields: [],
      uniqueIndexes: [],
      isGenerated: false,
    },
    {
      name: 'Comment',
      dbName: 'comments',
      schema: null,
      fields: [
        {
          name: 'id',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          type: 'Int',
          isId: true,
          isUnique: true,
          isReadOnly: false,
          hasDefaultValue: true,
        },
        {
          name: 'content',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          type: 'String',
          isId: false,
          isUnique: false,
          isReadOnly: false,
          hasDefaultValue: false,
        },
        {
          name: 'postId',
          kind: 'scalar',
          isList: false,
          isRequired: true,
          type: 'Int',
          isId: false,
          isUnique: false,
          isReadOnly: false,
          hasDefaultValue: false,
        },
        {
          name: 'post',
          kind: 'object',
          isList: false,
          isRequired: true,
          type: 'Post',
          relationName: 'CommentToPost',
          relationFromFields: ['postId'],
          relationToFields: ['id'],
          isId: false,
          isUnique: false,
          isReadOnly: false,
          hasDefaultValue: false,
        },
      ],
      primaryKey: null,
      uniqueFields: [],
      uniqueIndexes: [],
      isGenerated: false,
    },
  ],
  enums: [],
  types: [],
  indexes: [],
}

const POST_MODEL = BLOG_DATAMODEL.models[1]

describe('Directive Parsing Robustness', () => {
  it('should handle multiple directives with deeply nested objects', () => {
    const documentation = `
      @optimize {
        "method": "first",
        "query": {
          "where": {
            "AND": [
              { "status": { "in": ["active", "pending"] } },
              { "views": { "gte": 100 } }
            ]
          }
        }
      }
      @optimize {
        "method": "second",
        "query": {
          "where": {
            "OR": [
              { "published": true },
              { "status": "draft" }
            ]
          }
        }
      }
    `

    const result = processModelDirectives(
      { ...POST_MODEL, documentation },
      BLOG_DATAMODEL,
      { defaultCacheTtl: 300 }
    )

    expect(result.directives).toHaveLength(2)
    expect(result.directives[0].method).toBe('first')
    expect(result.directives[1].method).toBe('second')
  })

  it('should skip directive with mismatched braces', () => {
    const documentation = `
      @optimize { "method": "broken", "query": { "where": { "status": "active" } }
      @optimize { "method": "valid", "query": { "where": { "id": 1 } } }
    `

    const result = processModelDirectives(
      { ...POST_MODEL, documentation },
      BLOG_DATAMODEL,
      { defaultCacheTtl: 300 }
    )

    expect(result.directives).toHaveLength(1)
    expect(result.directives[0].method).toBe('valid')
  })

  it('should handle directives with string values containing braces', () => {
    const documentation = `
    @optimize {
      "method": "withBraces",
      "query": {
        "where": {
          "title": "Test { with } braces"
        }
      }
    }
  `

    const result = processModelDirectives(
      { ...POST_MODEL, documentation },
      BLOG_DATAMODEL,
      { defaultCacheTtl: 300 }
    )

    expect(result.directives).toHaveLength(1)
    expect((result.directives[0].query.original as any).where.title).toBe(
      'Test { with } braces'
    )
  })

  it('should skip directive with invalid JSON', () => {
    const documentation = `
      @optimize { method: "broken", query: { invalid } }
      @optimize { "method": "valid", "query": { "where": { "status": "active" } } }
    `

    const result = processModelDirectives(
      { ...POST_MODEL, documentation },
      BLOG_DATAMODEL,
      { defaultCacheTtl: 300 }
    )

    expect(result.directives).toHaveLength(1)
    expect(result.directives[0].method).toBe('valid')
  })
})
