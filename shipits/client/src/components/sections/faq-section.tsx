import { useState } from "react";
import { ParallaxSection } from "@/components/ui/parallax-section";
import { ChevronDown } from "lucide-react";

const faqItems = [
  {
    id: 1,
    question: "What is Osprey @ CMU?",
    answer: "Osprey @ CMU is Carnegie Mellon's premier student innovation platform designed to foster collaboration and showcase technical excellence. Our community provides a structured environment where students can present their projects, receive constructive feedback, and connect with peers across disciplines including computer science, engineering, design, and business."
  },
  {
    id: 2,
    question: "How do I submit my project?",
    answer: "To submit your project, first register with your official CMU email address. Navigate to the Projects section and select \"Submit Project.\" You'll need to provide a comprehensive project description, technical specifications, team information, and supporting media. All submissions undergo a quality review process to ensure they meet our community standards and showcase meaningful technical work."
  },
  {
    id: 3,
    question: "Can I collaborate with other students?",
    answer: "Collaboration is fundamental to our platform's mission. You can connect with project creators through our integrated messaging system, join established teams seeking additional talent, or post project proposals to attract collaborators. We encourage interdisciplinary collaboration and provide tools to facilitate effective team communication and project management."
  },
  {
    id: 4,
    question: "What types of projects are accepted?",
    answer: "We welcome projects from all technical disciplines, including software development, hardware prototyping, AI/ML applications, web development, mobile applications, research initiatives, and entrepreneurial ventures. Projects should demonstrate technical innovation, thoughtful design, and potential for real-world impact. Academic course projects and research are also encouraged if they showcase significant technical achievement."
  },
  {
    id: 5,
    question: "How does the feedback system work?",
    answer: "Our peer review system allows community members to provide constructive feedback on projects. Reviews focus on technical implementation, design decisions, scalability, and potential improvements. Users can upvote helpful feedback, creating a reputation system that highlights valuable contributors to our community."
  },
  {
    id: 6,
    question: "Is Osprey @ CMU only for CMU students?",
    answer: "While our platform is centered around the CMU community, we welcome participation from alumni and industry professionals who wish to mentor, collaborate, or share their expertise. However, project submissions and core community features are primarily designed for current CMU students to showcase their academic and extracurricular work."
  },

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
