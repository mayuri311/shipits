import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Upload, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const categories = ["Technology", "Art", "Design", "Music", "Games", "Hardware"];

export default function CreateProject() {
  const [, setLocation] = useLocation();
  const [projectData, setProjectData] = useState({
    title: "",
    description: "",
    category: "",
    fundingGoal: "",
    duration: "30",
    shortDescription: "",
    tags: [] as string[],
    imageUrl: ""
  });
  const [newTag, setNewTag] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would normally submit to backend
    console.log("Project data:", projectData);
    // Redirect to forum after creation
    setLocation("/forum");
  };

  const addTag = () => {
    if (newTag.trim() && !projectData.tags.includes(newTag.trim())) {
      setProjectData({
        ...projectData,
        tags: [...projectData.tags, newTag.trim()]
      });
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setProjectData({
      ...projectData,
      tags: projectData.tags.filter(tag => tag !== tagToRemove)
    });
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

      <div className="pt-20 pb-12">
        <div className="container mx-auto px-6 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Link href="/forum">
              <Button variant="outline" className="mb-4">
                <ArrowLeft size={16} className="mr-2" />
                Back to Forum
              </Button>
            </Link>
            <h1 className="text-4xl font-bold mb-4">Create a New Project</h1>
            <p className="text-xl text-gray-600">
              Share your innovative idea with the CMU community and get the support you need to bring it to life.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <h2 className="text-2xl font-semibold mb-6">Basic Information</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Title *
                  </label>
                  <Input
                    value={projectData.title}
                    onChange={(e) => setProjectData({ ...projectData, title: e.target.value })}
                    placeholder="Give your project a compelling title"
                    required
                    maxLength={60}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {projectData.title.length}/60 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Short Description *
                  </label>
                  <Input
                    value={projectData.shortDescription}
                    onChange={(e) => setProjectData({ ...projectData, shortDescription: e.target.value })}
                    placeholder="A brief one-line description of your project"
                    required
                    maxLength={120}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {projectData.shortDescription.length}/120 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <Select value={projectData.category} onValueChange={(value) => setProjectData({ ...projectData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Funding Goal (USD) *
                    </label>
                    <Input
                      type="number"
                      value={projectData.fundingGoal}
                      onChange={(e) => setProjectData({ ...projectData, fundingGoal: e.target.value })}
                      placeholder="10000"
                      required
                      min="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campaign Duration (days) *
                    </label>
                    <Select value={projectData.duration} onValueChange={(value) => setProjectData({ ...projectData, duration: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="45">45 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Project Description */}
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <h2 className="text-2xl font-semibold mb-6">Project Description</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detailed Description *
                </label>
                <Textarea
                  value={projectData.description}
                  onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
                  placeholder="Describe your project in detail. What problem does it solve? How will you build it? What makes it unique?"
                  required
                  className="min-h-[200px]"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Tell potential backers everything they need to know about your project. Include your motivation, technical approach, timeline, and how you'll use the funding.
                </p>
              </div>
            </div>

            {/* Project Media */}
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <h2 className="text-2xl font-semibold mb-6">Project Media</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Image
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">
                    Upload a compelling image for your project
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Recommended: 1200x630 pixels, under 5MB
                  </p>
                  <Button type="button" variant="outline">
                    Choose File
                  </Button>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <h2 className="text-2xl font-semibold mb-6">Tags & Keywords</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Tags
                </label>
                <div className="flex gap-2 mb-4">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" onClick={addTag}>
                    <Plus size={16} />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {projectData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                
                <p className="text-sm text-gray-500 mt-2">
                  Add relevant tags to help people discover your project. Examples: React, IoT, Sustainability, Mobile App
                </p>
              </div>
            </div>

            {/* Submit */}
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <h2 className="text-2xl font-semibold mb-6">Ready to Launch?</h2>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-blue-900 mb-2">Before you submit:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Make sure all required fields are completed</li>
                  <li>• Review your project description for clarity and completeness</li>
                  <li>• Ensure your funding goal is realistic and justified</li>
                  <li>• Double-check that your contact information is correct</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                >
                  Launch Project
                </Button>
                <Link href="/forum">
                  <Button type="button" variant="outline" className="px-8 py-3">
                    Save as Draft
                  </Button>
                </Link>
              </div>

              <p className="text-sm text-gray-500 mt-4">
                By launching your project, you agree to the Ship Its @ CMU community guidelines and terms of service.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}