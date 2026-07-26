import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/site/Landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartSchool RDC — Gestion scolaire cloud pour écoles RDC" },
      { name: "description", content: "SmartSchool RDC : plateforme cloud tout-en-un pour gérer élèves, enseignants, classes, présences et bulletins dans les écoles primaires et secondaires de la RDC." },
      { property: "og:title", content: "SmartSchool RDC — Gestion scolaire cloud pour écoles RDC" },
      { property: "og:description", content: "Plateforme cloud tout-en-un pour gérer élèves, enseignants, classes, présences et bulletins dans les écoles primaires et secondaires de la RDC." },
      { property: "og:url", content: "https://smartschool-rdc-hub.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://smartschool-rdc-hub.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            { "@type": "Question", name: "Nos données sont-elles isolées des autres écoles ?", acceptedAnswer: { "@type": "Answer", text: "Absolument. Chaque école dispose d'un espace complètement séparé. Aucune autre école ne peut voir vos données grâce à notre architecture multi-tenant sécurisée." } },
            { "@type": "Question", name: "L'application fonctionne-t-elle en français ?", acceptedAnswer: { "@type": "Answer", text: "Oui — l'interface est disponible en français et en anglais, avec un basculement instantané." } },
            { "@type": "Question", name: "Faut-il installer un logiciel ?", acceptedAnswer: { "@type": "Answer", text: "Non. Tout se passe dans le navigateur, sur ordinateur, tablette ou téléphone." } },
            { "@type": "Question", name: "Puis-je essayer gratuitement ?", acceptedAnswer: { "@type": "Answer", text: "Oui, l'inscription est gratuite et vous pouvez tester toutes les fonctionnalités essentielles." } },
          ],
        }),
      },
    ],
  }),
  component: Landing,
});
