# Backend Development Guidelines

> Concrete conventions for KVideo's API routes and server utilities, distilled from completed tasks.

---

## Overview

These guides document the security and reliability rules the API layer follows. API routes fetch user-controlled upstreams (video sources, IPTV playlists, image URLs), so they assume untrusted destinations and must guard credentials, outbound headers, and resource usage.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [API Security](./api-security.md) | Credential forwarding, header injection, rate limiting, fan-out caps, error disclosure | Filled |

---

## How These Were Filled

- API security: `security-batch1`

When you complete backend work, distill new conventions back here (Trellis `trellis-update-spec` step).

---

**Language**: All documentation is written in **English**.
