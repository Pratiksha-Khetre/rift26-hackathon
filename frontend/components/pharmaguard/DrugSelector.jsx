"use client";

// rift26-hackathon\Frontend\components\pharmaguard\DrugSelector.jsx

import { useState } from "react";
import { Search, Pill, ChevronRight } from "lucide-react";
import { mockDrugs } from "@/lib/mock-data";

export default function DrugSelector({ onDrugSelect, selectedDrugs = [] }) {
  const [search, setSearch] = useState("");

  const filteredDrugs = mockDrugs.filter(
    (drug) =>
      drug.name.toLowerCase().includes(search.toLowerCase()) ||
      drug.category.toLowerCase().includes(search.toLowerCase()),
  );

  function handleToggleDrug(drugId) {
    if (selectedDrugs.includes(drugId)) {
      onDrugSelect(selectedDrugs.filter((id) => id !== drugId));
    } else {
      onDrugSelect([...selectedDrugs, drugId]);
    }
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-semibold text-foreground mb-2">
        Select Medications to Analyze
      </label>
      <p className="text-sm text-muted-foreground mb-4">
        Choose one or more drugs to evaluate against the detected genomic
        variants.
      </p>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search medications..."
          className="w-full rounded-lg border border-input bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-colors"
          aria-label="Search medications"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filteredDrugs.map((drug) => {
          const isSelected = selectedDrugs.includes(drug.id);
          return (
            <button
              key={drug.id}
              onClick={() => handleToggleDrug(drug.id)}
              className={`group flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-card hover:border-primary/40 hover:bg-secondary/50"
              }`}
              aria-pressed={isSelected}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-primary"
                }`}
              >
                <Pill className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {drug.name}
                </p>
                <p className="text-xs text-muted-foreground">{drug.category}</p>
              </div>
              <ChevronRight
                className={`h-4 w-4 shrink-0 transition-all ${
                  isSelected
                    ? "text-primary opacity-100"
                    : "text-muted-foreground opacity-0 group-hover:opacity-100"
                }`}
              />
            </button>
          );
        })}
      </div>

      {filteredDrugs.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-8">
          <p className="text-sm text-muted-foreground">
            No medications match your search.
          </p>
        </div>
      )}

      {selectedDrugs.length > 0 && (
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground">
            Selected:
          </span>
          {selectedDrugs.map((id) => {
            const drug = mockDrugs.find((d) => d.id === id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                {drug?.name}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
