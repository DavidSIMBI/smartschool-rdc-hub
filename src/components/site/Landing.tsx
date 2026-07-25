import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Users,
  GraduationCap,
  CalendarCheck,
  ClipboardList,
  FileText,
  Wallet,
  Clock,
  Megaphone,
  BookOpen,
  Bus,
  Hotel,
  ShieldCheck,
  Sparkles,
  Check,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { AnimatedCounter } from "./AnimatedCounter";
import { Navbar } from "./Navbar";
import { Logo } from "./Logo";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicStats } from "@/lib/public-stats.functions";
import { Skeleton } from "@/components/ui/skeleton";
import heroImg from "@/assets/hero-classroom.jpg";
import dashImg from "@/assets/dashboard-preview.jpg";

export function Landing() {
  const { t } = useI18n();
  const fetchStats = useServerFn(getPublicStats);
  const { data: stats, isLoading } = useQuery({
    queryKey: ["public-stats"],
    queryFn: () => fetchStats(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const features = [
    { icon: Users, key: "features.students" },
    { icon: GraduationCap, key: "features.teachers" },
    { icon: CalendarCheck, key: "features.attendance" },
    { icon: ClipboardList, key: "features.exams" },
    { icon: FileText, key: "features.reports" },
    { icon: Wallet, key: "features.fees" },
    { icon: Clock, key: "features.timetable" },
    { icon: Megaphone, key: "features.announcements" },
  ] as const;

  const soon = [
    { icon: BookOpen, key: "features.library" },
    { icon: Bus, key: "features.transport" },
    { icon: Hotel, key: "features.hostel" },
  ] as const;

  const testimonials = [
    {
      name: "Jean-Pierre Mabiala",
      role: "Directeur, Institut Bosangani, Kinshasa",
      quote: "SmartSchool a transformé notre gestion. Bulletins, présences, frais — tout est enfin centralisé.",
    },
    {
      name: "Astrid Kalombo",
      role: "Directrice, École St-Joseph, Lubumbashi",
      quote: "Nous avons gagné plusieurs heures par semaine. L'équipe est ravie et les parents sont mieux informés.",
    },
    {
      name: "Patrick Ilunga",
      role: "Préfet, Complexe Scolaire Kongolo, Goma",
      quote: "Sécurisé, moderne, et surtout pensé pour la RDC. Enfin une solution adaptée à nos réalités.",
    },
  ];

  const plans = [
    { key: "pricing.starter", price: "$29", features: ["Jusqu'à 200 élèves", "1 comptes staff", "Support email"] },
    { key: "pricing.pro", price: "$79", features: ["Jusqu'à 1 000 élèves", "15 comptes staff", "Bulletins auto", "Support prioritaire"], popular: true },
    { key: "pricing.enterprise", price: "$199", features: ["Élèves illimités", "20 comptes staff", "SLA + formations", "Domaine personnalisé"] },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
        <div
          className="absolute inset-0 -z-10 opacity-40"
          style={{ background: "var(--gradient-subtle)" }}
        />
        <div
          className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[900px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--gradient-hero)" }}
        />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <Badge variant="secondary" className="mb-5 gap-1.5 px-3 py-1 rounded-full">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {t("hero.badge")}
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
                {t("hero.title")}{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "var(--gradient-hero)" }}
                >
                  {t("hero.title2")}
                </span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
                {t("hero.subtitle")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-12 px-6 shadow-[var(--shadow-elegant)] hover-scale">
                  <Link to="/auth/register">
                    {t("hero.cta.primary")} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-6">
                  <a href="#features">{t("hero.cta.secondary")}</a>
                </Button>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Sécurité RLS</div>
                <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> FR / EN</div>
              </div>
            </div>
            <div className="relative animate-fade-in">
              <div
                className="absolute -inset-6 rounded-3xl opacity-30 blur-2xl"
                style={{ background: "var(--gradient-hero)" }}
              />
              <img
                src={heroImg}
                alt="Classroom in DRC using SmartSchool"
                width={1600}
                height={1200}
                className="relative rounded-2xl shadow-[var(--shadow-elegant)] border border-border/50"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { v: stats?.schools ?? 0, k: "stats.schools" },
              { v: stats?.students ?? 0, k: "stats.students" },
              { v: stats?.teachers ?? 0, k: "stats.teachers" },
              { v: stats?.admins ?? 0, k: "stats.admins" },
            ].map((s) => (
              <Card key={s.k} className="p-6 text-center border-border/60 hover-scale">
                <div className="text-3xl sm:text-4xl font-bold text-primary">
                  {isLoading ? (
                    <Skeleton className="mx-auto h-10 w-24" />
                  ) : (
                    <AnimatedCounter value={s.v} />
                  )}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{t(s.k as never)}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Dashboard preview */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden border border-border shadow-[var(--shadow-elegant)]">
            <img src={dashImg} alt="Dashboard preview" width={1600} height={1008} loading="lazy" className="w-full h-auto" />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{t("features.title")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("features.subtitle")}</p>
          </div>
          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(({ icon: Icon, key }) => (
              <Card key={key} className="p-6 border-border/60 hover-scale hover:shadow-[var(--shadow-soft)] transition-shadow">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{t(key as never)}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{t((key + ".desc") as never)}</p>
              </Card>
            ))}
          </div>
          <div className="mt-6 grid sm:grid-cols-3 gap-5">
            {soon.map(({ icon: Icon, key }) => (
              <Card key={key} className="p-6 border-dashed border-border/60 opacity-80">
                <div className="flex items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline">{t("features.soon")}</Badge>
                </div>
                <h3 className="mt-4 font-semibold">{t(key as never)}</h3>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ROLES */}
      <section className="py-20 sm:py-28 bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center">{t("roles.title")}</h2>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {["roles.admin", "roles.secretary", "roles.accountant", "roles.teacher", "roles.student", "roles.parent"].map((k) => (
              <Card key={k} className="p-6 border-border/60 flex items-center gap-4 hover-scale">
                <div className="grid h-12 w-12 place-items-center rounded-xl text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="font-semibold">{t(k as never)}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{t("pricing.title")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("pricing.subtitle")}</p>
          </div>
          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <Card
                key={p.key}
                className={`p-8 relative border-border/60 hover-scale ${p.popular ? "ring-2 ring-primary shadow-[var(--shadow-elegant)]" : ""}`}
              >
                {p.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" style={{ background: "var(--gradient-primary)" }}>
                    {t("pricing.popular")}
                  </Badge>
                )}
                <h3 className="font-semibold text-lg">{t(p.key as never)}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{p.price}</span>
                  <span className="text-muted-foreground">{t("pricing.month")}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full mt-8" variant={p.popular ? "default" : "outline"}>
                  <Link to="/auth/register">{t("pricing.cta")}</Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 sm:py-28 bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center">{t("testimonials.title")}</h2>
          <div className="mt-14 grid md:grid-cols-3 gap-6">
            {testimonials.map((tst) => (
              <Card key={tst.name} className="p-6 border-border/60">
                <div className="flex gap-1 text-primary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed">"{tst.quote}"</p>
                <div className="mt-6">
                  <div className="font-semibold text-sm">{tst.name}</div>
                  <div className="text-xs text-muted-foreground">{tst.role}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center">{t("faq.title")}</h2>
          <Accordion type="single" collapsible className="mt-10">
            {["1", "2", "3", "4"].map((n) => (
              <AccordionItem key={n} value={n}>
                <AccordionTrigger className="text-left">{t(`faq.q${n}` as never)}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{t(`faq.a${n}` as never)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CONTACT / CTA */}
      <section id="contact" className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Card className="relative overflow-hidden p-8 sm:p-12 border-border/60">
            <div
              className="absolute inset-0 opacity-90 -z-10"
              style={{ background: "var(--gradient-hero)" }}
            />
            <div className="grid md:grid-cols-2 gap-10 items-center text-primary-foreground">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{t("contact.title")}</h2>
                <p className="mt-4 opacity-90">{t("contact.subtitle")}</p>
                <div className="mt-8">
                  <Button asChild size="lg" variant="secondary" className="h-12 px-6">
                    <Link to="/auth/register">
                      {t("hero.cta.primary")} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              <form
                className="space-y-3 rounded-2xl bg-background/95 backdrop-blur p-6 text-foreground"
                onSubmit={(e) => {
                  e.preventDefault();
                }}
              >
                <Input placeholder={t("contact.name")} required />
                <Input type="email" placeholder={t("contact.email")} required />
                <Textarea placeholder={t("contact.message")} rows={4} required />
                <Button className="w-full">{t("contact.send")}</Button>
              </form>
            </div>
          </Card>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo />
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SmartSchool RDC\u00a0 {t("footer.rights")}
          </p>
        </div>
      </footer>
    </div>
  );
}