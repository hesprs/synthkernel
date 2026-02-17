<h1 align="center">
    SynthKernel
    <br />
</h1>

<h4 align="center">A type safe and composable meta architecture for modular monolith development.</h4>

<p align="center">
    <img src="https://img.shields.io/badge/%F0%9F%96%90%EF%B8%8F%20Made%20by-Humans-333333?labelColor=25C260" alt="Made by Humans">
    <img src="https://img.shields.io/badge/%F0%9F%A6%BE%20Agent%20Skill-Available-333333?labelColor=8A2BF2" alt="Agent Skill Available">
</p>

<p align="center">
    <a href="https://github.com/hesprs/synthkernel/skill">
        <strong>Agent Skill</strong>
    </a> •
    <a href="#-copyright--license">
        <strong>Licenses</strong>
    </a>
</p>

## ❓ What is SynthKernel?

SynthKernel is a low-level system design approach for making clear and structured [modular monolith](https://www.geeksforgeeks.org/system-design/what-is-a-modular-monolith/) in **TypeScript**. It combines elements of Object Oriented Programming, advanced Type Generics in TypeScript, Facade Pattern, and aims to push the philosophy of **inversion of control** to it's extremum.

The simplest implementation of SynthKernel consists of a **central loader** and flat **modules**. Unlike other modularity conventions that design the loader to provide interfaces and APIs, the loader in SynthKernel only manages module loading and lifecycles, all actual functionalities are achieved by modules. Modules are the actual center of the entire application - they define APIs, execute real logic, augment the the loader class and wire each other via dependency injection. The module loader behaves as a lifecycle manager and a facade between complex internal logic and the application consumer.

SynthKernel doesn't impose any limitations, you can use the philosophy of it in any context - in software development, OS design, or robotics control. It also allows you to compose the modules as freely as you can. Overall, with SynthKernel, you should be able to clearly demonstrate your APP via a tree diagram.

## 🔑 Core Problem It Solves

SynthKernel addresses the architectural friction found in traditional monolithic or loosely-coupled plugin systems by enforcing a **type-safe, modular composition model**. While standard architectures often struggle with "God Objects" that accumulate tight coupling or require manual registry updates to extend functionality, SynthKernel leverages TypeScript's type system to automatically orchestrate capabilities: modules self-register their configurations, lifecycle hooks, and public APIs directly into the central Loader without boilerplate. This eliminates the disconnect between runtime behavior and static types, ensuring that adding a new feature (like a file parser or CI check) instantly augments the application's interface and type definitions, resulting in a codebase that scales with strict modularity, zero configuration drift, and inherent testability.

## 🤖 Agent Skill

SynthKernel is 100% AI-native, and is confident to boost the performance of agentic coding greatly. From a personal perspective, it is crucial to have a convention of architecture during agentic coding. This can ensures AI can produce human-friendly code and also prevents them from entangling themselves in a spaghetti. This could also partially explain why AI agents are so versed at frontend - since there're clear conventions of architecture to follow.

WARNING: SynthKernel does impose very strict and opinionated naming, architecture and file system conventions, and is still in experimental phase.

**To install the skill**:

1. Choose `npx` / `pnpm dlx` / `bunx` or whatever according your preference, take `bunx` as an example:

```sh
bunx skills add hesprs/synthkernel
```

The command will clone this repo and find one skill.

2. Choose the only skill, then choose the coding agent and whether to install globally according to your needs. Continue the scaffolder and the skill will be installed.

## 📝 Copyright & License

Copyright ©️ 2025-2026 Hesprs (Hēsperus)

Architecture whitepaper and README licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

Agent skill licensed under the [MIT License](https://mit-license.org/)
