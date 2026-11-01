# Task S1: Fix Homarr Service Status, Start Handler, and Guide Links in Services Tab

## Objective
Fix the Homarr service entry in the Services tab:
1. Identify why Homarr appears as "STOPPED" on port 7575.
2. Fix the "Start" action so it actually brings up Homarr or redirects to the integrated fullpage Homarr board.
3. Fix the "Guide" button in `ServicesManager.tsx` so clicking it properly opens the unified guide page or modal instead of failing silently.
4. Verify all service action buttons and reverse proxy links across the hub.
