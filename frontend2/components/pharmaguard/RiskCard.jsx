// rift26-hackathon\frontend2\components\pharmaguard\RiskCard.jsx

"use client";

import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  BookOpen,
  ArrowRight,
} from "lucide-react";

const riskConfig = {
  safe: {
    icon: ShieldCheck,
    label: "Safe to Use",
    badgeClass: "bg-safe-light text-safe",
    borderClass: "border-safe/20",
    bgClass: "bg-safe-light/30",
    iconBg: "bg-safe/10",
    iconColor: "text-safe",
    barColor: "bg-safe",
  },
  adjust: {
    icon: AlertTriangle,
    label: "Adjust Dosage",
    badgeClass: "bg-warning-light text-warning-foreground",
    borderClass: "border-warning/20",
    bgClass: "bg-warning-light/30",
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    barColor: "bg-warning",
  },
  toxic: {
    icon: ShieldAlert,
    label: "Avoid / Toxic Risk",
    badgeClass: "bg-toxic-light text-toxic",
    borderClass: "border-toxic/20",
    bgClass: "bg-toxic-light/30",
    iconBg: "bg-toxic/10",
    iconColor: "text-toxic",
    barColor: "bg-toxic",
  },
};

export default function RiskCard({ result }) {
  const config = riskConfig[result.riskLevel] || riskConfig.safe;
  const Icon = config.icon;

  return (
    <div
      className={`rounded-xl border ${config.borderClass} ${config.bgClass} overflow-hidden transition-all hover:shadow-md`}
    >
      {/* Header */}
      <div className="flex items-start gap-4 p-5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${config.iconBg}`}
        >
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-base font-semibold text-foreground">
              {result.drug}
            </h3>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.badgeClass}`}
            >
              {config.label}
            </span>
          </div>
          {result.affectedGenes.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground">
                Affected genes:
              </span>
              {result.affectedGenes.map((gene) => (
                <span
                  key={gene}
                  className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs font-mono font-medium text-foreground"
                >
                  {gene}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Risk Score Bar */}
      <div className="px-5 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Risk Score
          </span>
          <span className="text-xs font-bold text-foreground">
            {result.riskScore}/100
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full ${config.barColor} transition-all duration-700`}
            style={{ width: `${result.riskScore}%` }}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="px-5 pb-4">
        <p className="text-sm text-foreground/80 leading-relaxed">
          {result.summary}
        </p>
      </div>

      {/* Recommendation */}
      <div className="border-t border-border/50 bg-card/50 px-5 py-4">
        <div className="flex items-start gap-2">
          <ArrowRight className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">
              Clinical Recommendation
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {result.recommendation}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border/50 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {result.guidelines}
          </span>
        </div>
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
          Level {result.evidenceLevel}
        </span>
      </div>
    </div>
  );
}
