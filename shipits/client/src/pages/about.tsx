import { useState } from "react";
import { ParallaxSection } from "@/components/ui/parallax-section";
import {
  MessageSquare,
  Users,
  Lightbulb,
  Trophy,
  ArrowRight,
  CheckCircle,
  Star,
  Zap,
  Heart,
  Target,
  Sparkles,
  BookOpen,
  Coffee,
  Rocket,
  Globe,
  Shield,
  Clock
} from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import TranslatedText from "@/components/TranslatedText";

export default function AboutPage() {
  const { t } = useI18n();
  const [activeFeature, setActiveFeature] = useState<'forum' | 'list' | 'chat'>('forum');

  const features = [
    {
      id: 'forum' as const,
      title: "Project Showcase Forum",
      subtitle: "Where Innovation Meets Community",
      icon: Rocket,
      color: "from-blue-500 to-cyan-500",
      bgColor: "from-blue-50 to-cyan-50",
      benefits: [
        "Share your projects with CMU's creative community",
        "Get constructive feedback from peers and experts",
        "Discover trending projects and inspiration",
        "Build your portfolio with real project showcases",
        "Connect with collaborators for future projects"
      ],
      stats: [
        { label: "Active Projects", value: "500+", icon: Zap },
        { label: "Community Members", value: "2,000+", icon: Users },
        { label: "Daily Interactions", value: "150+", icon: MessageSquare }
      ],
      demo: {
        title: "Real Projects, Real Impact",
        description: "From mobile apps to AI research, showcase what you're building and get the recognition you deserve.",
        features: ["Project Galleries", "Comment Threads", "Like & Share System", "Tag-based Discovery"]
      }
    },
    {
      id: 'list' as const,
      title: "Collaborative Lists",
      subtitle: "Organize Ideas, Build Teams",
      icon: Target,
      color: "from-purple-500 to-pink-500",
      bgColor: "from-purple-50 to-pink-50",
      benefits: [
        "Create and manage project wishlists",
        "Find teammates with complementary skills",
        "Track project milestones and progress",
        "Share resources and learning materials",
        "Organize hackathon teams and study groups"
      ],
      stats: [
        { label: "Active Lists", value: "300+", icon: CheckCircle },
        { label: "Team Formations", value: "80+", icon: Users },
        { label: "Shared Resources", value: "1,000+", icon: BookOpen }
      ],
      demo: {
        title: "From Idea to Reality",
        description: "Transform concepts into collaborative projects. Find the right people and resources to bring your vision to life.",
        features: ["Task Management", "Team Recruitment", "Resource Sharing", "Progress Tracking"]
      }
    },
    {
      id: 'chat' as const,
      title: "Real-time Chat",
      subtitle: "Connect Instantly, Collaborate Seamlessly",
      icon: MessageSquare,
      color: "from-green-500 to-emerald-500",
      bgColor: "from-green-50 to-emerald-50",
      benefits: [
        "Instant messaging with project collaborators",
        "Real-time discussion threads",
        "File sharing and code collaboration",
        "Private conversations and group chats",
        "Stay connected with your project teams"
      ],
      stats: [
        { label: "Messages Daily", value: "5,000+", icon: Zap },
        { label: "Active Conversations", value: "200+", icon: MessageSquare },
        { label: "Files Shared", value: "800+", icon: Coffee }
      ],
      demo: {
        title: "Communication Without Boundaries",
        description: "Seamless communication for distributed teams. Share ideas, code, and feedback in real-time.",
        features: ["Real-time Messaging", "File Attachments", "Group Chats", "Direct Messages"]
      }
    }
  ];

  const currentFeature = features.find(f => f.id === activeFeature)!;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-maroon via-maroon/90 to-maroon/80 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-6 max-w-6xl text-center">
          <div className="mb-8">
            <Sparkles className="mx-auto mb-6 w-16 h-16 text-yellow-300" />
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Welcome to Osprey @ CMU
            </h1>
            <p className="text-xl md:text-3xl text-white/90 mb-8 max-w-4xl mx-auto leading-relaxed">
              The ultimate platform for CMU students to showcase projects,
              collaborate on ideas, and build lasting connections in a vibrant community of innovators.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-full px-6 py-3">
                <span className="text-white font-semibold">🎯 Project Showcase</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-full px-6 py-3">
                <span className="text-white font-semibold">🤝 Team Collaboration</span>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-full px-6 py-3">
                <span className="text-white font-semibold">💬 Real-time Chat</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Selector */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Discover Our Features</h2>
            <p className="text-xl text-muted-foreground">
              Three powerful tools designed to supercharge your CMU experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <button
                  key={feature.id}
                  onClick={() => setActiveFeature(feature.id)}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 text-left ${
                    activeFeature === feature.id
                      ? 'border-maroon bg-maroon/5 shadow-lg'
                      : 'border-border hover:border-maroon/50 hover:shadow-md'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.subtitle}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Showcase */}
      <section className={`py-20 bg-gradient-to-br ${currentFeature.bgColor}`}>
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Feature Content */}
            <div>
              <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${currentFeature.color} text-white px-4 py-2 rounded-full text-sm font-medium mb-6`}>
                <currentFeature.icon className="w-4 h-4" />
                {currentFeature.title}
              </div>

              <h2 className="text-4xl font-bold mb-6">{currentFeature.demo.title}</h2>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                {currentFeature.demo.description}
              </p>

              {/* Feature List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {currentFeature.demo.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6">
                {currentFeature.stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <stat.icon className="w-8 h-8 text-maroon mx-auto mb-2" />
                    <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Benefits */}
            <div>
              <h3 className="text-2xl font-bold mb-6">Why Choose {currentFeature.title}?</h3>
              <div className="space-y-4">
                {currentFeature.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-white/50 backdrop-blur-sm rounded-lg border border-white/20">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${currentFeature.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <span className="text-white font-bold text-sm">{index + 1}</span>
                    </div>
                    <p className="text-foreground leading-relaxed">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-maroon to-maroon/90 text-white">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Join the Community?</h2>
          <p className="text-xl text-white/90 mb-8 leading-relaxed">
            Start showcasing your projects, collaborating with peers, and building connections that last a lifetime.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <Rocket className="w-12 h-12 text-yellow-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Showcase Projects</h3>
              <p className="text-white/80">Share your innovations with the CMU community</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <Users className="w-12 h-12 text-blue-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Build Teams</h3>
              <p className="text-white/80">Find collaborators for your next big idea</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <Trophy className="w-12 h-12 text-green-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Get Recognized</h3>
              <p className="text-white/80">Earn accolades for your creative work</p>
            </div>
          </div>

          <button className="bg-white text-maroon px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
            Join Osprey @ CMU Today
            <ArrowRight className="inline-block ml-2 w-5 h-5" />
          </button>
        </div>
      </section>
    </div>
  );
}
