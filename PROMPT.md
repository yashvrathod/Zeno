Refactor the hero animation system to use viewport-based composition math instead of hardcoded transform values.

Current issue:
The hero scene uses many hardcoded x/y transform values for positioning the hologram panel, code analysis card, and video wrapper. This causes responsiveness issues across tablets, ultrawide displays, and short-height screens.

Goal:
Create a cinematic, responsive 3D hero scene inspired by Scale AI and Apple motion design using mathematically calculated positions instead of breakpoint-specific magic numbers.

Requirements:

Architecture:

* Build a reusable scene composition system
* Calculate all positions dynamically from viewport width/height
* Replace hardcoded values like:
  x: isMobile ? 28 : -90
  y: isMobile ? 50 : 50

with viewport-relative composition logic

Use a layout system similar to:

* centered positions
* offscreen positions
* spacing-based positioning
* composition-driven transforms

Example concept:

* calculate scene width from viewport
* calculate spacing dynamically
* derive hologram/video/code positions from a shared center point
* maintain cinematic balance across all screen sizes

Implement:

* createSceneLayout()
* calculateScenePositions()
* viewport-based composition engine

Suggested logic:

* use window.innerWidth and window.innerHeight
* derive spacing from viewport proportions
* use relative offsets instead of fixed pixel values
* create reusable scene states

Scene Composition States:

* intro layout
* centered layout
* focus code layout
* focus hologram layout
* split content layout

Animation Goals:

* smooth cinematic transitions
* stable tablet responsiveness
* immersive 3D perspective
* smooth GSAP transforms
* maintain visual hierarchy
* avoid overlapping components on smaller screens

GSAP Requirements:

* keep ScrollTrigger architecture
* keep scrub animations
* use transform and opacity only
* preserve perspective transforms
* preserve 3D motion feel

Responsiveness:
Desktop:

* wider spacing
* stronger parallax
* deeper perspective

Tablet:

* compressed spacing
* reduced transform intensity
* maintain centered composition

Mobile:

* stacked composition
* simplified transforms
* reduced perspective depth
* avoid clipping/offscreen issues

Technical Requirements:

* use gsap.matchMedia()
* use transformOrigin correctly
* avoid layout thrashing
* optimize for 60fps
* preserve existing animation phases and timelines

Important:
The scene should behave like a cinematic motion composition system rather than a collection of individually positioned elements.

The final architecture should feel scalable, maintainable, and similar to how premium interactive landing pages structure responsive motion scenes.
