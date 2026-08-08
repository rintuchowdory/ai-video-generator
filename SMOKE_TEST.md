# Local Smoke Test

The updated frontend loaded successfully against the local FastAPI backend on 2026-07-31. The landing page rendered the topic, scene count, tone, and storyboard controls without browser rendering errors. The topic input accepted a test value and enabled the storyboard workflow.

The backend contract suite separately verifies that, before configuration, missing provider credentials return an actionable `503` response rather than failing silently.
The storyboard request was also exercised without a configured Groq credential. The UI displayed the intended guidance to set `GROQ_PROXY_URL` or `GROQ_API_KEY` in `backend/.env`, and the browser console contained no runtime errors beyond the standard React development notice.
