import { useState } from "react";
import { ParallaxSection } from "@/components/ui/parallax-section";
import { ChevronDown } from "lucide-react";

const faqItems = [
  {
    id: 1,
    question: "What is Osprey @ CMU?",
    answer: "Osprey @ CMU is a community platform where Carnegie Mellon students can showcase their projects, collaborate on new ideas, and connect with like-minded peers. Whether you're working on a mobile app, hardware project, or research initiative, this is your space to share and get feedback."
  },
  {
    id: 2,
    question: "How do I submit my project?",
    answer: "Simply create an account using your CMU email, navigate to the forum section, and click \"Submit Project.\" You can upload images, videos, code repositories, and detailed descriptions. All submissions are reviewed to ensure quality and relevance to the community."
  },
  {
    id: 3,
    question: "Can I collaborate with other students?",
    answer: "Absolutely! Collaboration is at the heart of Osprey @ CMU. You can reach out to project creators through our messaging system, join existing projects that are looking for contributors, or post collaboration requests in the forum to find teammates for your ideas."
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
    <section id="faq" className="relative py-16 bg-gradient-to-b from-muted to-background">
      <div className="container mx-auto px-6 max-w-4xl">
        <ParallaxSection>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-foreground">Frequently Asked Questions</h2>
            <p className="text-xl text-muted-foreground">Everything you need to know about Osprey @ CMU</p>
          </div>

          <div className="space-y-4">
            {faqItems.map((item) => {
              const isOpen = openItems.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`bg-card border-2 transition-all duration-300 ${
                    isOpen
                      ? 'border-maroon bg-maroon/5 shadow-lg'
                      : 'border-border hover:border-maroon'
                  }`}
                >
                  <button
                    className={`w-full p-6 text-left flex items-center justify-between transition-colors duration-300 ${
                      isOpen ? 'bg-maroon/10' : 'hover:bg-maroon/5'
                    }`}
                    onClick={() => toggleItem(item.id)}
                  >
                    <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                      isOpen ? 'text-maroon' : 'text-foreground'
                    }`}>
                      {item.question}
                    </h3>
                    <ChevronDown
                      className={`text-maroon transition-all duration-300 ${
                        isOpen ? 'rotate-180 scale-110' : ''
                      }`}
                      size={20}
                    />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <div className="p-6 border-t border-border">
                      <p className="text-muted-foreground leading-relaxed">{item.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ParallaxSection>
      </div>
    </section>
  );
}
