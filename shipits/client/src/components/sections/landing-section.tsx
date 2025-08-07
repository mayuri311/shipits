import { ChevronDown, Menu, X } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { AuthModal } from "@/components/AuthModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

interface LandingSectionProps {
  onNavigate: (section: string) => void;
}

export function LandingSection({ onNavigate }: LandingSectionProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <section 
      id="landing" 
      className="relative min-h-screen flex flex-col gradient-bg"
    >
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      {/* Fixed Header Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-2">
          <div className="flex justify-between items-center">
            <button 
              className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 rounded px-2 py-1 text-sm sm:text-base"
              onClick={() => onNavigate("landing")}
            >
              HOME
            </button>
            
            {/* Navigation Items */}
            <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
              <Link href="/forum">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
                  FORUM
                </Button>
              </Link>
              
              {/* Desktop: Show all navigation options */}
              <div className="hidden md:flex items-center gap-2">
                <button 
                  className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 rounded px-3 py-1"
                  onClick={() => onNavigate("contact")}
                >
                  CONTACT
                </button>
                <button 
                  className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 rounded px-3 py-1"
                  onClick={() => onNavigate("partners")}
                >
                  PARTNERS
                </button>
              </div>

              {/* Mobile: More options button */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="px-2 text-xs relative md:hidden"
              >
                {isMenuOpen ? <X className="w-3 h-3" /> : <Menu className="w-3 h-3" />}
                {!isMenuOpen && <span className="absolute -top-1 -right-1 w-2 h-2 bg-maroon rounded-full"></span>}
              </Button>
            </div>
          </div>
          
          {/* Mobile Extended Menu */}
          {isMenuOpen && (
            <div className="border-t border-gray-200 mt-2 pt-3 pb-2 md:hidden">
              <div className="grid grid-cols-2 gap-2">
                <button 
                  className="flex items-center justify-start px-3 py-2 text-xs text-black hover:text-maroon hover:bg-gray-50 transition-colors rounded"
                  onClick={() => { onNavigate("contact"); setIsMenuOpen(false); }}
                >
                  CONTACT
                </button>
                <button 
                  className="flex items-center justify-start px-3 py-2 text-xs text-black hover:text-maroon hover:bg-gray-50 transition-colors rounded"
                  onClick={() => { onNavigate("partners"); setIsMenuOpen(false); }}
                >
                  PARTNERS
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Central Title */}
      <div className="flex-1 flex items-center justify-center text-center pt-20 px-4">
        <div className="animate-float">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold tracking-tight mb-4">
            Ship Its <span className="text-maroon">@</span> CMU
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 font-light max-w-2xl mx-auto">
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
