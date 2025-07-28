import { useState } from "react";
import { Link, useParams } from "wouter";
import { 
  Play, Heart, Share2, Bookmark, Facebook, Twitter, Instagram, Mail,
  MapPin, Calendar, Users, DollarSign, MessageSquare, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

// Mock project data based on the Kickstarter design
const mockProject = {
  id: "1",
  title: "ZX Spectrum Next Issue 3",
  description: "The Sinclair ZX Spectrum Next: the evolution of the Speccy computer, now expanded into the world of the Sinclair QL, C64 and... More!",
  overview: `The ZX Spectrum Next is a modern reimagining of the classic Sinclair ZX Spectrum, designed for both retro enthusiasts and new users. This third iteration brings enhanced capabilities while maintaining the authentic feel of the original.

Our project focuses on expanding compatibility with classic systems like the Sinclair QL and Commodore 64, offering a comprehensive retro computing experience. The hardware features modern conveniences while preserving the charm of 1980s computing.

Key improvements in Issue 3 include enhanced sound capabilities, expanded memory options, and improved video output. We've also added modern connectivity options while maintaining complete backward compatibility with original Spectrum software.`,
  creator: {
    name: "Henrique Oliveira", 
    avatar: "/api/placeholder/60/60",
    location: "London, UK",
    projectsCreated: 3,
    projectsSupported: 24
  },
  imageUrl: "/api/placeholder/640/400",
  videoUrl: "/api/placeholder/640/400",
  fundingGoal: 336067,
  currentFunding: 2152028,
  backers: 4645,
  daysLeft: 21,
  category: "Hardware",
  tags: ["Hardware", "Retro", "Computing", "Gaming"],
  featured: true,
  likes: 892,
  comments: 234,
  updates: 12,
  faqs: 8
};

const mockComments = [
  {
    id: "1",
    user: {
      name: "John Pumphrey",
      avatar: "/api/placeholder/40/40",
      badge: "Superbacker"
    },
    content: "I understand and am thrilled that the Next can run so many cores so that all of my retro computers are in one box (thank you!). As a previous owner of a ZX81 and C64, what is not clear is how the keyboard will work with these cores for programming?",
    timeAgo: "about 2 hours ago"
  },
  {
    id: "2", 
    user: {
      name: "Dean",
      avatar: "/api/placeholder/40/40"
    },
    content: "There will be some form of 'keyboard map' included in the manual.\n\nIe clr home may be mapped to caps, or something like that\n\nIm sure inventive people will come up with stickers or an overlay or something :-)\n\nAlso no reason you couldn't use a ps/2 keyboard\n\nVery possibly there will me a keymap text file you can edit also",
    timeAgo: "about 1 hour ago"
  },
  {
    id: "3",
    user: {
      name: "Milton", 
      avatar: "/api/placeholder/40/40"
    },
    content: "Will the commodore.net 'initiative' affect the C64 core development for the KS3 ZXS Next? Should backers be worried about it?",
    timeAgo: "about 3 hours ago"
  }
];

const mockFaqs = [
  {
    id: "1",
    question: "What's included in the base package?",
    answer: "The base package includes the ZX Spectrum Next motherboard, case, keyboard, and power supply. Additional accessories and expansion boards are available as add-ons."
  },
  {
    id: "2",
    question: "Is this compatible with original Spectrum software?",
    answer: "Yes! The ZX Spectrum Next maintains full backward compatibility with original Spectrum software, including games, demos, and applications."
  },
  {
    id: "3",
    question: "When will units ship?",
    answer: "We expect to begin shipping units in Q2 2024, with all backers receiving their orders by the end of 2024."
  }
];

export default function ProjectDetail() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [newComment, setNewComment] = useState("");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateFundingPercentage = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide">
              HOME
            </Link>
            <Link href="/forum" className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide">
              FORUM
            </Link>
            <Link href="/#contact" className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide">
              CONTACT
            </Link>
            <Link href="/#partners" className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide">
              PARTNERS
            </Link>
          </div>
        </div>
      </nav>

      <div className="pt-20">
        <div className="container mx-auto px-6 max-w-7xl">
          {/* Project Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">{mockProject.title}</h1>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              {mockProject.description}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Media Section */}
              <div className="bg-white rounded-lg border border-gray-200 mb-6 overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-black/20"></div>
                  <Button className="bg-green-600 hover:bg-green-700 rounded-full p-4 z-10">
                    <Play className="w-8 h-8 text-white fill-white ml-1" />
                  </Button>
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white">
                    <Heart className="w-5 h-5" />
                    <span className="text-sm">Project We Love</span>
                  </div>
                  <div className="absolute bottom-4 right-4 flex items-center gap-2 text-white">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{mockProject.creator.location}</span>
                  </div>
                </div>
              </div>

              {/* Project Navigation Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 bg-white border border-gray-200 rounded-lg p-1">
                  <TabsTrigger value="overview" className="text-sm">Overview</TabsTrigger>
                  <TabsTrigger value="creator" className="text-sm">Creator</TabsTrigger>
                  <TabsTrigger value="faqs" className="text-sm relative">
                    FAQs
                    <span className="ml-1 bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded">
                      {mockProject.faqs}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="updates" className="text-sm relative">
                    Updates
                    <span className="ml-1 bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded">
                      {mockProject.updates}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="comments" className="text-sm relative">
                    Comments
                    <span className="ml-1 bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded">
                      {mockProject.comments}
                    </span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="prose max-w-none">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {mockProject.overview}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="creator" className="mt-6">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-600">
                          {mockProject.creator.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-1">{mockProject.creator.name}</h3>
                        <p className="text-gray-600 mb-2">{mockProject.creator.location}</p>
                        <div className="flex gap-4 text-sm text-gray-500">
                          <span>{mockProject.creator.projectsCreated} projects created</span>
                          <span>{mockProject.creator.projectsSupported} projects supported</span>
                        </div>
                      </div>
                    </div>
                    <div className="prose max-w-none">
                      <p className="text-gray-700">
                        Experienced hardware developer with a passion for retro computing and preserving computing history.
                        Previous projects include successful crowdfunding campaigns for vintage computer recreations.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="faqs" className="mt-6">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="space-y-4">
                      {mockFaqs.map((faq) => (
                        <div key={faq.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                          <h4 className="font-semibold text-gray-900 mb-2">{faq.question}</h4>
                          <p className="text-gray-600">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="updates" className="mt-6">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="text-center py-12">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">No updates yet</h3>
                      <p className="text-gray-500">The creator will post updates about the project progress here.</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="comments" className="mt-6">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    {/* Comment Form */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-6">
                      <p className="text-sm text-gray-600 mb-4">
                        Only backers can post comments. <Link href="#" className="text-blue-600 hover:underline">Log in</Link>
                      </p>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-6">
                      {mockComments.map((comment) => (
                        <div key={comment.id} className="flex gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                {comment.user.name.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">{comment.user.name}</span>
                              {comment.user.badge && (
                                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded">
                                  {comment.user.badge}
                                </span>
                              )}
                              <span className="text-sm text-gray-500">{comment.timeAgo}</span>
                            </div>
                            <p className="text-gray-700 whitespace-pre-line">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                {/* Funding Info */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                  <div className="text-center mb-6">
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      {formatCurrency(mockProject.currentFunding)}
                    </div>
                    <div className="text-sm text-gray-500 mb-4">
                      pledged of {formatCurrency(mockProject.fundingGoal)} goal
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                      <div 
                        className="bg-green-500 h-3 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${calculateFundingPercentage(mockProject.currentFunding, mockProject.fundingGoal)}%` 
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-center mb-6">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">{mockProject.backers.toLocaleString()}</div>
                        <div className="text-sm text-gray-500">backers</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900">{mockProject.daysLeft}</div>
                        <div className="text-sm text-gray-500">days to go</div>
                      </div>
                    </div>

                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 font-medium mb-4">
                      Back this project
                    </Button>

                    <div className="flex justify-center gap-2 mb-4">
                      <Button variant="outline" size="sm" className="p-2">
                        <Bookmark className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="p-2">
                        <Facebook className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="p-2">
                        <Twitter className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="p-2">
                        <Instagram className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="p-2">
                        <Mail className="w-4 h-4" />
                      </Button>
                    </div>

                    <p className="text-xs text-gray-500">
                      All or nothing. This project will only be funded if it reaches its goal by Mon, August 18 2025 2:59 AM EDT.
                    </p>
                  </div>
                </div>

                {/* Support Guidelines */}
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                  <div className="mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-blue-600">🚀</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 mb-1">Ship Its connects creators with backers to fund projects.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-yellow-600">⚠️</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 mb-1">Rewards aren't guaranteed, but creators must regularly update backers.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-green-600">💳</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 mb-1">You're only charged if the project meets its funding goal by the campaign deadline.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Support Sidebar */}
                <div className="mt-6 bg-white border-l-4 border-gray-200 p-4 rounded">
                  <p className="text-sm text-gray-600 mb-2">
                    This is your space to offer support and feedback. Remember to{" "}
                    <Link href="#" className="text-green-600 hover:underline">be constructive</Link>
                    —there's a human behind this project.
                  </p>
                  <p className="text-sm text-gray-600">
                    Have a question for the creator?{" "}
                    <Link href="#" className="text-gray-900 hover:underline font-medium">
                      Check this project's FAQ
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}