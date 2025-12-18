import { describe, it, expect } from 'vitest'
import { convertDMMFToModels } from '../src/model-converter'
import { BLOG_DATAMODEL, EMPTY_DATAMODEL } from './fixtures'

describe('convertDMMFToModels', () => {
  it('converts scalar fields', () => {
    const [user] = convertDMMFToModels(BLOG_DATAMODEL)

    expect(user.name).toBe('User')
    expect(user.tableName).toBe('User')

    const idField = user.fields.find((f) => f.name === 'id')!
    expect(idField).toMatchObject({
      type: 'Int',
      isRequired: true,
      isRelation: false,
    })
  })

  it('converts relation fields', () => {
    const models = convertDMMFToModels(BLOG_DATAMODEL)
    const post = models.find((m) => m.name === 'Post')!
    const author = post.fields.find((f) => f.name === 'author')!

    expect(author).toMatchObject({
      isRelation: true,
      relatedModel: 'User',
      foreignKey: 'authorId',
      references: 'id',
      isForeignKeyLocal: true,
    })
  })

  it('handles list types', () => {
    const [user] = convertDMMFToModels(BLOG_DATAMODEL)
    const posts = user.fields.find((f) => f.name === 'posts')!

    expect(posts.type).toBe('Post[]')
  })

  it('uses dbName when provided', () => {
    const models = convertDMMFToModels(BLOG_DATAMODEL)
    const post = models.find((m) => m.name === 'Post')!
    expect(post.tableName).toBe('Post')
  })

  it('handles empty datamodel', () => {
    expect(convertDMMFToModels(EMPTY_DATAMODEL)).toEqual([])
  })
})