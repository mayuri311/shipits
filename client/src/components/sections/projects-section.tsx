import { useState } from "react";
import { ParallaxSection } from "@/components/ui/parallax-section";
import { Heart, Smartphone, Brain, Cpu, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const mockProjects = [
  {
    id: "1",
    title: "EcoTracker App",
    description: "A mobile app that helps students track their carbon footprint and find sustainable alternatives on campus.",
    category: "Mobile Development",
    likes: 24,
    icon: Smartphone,
    gradient: "from-blue-50 to-indigo-100",
    iconColor: "text-indigo-600"
  },
  {
    id: "2",
    title: "StudyBuddy AI", 
    description: "An AI-powered study companion that creates personalized learning schedules and practice problems.",
    category: "Machine Learning",
    likes: 31,
    icon: Brain,
    gradient: "from-green-50 to-emerald-100",
    iconColor: "text-emerald-600"
  },
  {
    id: "3",
    title: "Smart Dorm System",
    description: "IoT sensors and automation to optimize energy usage and comfort in dormitory rooms.",
    category: "Hardware",
    likes: 18,
    icon: Cpu,
    gradient: "from-purple-50 to-violet-100", 
    iconColor: "text-violet-600"
  },
  {
    id: "4",
    title: "Campus Connect",
    description: "A social platform connecting students with similar interests and academic goals across campus.",
    category: "Web Development",
    likes: 42,
    icon: Globe, 
    gradient: "from-orange-50 to-red-100",
    iconColor: "text-red-600"
  }
];

export function ProjectsSection() {
  const [isForumOpen, setIsForumOpen] = useState(false);

  // Duplicate projects for continuous scroll effect
  const duplicatedProjects = [...mockProjects, ...mockProjects];

  return (
    <section id="projects" className="relative py-16 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-6 max-w-6xl">
        <ParallaxSection>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Recent Projects</h2>
            <p className="text-xl text-gray-600">Discover what our community is building</p>
          </div>

          {/* Horizontal Scrolling Project Carousel */}
          <div className="relative overflow-hidden">
            <div className="flex space-x-6 animate-scroll hover:pause">
              {duplicatedProjects.map((project, index) => {
                const IconComponent = project.icon;
                return (
                  <div 
                    key={`${project.id}-${index}`}
                    className="flex-none w-80 bg-white border-2 border-gray-200 p-6 hover:border-maroon transition-colors duration-300 group"
                  >
                    <div className={`bg-gradient-to-br ${project.gradient} h-48 rounded-lg mb-4 flex items-center justify-center border border-gray-200`}>
                      <IconComponent className={`${project.iconColor}`} size={64} />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-maroon transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3">{project.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {project.category}
                      </span>
                      <div className="flex items-center text-sm text-gray-500">
                        <Heart className="mr-1" size={16} />
                        <span>{project.likes}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-center mt-12">
            <Dialog open={isForumOpen} onOpenChange={setIsForumOpen}>
              <DialogTrigger asChild>
                <button className="bg-maroon text-white px-8 py-4 hover:bg-maroon-dark transition-colors duration-300 font-medium tracking-wide">
                  ACCESS FULL FORUM
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Ship Its Forum</DialogTitle>
                </DialogHeader>
                <div className="py-6">
                  <p className="text-gray-600 mb-4">
                    The Ship Its forum is currently under development. Here you'll be able to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-600">
                    <li>Browse all student projects with detailed descriptions</li>
                    <li>Submit your own projects for community feedback</li>
                    <li>Connect with project creators and collaborators</li>
                    <li>Join discussion threads about development challenges</li>
                    <li>Find teammates for new project ideas</li>
                  </ul>
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">
                      <strong>Coming Soon:</strong> Full forum functionality with user authentication, 
                      project submissions, and community features.
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </ParallaxSection>
      </div>
    </section>
  );
}
