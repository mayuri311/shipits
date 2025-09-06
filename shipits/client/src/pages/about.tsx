import { useState } from "react";
import { Link } from "wouter";
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
      demo: {
        title: "Real Projects, Real Impact",
        description: "From mobile apps to AI research, showcase what you're building and get the recognition you deserve.",
        features: ["Project Galleries", "Comment Threads", "Like & Share System", "Tag-based Discovery"]
      }
    },
    {
      id: 'list' as const,
      title: "Collaborative Lists",
      subtitle: "Share Resources, Discover Opportunities",
      icon: Target,
      color: "from-purple-500 to-pink-500",
      bgColor: "from-purple-50 to-pink-50",
      benefits: [
        "Share curated lists of valuable resources",
        "Discover top VC firms, accelerators, and funding opportunities",
        "Find the best coffee shops, study spots, and workspaces in Pittsburgh",
        "Create professional networks and industry connections",
        "Build community knowledge bases for career development"
      ],
      demo: {
        title: "Community Knowledge Hub",
        description: "Create and discover valuable resource lists that help fellow students navigate opportunities, build networks, and make informed decisions.",
        features: ["Resource Curation", "Community Sharing", "Professional Networks", "Local Discovery"]
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
      <section className="relative py-20 hero-soft-bg text-foreground overflow-hidden">

        {/* Back to Home Link */}
        <div className="relative z-10 pt-6">
          <div className="container mx-auto px-6 max-w-6xl">
            <Link href="/" className="inline-flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors duration-300">
              <ArrowRight className="w-4 h-4 rotate-180" />
              Back to Home
            </Link>
          </div>
        </div>

        <div className="relative container mx-auto px-6 max-w-6xl text-center">
          <div className="mb-8">
            <Sparkles className="mx-auto mb-6 w-16 h-16 text-yellow-300" />
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Welcome to Osprey @ CMU
            </h1>
            <p className="text-xl md:text-3xl text-foreground/80 mb-8 max-w-4xl mx-auto leading-relaxed">
              The ultimate platform for CMU students to showcase projects,
              collaborate on ideas, and build lasting connections in a vibrant community of innovators.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <div className="bg-white/60 backdrop-blur-sm rounded-full px-6 py-3 border border-white/30">
                <span className="text-foreground font-semibold">🎯 Project Showcase</span>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-full px-6 py-3 border border-white/30">
                <span className="text-foreground font-semibold">📚 Resource Sharing</span>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-full px-6 py-3 border border-white/30">
                <span className="text-foreground font-semibold">💬 Real-time Chat</span>
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

      {/* Feature Navigation */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Explore?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Jump right into the features that interest you most
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/forum">
              <div className="group p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all duration-300 cursor-pointer">
                <Rocket className="w-12 h-12 text-blue-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-semibold mb-2 text-blue-900">Explore Forum</h3>
                <p className="text-blue-700 mb-4">Browse projects and join discussions</p>
                <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium group-hover:bg-blue-700 transition-colors">
                  Visit Forum
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>

            <Link href="/lists">
              <div className="group p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-all duration-300 cursor-pointer">
                <Target className="w-12 h-12 text-purple-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-semibold mb-2 text-purple-900">Browse Lists</h3>
                <p className="text-purple-700 mb-4">Discover resources and opportunities</p>
                <div className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium group-hover:bg-purple-700 transition-colors">
                  View Lists
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>

            <Link href="/chat">
              <div className="group p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 hover:border-green-400 transition-all duration-300 cursor-pointer">
                <MessageSquare className="w-12 h-12 text-green-600 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-semibold mb-2 text-green-900">Start Chatting</h3>
                <p className="text-green-700 mb-4">Connect with fellow students</p>
                <div className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-full text-sm font-medium group-hover:bg-green-700 transition-colors">
                  Open Chat
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-maroon to-maroon/90 text-white">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Join the Community?</h2>
          <p className="text-xl text-white/90 mb-8 leading-relaxed">
            Start showcasing your projects, discovering valuable resources, and building connections that last a lifetime.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <Rocket className="w-12 h-12 text-yellow-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Showcase Projects</h3>
              <p className="text-white/80">Share your innovations with the CMU community</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <Users className="w-12 h-12 text-blue-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Share Resources</h3>
              <p className="text-white/80">Discover valuable resources and build connections</p>
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
