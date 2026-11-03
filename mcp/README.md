# fundamental-analysis-mcp

An MCP server that gives an AI assistant the calculators from
[fundamental-analysis](https://www.npmjs.com/package/fundamental-analysis): P/E, DCF, Graham Number, Altman Z-Score,
Piotroski F-Score, return on equity, profit margins, and liquidity and debt ratios, plus one tool that runs every ratio
your figures allow in a single call.

Every result returns four things: the value, the formula that produced it, the inputs it used and the caveats you need
before acting on it. The assistant brings the figures. The server fetches nothing, needs no API key and has no
dependencies.

## Tools

| Tool | What it returns |
|---|---|
| `pe_ratio` | Price / EPS, with a note when EPS is zero or negative |
| `dcf_valuation` | Enterprise value from projected free cash flow, the terminal value's share of it, and an implied share price when you pass debt, cash and shares |
| `graham_number` | sqrt(22.5 x EPS x book value per share), and the price against it |
| `altman_z_score` | Z (public manufacturers) or Z'' (everyone else), with the zone |
| `return_on_equity` | Net income / equity, null when equity is zero or negative |
| `piotroski_f_score` | The 0 to 9 score with each of the nine signals, and which signals a missing prior year leaves unscored |
| `profit_margin` | Gross, operating, net or free cash flow margin as a share of revenue |
| `liquidity_ratio` | Current ratio, or quick ratio without inventory |
| `leverage_ratio` | Debt to equity, or interest coverage (EBIT / interest expense) |
| `analyze_company` | Every ratio the figures allow, grouped as valuation, profitability, liquidity, solvency, efficiency, risk and quality, with the metrics that came back null named. Add `withInsights` for a status and a one-line reading per metric |

Every tool is read-only: it computes and answers, and changes nothing.

## Set up

Claude Code:

```bash
claude mcp add fundamental-analysis -- npx -y fundamental-analysis-mcp
```

Claude Desktop (`claude_desktop_config.json`) and Cursor (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "fundamental-analysis": {
      "command": "npx",
      "args": ["-y", "fundamental-analysis-mcp"]
    }
  }
}
```

## Example

Ask: "Graham Number for EPS 4 and book value 25 a share, price 40?" The `graham_number` tool answers:

```json
{
  "value": 47.43,
  "priceVsGraham": 0.84,
  "formula": "Graham Number = sqrt(22.5 * EPS * book value per share)",
  "inputs": { "eps": 4, "bookValuePerShare": 25, "price": 40 },
  "caveats": ["22.5 is 15 times earnings by 1.5 times book, Graham's limits for a defensive investor. It ignores growth, so it is strict on growth companies and on asset-light businesses."]
}
```

## Build and test

```bash
npm run build   # one file, dist/server.js, with the library bundled in
npx vitest run mcp   # from the repository root
```

## MCP registry

`server.json` describes the server for the official MCP registry as `io.github.boffincoders/fundamental-analysis-mcp`,
and `mcpName` in `package.json` carries the same name so the registry can check the npm package. Publish to npm first,
then run `mcp-publisher publish` from this folder.

## Licence

MIT. Maintained by [Boffin Coders](https://boffincoders.com/open-source/fundamental-analysis).
