---
name: Object Storage range streams
description: Undocumented streaming behavior needed for direct video byte-range responses.
---

The Object Storage SDK's streaming wrapper forwards options to the underlying Google Cloud Storage read stream, including byte-range start/end options that its public download option typings omit. Its returned PassThrough does not forward the source's response event; the standard Node pipe event exposes the source so its response headers can be observed.

**Why:** Correct video range responses need the upstream Content-Range and Content-Length before any bytes are sent. Reading the whole object into memory or downloading it to a temporary file for each seek defeats the purpose of direct range streaming.

**How to apply:** When upgrading the SDK, verify option forwarding and source-stream event behavior against the installed implementation. Confirm bounded, open-ended, suffix, clamped and unsatisfiable ranges with live storage requests.
