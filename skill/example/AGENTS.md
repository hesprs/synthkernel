## Project Architecture

This project uses SynthKernel architecture. Typical practice consists a module loader class and module classes:

- The module loader class manages module lifecycles, orchestrates types, and behaves as an facade at of your app logic.
- All module classes extend a `BaseModule` class, they define APIs, register lifecycle hooks, execute actual logic, augment the loader class and wire each other via dependency injection.
- Types are resolved via generics orchestration.
- Modules are composed to the loader to form an APP.

**Structure**:

```text
loader: PolisAlert Loader - manages module lifecycles, orchestrates types, exposes augmented API
- CoreLogging: Provides centralized logging and audit trail functionality
- AlertDispatch: Handles alert validation and transmission, depends on CoreLogging via DI
```
