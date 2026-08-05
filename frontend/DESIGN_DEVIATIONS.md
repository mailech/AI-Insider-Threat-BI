# Design Deviations

This document tracks any intentional deviations from the core Milestone 1 Design System ("Encrypted Terminal / Classified Broadsheet").

## 1. Validation Error Color

**Deviation**: Introduced a desaturated amber/orange (`#f59e0b`) specifically for validation errors (form fields, error toasts).
**Reasoning**: The design system originally specified pure lime (`#c5ff4a`) for all accents and states, but also requested to avoid user confusion in a security tool where red is typically used for alerts. Using pure lime for a validation error (e.g., "Invalid password") clashes with the positive/active semantic meaning of the lime CTA buttons.
**Scope Limitation**: This amber/orange is **strictly** reserved for validation errors in form fields and toasts. It must **not** be used as a general "warning" color, and it must **not** creep into status pills, log severity indicators, or any other UI elements. The chromatic palette remains single-accent (lime) for everything else.
