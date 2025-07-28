import { useState } from "react";
import { Link } from "wouter";
import { User, MapPin, Calendar, Github, Linkedin, Twitter, Mail, Edit3, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const mockUserProjects = [
  {
    id: "1",
    title: "EcoTracker Mobile App",
    status: "Active",
    fundingGoal: 15000,
    currentFunding: 8500,
    backers: 127,
    daysLeft: 23
  },
  {
    id: "2", 
    title: "Smart Campus Kiosk",
    status: "Completed",
    fundingGoal: 8000,
    currentFunding: 9200,
    backers: 89,
    daysLeft: 0
  }
];

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: "Sarah Chen",
    andrewId: "schen2",
    email: "schen2@andrew.cmu.edu",
    major: "Computer Science",
    graduationYear: "2025",
    location: "Pittsburgh, PA",
    bio: "Passionate about sustainable technology and mobile app development. Currently working on projects that help students track their environmental impact.",
    skills: ["React", "Node.js", "Python", "Mobile Development", "UI/UX Design"],
    github: "github.com/sarahchen",
    linkedin: "linkedin.com/in/sarahchen",
    twitter: "@sarahchen_dev",
    website: "sarahchen.dev"
  });

  const [editedProfile, setEditedProfile] = useState(profile);

  const handleSave = () => {
    setProfile(editedProfile);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedProfile(profile);
    setIsEditing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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
        <div className="container mx-auto px-6 max-w-6xl">
          {/* Profile Header */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-maroon rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    {profile.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2">{profile.name}</h1>
                  <p className="text-gray-600 mb-1">@{profile.andrewId} • {profile.major}</p>
                  <p className="text-gray-500 text-sm">Class of {profile.graduationYear}</p>
                </div>
              </div>
              
              <Button 
                onClick={() => setIsEditing(!isEditing)}
                variant={isEditing ? "outline" : "default"}
                className={isEditing ? "" : "bg-maroon hover:bg-maroon/90"}
              >
                {isEditing ? (
                  <>
                    <X size={16} className="mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Edit3 size={16} className="mr-2" />
                    Edit Profile
                  </>
                )}
              </Button>
            </div>

            {/* Profile Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold mb-4">About</h3>
                {isEditing ? (
                  <Textarea
                    value={editedProfile.bio}
                    onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    className="min-h-[120px]"
                  />
                ) : (
                  <p className="text-gray-700">{profile.bio}</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-4">Contact & Links</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-gray-500" />
                    <span className="text-gray-700">{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin size={16} className="text-gray-500" />
                    {isEditing ? (
                      <Input
                        value={editedProfile.location}
                        onChange={(e) => setEditedProfile({ ...editedProfile, location: e.target.value })}
                        placeholder="Location"
                        className="flex-1"
                      />
                    ) : (
                      <span className="text-gray-700">{profile.location}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Github size={16} className="text-gray-500" />
                    {isEditing ? (
                      <Input
                        value={editedProfile.github}
                        onChange={(e) => setEditedProfile({ ...editedProfile, github: e.target.value })}
                        placeholder="GitHub URL"
                        className="flex-1"
                      />
                    ) : (
                      <a href={`https://${profile.github}`} className="text-blue-600 hover:underline">
                        {profile.github}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Linkedin size={16} className="text-gray-500" />
                    {isEditing ? (
                      <Input
                        value={editedProfile.linkedin}
                        onChange={(e) => setEditedProfile({ ...editedProfile, linkedin: e.target.value })}
                        placeholder="LinkedIn URL"
                        className="flex-1"
                      />
                    ) : (
                      <a href={`https://${profile.linkedin}`} className="text-blue-600 hover:underline">
                        {profile.linkedin}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Skills Section */}
            <div className="mt-8">
              <h3 className="font-semibold mb-4">Skills & Technologies</h3>
              {isEditing ? (
                <Input
                  value={editedProfile.skills.join(", ")}
                  onChange={(e) => setEditedProfile({ 
                    ...editedProfile, 
                    skills: e.target.value.split(", ").map(s => s.trim()).filter(s => s.length > 0)
                  })}
                  placeholder="Enter skills separated by commas"
                  className="w-full"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <span
                      key={skill}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Save/Cancel buttons when editing */}
            {isEditing && (
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                  <Save size={16} className="mr-2" />
                  Save Changes
                </Button>
              </div>
            )}
          </div>

          {/* Projects Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <Tabs defaultValue="my-projects" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100">
                <TabsTrigger value="my-projects">My Projects</TabsTrigger>
                <TabsTrigger value="backed-projects">Backed Projects</TabsTrigger>
              </TabsList>

              <TabsContent value="my-projects" className="mt-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold">My Projects ({mockUserProjects.length})</h3>
                  <Link href="/create-project">
                    <Button className="bg-green-600 hover:bg-green-700">
                      Create New Project
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {mockUserProjects.map((project) => (
                    <div key={project.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-semibold text-lg">{project.title}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          project.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {project.status}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Funding Progress</span>
                            <span>{Math.round((project.currentFunding / project.fundingGoal) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${Math.min((project.currentFunding / project.fundingGoal) * 100, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{formatCurrency(project.currentFunding)} raised</span>
                          <span>{project.backers} backers</span>
                        </div>

                        {project.status === 'Active' && (
                          <p className="text-sm text-gray-600">
                            {project.daysLeft} days remaining
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Link href={`/forum/project/${project.id}`}>
                          <Button variant="outline" size="sm" className="flex-1">
                            View Project
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm" className="flex-1">
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="backed-projects" className="mt-6">
                <div className="text-center py-12">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No backed projects yet</h3>
                  <p className="text-gray-500 mb-4">Explore the forum to find interesting projects to support!</p>
                  <Link href="/forum">
                    <Button variant="outline">
                      Browse Projects
                    </Button>
                  </Link>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}