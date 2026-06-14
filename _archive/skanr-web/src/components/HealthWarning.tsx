import { AlertTriangle, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { RiskResult } from "@/lib/health-profile";

export function HealthWarning({ risk, onDismiss }: { risk: RiskResult; onDismiss: () => void }) {
  const { t } = useI18n();

  if (!risk.hasRisk) return null;

  return (
    <div
      role="alert"
      className="rounded-3xl border-2 border-destructive/40 bg-destructive/10 p-5 mb-3 animate-in fade-in slide-in-from-top-2 duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-2xl bg-destructive/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="size-5 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-base text-destructive">
            {t("warn.title")}
          </h3>

          {risk.matchedAllergens.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-foreground/80">{t("warn.allergen")}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {risk.matchedAllergens.map((a) => (
                  <span
                    key={a}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-destructive text-destructive-foreground"
                  >
                    {t(`alg.${a}`)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {risk.matchedConditions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-foreground/80">{t("warn.condition")}</p>
              <div className="flex flex-col gap-1.5 mt-1.5">
                {risk.matchedConditions.map((c) => (
                  <div
                    key={c.key}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-card/70 border border-destructive/20"
                  >
                    <span className="text-sm font-semibold text-foreground">
                      {t(`cond.${c.key}`)}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">{c.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={onDismiss}
          aria-label={t("warn.dismiss")}
          className="size-8 rounded-full bg-card/70 hover:bg-card flex items-center justify-center shrink-0"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
