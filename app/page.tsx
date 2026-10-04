import Link from "next/link";
import { IngredientIcon, InsightIcon, NutritionIcon } from "@/components/Icons";
import { ScanIllustration } from "@/components/ScanIllustration";

const features = [
  {
    title: "AI Ingredient Analysis",
    text: "Understand complicated ingredients in seconds.",
    icon: IngredientIcon,
  },
  {
    title: "Personalized Insights",
    text: "See potential concerns based on your dietary preferences.",
    icon: InsightIcon,
  },
  {
    title: "Simple Nutrition",
    text: "Turn confusing nutrition information into easy-to-understand insights.",
    icon: NutritionIcon,
  },
];

const steps = [
  {
    number: "1",
    title: "Tell us about your preferences",
    text: "Share allergies, dietary preferences, and ingredients you want to avoid.",
  },
  {
    number: "2",
    title: "Upload a food label",
    text: "Use a photo of the ingredient list and nutrition panel.",
  },
  {
    number: "3",
    title: "Get your personalized analysis",
    text: "Review a plain-language report, then listen to a short summary.",
  },
];

export default function HomePage() {
  return (
    <div>
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 overflow-hidden px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
              Informational label assistant
            </p>
            <h1 className="mt-3 font-display text-5xl leading-tight text-foreground sm:text-6xl">
              xilo-food inspector
            </h1>
            <p className="mt-4 max-w-xl text-xl leading-8 text-foreground">
              Understand what&apos;s inside your food — and what it means for you.
            </p>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted">
              Upload a food label and get an AI-powered ingredient and nutrition analysis personalized
              to your dietary preferences.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/onboarding"
                className="rounded-full bg-accent px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-accent-dark"
              >
                Check a Food
              </Link>
              <a
                href="#how-it-works"
                className="rounded-full border border-line bg-white px-6 py-3 text-center text-sm font-semibold text-foreground transition hover:border-accent"
              >
                See How It Works
              </a>
            </div>
            <p className="mt-4 text-sm text-muted">Informational only. Not a medical diagnosis.</p>
          </div>
          <ScanIllustration />
        </section>

        <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 sm:px-6 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="rounded-3xl border border-line bg-white p-6 shadow-sm">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-2xl bg-accent-soft text-accent">
                  <Icon />
                </div>
                <h2 className="text-lg font-semibold text-foreground">{feature.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{feature.text}</p>
              </article>
            );
          })}
        </section>

        <section id="how-it-works" className="border-t border-line bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="font-display text-3xl text-foreground">How it works</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {steps.map((step) => (
                <li key={step.number} className="rounded-3xl bg-background p-6">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-sm font-semibold text-white">
                    {step.number}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <p className="font-semibold text-foreground">xilo-food inspector</p>
          <p className="mt-1 text-sm text-muted">AI-powered food label insights.</p>
        </div>
      </footer>
    </div>
  );
}
