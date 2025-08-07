import { LandingSection } from "@/components/sections/landing-section";
import { HeroSection } from "@/components/sections/hero-section";
import { CalendarSection } from "@/components/sections/calendar-section";
import { ProjectsSection } from "@/components/sections/projects-section";
import { FAQSection } from "@/components/sections/faq-section";
import { ContactSection } from "@/components/sections/contact-section";
import { PartnersSection } from "@/components/sections/partners-section";
import { Github, MessageSquare, Twitter, Linkedin } from "lucide-react";

export default function Home() {
  const handleNavigate = (section: string) => {
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen">
      <LandingSection onNavigate={handleNavigate} />
      <HeroSection />
      <CalendarSection />
      <ProjectsSection />
      <FAQSection />
      <ContactSection />
      <PartnersSection />
      
      {/* Footer */}
      <footer className="bg-black text-white py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center">
            <h3 className="text-xl sm:text-2xl font-bold mb-4">
              Ship Its <span className="text-maroon">@</span> CMU
            </h3>
            <p className="text-gray-400 mb-6 px-4">Building the Future, One Project at a Time</p>
            <div className="flex justify-center space-x-4 sm:space-x-6">
              <a href="#" className="text-gray-400 hover:text-maroon transition-colors p-2">
                <Github size={24} />
              </a>
              <a href="#" className="text-gray-400 hover:text-maroon transition-colors p-2">
                <MessageSquare size={24} />
              </a>
              <a href="#" className="text-gray-400 hover:text-maroon transition-colors p-2">
                <Twitter size={24} />
              </a>
              <a href="#" className="text-gray-400 hover:text-maroon transition-colors p-2">
                <Linkedin size={24} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
