import { useState } from "react";
import { ParallaxSection } from "@/components/ui/parallax-section";
import { ChevronDown } from "lucide-react";

const faqItems = [
  {
    id: 1,
    question: "What is Ship Its @ CMU?",
    answer: "Ship Its @ CMU is a community platform where Carnegie Mellon students can showcase their projects, collaborate on new ideas, and connect with like-minded peers. Whether you're working on a mobile app, hardware project, or research initiative, this is your space to share and get feedback."
  },
  {
    id: 2,
    question: "How do I submit my project?",
    answer: "Simply create an account using your CMU email, navigate to the forum section, and click \"Submit Project.\" You can upload images, videos, code repositories, and detailed descriptions. All submissions are reviewed to ensure quality and relevance to the community."
  },
  {
    id: 3,
    question: "Can I collaborate with other students?",
    answer: "Absolutely! Collaboration is at the heart of Ship Its. You can reach out to project creators through our messaging system, join existing projects that are looking for contributors, or post collaboration requests in the forum to find teammates for your ideas."
  },
  {
    id: 4,
    question: "Are there any upcoming events or workshops?",
    answer: "Yes! We regularly host hackathons, demo nights, and technical workshops. Check our calendar section above for upcoming events, or follow our announcements in the forum for the latest updates on community gatherings and learning opportunities."
  }
];

export function FAQSection() {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (id: number) => {
    setOpenItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  return (
    <section id="faq" className="relative py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-6 max-w-4xl">
        <ParallaxSection>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600">Everything you need to know about Ship Its @ CMU</p>
          </div>

          <div className="space-y-4">
            {faqItems.map((item) => {
              const isOpen = openItems.includes(item.id);
              return (
                <div 
                  key={item.id}
                  className="bg-white border-2 border-gray-200 transition-colors duration-300 hover:border-maroon"
                >
                  <button 
                    className="w-full p-6 text-left flex items-center justify-between"
                    onClick={() => toggleItem(item.id)}
                  >
                    <h3 className="text-lg font-semibold">{item.question}</h3>
                    <ChevronDown 
                      className={`text-maroon transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                      size={20}
                    />
                  </button>
                  {isOpen && (
                    <div className="p-6 pt-0 border-t border-gray-100">
                      <p className="text-gray-600">{item.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ParallaxSection>
      </div>
    </section>
  );
}
