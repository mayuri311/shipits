import { ParallaxSection } from "@/components/ui/parallax-section";

const mockPartners = [
  "TECH CORP",
  "INNOVATION LAB", 
  "STARTUP HUB",
  "VENTURE FUND"
];

export function PartnersSection() {
  return (
    <section id="partners" className="relative py-16 bg-gradient-to-b from-gray-100 to-white">
      <div className="container mx-auto px-6 max-w-6xl">
        <ParallaxSection>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Our Partners</h2>
            <p className="text-xl text-gray-600">Collaborating with industry leaders and academic institutions</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
            {mockPartners.map((partner, index) => (
              <div 
                key={index}
                className="bg-white p-8 border-2 border-gray-200 hover:border-maroon transition-colors duration-300 flex items-center justify-center h-24"
              >
                <span className="text-gray-500 font-medium">{partner}</span>
              </div>
            ))}
          </div>
        </ParallaxSection>
      </div>
    </section>
  );
}
