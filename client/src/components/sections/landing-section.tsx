import { ChevronDown } from "lucide-react";
import { Link } from "wouter";

interface LandingSectionProps {
  onNavigate: (section: string) => void;
}

export function LandingSection({ onNavigate }: LandingSectionProps) {
  return (
    <section 
      id="landing" 
      className="relative min-h-screen flex flex-col gradient-bg"
    >
      {/* Fixed Header Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <button 
              className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide"
              onClick={() => onNavigate("landing")}
            >
              HOME
            </button>
            <Link href="/forum">
              <button className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide">
                FORUM
              </button>
            </Link>
            <button 
              className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide"
              onClick={() => onNavigate("contact")}
            >
              CONTACT
            </button>
            <button 
              className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide"
              onClick={() => onNavigate("partners")}
            >
              PARTNERS
            </button>
          </div>
        </div>
      </nav>

      {/* Central Title */}
      <div className="flex-1 flex items-center justify-center text-center pt-20">
        <div className="animate-float">
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-4">
            Ship Its <span className="text-maroon">@</span> CMU
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 font-light">
            Building the Future, One Project at a Time
          </p>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <ChevronDown className="text-2xl text-maroon" size={32} />
      </div>
    </section>
  );
}
