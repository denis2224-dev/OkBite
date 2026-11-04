# Application conventions

Expo Router screens live in `src/app`. Reusable controls live in `src/components`,
custom hooks in `src/hooks`, client integrations in `src/services`, and pure helpers
in `src/utils`. Keep domain logic and specialized views together in `src/features`.
All Romanian interface copy comes from `src/copy/ro.ts`.
Keep platform differences in `.web.ts(x)` files and use shared schemas and theme tokens.
Run the root test, typecheck and lint commands before handing over changes.
