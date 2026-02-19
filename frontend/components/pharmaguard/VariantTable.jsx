"use client";

// rift26-hackathon\Frontend\components\pharmaguard\VariantTable.jsx

import { Dna, ExternalLink } from "lucide-react";
import { mockVariants } from "@/lib/mock-data";

const significanceStyles = {
  Pathogenic: "bg-toxic-light text-toxic",
  "Likely Pathogenic": "bg-warning-light text-warning-foreground",
  "Drug Response": "bg-safe-light text-safe",
};

export default function VariantTable() {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Dna className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Detected Genomic Variants
          </h3>
          <p className="text-xs text-muted-foreground">
            {mockVariants.length} pharmacogenomic variants identified
          </p>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold text-foreground">
                Gene
              </th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">
                Variant
              </th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">
                Phenotype
              </th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">
                rsID
              </th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">
                Frequency
              </th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">
                Significance
              </th>
            </tr>
          </thead>
          <tbody>
            {mockVariants.map((v, idx) => (
              <tr
                key={v.id}
                className={`border-b border-border/50 transition-colors hover:bg-muted/30 ${
                  idx % 2 === 0 ? "bg-card" : "bg-muted/10"
                }`}
              >
                <td className="px-4 py-3 font-mono font-semibold text-primary">
                  {v.gene}
                </td>
                <td className="px-4 py-3 font-mono text-foreground">
                  {v.variant}
                </td>
                <td className="px-4 py-3 text-foreground">{v.phenotype}</td>
                <td className="px-4 py-3">
                  <a
                    href={`https://www.ncbi.nlm.nih.gov/snp/${v.rsId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-xs"
                  >
                    {v.rsId}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {v.alleleFrequency}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      significanceStyles[v.significance] ||
                      "bg-muted text-muted-foreground"
                    }`}
                  >
                    {v.significance}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {mockVariants.map((v) => (
          <div
            key={v.id}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono font-semibold text-primary text-sm">
                {v.gene}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                  significanceStyles[v.significance] ||
                  "bg-muted text-muted-foreground"
                }`}
              >
                {v.significance}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
              <div>
                <span className="text-muted-foreground">Variant</span>
                <p className="font-mono text-foreground">{v.variant}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Phenotype</span>
                <p className="text-foreground">{v.phenotype}</p>
              </div>
              <div>
                <span className="text-muted-foreground">rsID</span>
                <p>
                  <a
                    href={`https://www.ncbi.nlm.nih.gov/snp/${v.rsId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-mono"
                  >
                    {v.rsId}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Frequency</span>
                <p className="text-foreground">{v.alleleFrequency}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
