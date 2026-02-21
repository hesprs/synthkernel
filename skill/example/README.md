# PolisAlert: A SynthKernel Educational Demo

**PolisAlert** is a minimal, type-safe notification pipeline designed to demonstrate the **SynthKernel** architecture in action. It is not a production-ready alerting system, but a reference implementation showing how to structure a modular monolith where modules self-register capabilities, orchestrate types, and communicate via dependency injection without tight coupling.

## Architecture Overview

This project strictly follows the **SynthKernel** file system conventions and design philosophy:

- **Loader (`index.ts`)**: Acts solely as a lifecycle manager and type facade. It contains **no business logic**.
- **Modules (`CoreLogging.ts`, `AlertDispatch.ts`)**: Encapsulate all functionality. They define their own options, augment the loader with new APIs, and wire dependencies via the shared container.
- **Type Orchestration**: The public API of the application is automatically constructed by the union of all loaded modules. If a module is not loaded, its methods do not exist on the Loader type.

### Module Tree

```text
PolisAlert Loader
├── CoreLogging
│   ├── Role: Infrastructure (Audit Trail)
│   ├── Augments: .log(), .logs
│   └── Options: logLevel, maxLogs
└── AlertDispatch
    ├── Role: Alert Function (Validation & Dispatch)
    ├── Augments: .dispatchAlert()
    ├── Dependencies: CoreLogging (via DI)
    └── Options: minMessageLength, maxMessageLength
```

## Key Concepts Demonstrated

### Loader Augmentation

- `CoreLogging` injects `log()` and `logs` into the Loader instance.
- `AlertDispatch` injects `dispatchAlert()`.
- **Result**: The consumer interacts only with the Loader, unaware of the underlying module complexity.

### Type Safety & Orchestration

The TypeScript compiler knows exactly what methods are available based on which modules are registered in `index.ts`.

- **Scenario**: If you remove `AlertDispatch` from the `allModules` array, calling `loader.dispatchAlert()` will immediately throw a **compile-time error**.
- **Mechanism**: Achieved via `Orchestratable` utility types and intersection of module augmentation interfaces.

### Dependency Injection

Modules communicate indirectly through the Loader's DI container.

For example, `AlertDispatch` does not import `CoreLogging`'s class logic directly. Instead, it requests an instance from the container (`this.container.get(CoreLogging)`).

### Lifecycle Hooks

Modules subscribe to global events (`onStart`, `onDispose`) defined by the Loader. Both modules log their initialization status automatically when the app starts, demonstrating clean separation of lifecycle management from business logic.

## File Structure

```bash
.                     # the example folder
├── index.ts          # The Loader: Defines base options, registers modules, handles lifecycle
├── BaseModule.ts     # Abstract base class for all modules (boilerplate reduction)
├── types.ts          # Core SynthKernel type utilities (Orchestratable, UnionToIntersection)
├── utilities.ts      # Hook system implementation (makeHook)
├── CoreLogging.ts    # Module: Handles logging state and audit trail
├── AlertDispatch.ts  # Module: Handles validation and message dispatching
└── main.ts           # Consumer: Example usage of PolisAlert
```
