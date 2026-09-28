# Housing Performance Simulator

## Product stance

A tool that lets home buyers decide "which option pays off over 30 years" with **neutral numbers**.

- No sales pitch or recommendation language (steering words such as 「おすすめ」 (recommended) or 「最適」 (optimal) are forbidden)
- Do not show manufacturer or product names (handle equipment only by category and efficiency value)
- Always keep calculation assumptions and coefficients in `src/lib/housing/data/*.ts`, and keep them disclosable from the UI (AssumptionsPanel)
- The subsidy master must have a `lastUpdated` field

## Next.js 16 notes

This repository uses Next.js 16+. Its APIs, conventions and file layout may differ from the Next.js in your training data. Before writing new API code, always consult the relevant guide in `node_modules/next/dist/docs/`. Do not ignore deprecation warnings; fix them.

## Calculation transparency

Implement each of the `heatLoad / hotWater / solar / battery / cost / subsidy / co2` modules as pure functions, and state the units of arguments and return values in comments. For coefficients that come from public sources (the energy-saving standard notice (省エネ基準告示), NEDO irradiance data, etc.), cite the source at the top of the data file.
