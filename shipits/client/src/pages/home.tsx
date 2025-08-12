import { LandingSection } from "@/components/sections/landing-section";
import { HeroSection } from "@/components/sections/hero-section";
import { CalendarSection } from "@/components/sections/calendar-section";
import { ProjectsSection } from "@/components/sections/projects-section";
import { FAQSection } from "@/components/sections/faq-section";
import { ContactSection } from "@/components/sections/contact-section";
import { PartnersSection } from "@/components/sections/partners-section";
import { Github, MessageSquare, Twitter, Linkedin, Award } from "lucide-react";
import { useEffect, useState } from "react";
import { projectsApi } from "@/lib/api";

export default function Home() {
  const [leaderboard, setLeaderboard] = useState<Array<{ _id: string; username: string; fullName: string; profileImage?: string; totalPoints: number }>>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await projectsApi.getLeaderboard({ period: 30, limit: 5 });
        if ((res as any).success) {
          setLeaderboard((res as any).data.items || []);
        }
      } catch {}
    })();
  }, []);
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
      {/* Trending Contributors */}
      {leaderboard.length > 0 && (
        <section className="py-10">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-yellow-500" /> Trending Contributors</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {leaderboard.map((u) => (
                <div key={u._id} className="border border-gray-200 rounded-lg p-4 bg-white flex items-center gap-3">
                  {u.profileImage ? (
                    <img src={u.profileImage} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-maroon text-white flex items-center justify-center font-bold">
                      {(u.fullName || u.username || 'U').slice(0,1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 truncate">{u.fullName || u.username}</div>
                    <div className="text-xs text-gray-600">{u.totalPoints} pts</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
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
