import { describe, it, expect } from 'vitest';
import {
  isArrayMarker,
  isDynamicParameter,
  sanitizeParamName,
  extractDynamicName,
  toInternalMarker,
  inferParameterType,
  extractParamsFromQuery,
  extractParamValue,
  validateDynamicParams,
  normalizeParamPath,
  pathToDotNotation,
  deduplicateParams,
} from '../src/extractors';
import { POST_MODEL } from './fixtures';
import type { ParameterDefinition } from '../src/types';
import { expectSafe } from './test-helpers';

describe('Marker Detection', () => {
  it.each([
    ['[0]', true, false],
    ['[123]', true, false],
    ['', false, false],
    ['[]', false, false],
    ['$status', false, true],
    ['__DYNAMIC_x__', false, true],
    ['$', false, false],
    ['status', false, false],
  ])('%s: array=%s, dynamic=%s', (input, isArray, isDynamic) => {
    expect(isArrayMarker(input)).toBe(isArray);
    expect(isDynamicParameter(input)).toBe(isDynamic);
  });
});

describe('Parameter Sanitization', () => {
  it.each([
    ['status', 'status'],
    ['minViews', 'minViews'],
    ['user-id', 'userid'],
    ['123abc', 'param_123abc'],
  ])('sanitizes "%s" -> "%s"', (input, expected) => {
    expect(sanitizeParamName(input)).toBe(expected);
  });

  it('sanitizes reserved keywords to safe deterministic names', () => {
    const a = sanitizeParamName('DROP');
    const b = sanitizeParamName('DROP');
    expect(a).toBe(b);
    expectSafe(a);

    const c = sanitizeParamName('SELECT');
    expectSafe(c);
    expect(a).not.toBe(c);
  });

  it('handles edge cases', () => {
    expect(sanitizeParamName('DROP_TABLE_users')).not.toContain('DROP');
    expect(sanitizeParamName('a'.repeat(100)).length).toBeLessThanOrEqual(64);
    expect(() => sanitizeParamName('')).toThrow('empty');
    expect(() => sanitizeParamName(123 as any)).toThrow('non-string');
  });

  it('extracts and transforms names', () => {
    expect(extractDynamicName('$status')).toBe('status');
    expect(extractDynamicName('__DYNAMIC_x__')).toBe('x');
    expect(toInternalMarker('status')).toBe('__DYNAMIC_status__');
    expect(() => extractDynamicName('status')).toThrow(
      'Not a dynamic parameter'
    );
  });
});

describe('Type Inference', () => {
  it.each<[string[], string]>([
    [['where', 'id'], 'number'],
    [['where', 'views'], 'number'],
    [['where', 'title'], 'string'],
    [['where', 'published'], 'boolean'],
    [['take'], 'number'],
    [['where', 'views', 'gte'], 'number'],
    [['where', 'userId'], 'number'],
    [['where', 'isActive'], 'boolean'],
    [[], 'string'],
  ])('%j -> %s', (path, expected) => {
    expect(inferParameterType(path, POST_MODEL)).toBe(expected);
  });
});

describe('Query Parameter Extraction', () => {
  it('extracts and transforms parameters', () => {
    const { params, dynamicKeys, processedQuery } = extractParamsFromQuery(
      { where: { status: '$status', views: { gte: '$minViews' } } },
      POST_MODEL
    );

    expect(params).toHaveLength(2);
    expect(dynamicKeys).toEqual(['status', 'minViews']);
    expect((processedQuery as any).where.status).toBe('__DYNAMIC_status__');
    expect(params[0]).toMatchObject({
      name: 'status',
      type: 'string',
      path: ['where', 'status'],
      required: true,
      position: 1,
    });
  });

  it('tracks static values', () => {
    const { params, staticValues } = extractParamsFromQuery(
      { where: { status: 'active', views: 100 } },
      POST_MODEL
    );
    expect(params).toHaveLength(0);
    expect(staticValues).toContain('active');
    expect(staticValues).toContain(100);
  });

  it('handles arrays and deduplication', () => {
    const { params } = extractParamsFromQuery(
      { where: { OR: [{ status: '$s1' }, { status: '$s2' }] } },
      POST_MODEL
    );
    expect(params[0].path).toEqual(['where', 'OR', '[0]', 'status']);
    expect(params[1].path).toEqual(['where', 'OR', '[1]', 'status']);
  });

  it('does not collapse different raw params that sanitize to the same base', () => {
    const out = extractParamsFromQuery(
      { where: { a: '$user-id', b: '$userid' } } as any,
      POST_MODEL
    );
    expect(out.params).toHaveLength(2);
    expect(out.params[0].name).not.toBe(out.params[1].name);
  });

  it('rejects unsafe keys in query objects', () => {
    const q = Object.create(null);

    Object.defineProperty(q, '__proto__', {
      value: { polluted: true },
      enumerable: true,
    });
    Object.defineProperty(q, 'constructor', { value: {}, enumerable: true });
    Object.defineProperty(q, 'prototype', { value: {}, enumerable: true });

    expect(() => extractParamsFromQuery(q as any, POST_MODEL)).toThrow(
      'Disallowed key'
    );
  });
});

describe('Path Operations', () => {
  it('extracts values from nested paths', () => {
    expect(extractParamValue({ a: { b: 1 } }, ['a', 'b'])).toBe(1);
    expect(extractParamValue({ arr: [{ x: 'y' }] }, ['arr', '[0]', 'x'])).toBe(
      'y'
    );
    expect(
      extractParamValue({ a: [{ b: [{ c: [{ d: 'deep' }] }] }] }, [
        'a',
        '[0]',
        'b',
        '[0]',
        'c',
        '[0]',
        'd',
      ])
    ).toBe('deep');
    expect(extractParamValue({ a: 0 }, ['a'])).toBe(0);
    expect(extractParamValue({ a: false }, ['a'])).toBe(false);
    expect(extractParamValue({ a: null }, ['a'])).toBe(null);
  });

  it('handles missing and edge case paths', () => {
    expect(extractParamValue({}, ['missing'])).toBeUndefined();
    expect(extractParamValue({ arr: [] }, ['arr', '[0]'])).toBeUndefined();
    expect(
      extractParamValue({ arr: [1, 2, 3] }, ['arr', '[5]'])
    ).toBeUndefined();
    expect(
      extractParamValue({ notArr: 'string' }, ['notArr', '[0]'])
    ).toBeUndefined();
    expect(extractParamValue({ '123': 'value' }, ['123'])).toBe('value');
    expect(
      extractParamValue({ 'key-with-dash': 'value' }, ['key-with-dash'])
    ).toBe('value');
    expect(extractParamValue({ '': 'value' }, [''])).toBeUndefined();
  });

  it('rejects invalid array indices', () => {
    expect(() => extractParamValue({ arr: [1] }, ['arr', '[-1]'])).toThrow(
      'Invalid'
    );
    expect(() => extractParamValue({ arr: [1] }, ['arr', '[abc]'])).toThrow(
      'Invalid'
    );
    expect(() => extractParamValue({ arr: [1] }, ['arr', '[NaN]'])).toThrow(
      'Invalid'
    );
  });

  it('blocks unsafe prototype keys', () => {
    expect(
      extractParamValue({ a: 1 }, ['__proto__', 'polluted'])
    ).toBeUndefined();
    expect(
      extractParamValue({ a: 1 }, ['constructor', 'prototype', 'polluted'])
    ).toBeUndefined();
  });
});

describe('Path Utilities', () => {
  it.each<[string[], string[]]>([
    [
      ['a', '[0]', 'b'],
      ['a', 'b'],
    ],
    [['tags', 'in'], ['tags']],
    [
      ['age', 'gte'],
      ['age', 'gte'],
    ],
    [[], []],
  ])('normalizeParamPath(%j) -> %j', (input, expected) => {
    expect(normalizeParamPath(input)).toEqual(expected);
  });

  it.each<[string[], string]>([
    [['a', 'b', 'c'], 'a.b.c'],
    [['a', '[0]', 'b'], 'a.b'],
    [[], ''],
  ])('pathToDotNotation(%j) -> "%s"', (input, expected) => {
    expect(pathToDotNotation(input)).toBe(expected);
  });
});

describe('Parameter Validation', () => {
  const params: ParameterDefinition[] = [
    {
      name: 'a',
      path: ['where', 'a'],
      required: true,
      type: 'string',
      position: 1,
    },
    {
      name: 'b',
      path: ['where', 'b'],
      required: true,
      type: 'string',
      position: 2,
    },
  ];

  it('validates correctly', () => {
    expect(() =>
      validateDynamicParams({ where: { a: 'x', b: 'y' } }, params)
    ).not.toThrow();
    expect(() => validateDynamicParams({ where: {} }, params)).toThrow(/a.*b/);
  });

  it('handles falsy values', () => {
    const param: ParameterDefinition[] = [
      {
        name: 'val',
        path: ['value'],
        required: true,
        type: 'number',
        position: 1,
      },
    ];
    expect(() => validateDynamicParams({ value: 0 }, param)).not.toThrow();
    expect(() => validateDynamicParams({ value: false }, param)).not.toThrow();
    expect(() => validateDynamicParams({ value: '' }, param)).not.toThrow();
  });

  it('deduplicates params', () => {
    const dups: ParameterDefinition[] = [
      { name: 'x', path: ['a'], type: 'string', required: true, position: 1 },
      { name: 'y', path: ['b'], type: 'string', required: true, position: 2 },
      { name: 'x', path: ['c'], type: 'string', required: true, position: 3 },
    ];
    const result = deduplicateParams(dups);
    expect(result).toHaveLength(2);
    expect(result[0].path).toEqual(['a']);
  });
});

describe('Edge Cases', () => {
  it('handles deep nesting', () => {
    let query: any = { where: {} };
    let current = query.where;
    for (let i = 0; i < 50; i++) {
      current.nested = {};
      current = current.nested;
    }
    current.value = '$param';
    const { params } = extractParamsFromQuery(query, POST_MODEL);
    expect(params).toHaveLength(1);
  });
});
