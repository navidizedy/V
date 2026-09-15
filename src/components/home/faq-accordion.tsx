"use client";

import { useState } from "react";

export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {items.map((faq, i) => {
        const isOpen = open === i;
        return (
          <div
            key={faq.q}
            className="rounded-2xl border border-gray-100 overflow-hidden bg-white hover:border-orange-200 transition-colors"
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${i}`}
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between p-5 text-right cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <span className="font-bold text-gray-900">{faq.q}</span>
              <span
                aria-hidden
                className={`w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 shrink-0 transition-transform ${isOpen ? "rotate-45" : ""}`}
              >
                <span className="text-xl font-bold leading-none">+</span>
              </span>
            </button>
            {/* Answers are always in the DOM (SEO + no-JS) — just hidden when collapsed */}
            <div
              id={`faq-panel-${i}`}
              hidden={!isOpen}
              className="px-5 pb-5 text-gray-600 leading-relaxed"
            >
              {faq.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}
