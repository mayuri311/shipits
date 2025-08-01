import { ParallaxSection } from "@/components/ui/parallax-section";
import { Rocket } from "lucide-react";

export function HeroSection() {
  return (
    <section id="hero" className="relative py-16 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <ParallaxSection>
            <h2 className="text-5xl font-bold mb-6 leading-tight">
              Where Innovation
              <span className="text-maroon"> Meets </span>
              Execution
            </h2>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Ship Its @ CMU is the premier platform for Carnegie Mellon students to showcase their projects, 
              connect with peers, and turn ideas into reality. Join our community of makers, builders, and innovators.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-maroon text-white px-8 py-4 hover:bg-maroon-dark transition-colors duration-300 font-medium tracking-wide">
                GET STARTED
              </button>
              <button className="border-2 border-black text-black px-8 py-4 hover:bg-black hover:text-white transition-all duration-300 font-medium tracking-wide">
                LEARN MORE
              </button>
            </div>
          </ParallaxSection>
          
          <ParallaxSection>
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg h-96 flex items-center justify-center border-2 border-gray-300">
              <div className="text-center">
                <Rocket className="text-6xl text-maroon mb-4 mx-auto" size={96} />
                <p className="text-gray-600 font-medium">Hero Graphic Placeholder</p>
              </div>
            </div>
          </ParallaxSection>
        </div>
      </div>
    </section>
  );
}
