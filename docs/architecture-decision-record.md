# ADR-0001: AR Camera Video Layering and Readiness Gating

- Status: Accepted
- Date: 2026-04-29

## Context

The deployed WebAR experience showed a black background even after camera permission succeeded. AR.js creates a camera video element that can be hidden by overlay layers or delayed readiness.

## Decision

Enforce explicit layering for camera video, scene canvas, and UI overlays. Gate the loading overlay until a live camera stream is verified and a video frame is ready. Provide debug telemetry and a clear error message when video readiness fails.

## Consequences

The AR page now guarantees consistent layering across mobile and desktop, with explicit readiness checks before hiding the loading overlay. Debug output and error handling become part of the AR start flow for easier diagnosis.
