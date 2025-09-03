import { ParallaxSection } from "@/components/ui/parallax-section";
import { ExternalLink, Building2 } from "lucide-react";

const partners = [
  {
    name: "Carnegie Mellon University",
    url: "https://www.cmu.edu",
    type: "Academic",
    description: "Leading research institution fostering innovation"
  },
  {
    name: "Google for Startups",
    url: "https://startup.google.com",
    type: "Corporate",
    description: "Supporting student entrepreneurs worldwide"
  },
  {
    name: "Microsoft for Startups",
    url: "https://startups.microsoft.com",
    type: "Corporate",
    description: "Empowering the next generation of innovators"
  },
  {
    name: "Andreessen Horowitz",
    url: "https://a16z.com",
    type: "Venture",
    description: "Investing in bold entrepreneurs building the future"
  }
];

export function PartnersSection() {
  return (
    <section id="partners" className="relative py-16 bg-gradient-to-b from-muted to-background">
      <div className="container mx-auto px-6 max-w-6xl">
        <ParallaxSection>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-foreground">Our Partners</h2>
            <p className="text-xl text-muted-foreground">Collaborating with industry leaders and academic institutions</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {partners.map((partner, index) => (
              <a
                key={index}
                href={partner.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-card p-6 border-2 border-border hover:border-maroon transition-all duration-300 hover:shadow-lg hover:-translate-y-1 block"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="text-maroon group-hover:scale-110 transition-transform duration-300" size={20} />
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-maroon transition-colors duration-300">
                        {partner.name}
                      </h3>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        {partner.type}
                      </span>
                    </div>
                  </div>
                  <ExternalLink
                    className="text-muted-foreground group-hover:text-maroon transition-colors duration-300 opacity-0 group-hover:opacity-100"
                    size={16}
                  />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {partner.description}
                </p>
              </a>
            ))}
          </div>
        </ParallaxSection>
      </div>
    </section>
  );
}
