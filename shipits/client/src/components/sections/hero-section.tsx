import { ParallaxSection } from "@/components/ui/parallax-section";
import { Rocket } from "lucide-react";

export function HeroSection() {
  return (
    <section id="hero" className="relative py-16 bg-background">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <ParallaxSection>
            <h2 className="text-5xl font-bold mb-6 leading-tight text-foreground">
              Where Innovation
              <span className="text-maroon"> Meets </span>
              Execution
            </h2>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Osprey @ CMU is the premier platform for Carnegie Mellon students to showcase their projects,
              connect with peers, and turn ideas into reality. Join our community of makers, builders, and innovators.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-maroon text-white px-8 py-4 hover:bg-maroon-dark transition-colors duration-300 font-medium tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-maroon rounded">
                GET STARTED
              </button>
              <button className="border-2 border-foreground text-foreground bg-background px-8 py-4 hover:bg-foreground hover:text-background transition-all duration-300 font-medium tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 rounded">
                LEARN MORE
              </button>
            </div>
          </ParallaxSection>
          
          <ParallaxSection>
            <div className="bg-muted rounded-lg h-96 flex items-center justify-center border-2 border-border">
              <div className="text-center">
                <Rocket className="text-6xl text-maroon mb-4 mx-auto" size={96} />
                <p className="text-muted-foreground font-medium">Hero Graphic Placeholder</p>
              </div>
            </div>
          </ParallaxSection>
        </div>
      </div>
    </section>
  );
}
