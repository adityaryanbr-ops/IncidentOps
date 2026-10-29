# IncidentOps visual system

## Scope and direction
Frontend redesign requested on 2026-10-28. The user supplied the Hirael Creative Studio template as the visual reference. A near-black full-viewport opening has a bottom-aligned oversized wordmark, a softly moving image backdrop, compact notched navigation, and a cream pill action with a circular arrow. A large introductory statement leads to the operational workspace. Existing routes, data contracts, evidence photos, location confirmation, safety notices, source links, exports, and local persistence remain the product foundation.

## Typography
Manrope for display headings; IBM Plex Sans for forms, navigation, reports, and supporting text. Fonts load through next/font. Display tracking never exceeds -0.04em.

## Color and shape
Near-black and muted olive-neutral surfaces with cream primary actions. Semantic severity and error colors remain distinct. CSS variables control both light and dark themes; initial theme is dark to follow the explicit Hirael reference and the sun/moon button changes it for the current page session. Workspace panels use 12px corners, inputs use 6px corners, and actions use pill corners. The full-viewport hero uses 32px corners. Surface separation uses borders.

## Motion
Opening typography rises once from a clipped baseline, while a blurred decorative city backdrop drifts slowly, and below-fold workspace/report sections reveal once. Button arrows and press states provide action feedback. IntersectionObserver owns scroll reveals and disconnects after entry or unmount. Reduced motion disables entrances and smooth scrolling. No scroll hijacking or animation dependency.

## Assets
public/city-hero.png is generated illustrative city imagery and is explicitly captioned as illustration. It is never submitted as evidence. Existing public/samples images remain sample incident evidence.

## Validation
Lint, TypeScript, production build, and tests/scroll-reveal.test.mjs were run. Browser preview access was denied in this session. Responsive appearance, print preview, keyboard behavior, and an end-to-end live analysis require browser verification before claiming visual acceptance.

## Reference revision
On 2026-10-28, inspected the linked 21st.dev listing and its live Hirael preview. Implemented an original IncidentOps adaptation without downloading the paid template. The existing generated city image is reused as decorative atmosphere, not incident evidence. Local browser verification is still unavailable following the earlier preview denial.

## Incident category exploration
Added twelve illustrative upload categories: road and transport, workplace, home and property, sports and recreation, industrial, fire and smoke, flooding and leaks, electrical, structural damage, storm and tree damage, chemical and pollution, and blocked access. These are a browsing taxonomy, not a claim of validated model coverage or an automatic severity judgment.

The rendered 3D icon sheet is stored as public/incident-icons.webp (1448×1086, alpha, approximately 424 KB); public/incident-icons.png retains the generated source. A four-column by three-row CSS atlas gives every category a distinct image while sharing one network asset. Its miniatures use ivory, amber, charcoal, sage, and translucent water. Icons are decorative beside accessible text labels.

Selecting a category updates example incidents and safe photo guidance. The report action carries its label into the intake header without overwriting any draft or changing the backend API. Individual category cards reveal as they enter the viewport. Supporting browsers also tie headline growth and miniature arrival to scroll using CSS view timelines; other browsers retain observer-based reveals and the final readable text size. Reduced motion disables spatial effects.

Research references: https://ready.wv.gov/hazards and https://www.readync.gov/stay-informed/north-carolina-hazards for broader emergency classes; https://www.osha.gov/sites/default/files/2021-07/Workplace%20Safety%20%26amp%3B%20Heath%20%28Chemical%20and%20Machine%20Hazards%29%20Trainer%20Guide.pdf for machinery and workplace hazards. Category organization and upload examples are product design judgments, not measured upload frequencies.

Verification: six focused tests cover category cells, selection-to-intake behavior, and observer/reduced-motion fallbacks. Lint and TypeScript pass. The user explicitly approved local preview verification, but a saved browser permission policy still denied localhost. No rendered screenshots or live scroll/mobile behavior could be verified in this session.

## Quick incident intake
Reports now use a two-row note field with one-line sample descriptions, plus a photo and a separate incident location. Device geolocation is requested only when the user clicks Use my location, and its reported accuracy is shown. Direct latitude/longitude input is range-checked and sent to the existing analysis API without geocoding; address input still uses the confirmed Photon lookup. Optional voice transcripts sit in a disclosure. Sample coordinates are explicitly illustrative. Real-device geolocation and browser rendering remain unverified because of the saved local browser restriction.

## Location recovery and voice reporting
Device location now retries once with lower accuracy and a position up to one minute old if a high-accuracy attempt fails or times out. Permission denial does not retry; messages distinguish blocked access, timeout, and unavailable location. Device/host permissions cannot be changed by application code. Coordinates and displayed accuracy still need user review.

VoiceInput is visible, using browser SpeechRecognition/webkitSpeechRecognition only after Speak report is clicked. Start/stop, final transcript review/edit, permission/network/no-speech feedback, and unmount cleanup are implemented. The browser may use a remote recognition service; the control discloses this. Unsupported browsers retain typed/pasted transcripts and keyboard dictation. A provided transcript is the primary report text, so stale sample notes cannot override dictation. Analysis is disabled while recording. Selecting a sample clears the prior transcript.

Location retry, permission handling, voice-only submission, recognition results, cleanup, and failed-session event isolation have focused tests. Hardware location, microphone access, and browser speech-service connectivity have not been verified on the user's device.

Voice recovery update: VoiceInput now uses MediaRecorder and sends the short clip
(maximum 59 seconds in the UI) to `/api/incidents/transcribe`. The backend uses a
local multilingual Whisper base model. It no longer depends on the browser's
SpeechRecognition service. Audio is not persisted. Permission denial remains a
recoverable, explicit error; editable transcript and keyboard dictation remain.
Location recovery includes Find address, confirmed approximate coordinates and
retained place-name provenance. Device GPS still depends on OS/browser providers.

## Arc hero and quote deck — Scrolltide reference

Inspected Scrolltide's public Arc Carousel and Quote Deck previews in the browser.
The implementation is original CSS/React inspired by their geometry, not copied
from paid prompts or source. Existing Manrope/IBM Plex typography and cream/sage
palette remain. The hero now fills its upper space with all 12 existing rendered
incident miniatures, seated tangentially on an arc with one focused at its apex.
The selected category links to the workspace without overwriting the draft.

A cream quote deck before the footer contains six short sample testimonials.
They are explicitly illustrative scenarios, not represented as collected reviews;
there are no fabricated reviewer identities, ratings, or customer claims.

Both decks support cyclic arrows, Home/End and left/right keys, horizontal swipes,
play/pause, hover pause, persistent stop on focus and manual interaction, offscreen
and hidden-tab suspension, and reduced-motion defaults. Vertical scrolling remains
native. Supporting browsers add scroll-timeline motion to the arc exit and deck
arrival; others retain the static composition and existing reveal behavior. No
new dependencies or image downloads were added. Only the active hero card is in
the tab order; the controls provide navigation through all categories.

Verification: 28 frontend tests pass, plus lint, TypeScript and production build.
New tests cover wraparound, sample disclosure, category-to-intake handoff, swipe
versus vertical movement, click suppression, focus pause, observer suspension and
reduced motion. Local visual/mobile verification remains blocked by the previously
reported saved browser policy; reference previews were inspected visually.

## Simplified quote deck

Removed the entire hero arc carousel and its styling, restoring the original hero
composition. The category explorer and its twelve 3D miniatures remain below.
Removed testimonial playback controls, arrow controls, per-card Sample badges and
autoplay. The deck remains selectable by tapping a card, swiping horizontally or
using arrow/Home/End keys from its focusable section. Vertical scrolling is native.
The existing scroll entrance and reduced-motion CSS remain.

Six drafted testimonials now have fictional names and locally generated fictional
portraits, stored as a 768×512 six-cell atlas in public/review-personas.webp (~42KB).
A visible section disclosure identifies the names and portraits as fictional;
these are not represented as collected customer endorsements. Each visible card
has a full-card button, a name and role, and an avatar from its assigned atlas cell.

Verified: 28 frontend tests, lint, TypeScript and production build pass. The new
portrait sheet was inspected visually. Local browser/mobile rendering remains
unverified because of the saved browser policy.

## Readability and simplified reporting

Raised visible CSS text below 14px to 16px and 14–17px body copy to 18px,
including mobile overrides. Primary field labels, inputs, category names,
example buttons and actions use 18px; metadata and disclosures remain at least
16px. Shared label/input/textarea/button/badge primitives used by the site follow
the larger scale; severity badges can grow vertically rather than clip their text.

The reporting form keeps one column of fields at every width. Example actions
have larger targets and stack on mobile; the main workspace stacks below 1100px.
Shortened example, location and voice instructions while retaining privacy,
location accuracy, advisory and fictional-testimonial disclosures. Workplace
examples now use fewer plain words. Technical runtime details and execution traces
remain accessible behind disclosures. Search query metadata was removed from the
report display; long source excerpts are expandable. Source titles and helpline
numbers remain prominent. Quote cards have additional height for larger names
and roles. The body defaults to 18px with a 1.6 line height.

Verification: all 28 existing frontend tests, lint, TypeScript and production build
pass. No behavior or API contracts were changed. Rendered browser/mobile checks
remain unavailable under the previously reported saved browser policy.

## Open layout and action-first incident brief

Replaced repeated rounded panels with ruled sections: category choices are open
illustration tiles, workspace panels use dividers, and incident/source lists use
rows. Hero corners are reduced to 8px (4px mobile); the quote tray is square and
its actual stacked cards retain a restrained 6px corner. Form controls remain
recognizable with small corners; branded pill actions retain their existing shape.

The incident report now reads as one brief: title/location, labeled severity strip,
visible emergency notice, numbered immediate actions, source-backed phone directory,
then evidence and unknowns. Severity uses a named label plus sage/amber/orange/red
accent rather than relying on color alone. Contact numbers use a separate green
accent and retain purpose, jurisdiction, source links and verification status.
Handoff detail, inferences, source context and technical trace use disclosures.
Human checks and unresolved uncertainties remain visible. Confidence moves to
technical detail and is identified as a model estimate. Existing saved reports
use the new presentation without migration; no facts or actions are truncated.

The backend brief prompt now asks for concise plain English, useful facts and
uncertainties, specific actions in urgency order and minimal repetition. New
reports use this prompt after the backend restart; saved text is not rewritten.

Verification: 31 frontend tests and 15 backend tests pass, along with lint,
TypeScript and the production build. Added checks for section order, retained
steps/emergency notice/unknowns, closed technical detail and missing-action states.
Attempted browser inspection again through the normal tool; the saved localhost
policy denied it. Source-level review is complete; visual/mobile rendering and a
fresh live model generation with the revised prompt remain unverified.
