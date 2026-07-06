---
id: note_typescript_patterns
created_at: "2026-01-25T13:00:00Z"
updated_at: "2026-03-05T10:00:00Z"
revision: 4
mode: simple
tags: [mdplanner/notes]
---

# TypeScript Patterns

## Generic entity constraint
```typescript
type Entity = Record<string, unknown>;
```

## Service interface
```typescript
interface DomainService<T, C, U> {
  list(): Promise<T[]>;
  getById(id: string): Promise<T | null>;
  create(data: C): Promise<T>;
  update(id: string, data: U): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}
```

## Repository create pattern
```typescript
{ ...data, id, ...defaults, created, updated }
```
Spread data first, override required defaults only.

## Zod schema naming
`snake_case` Zod + async transform — see `FrontmatterProjectSchema`.
