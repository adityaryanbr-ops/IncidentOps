"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { ScrollReveal } from "@/components/scroll-reveal";

export const ILLUSTRATIVE_REVIEWS = [
  { context: "On the road", quote: "A photo and one sentence. That’s all I needed to get the report started.", name: "Rohan Mehta", role: "Commuter", initials: "RD", tone: "sage" },
  { context: "At work", quote: "The checklist made the handover much easier to follow.", name: "Neha Rao", role: "Site supervisor", initials: "WS", tone: "sand" },
  { context: "Around campus", quote: "I could say what happened instead of typing it all out.", name: "Aditi Shah", role: "Student", initials: "CP", tone: "lemon" },
  { context: "After the rain", quote: "Having the photo, location and next steps together just made sense.", name: "Arjun Nair", role: "Resident", initials: "HM", tone: "blue" },
  { context: "During a shift", quote: "It helped me explain the hazard without writing a whole page.", name: "Meera Iyer", role: "Facilities coordinator", initials: "FT", tone: "rose" },
  { context: "Out in the field", quote: "The source links were useful. I could check where the advice came from.", name: "Kabir Sethi", role: "Field coordinator", initials: "FC", tone: "lavender" },
] as const;

export function IncidentQuoteDeck() {
  const [active, setActive] = useState(0);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const count = ILLUSTRATIVE_REVIEWS.length;
  const step = (direction: number) => setActive(index => (index + direction + count) % count);

  function finishSwipe(event: PointerEvent<HTMLElement>) {
    if (!pointer.current) return;
    const dx = event.clientX - pointer.current.x;
    const dy = event.clientY - pointer.current.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      swiped.current = true;
      step(dx < 0 ? 1 : -1);
    }
    pointer.current = null;
  }

  return <ScrollReveal><section className="quote-section" aria-labelledby="quote-heading" aria-roledescription="carousel" aria-describedby="quote-instructions" tabIndex={0}
    onKeyDown={event => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); step(event.key === "ArrowRight" ? 1 : -1); }
      if (event.key === "Home" || event.key === "End") { event.preventDefault(); setActive(event.key === "Home" ? 0 : count - 1); }
    }}
    onPointerDown={event => { pointer.current = { x: event.clientX, y: event.clientY }; swiped.current = false; }}
    onPointerUp={finishSwipe}
    onPointerCancel={() => { pointer.current = null; }}
    onClickCapture={event => { if (swiped.current) { event.preventDefault(); event.stopPropagation(); swiped.current = false; } }}>
    <div className="quote-heading"><div><p className="quote-overline">A little less friction.</p><h2 id="quote-heading">For the people<br />on the ground.</h2></div><p className="quote-disclosure">Example stories</p></div>
    <div className="quote-stage">
      {ILLUSTRATIVE_REVIEWS.map((review, index) => {
        const offset = ((index - active + count + Math.floor(count / 2)) % count) - Math.floor(count / 2);
        return <article key={review.name} className="quote-card" data-active={offset === 0} data-tone={review.tone} aria-label={`Illustrative testimonial ${index + 1} of ${count}`} aria-hidden={Math.abs(offset) > 2 || undefined} style={{ "--offset": offset, zIndex: 10 - Math.abs(offset), opacity: Math.abs(offset) > 2 ? 0 : offset === 0 ? 1 : .48, pointerEvents: Math.abs(offset) > 2 ? "none" : undefined } as CSSProperties}>
          <div className="quote-card-top"><span>{review.context}</span></div>
          <blockquote>“{review.quote}”</blockquote>
          <footer><span className="quote-avatar" aria-hidden="true" style={{backgroundPosition: `${index % 3 * 50}% ${Math.floor(index / 3) * 100}%`}} /><span><strong>{review.name}</strong><small>{review.role}</small></span></footer>
          <button type="button" className="quote-pick" tabIndex={offset === 0 ? 0 : -1} aria-label={`Read ${review.name}’s illustrative testimonial`} aria-pressed={offset === 0} onClick={() => setActive(index)} />
        </article>;
      })}
    </div>
    <p id="quote-instructions" className="quote-instructions">Swipe or tap a card to explore. <span className="sr-only">You can also use the left and right arrow keys.</span></p>
    <p className="sr-only" aria-live="polite" aria-atomic="true">{ILLUSTRATIVE_REVIEWS[active].name}: {ILLUSTRATIVE_REVIEWS[active].quote}</p>
  </section></ScrollReveal>;
}
