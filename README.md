<h1 align="center">
    SynthKernel
    <br />
</h1>

<h4 align="center">A type safe and composable meta architecture for modular monolith development.</h4>

<p align="center">
    <img src="https://img.shields.io/badge/%F0%9F%96%90%EF%B8%8F%20Made%20by-Humans-333333?labelColor=25C260" alt="Made by Humans">
    <img src="https://img.shields.io/badge/%F0%9F%A6%BE%20Agent%20Skill-Available-333333?labelColor=8A2BF2" alt="Agent Skill Available">
    <a href="https://github.com/hesprs/synthkernel/actions">
        <img src="https://img.shields.io/github/actions/workflow/status/hesprs/synthkernel/ci.yml?style=flat&logo=github&logoColor=white&label=CI&labelColor=d4ab00&color=333333" alt="ci">
    </a>
</p>

<p align="center">
    <a href="https://github.com/hesprs/synthkernel/tree/main/whitepaper.ipynb">
        <strong>Whitepaper</strong>
    </a> •
    <a href="https://github.com/hesprs/synthkernel/tree/main/skill">
        <strong>Agent Skill</strong>
    </a> •
    <a href="#-copyright--licenses">
        <strong>Licenses</strong>
    </a>
</p>

## ❓ What is SynthKernel?

SynthKernel is a low-level system design approach for making clear and structured [modular monolith](https://www.geeksforgeeks.org/system-design/what-is-a-modular-monolith/) in **TypeScript**. It combines elements of Object Oriented Programming, advanced Type Generics in TypeScript, Facade Pattern, and aims to push the philosophy of **Inversion of Control** to it's extremum.

The simplest implementation of SynthKernel consists of a **central loader** and flat **modules**. Unlike other modularity conventions that design the loader to provide interfaces and APIs, the loader in SynthKernel only manages module loading and lifecycles, all actual functionalities are achieved by modules. Modules are the actual center of the entire application - they define APIs, execute real logic, augment the the loader class and wire each other via dependency injection. The module loader behaves as a lifecycle manager and a facade between complex internal logic and the application consumer.

SynthKernel doesn't impose any limitations on what you can achieve, you can use the philosophy of it in any context - in software development, OS design, or robotics control. It also allows you to compose the modules as freely as you can. Overall, with SynthKernel, you should be able to clearly demonstrate your APP via a tree diagram.

## 🔑 Core Problem It Solves

SynthKernel addresses the architectural friction found in traditional monolithic or loosely-coupled plugin systems by enforcing a **type-safe, modular composition model**. While standard architectures often struggle with "God Objects" that accumulate tight coupling or require manual registry updates to extend functionality, SynthKernel leverages TypeScript's type system to automatically orchestrate capabilities. This eliminates the disconnect between runtime behavior and static types, ensuring that adding a new feature instantly augments the application's interface and type definitions, resulting in a codebase that scales with strict modularity, zero configuration drift, and inherent testability.

## 📰 Whitepaper

SynthKernel provides a Jupyter Notebook whitepaper running TypeScript, you can find it here: [SynthKernel Whitepaper](https://github.com/hesprs/synthkernel/blob/main/whitepaper.ipynb).

VSCode or any fork of it is recommended to view it. To correctly execute the whitepaper, you need to do some setup:

Install Python3 and Deno (because it provides a Jupyter Notebook TypeScript kernel), ensure you have installed the following extensions for VSCode if you are using it:

- `ms-toolsai.jupyter`
- `bierner.markdown-mermaid`

Then open your terminal at a proper directory (we will create some file in it) and run following commands:

```sh
# install Jupyter if you haven't
pip3 install jupyterlab

# register TS kernel
deno jupyter --install
```

Then open `whitepaper.ipynb` in your viewer, choose the Deno kernel (in VSCode, it's `Select Kernel` -> `Jupyter Kernel...` -> `Deno`). Now you can read the notebook.

## 🤖 Agent Skill

SynthKernel is 100% AI-native, and is confident to boost the performance of agentic coding greatly.

AI performs best when they have strict guidelines to follow, which is the reason why AI is so versed at frontend - the frameworks are right there and the best practice patterns are defined. To have a strict instruction on the software architecture ensures AI can produce human-friendly code and also prevents them from entangling themselves in a spaghetti.

WARNING: SynthKernel does enforce very strict and opinionated naming, architecture and file system conventions, and is still in experimental phase.

**To install the skill**:

Choose `npx` / `pnpm dlx` / `bunx` or whatever according your preference, take `npx` as an example:

```sh
npx skills add hesprs/synthkernel
```

The command will scaffold and find 1 skill. Choose the only skill, then choose the coding agent and whether to install globally according to your needs. Continue the scaffolder and the skill will be installed.

## 📝 Copyright & Licenses

Copyright ©️ 2026 Hesprs (Hēsperus)

Architecture whitepaper and README licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)

Agent skill licensed under the [MIT License](https://mit-license.org/)
