# Archers Calendar Generator - Improvement Spec

## Overview
This document outlines the architectural, UX, and performance improvements for the Archers Calendar Generator. The goal is to address the unwieldy size of the main `page.tsx` file (4,200+ lines), improve the mobile user experience, and optimize the image export process.

## 1. Architecture & Performance: React Context Refactor

### Problem
Currently, the entire application state (over 40 variables) and all UI components reside in a single `app/page.tsx` file. This causes excessive re-renders across the entire application whenever a single piece of state (like a background color or a text input) changes, leading to sluggish performance.

### Solution
Implement a global state management solution using React Context to separate concerns and enable component splitting.

*   **Context Provider (`ScheduleContext.tsx`):** 
    *   Extract all `useState` and `useMemo` hooks related to the calendar's visual state, parsed entries, and export settings into a dedicated provider.
    *   Expose a `useSchedule()` custom hook for child components to consume.
*   **Component Splitting:**
    *   Break down `page.tsx` into logical, independent components:
        *   `components/PreviewCanvas.tsx` (The actual calendar display)
        *   `components/Sidebar/` (Desktop controls)
        *   `components/MobileControls/` (Mobile bottom sheet)
        *   `components/ExportOverlay.tsx` (Handling the download UI)
*   **Benefits:** Improved rendering performance (components only re-render when their specific context slices change) and vastly improved developer experience/maintainability.

## 2. Mobile UX Reorganization

### Problem
On mobile devices, the settings (Design, Courses, Export) and the calendar preview are separated by tabs. This forces the user to constantly switch back and forth to see how their design changes affect the actual calendar, leading to a disjointed experience.

### Solution
Transition from a tab-replacement model to a persistent preview model.

*   **Persistent Preview:** The calendar preview will remain fixed at the top of the mobile screen.
*   **Bottom Sheet Settings:** The settings panels (Courses, Design, Export) will be housed in a sliding "Bottom Sheet" (or half-screen overlay) that sits below the preview.
*   **Benefits:** Users receive immediate visual feedback on their design choices without losing context, mirroring native mobile editing apps (like Instagram or standard photo editors).

## 3. Export Optimization

### Problem
The application uses `html2canvas` at a hardcoded 4x scale (`EXPORT_SCALE = 4`) for all devices to generate high-resolution images. On mobile devices with less memory, this can cause the browser to hang, freeze, or crash entirely. Additionally, there is insufficient visual feedback during the heavy generation process.

### Solution
Optimize the perceived and actual performance of the export engine.

*   **Dynamic Scaling:** Instead of a static 4x scale, dynamically adjust the export scale based on the user's device viewport and available memory. 
    *   Desktop/High-memory: Keep 4x scale for maximum fidelity.
    *   Mobile/Low-memory: Fall back to 2x or 3x scale to prevent crashes while maintaining acceptable quality.
*   **Feedback UI:** Implement a blocking, visually distinct "Generating High-Res Image..." overlay. This overlay should mount *before* the synchronous `html2canvas` operation blocks the main thread, ensuring the user knows the app is working, not frozen.
*   **Benefits:** Reduced crash rates on mobile, faster generation times on lower-end devices, and a less frustrating user experience.
