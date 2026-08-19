# Virtual Office public deployment

This repository contains only the public deployment output for `ai-lish/virtual-office`.
The operational source and data remain in the private `math-lish/virtual-office`
repository. The published page is a sanitized overview with a build-time model
summary; it does not contain the operational dashboard or source data.

`models.json` contains only each model's rounded 5h／7d usage percentages. The
scheduled Pages workflow obtains the provider snapshot with the repository
secret, discards raw response fields, and publishes an empty `unavailable`
snapshot if the provider or secret is unavailable. It never publishes prompt
counts, reset times, account data, tokens or the raw API response.

`status.json` is a closed-schema public health marker. It contains no quota,
token, provider, user, account or other raw operational data.
