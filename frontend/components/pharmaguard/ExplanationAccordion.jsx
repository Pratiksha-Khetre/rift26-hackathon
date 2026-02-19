"use client";

// rift26-hackathon\Frontend\components\pharmaguard\ExplanationAccordion.jsx

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { mockExplanations } from "@/lib/mock-data";

export default function ExplanationAccordion() {
  const [openId, setOpenId] = useState(null);

  function toggle(id) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <HelpCircle className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Understanding Your Results
          </h3>
          <p className="text-xs text-muted-foreground">
            Learn about pharmacogenomics and how to interpret this report.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
        {mockExplanations.map((item) => {
          const isOpen = openId === item.id;
          return (
            <div key={item.id} className="bg-card">
              <button
                onClick={() => toggle(item.id)}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
                aria-expanded={isOpen}
                aria-controls={`explanation-${item.id}`}
              >
                <span className="text-sm font-medium text-foreground pr-4">
                  {item.title}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                id={`explanation-${item.id}`}
                className={`overflow-hidden transition-all duration-200 ${
                  isOpen ? "max-h-96" : "max-h-0"
                }`}
                role="region"
                aria-labelledby={`explanation-trigger-${item.id}`}
              >
                <div className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.content}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
