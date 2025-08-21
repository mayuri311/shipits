import { ChevronDown, Menu, X } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { AuthModal } from "@/components/AuthModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";
import TranslatedText from "@/components/TranslatedText";

interface LandingSectionProps {
  onNavigate: (section: string) => void;
}

export function LandingSection({ onNavigate }: LandingSectionProps) {
  const { t } = useI18n();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <section 
      id="landing" 
      className="relative min-h-screen flex flex-col hero-soft-bg"
    >
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      {/* Fixed Header Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-2">
          <div className="flex justify-between items-center">
            <button
              className="text-foreground hover:text-maroon transition-colors duration-300 font-medium tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 rounded px-2 py-1 text-sm sm:text-base"
              onClick={() => onNavigate("landing")}
            >
              <TranslatedText
                sourceType="ui"
                sourceId="nav-home"
                field="label"
                text={t('homeNav', 'HOME')}
                as="span"
              />
            </button>
            
            {/* Navigation Items */}
            <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
              <Link href="/forum">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
                  <TranslatedText
                    sourceType="ui"
                    sourceId="nav-forum"
                    field="label"
                    text={t('forumNav', 'FORUM')}
                    as="span"
                  />
                </Button>
              </Link>
              
              {/* Desktop: Show all navigation options */}
              <div className="hidden md:flex items-center gap-2">
                <Link href="/lists" className="text-foreground hover:text-maroon transition-colors duration-300 font-medium tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 rounded px-3 py-1">
                  <TranslatedText
                    sourceType="ui"
                    sourceId="nav-lists"
                    field="label"
                    text={t('listsNav', 'LISTS')}
                    as="span"
                  />
                </Link>
                <button
                  className="text-foreground hover:text-maroon transition-colors duration-300 font-medium tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 rounded px-3 py-1"
                  onClick={() => onNavigate("contact")}
                >
                  <TranslatedText
                    sourceType="ui"
                    sourceId="nav-contact"
                    field="label"
                    text={t('contactNav', 'CONTACT')}
                    as="span"
                  />
                </button>
                <button
                  className="text-foreground hover:text-maroon transition-colors duration-300 font-medium tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon focus-visible:ring-offset-2 rounded px-3 py-1"
                  onClick={() => onNavigate("partners")}
                >
                  <TranslatedText
                    sourceType="ui"
                    sourceId="nav-partners"
                    field="label"
                    text={t('partnersNav', 'PARTNERS')}
                    as="span"
                  />
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
            <div className="border-t border-border mt-2 pt-3 pb-2 md:hidden">
              <div className="grid grid-cols-2 gap-2">
                <Link href="/lists" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                    <TranslatedText
                      sourceType="ui"
                      sourceId="mobile-nav-lists"
                      field="label"
                      text={t('listsNav', 'LISTS')}
                      as="span"
                    />
                  </Button>
                </Link>
                <button
                  className="flex items-center justify-start px-3 py-2 text-xs text-foreground hover:text-maroon hover:bg-accent transition-colors rounded"
                  onClick={() => { onNavigate("contact"); setIsMenuOpen(false); }}
                >
                  <TranslatedText
                    sourceType="ui"
                    sourceId="mobile-nav-contact"
                    field="label"
                    text={t('contactNav', 'CONTACT')}
                    as="span"
                  />
                </button>
                <button
                  className="flex items-center justify-start px-3 py-2 text-xs text-foreground hover:text-maroon hover:bg-accent transition-colors rounded"
                  onClick={() => { onNavigate("partners"); setIsMenuOpen(false); }}
                >
                  <TranslatedText
                    sourceType="ui"
                    sourceId="mobile-nav-partners"
                    field="label"
                    text={t('partnersNav', 'PARTNERS')}
                    as="span"
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Central Title */}
      <div className="flex-1 flex items-center justify-center text-center pt-20 px-4">
        <div className="animate-float">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold tracking-tight mb-4 text-foreground">
            <TranslatedText
              sourceType="ui"
              sourceId="landing-title"
              field="title"
              text={t('shipItsAtCMU', 'Ship Its @ CMU')}
              as="span"
            />
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-light max-w-2xl mx-auto">
            <TranslatedText
              sourceType="ui"
              sourceId="landing-subtitle"
              field="description"
              text={t('buildingFuture', 'Building the Future, One Project at a Time')}
              as="span"
            />
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
