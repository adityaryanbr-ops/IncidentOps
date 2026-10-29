"use client";

import { useState } from "react";
import { ArrowRight, ArrowUpRight, Check, Camera } from "lucide-react";
import { INCIDENT_CATEGORIES, type IncidentCategory } from "@/lib/incident-categories";
import { ScrollReveal } from "@/components/scroll-reveal";

export function IncidentCategories({ onChoose }: { onChoose: (category: IncidentCategory) => void }) {
  const [selected, setSelected] = useState<IncidentCategory>(INCIDENT_CATEGORIES[0]);

  return (
    <section id="incident-types" className="category-section" aria-labelledby="category-heading">
      <div className="category-introduction">
        <h2 id="category-heading" className="category-headline">Different scenes.<br /><span>One clear next step.</span></h2>
        <p>From a damaged walkway to a flooded room. Start with what you see, and let the evidence tell the story.</p>
      </div>
      <div className="category-grid" aria-label="Explore incident categories">
        {INCIDENT_CATEGORIES.map((category) => (
          <ScrollReveal key={category.id} className="category-reveal">
            <button
              type="button"
              className="category-card"
              aria-pressed={selected.id === category.id}
              aria-controls="category-detail"
              onClick={() => setSelected(category)}
            >
              <span className="category-art-frame" aria-hidden="true"><span className="category-art" style={{ backgroundPosition: `${category.column * 100 / 3}% ${category.row * 50}%` }} /></span>
              <span className="category-name">{category.title}</span>
              <span className="category-feedback" aria-hidden="true">{selected.id === category.id ? <Check size={17} /> : <ArrowUpRight size={17} />}</span>
            </button>
          </ScrollReveal>
        ))}
      </div>
      <div className="category-detail" id="category-detail">
        <div className="category-description" aria-live="polite" aria-atomic="true"><h3>{selected.title}</h3><p>{selected.examples}</p></div>
        <div className="category-photo-tip" aria-live="polite" aria-atomic="true"><Camera size={19} aria-hidden="true" /><div><h4>What to capture</h4><p>{selected.capture}</p></div></div>
        <a href="#workspace" className="action-button" onClick={() => onChoose(selected)}>Report this incident <span className="button-orb"><ArrowRight size={18} /></span></a>
      </div>
      <div className="category-footnote"><p>Stay safe. Never approach a hazard for a photo. In an emergency, contact local emergency services.</p><a href="https://ready.wv.gov/hazards" target="_blank" rel="noreferrer">Public hazard guide <ArrowUpRight size={13} aria-hidden="true" /></a></div>
    </section>
  );
}
