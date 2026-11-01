# Task S3: 3D Radial View Mouse Wheel Scroll Isolation

## Objective
Prevent the outer web page from scrolling down when the user uses the mouse wheel over the 3D Radial View:
1. Identify the container component rendering the 3D radial carousel / canvas.
2. Intercept wheel events with `{ passive: false }` and `event.preventDefault()` so zoom/rotation interacts with the 3D radial scene exclusively.
3. Apply `overscroll-behavior: contain` to prevent scroll chaining to the main viewport.
