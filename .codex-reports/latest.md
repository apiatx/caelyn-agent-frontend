# Frontend-to-backend incident check

Timestamp: 2026-07-27 UTC

## Runtime upstream selection

- Environment-variable name: none. The affected proxy routes do not select their upstream from an environment variable; therefore presence is not applicable.
- Resolved upstream: `https://fast-api-server-aidanpilon.replit.app` (hostname `fast-api-server-aidanpilon.replit.app`, port `443`).
- Proxy selection points:
  - Home dashboard, movers, daily alpha board, and top catalysts: `frontend/server/routes.ts:4453` selects the hard-coded `SR_URL`; those routes use it at lines 4484, 4810, 4853, and 4874.
  - Risk intelligence: `frontend/server/routes.ts:1538` selects the hard-coded `AGENT_URL`; the route uses it at line 3335.
  - Watchlist: `frontend/server/routes.ts:5207` selects the hard-coded `WL_URL`; the route uses it at line 5215.

The requests below were made directly from the frontend environment to that exact upstream, using the same authentication-header mechanism as the frontend proxy. Credential values were not printed.

| Direct upstream URL | HTTP status | Response time | First 300 response characters |
| --- | ---: | ---: | --- |
| `https://fast-api-server-aidanpilon.replit.app/health` | 200 | 0.451184 s | `{"status":"ok","code_version":"2026-03-08-v4-no-auth","init_complete":true,"init_error":null,"agent_loaded":true,"data_service_loaded":true,"bootstrap_done":true}` |
| `https://fast-api-server-aidanpilon.replit.app/api/home/dashboard` | 200 | 2.569571 s | `{"generated_at":"2026-07-27T19:52:11.133021+00:00","greeting":{"text":"Good evening","market":{"status":"open","label":"Markets Open","now_et":"Mon 15:52 ET"}},"ticker_strip":[{"symbol":"SPY","price":739.02,"change_pct":0.02,"asset_class":"equity"},{"symbol":"QQQ","price":681.81,"change_pct":-0.36,"` |
| `https://fast-api-server-aidanpilon.replit.app/api/home/daily-alpha-board` | 200 | 1.615743 s | `{"ok":true,"generated_at":"2026-07-27T19:52:12.868532+00:00","mode":"cache_only","board_mode":"long_watchlist","external_api_calls":0,"provider_calls_blocked":true,"provider_call_attempts":[],"unsafe_sources_skipped":[],"limit":10,"regime":{"label":"neutral","summary":"No cached regime data — neutra` |
| `https://fast-api-server-aidanpilon.replit.app/api/home/movers` | 200 | 0.737500 s | `{"category":"stocks","gainers":[{"symbol":"DFNS","name":"T3 Defense Inc.","asset_type":"stock","price":15.16,"change_percent":248.51,"change_label":"+248.51%","source":"fmp_gainers","volume_24h":null,"market_cap":null},{"symbol":"BIYA","name":"Baiya International Group Inc.","asset_type":"stock","pr` |
| `https://fast-api-server-aidanpilon.replit.app/api/home/top-catalysts` | 200 | 3.538156 s | `{"view":"home_compact","source":"calendar_top_catalysts","window_start":"2026-07-27","window_end":"2026-07-31","window_mode":"current_week","generated_at":"2026-07-27T19:52:13.777544+00:00","catalysts":[{"id":"macro_fed_rates_2026-07-27","type":"macro_group","category":"fed_rates","title":"Fed / Rat` |
| `https://fast-api-server-aidanpilon.replit.app/api/home/risk-intelligence` | 200 | 1.464668 s | `{"as_of":"2026-07-27T19:52:17.989237+00:00","market_open":true,"data_freshness":{"market_snapshot_age_seconds":0,"calendar_age_seconds":57122,"macro_age_seconds":0,"source_summary":"reused existing cached Home/Macro/Calendar data","market_snapshot_status":"live","calendar_status":"live","macro_statu` |
| `https://fast-api-server-aidanpilon.replit.app/api/watchlist` | 200 | 1.057190 s | `{"id":"00a0e3ea-31dc-4223-97bc-470720dd3215","name":"Primary","csv_data":[{"EBIT":"-47337000","Symbol":"AAOI","Volume":"4696337","Revenue":"507000000","Industry":"Communication Equipment","PE Ratio":"","PS Ratio":"22.14194","EV/EBITDA":"","EPS Growth":"","FCF Margin":"-87.00%","Forward PE":"77.50106` |

## Conclusion

- The frontend is pointing to the expected backend. Its hostname exactly matches the FastAPI Replit/deployment previously tested locally: `fast-api-server-aidanpilon.replit.app`.
- The exact upstream currently returns HTTP 200 for `/health` and all six affected API paths.
- This is a transient backend failure, not a stale deployment target or proxy-configuration mismatch: the recorded frontend target and the tested backend target are the same, while the direct current checks are healthy.
- Smallest required correction: no code or configuration change. Add/retain upstream status-and-latency monitoring (and retry the failed request operationally if it recurs); investigate the backend only if future direct probes to this same hostname reproduce a non-200 response.
