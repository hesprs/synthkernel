# How to Progressively Develop a SynthKernel Project

All code below are templates. Remember that SynthKernel classes do not have uniform shape, modify the templates according to your needs.

## Add a Module

You need to add a module when you want to add a new feature or split bloated modules.

### Step 1 Clarify Requirements

Before Proceeding, ask yourselves:

1. Am I clear about whether DI and Augmentation are enabled, and all the lifecycle hooks & orchestrations of the loader? If not, read loader's code to know them.
2. What's the function of the module?
3. Does the module need DI, augmentation, lifecycle hooks and orchestrations? Are the ones provided by the loader suffice? If not, read [start](start.md) and modify the loader.

- DI: What other modules it needs?
- Lifecycle hooks: what lifecycle events the module needs to subscribe to?
- Orchestrations: does the module has configurable states to receive from or contribute to the loader (the facade)? Like configs defined by users or a event map that needs extending.
- Augmentations: Do modules need to inject methods and properties back to the loader so that consumers can access module functions?

### Step 2 Construct the Module

To add a module, create a file named `(module name in PascalCase).ts`, and write your code:

```TypeScript
/** (module name): (what this module does) */
import { BaseModule, type BaseOptions } from './index.ts'; // all orchestrations needed by this module that has base fields, change the path to the actual path where the loader exists

// import all modules that will be used by this module by DI
import AnotherModule from './AnotherModule.ts'

// the types of orchestrations, must extend the base type if the orchestration has base fields, adjust according to your needs
interface Options extends BaseOptions {
    // all fields this module provides, adjust accordingly
    option1: string;
    option2?: boolean;
}

// the augmentation if the module needs, adjust the fields according to your needs
interface Augmentation {
    method: () => void;
    property: boolean;
}

// change the module name to the intended one
// pass type parameters in the correct order as defined in BaseModule
// - if what you want to pass comes later, e.g., you only want to pass `Augmentation`, simply pass the base orchestration, like BaseModule<BaseOptions, Augmentation>
export class Module extends BaseModule<Options, Augmentation> {
    constructor(...args: BaseArgs) {
        super(...args);

        // if you need augmentation, you must call `this.augment` in your constructor and pass everything defined in your `Augmentation` interface.
        this.augment({
            method: this.method,
            property: this.property,
        });

        // subscribe to lifecycle hooks if needed, adjust accordingly
        this.onStart(this.method);

        // use this.container.get() to inject a dependency
       const dep = this.container.get(AnotherModule);

        // ... freely implement your logic
    }

    // ... write your logic, the module is your playground
    method = () => {};
    property = false;
}
```

### Step 3 Record References

If you have write access to a project-wide memory system like `AGENTS.md`, find the `Project Architecture` section and update the tree structure to add your new module.

## Split or Elevate a Module

To keep your codebase maintainable, once you find a module has too much functions, you need to **split or elevate** a module.

- To split a module, simply extract some tightly coupled methods and properties into another module, following the template of [create a new module](#add-a-module). E.g., you can split a huge `Login` module into `PasswordLogin` and `2FALogin` modules.
- To elevate, simply make this module a new hierarchy of loader and modules and making the loader both a loader and module of a parent loader. E.g., you can elevate a `Login` module to become a `Login` loader with modules `Password` and `2FA`. Follow the guide of [how to create a new loader hierarchy](start.md).
