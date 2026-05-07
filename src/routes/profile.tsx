import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Heart, ShieldAlert, Globe } from "lucide-react";
import { useState } from "react";
import { ALLERGEN_KEYS, CONDITION_KEYS, useI18n, type Lang, type AllergenKey, type ConditionKey } from "@/lib/i18n";
import { useHealthProfile } from "@/lib/health-profile";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [{ title: "Skanr — Health Profile" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t, lang, setLang, dir } = useI18n();
  const { profile, update } = useHealthProfile();
  const [savedFlash, setSavedFlash] = useState(false);

  const toggleAllergen = (key: AllergenKey) => {
    const next = profile.allergens.includes(key)
      ? profile.allergens.filter((a) => a !== key)
      : [...profile.allergens, key];
    update({ ...profile, allergens: next });
    flashSaved();
  };
  const toggleCondition = (key: ConditionKey) => {
    const next = profile.conditions.includes(key)
      ? profile.conditions.filter((c) => c !== key)
      : [...profile.conditions, key];
    update({ ...profile, conditions: next });
    flashSaved();
  };

  const flashSaved = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  const langs: { code: Lang; label: string; flag: string }[] = [
    { code: "tr", label: "Türkçe", flag: "🇹🇷" },
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "ar", label: "العربية", flag: "🇸🇦" },
  ];

  return (
    <div className="min-h-screen bg-background pb-12" dir={dir}>
      <div className="mx-auto max-w-md px-5 pt-6">
        <header className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="size-10 rounded-full bg-secondary flex items-center justify-center ring-1 ring-border hover:bg-accent transition"
            aria-label={t("profile.back")}
          >
            <ArrowLeft className={cn("size-5", dir === "rtl" && "rotate-180")} />
          </Link>
          <h1 className="font-display font-bold text-lg">{t("profile.title")}</h1>
          <div className={cn(
            "text-xs font-medium px-2.5 py-1 rounded-full transition-opacity",
            savedFlash ? "opacity-100 bg-success/20 text-success" : "opacity-0",
          )}>
            {t("profile.saved")}
          </div>
        </header>

        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{t("profile.subtitle")}</p>

        {/* Language */}
        <Section icon={<Globe className="size-4" />} title={t("profile.lang")}>
          <div className="grid grid-cols-3 gap-2">
            {langs.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-2xl border transition",
                  lang === l.code
                    ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-glow)]"
                    : "bg-card border-border hover:border-primary/40",
                )}
              >
                <span className="text-2xl">{l.flag}</span>
                <span className="text-xs font-semibold">{l.label}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Allergens */}
        <Section icon={<ShieldAlert className="size-4" />} title={t("profile.allergens")}>
          <div className="grid grid-cols-2 gap-2">
            {ALLERGEN_KEYS.map((a) => {
              const active = profile.allergens.includes(a);
              return (
                <button
                  key={a}
                  onClick={() => toggleAllergen(a)}
                  className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition text-start",
                    active
                      ? "bg-destructive/10 border-destructive/40 text-destructive"
                      : "bg-card border-border text-foreground hover:border-primary/40",
                  )}
                >
                  <span className="truncate">{t(`alg.${a}`)}</span>
                  {active && <Check className="size-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Conditions */}
        <Section icon={<Heart className="size-4" />} title={t("profile.conditions")}>
          <div className="grid grid-cols-2 gap-2">
            {CONDITION_KEYS.map((c) => {
              const active = profile.conditions.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => toggleCondition(c)}
                  className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition text-start",
                    active
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-card border-border text-foreground hover:border-primary/40",
                  )}
                >
                  <span className="truncate">{t(`cond.${c}`)}</span>
                  {active && <Check className="size-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3 text-primary">
        {icon}
        <h2 className="font-display font-semibold text-sm uppercase tracking-wider">{title}</h2>
      </div>
      {children}
    </section>
  );
}
