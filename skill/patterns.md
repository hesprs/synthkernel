# SynthKernel Patterns

## Testing

Structural typing makes testing trivial — no framework setup needed.

**Unit test**: pass a mock context object directly to the constructor:

```typescript
const module = new MyModule({ neededApi: () => 'mocked' });
module.start();
```

**Integration test**: pass plain objects alongside class constructors:

```typescript
const ctx = createContext([RealModule, { root: { mockApi: () => true } }], { mergeKeys: ['root'] });
```

## Nested Contexts

Group related modules into a sub-context when the module list grows. A module creates its own `createContext` internally, plumbing parent APIs down as `preMerge`:

```typescript
import { createContext } from 'synthkernel';
import HttpModule from './network/HttpModule.ts';
import WsModule from './network/WsModule.ts';

export default class NetworkModule {
  private subCtx;

  constructor(ctx: { log: (msg: string) => void; baseUrl: string }) {
    this.subCtx = createContext([HttpModule, WsModule], {
      mergeKeys: ['root'],
      preMerge: { log: ctx.log, baseUrl: ctx.baseUrl },
    });
    for (const ctor of [HttpModule, WsModule]) this.subCtx.__getModule__(ctor).start();
  }

  root = { ...this.subCtx };

  readonly dispose = () => {
    for (const ctor of [HttpModule, WsModule].reverse()) this.subCtx.__getModule__(ctor).dispose();
  };
}
```

Sub-context modules see only plumbed parent APIs and their own siblings.

## Interception

A module later in the array can wrap earlier modules' APIs:

```typescript
class LoggingInterceptor {
  constructor(ctx: { fetchData: () => Promise<any> }) {
    const original = ctx.fetchData;
    ctx.fetchData = async () => {
      console.log('fetch called');
      return original();
    };
  }
  root = {};
}
```

## Settings

Modules declare settings types with `declare settings`. The facade assigns runtime values via `__assign__`, and `injectKeys` writes them back:

```typescript
// Module
declare settings: { dbUrl: string };
readonly start = () => connect(this.settings.dbUrl);

// Facade
const ctx = createContext(modules, {
  mergeKeys: ['settings', 'root'],
  injectKeys: ['settings', 'root'],
}).__assign__({ settings: { dbUrl: process.env.DB_URL } });
```

## Splitting

When a module has too many responsibilities:

- **Split**: extract methods into a new module in the same context.
- **Elevate**: convert into a sub-context (see Nested Contexts above).
