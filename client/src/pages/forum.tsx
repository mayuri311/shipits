import { useState } from "react";
import { Link } from "wouter";
import { Search, Filter, ChevronDown, Heart, MessageSquare, Share2, Bookmark, User, Plus, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const mockProjects = [
  {
    id: "1",
    title: "EcoTracker Mobile App",
    description: "A comprehensive carbon footprint tracking application for Carnegie Mellon students with real-time analytics and sustainability recommendations.",
    category: "Technology",
    imageUrl: "/api/placeholder/400/250",
    fundingGoal: 15000,
    currentFunding: 8500,
    backers: 127,
    daysLeft: 23,
    featured: true,
    creator: {
      name: "Sarah Chen",
      avatar: "/api/placeholder/40/40",
      location: "Pittsburgh, PA"
    },
    tags: ["Mobile", "Sustainability", "iOS", "Android"]
  },
  {
    id: "2",
    title: "StudyBuddy AI Assistant",
    description: "An intelligent study companion that creates personalized learning schedules and generates practice problems using machine learning.",
    category: "Technology",
    imageUrl: "/api/placeholder/400/250",
    fundingGoal: 25000,
    currentFunding: 18200,
    backers: 243,
    daysLeft: 15,
    featured: false,
    creator: {
      name: "Marcus Johnson",
      avatar: "/api/placeholder/40/40",
      location: "Pittsburgh, PA"
    },
    tags: ["AI", "Education", "Machine Learning", "Web"]
  },
  {
    id: "3",
    title: "Smart Campus Navigation",
    description: "AR-powered navigation system for CMU campus with real-time crowd density and accessibility features.",
    category: "Technology",
    imageUrl: "/api/placeholder/400/250",
    fundingGoal: 12000,
    currentFunding: 9800,
    backers: 156,
    daysLeft: 31,
    featured: false,
    creator: {
      name: "Alex Rivera",
      avatar: "/api/placeholder/40/40",
      location: "Pittsburgh, PA"
    },
    tags: ["AR", "Navigation", "Accessibility", "Mobile"]
  }
];

const categories = ["All", "Technology", "Art", "Design", "Music", "Games", "Hardware"];
const sortOptions = ["Featured", "Most Funded", "Ending Soon", "Recently Added", "Most Backed"];

export default function Forum() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Technology");
  const [sortBy, setSortBy] = useState("Featured");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState({ name: "Sarah Chen", andrewId: "schen2" });

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
            <div className="flex items-center gap-8">
              <Link href="/" className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide">
                HOME
              </Link>
              <span className="text-maroon font-medium tracking-wide">FORUM</span>
              <Link href="/#contact" className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide">
                CONTACT
              </Link>
              <Link href="/#partners" className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide">
                PARTNERS
              </Link>
            </div>
            
            {/* Auth Section */}
            <div className="flex items-center gap-4">
              {!isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <Button 
                    onClick={() => window.location.href = 'https://login.cmu.edu/idp/profile/SAML2/Redirect/SSO'}
                    className="bg-maroon hover:bg-maroon/90 text-white px-6 py-2"
                  >
                    Log in with CMU
                  </Button>
                  <Button 
                    onClick={() => setIsAuthenticated(true)}
                    variant="outline"
                    className="text-sm border-gray-300"
                  >
                    Demo Login
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/profile">
                    <Button variant="outline" className="flex items-center gap-2 border-maroon text-maroon hover:bg-maroon hover:text-white">
                      <User size={16} />
                      {user.name}
                    </Button>
                  </Link>
                  <Link href="/create-project">
                    <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
                      <Plus size={16} />
                      Create Project
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsAuthenticated(false)}
                    className="p-2"
                  >
                    <LogOut size={16} />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-20 pb-12">
        <div className="container mx-auto px-6 max-w-7xl">
          {/* Header Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">
              Ship Its <span className="text-maroon">@</span> CMU Forum
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              Discover and support innovative student projects from Carnegie Mellon
            </p>

            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <Input
                    type="text"
                    placeholder="Search projects, creators, and categories"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-300"
                  />
                </div>
              </div>
              
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Show me</span>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-700">projects sorted by</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              Explore <span className="text-green-600">{mockProjects.length.toLocaleString()}</span> projects
            </h2>
          </div>

          {/* Project Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockProjects.map((project) => (
              <Link key={project.id} href={`/forum/project/${project.id}`}>
                <div className="bg-white border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-lg group cursor-pointer">
                  {/* Project Image */}
                  <div className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 border-b border-gray-200">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-maroon/10 rounded-full flex items-center justify-center mb-2 mx-auto">
                          <span className="text-maroon font-bold text-lg">
                            {project.title.split(' ').map(word => word[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">Project Preview</p>
                      </div>
                    </div>
                    {project.featured && (
                      <div className="absolute top-3 left-3">
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                          Featured
                        </span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <button className="p-1.5 bg-white/80 hover:bg-white rounded-full transition-colors">
                        <Bookmark className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Project Content */}
                  <div className="p-4">
                    {/* Creator Info */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          {project.creator.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{project.creator.name}</span>
                        <span className="text-gray-400 ml-1">• {project.creator.location}</span>
                      </div>
                    </div>

                    {/* Project Title */}
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-maroon transition-colors line-clamp-2">
                      {project.title}
                    </h3>

                    {/* Project Description */}
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {project.description}
                    </p>

                    {/* Funding Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(project.currentFunding)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {calculateFundingPercentage(project.currentFunding, project.fundingGoal).toFixed(0)}% funded
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${calculateFundingPercentage(project.currentFunding, project.fundingGoal)}%` 
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                        <span>pledged of {formatCurrency(project.fundingGoal)} goal</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          <span>{project.backers}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          <span>12</span>
                        </div>
                      </div>
                      <span className="font-medium">
                        {project.daysLeft} days left
                      </span>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {project.tags.slice(0, 3).map((tag) => (
                        <span 
                          key={tag}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {project.tags.length > 3 && (
                        <span className="text-xs text-gray-400">
                          +{project.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center mt-12">
            <Button 
              variant="outline" 
              className="border-2 border-maroon text-maroon hover:bg-maroon hover:text-white px-8 py-3"
            >
              Load More Projects
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}