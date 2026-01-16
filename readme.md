# @dee-wan-cms/schema-parser

Prisma schema directive parser that extracts, validates, and transforms query parameters with built-in SQL injection prevention and caching support.

## Why?

To define optimized, parameterized queries directly in Prisma schema and generate type-safe API endpoints. This parser extracts those directives, validates them, and prepares them for code generation.

```prisma
model Post {
  id        Int     @id
  title     String
  status    String
  views     Int

  /// @optimize {
  ///   "header": "getActivePostsByMinViews",
  ///   "query": {
  ///     "where": {
  ///       "status": "$status",
  ///       "views": { "gte": "$minViews" }
  ///     }
  ///   },
  ///   "cache": { "ttl": 300 }
  /// }
}
```

The parser extracts this, validates fields, sanitizes parameter names.

## Installation

```bash
yarn add @dee-wan-cms/schema-parser
```

## Quick Start

```typescript
import { processModelDirectives } from '@dee-wan-cms/schema-parser';
import { getDMMF } from '@prisma/internals';

const dmmf = await getDMMF({ datamodel: schemaString });
const model = dmmf.datamodel.models.find((m) => m.name === 'Post');

const result = processModelDirectives(model, dmmf.datamodel, {
  defaultCacheTtl: 300,
  skipInvalid: true,
});

result.directives.forEach((directive) => {
  console.log('Header:', directive.header);
  console.log('Parameters:', directive.parameters.all);
  console.log('Cache TTL:', directive.cache.ttl);
});
```

## Core Features

### 🔒 **SQL Injection Prevention**

Automatically sanitizes parameter names, strips SQL keywords, and validates against dangerous patterns.

```typescript
import { sanitizeParamName } from '@dee-wan-cms/schema-parser';

sanitizeParamName('DROP TABLE users'); // → 'param_abc123' (safe hash)
sanitizeParamName('user-id'); // → 'userid'
sanitizeParamName('SELECT'); // → 'param_def456' (safe hash)
```

### 🎯 **Dynamic Parameter Extraction**

```typescript
const query = {
  where: {
    status: '$status',
    views: { gte: '$minViews' },
  },
};

const { params, processedQuery } = extractParamsFromQuery(query, model);

// params = [
//   { name: 'status', type: 'string', path: ['where', 'status'], position: 1 },
//   { name: 'minViews', type: 'number', path: ['where', 'views', 'gte'], position: 2 }
// ]

// processedQuery = {
//   where: {
//     status: '__DYNAMIC_status__',
//     views: { gte: '__DYNAMIC_minViews__' }
//   }
// }
```

### ⚡ **Cache Configuration**

```typescript
import { parseCacheConfig } from '@dee-wan-cms/schema-parser';

// Simple enable/disable
parseCacheConfig(true, 300); // → { enabled: true, ttl: 300 }
parseCacheConfig(false, 300); // → { enabled: false }

// Custom TTL
parseCacheConfig({ ttl: 600 }, 300); // → { enabled: true, ttl: 600 }

// With binding
parseCacheConfig({ ttl: 600, binding: 'CACHE' }, 300);
// → { enabled: true, ttl: 600, binding: 'CACHE' }
```

### ✅ **Field Validation**

Validates that referenced fields exist on the model:

```typescript
const result = processModelDirectives(model, datamodel);

if (result.errors.length > 0) {
  result.errors.forEach((err) => {
    console.error(`${err.level}: ${err.message}`);
    // error: Field 'nonExistent' does not exist on model 'Post'
  });
}
```

## API Reference

### `processModelDirectives(model, datamodel, config?)`

Main entry point. Parses all directives from a model's documentation.

**Parameters:**

- `model: DMMF.Model` - Prisma model from DMMF
- `datamodel: DMMF.Datamodel` - Full datamodel for validation
- `config?: DirectivePipelineConfig`
  - `defaultCacheTtl: number` - Default cache TTL (1-31536000 seconds)
  - `skipInvalid: boolean` - Skip invalid directives vs throw (default: `true`)

**Returns:** `ModelDirectiveResult`

```typescript
{
  modelName: string
  directives: DirectiveProps[]
  errors: DirectiveError[]
  hasCaching: boolean
}
```

**Example:**

```typescript
const result = processModelDirectives(model, datamodel, {
  defaultCacheTtl: 600,
  skipInvalid: false, // Throw on validation errors
});
```

### `processAllDirectives(models, datamodel, config?)`

Process directives for all models at once.

**Returns:** `Map<string, ModelDirectiveResult>`

```typescript
const results = processAllDirectives(dmmf.datamodel.models, dmmf.datamodel);

for (const [modelName, result] of results) {
  console.log(`${modelName}: ${result.directives.length} directives`);
}
```

### `extractParamsFromQuery(query, model)`

Extract and transform dynamic parameters from a query object.

**Returns:** `ExtractedParams`

```typescript
{
  processedQuery: Record<string, unknown>
  params: ParameterDefinition[]
  inputSchema: InputSchema
  dynamicKeys: string[]
  staticValues: unknown[]
}
```

### `sanitizeParamName(name)`

Sanitize a parameter name for safe use.

**Rules:**

- Strips SQL keywords
- Converts to alphanumeric + underscore
- Adds `param_` prefix if starts with digit
- Max 64 characters
- Deterministic hashing for collisions

```typescript
sanitizeParamName('user-id'); // 'userid'
sanitizeParamName('123abc'); // 'param_123abc'
sanitizeParamName('DROP_TABLE_users'); // 'users' (keywords stripped)
```

### `parseCacheConfig(directive, defaultTtl)`

Parse cache configuration with validation.

**TTL Constraints:**

- Min: 1 second
- Max: 31,536,000 seconds (1 year)
- Must be integer
- Invalid values fall back to `defaultTtl`

### Type Definitions

```typescript
interface DirectiveProps {
  header: string;
  modelName: string;
  query: ProcessedQuery;
  parameters: ParameterSet;
  cache: CacheConfig;
  context: {
    model: DMMF.Model;
    datamodel: DMMF.Datamodel;
    allModels: DMMF.Model[];
    enums: DMMF.DatamodelEnum[];
  };
}

interface ParameterDefinition {
  name: string; // Sanitized name
  originalName?: string; // Original from directive
  type: 'string' | 'number' | 'boolean' | 'object';
  path: string[]; // Path in query object
  required: boolean;
  position: number; // 1-indexed
}

interface CacheConfig {
  enabled: boolean;
  ttl?: number;
  binding?: string;
}
```

## Advanced Usage

### Complex Queries with Logical Operators

```prisma
/// @optimize {
///   "header": "searchPosts",
///   "query": {
///     "where": {
///       "AND": [
///         { "status": "$status" },
///         {
///           "OR": [
///             { "views": { "gte": "$minViews" } },
///             { "published": true }
///           ]
///         }
///       ]
///     }
///   }
/// }
```

### Array Parameters

```typescript
const query = {
  where: {
    OR: [{ status: '$s1' }, { status: '$s2' }],
  },
};

// Parameters get distinct names and positions
// Even if referencing the same field
```

### Parameter Deduplication

Same parameter name across query? Gets deduplicated automatically:

```typescript
const query = {
  where: {
    status: '$status',
    OR: [{ status: '$status' }], // Same $status
  },
};

// Only one parameter definition created
// Both locations reference the same internal marker
```

### Custom Type Inference

The parser infers parameter types from context:

```typescript
// Numeric keywords
{
  take: '$limit';
} // type: 'number'
{
  skip: '$offset';
} // type: 'number'

// Field-based inference
{
  where: {
    id: '$id';
  }
} // type: 'number' (Post.id is Int)
{
  where: {
    title: '$t';
  }
} // type: 'string' (Post.title is String)

// Comparison operators
{
  views: {
    gte: '$min';
  }
} // type: 'number'

// Pattern matching
{
  userId: '$uid';
} // type: 'number' (contains 'id')
{
  isActive: '$active';
} // type: 'boolean' (contains 'is')
```

### Runtime Parameter Validation

```typescript
import {
  validateDynamicParams,
  extractParamValue,
} from '@dee-wan-cms/schema-parser';

const params = { status: 'active', minViews: 100 };

try {
  validateDynamicParams(params, directive.parameters.all);
  // Parameters are valid
} catch (error) {
  console.error('Missing parameters:', error.message);
  // Missing required parameters: status (path: where.status), minViews (path: where.views.gte)
}

// Extract specific parameter value
const status = extractParamValue(params, ['where', 'status']);
```

## Security

### Built-in Protections

1. **SQL Keyword Filtering**: Strips/hashes dangerous keywords
2. **Prototype Pollution Prevention**: Blocks `__proto__`, `constructor`, `prototype`
3. **Input Validation**: Validates field existence against schema
4. **Type Safety**: Strong TypeScript types throughout
5. **Array Index Validation**: Prevents negative indices

### Best Practices

```typescript
// ✅ DO: Use the parser's sanitization
const safe = sanitizeParamName(userInput);

// ❌ DON'T: Use raw user input as parameter names
const unsafe = `$${userInput}`; // NEVER

// ✅ DO: Validate against schema
const result = processModelDirectives(model, datamodel, {
  skipInvalid: false, // Throw on invalid fields
});

// ✅ DO: Check for errors
if (result.errors.length > 0) {
  // Handle validation errors
}
```

### Known Limitations

1. **Recursion Depth**: Deep nesting (>50 levels) works but is slow
2. **Input Size**: Very large JSON (>1MB) may cause performance issues
3. **Parameter Count**: No hard limit, but >1000 parameters is impractical

## Configuration

### Cache TTL Validation

```typescript
import { CACHE_TTL } from '@dee-wan-cms/schema-parser';

console.log(CACHE_TTL);
// {
//   MIN: 1,              // 1 second
//   MAX: 31536000,       // 1 year
//   DEFAULT: 300         // 5 minutes
// }
```

### Error Handling Modes

```typescript
// Lenient: Skip invalid directives, collect errors
const lenient = processModelDirectives(model, datamodel, {
  skipInvalid: true,
});
console.log(
  `Parsed ${lenient.directives.length}, errors: ${lenient.errors.length}`
);

// Strict: Throw on first error
try {
  const strict = processModelDirectives(model, datamodel, {
    skipInvalid: false,
  });
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

## Common Patterns

### Pagination

```prisma
/// @optimize {
///   "header": "listPosts",
///   "query": {
///     "take": "$limit",
///     "skip": "$offset",
///     "orderBy": { "createdAt": "desc" }
///   }
/// }
```

### Filtering with Relations

```prisma
/// @optimize {
///   "header": "getPostsByAuthor",
///   "query": {
///     "where": {
///       "author": {
///         "email": "$authorEmail"
///       }
///     },
///     "include": { "author": true }
///   }
/// }
```

### Multiple Cache Strategies

```prisma
/// Short cache for volatile data
/// @optimize {
///   "header": "getRealtimeStats",
///   "query": { "where": { "live": true } },
///   "cache": { "ttl": 10 }
/// }

/// Long cache for stable data
/// @optimize {
///   "header": "getArchivedPosts",
///   "query": { "where": { "archived": true } },
///   "cache": { "ttl": 3600 }
/// }
```

## Utilities

### Path Normalization

```typescript
import {
  normalizeParamPath,
  pathToDotNotation,
} from '@dee-wan-cms/schema-parser';

const path = ['where', '[0]', 'status', 'in'];
normalizeParamPath(path); // ['where', 'status']
pathToDotNotation(path); // 'where.status'
```

### Parameter Organization

```typescript
import { organizeParameters } from '@dee-wan-cms/schema-parser';

const organized = organizeParameters(params);
// {
//   all: ParameterDefinition[]       // All params, sorted by position
//   required: ParameterDefinition[]  // Only required
//   optional: ParameterDefinition[]  // Only optional
//   typeMap: { [name]: type }        // Quick type lookup
// }
```

## Troubleshooting

### "Field 'X' does not exist on model"

The directive references a field not in your Prisma model. Check spelling and model definition.

### "Invalid TTL: must be integer between 1 and 31536000"

Cache TTL is out of range or not an integer. Use values between 1 second and 1 year.

### "Missing required parameters"

Runtime validation failed. Ensure all parameters in the query are provided:

```typescript
const params = { status: 'active' }; // Missing minViews!
validateDynamicParams(params, directive.parameters.all); // Throws
```

### "Parameter position gap detected"

Internal error - parameters aren't sequentially positioned. This shouldn't happen; file an issue.

## Contributing

```bash
git clone https://github.com/your-org/dee-wan-cms.git
cd packages/schema-parser
npm install
npm test
```

Requirements:

- Node 18+
- Tests must pass
- Coverage must not decrease
- Follow existing code style (functional, no OOP)

## License

MIT

## Credits

Built for [Dee-wan-cms](https://github.com/dee-wan-cms) - edge-first CMS

Part of the `@dee-wan-cms/*` ecosystem.
