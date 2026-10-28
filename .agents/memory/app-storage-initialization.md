---
name: App Storage initialization
description: Handling missing default buckets without crashing the application.
---

Instantiate the App Storage SDK client inside an awaited storage operation rather than at module load, and verify storage with a live upload/read/delete check.

**Why:** Installing the SDK did not provision a default bucket in this environment. The client starts asynchronous initialization in its constructor; an unhandled initialization rejection can prevent the application from running when no default bucket exists.

**How to apply:** Keep initialization failures within request error handling. If the SDK reports that a bucket name is needed, have a bucket created in the project's App Storage tool before claiming storage is operational.
