# Tunstack

Tunstack (derived from _Tunnel Stack_) is a tech stack that optimizes for product development & iteration speed by focusing on end-to-end type safety, code shareability, and TypeScript-native logic.

## Core Technologies

- TypeScript (with [tilde-imports](https://github.com/Tunnel-Labs/tilde-imports) + [glob-imports](https://github.com/Tunnel-Labs/glob-imports))
- pnpm
- tRPC
- MongoDB (with [typegeese](https://github.com/Tunnel-Labs/typegeese))

## Principles

1. **TypeScript should be the primary programming language and used whenever possible.** Introducing a second programming language to a codebase significantly harms code shareability and maintainability. In addition to programming languages, domain-specific languages such as SQL and GraphQL are also avoided, as they often require code generation scripts to integrate nicely with TypeScript (we see this with SQL migrations which are often a pain to write and test). Instead, Tunstack uses MongoDB as its database because MongoDB makes it possible to directly use TypeScript code for database logic, including defining data schemas and schema migrations.

2. **As an application-oriented stack, Tunstack ships custom modifications (via auto-generated patch files) to core tooling optimized for application development.** Instead of working within the limitations of tooling, Tunstack augments existing tools and optimizes them for application development using a low-maintenance and low-overhead approach of generating patch files.
