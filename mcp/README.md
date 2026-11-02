# fundamental-analysis-mcp

An MCP server that gives an AI assistant the calculators from
[fundamental-analysis](https://www.npmjs.com/package/fundamental-analysis): P/E, DCF, Graham Number, Altman Z-Score and
return on equity.

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

## Licence

MIT. Maintained by [Boffin Coders](https://boffincoders.com/open-source/fundamental-analysis).
