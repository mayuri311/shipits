import { useState, useEffect, useRef } from "react";
import { Link, useParams } from "wouter";
import { User, MapPin, Calendar, Github, Linkedin, Twitter, Mail, Edit3, Save, X, Camera, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { usersApi, uploadApi, projectsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import type { User as UserType, Project } from "@shared/schema";
import { compressProfileImage, formatFileSize } from "@/lib/imageCompression";
import { ThemeSettings } from "@/components/ThemeSettings";

export default function Profile() {
  const { user: currentUser, updateUser } = useAuth();
  const { id } = useParams();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserType>>({});
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine if we're viewing the current user's profile or someone else's
  const isOwnProfile = !id || (currentUser && id === currentUser._id?.toString());
  
  // Fetch user data if viewing someone else's profile
  const { data: otherUserData, isLoading: isLoadingOtherUser } = useQuery({
    queryKey: ['user', id],
    queryFn: () => id ? usersApi.getUser(id) : null,
    enabled: !!id && !isOwnProfile,
  });

  // Use current user data if viewing own profile, otherwise use fetched data
  const user = isOwnProfile ? currentUser : otherUserData?.data?.user;

  // Fetch user's projects
  const { data: userProjectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['userProjects', user?._id],
    queryFn: () => user?._id ? projectsApi.getProjects({ ownerId: user._id.toString(), limit: 100 }) : null,
    enabled: !!user?._id,
  });

  const userProjects = userProjectsData?.success ? userProjectsData.data.items : [];

  // Fetch user's backed projects (subscriptions)
  const { data: backedProjectsData, isLoading: isLoadingBackedProjects } = useQuery({
    queryKey: ['userBackedProjects', user?._id],
    queryFn: () => user?._id ? usersApi.getUserSubscriptions(user._id.toString()) : null,
    enabled: !!user?._id,
  });

  const backedProjects = backedProjectsData?.success ? backedProjectsData.data.projects : [];

  useEffect(() => {
    setEditedProfile(user || {});
  }, [user]);

  const handleSave = async () => {
    if (!user?._id) return;
    try {
      // Prepare the update data, handling profile image properly
      const updateData = { ...editedProfile };
      
      console.log('Update data being sent:', updateData);
      
      // If profile image is explicitly set to null, we want to remove it
      if (updateData.profileImage === null) {
        updateData.profileImage = '';
      }
      
      const response = await usersApi.updateUser(user._id.toString(), updateData);
      console.log('Update response:', response);
      
      if (response.success) {
        updateUser(response.data.user);
        setIsEditing(false);
        toast({
          title: "Profile Updated",
          description: "Your profile has been successfully updated.",
        });
      } else {
        throw new Error(response.error || 'Update failed');
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: `Failed to update profile: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setEditedProfile(user || {});
    setIsEditing(false);
  };

  const handleProfilePictureUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }
    
    // Allow larger files since we'll compress them
    if (file.size > 50 * 1024 * 1024) { // 50MB limit for original file
      toast({
        title: "File too large",
        description: "Please select an image smaller than 50MB.",
        variant: "destructive",
      });
      return;
    }
    
    setUploadingProfilePic(true);
    try {
      // Show compression progress
      toast({
        title: "Processing image...",
        description: `Compressing ${formatFileSize(file.size)} image for optimal upload.`,
      });

      // Compress the image before upload
      const compressionResult = await compressProfileImage(file);
      
      console.log('Image compression result:', {
        originalSize: formatFileSize(compressionResult.originalSize),
        compressedSize: formatFileSize(compressionResult.compressedSize),
        compressionRatio: compressionResult.compressionRatio.toFixed(2) + 'x',
        dimensions: `${compressionResult.width}x${compressionResult.height}`
      });

      // Set the compressed image directly (skip API upload since we have the data URL)
      setEditedProfile(prev => ({ ...prev, profileImage: compressionResult.dataUrl }));
      
      toast({
        title: "Profile picture processed",
        description: `Image compressed from ${formatFileSize(compressionResult.originalSize)} to ${formatFileSize(compressionResult.compressedSize)} (${compressionResult.compressionRatio.toFixed(1)}x smaller).`,
      });
    } catch (error) {
      console.error('Profile picture compression error:', error);
      toast({
        title: "Processing failed",
        description: "Failed to process the image. Please try a different image.",
        variant: "destructive",
      });
    } finally {
      setUploadingProfilePic(false);
    }
  };

  const handleRemoveProfilePicture = () => {
    setEditedProfile(prev => ({ ...prev, profileImage: null }));
    toast({
      title: "Profile picture removed",
      description: "Your profile picture will be removed when you save changes.",
    });
  };

  // Show loading state when fetching other user's profile
  if (isLoadingOtherUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Loading Profile...</h2>
        </div>
      </div>
    );
  }

  // Show error if user not found
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {isOwnProfile ? "Please Log In" : "User Not Found"}
          </h2>
          <p className="text-gray-600 mb-6">
            {isOwnProfile 
              ? "You need to be logged in to view your profile."
              : "The user you're looking for doesn't exist or has been removed."
            }
          </p>
          <Link href="/forum">
            <Button>Go to Forum</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-2">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide text-sm sm:text-base">
              HOME
            </Link>
            
            {/* Navigation Items */}
            <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
              <Link href="/forum">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
                  FORUM
                </Button>
              </Link>
              
              {/* Desktop: Show all navigation options */}
              <div className="hidden md:flex items-center gap-2">
                <Link href="/#contact" className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide">
                  CONTACT
                </Link>
                <Link href="/#partners" className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide">
                  PARTNERS
                </Link>
              </div>

              {/* Mobile: More options button */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="px-2 text-xs relative md:hidden"
              >
                {isMenuOpen ? <X className="w-3 h-3" /> : <Menu className="w-3 h-3" />}
                {!isMenuOpen && <span className="absolute -top-1 -right-1 w-2 h-2 bg-maroon rounded-full"></span>}
              </Button>
            </div>
          </div>
          
          {/* Mobile Extended Menu */}
          {isMenuOpen && (
            <div className="border-t border-gray-200 mt-2 pt-3 pb-2 md:hidden">
              <div className="grid grid-cols-2 gap-2">
                <Link href="/#contact" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                    CONTACT
                  </Button>
                </Link>
                <Link href="/#partners" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                    PARTNERS
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className="pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 md:p-8 mb-8">
            <div className="flex flex-col sm:flex-row items-start justify-between mb-6 gap-4 sm:gap-0">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full sm:w-auto">
                <div className="relative group">
                  {(isOwnProfile && isEditing ? editedProfile.profileImage : user.profileImage) ? (
                    <img
                      src={isOwnProfile && isEditing ? editedProfile.profileImage || user.profileImage : user.profileImage}
                      alt={`${user.fullName || user.username || 'User'} profile picture`}
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                      onError={(e) => {
                        // Fallback to default avatar if image fails to load
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  
                  <div 
                    className={`w-24 h-24 bg-maroon rounded-full flex items-center justify-center ${
                      (isOwnProfile && isEditing ? editedProfile.profileImage : user.profileImage) ? 'hidden' : ''
                    }`}
                  >
                    <span className="text-white text-2xl font-bold">
                      {user.fullName?.split(' ').map(n => n[0]).join('') || user.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  
                  {isOwnProfile && isEditing && (
                    <>
                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleProfilePictureUpload(e.target.files)}
                        className="hidden"
                        disabled={uploadingProfilePic}
                        aria-label="Upload profile picture"
                      />
                      
                      {/* Visible, accessible change photo button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingProfilePic}
                        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white hover:bg-gray-50 text-gray-700 border-gray-300 shadow-sm"
                        aria-label="Change profile picture"
                        title="Change profile picture"
                      >
                        {uploadingProfilePic ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-maroon mr-2"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <Camera className="w-4 h-4 mr-2" />
                            Change Photo
                          </>
                        )}
                      </Button>
                    </>
                  )}
                  
                  {isOwnProfile && isEditing && (editedProfile.profileImage !== null && (editedProfile.profileImage || user.profileImage)) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveProfilePicture}
                      className="absolute -bottom-2 -right-2 w-8 h-8 p-0 rounded-full bg-red-500 hover:bg-red-600 text-white border-red-500"
                      aria-label="Remove profile picture"
                      title="Remove profile picture"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
                <div className="text-center sm:text-left flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                    {isOwnProfile && isEditing ? 
                      <Input 
                        value={editedProfile.fullName} 
                        onChange={(e) => setEditedProfile({...editedProfile, fullName: e.target.value})} 
                        className="text-center sm:text-left"
                      /> : 
                      user.fullName
                    }
                  </h1>
                  <p className="text-gray-600 mb-1 text-sm sm:text-base">@{user.username} • {user.college}</p>
                  {user.graduationYear && (
                    <p className="text-gray-500 text-sm">Class of {user.graduationYear}</p>
                  )}
                </div>
              </div>
              
              {isOwnProfile && (
                <div className="w-full sm:w-auto flex justify-center">
                  <Button 
                    onClick={() => setIsEditing(!isEditing)}
                    variant={isEditing ? "outline" : "default"}
                    className={`${isEditing ? "" : "bg-maroon hover:bg-maroon/90"} w-full sm:w-auto`}
                    size={isMobile ? "sm" : "default"}
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
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div>
                <h3 className="font-semibold mb-4">About</h3>
                {isOwnProfile && isEditing ? (
                  <Textarea
                    value={editedProfile.bio}
                    onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    className="min-h-[120px]"
                  />
                ) : (
                  <p className="text-gray-700">{user.bio || "No bio available."}</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-4">Contact & Links</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-gray-500" />
                    <span className="text-gray-700">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Github size={16} className="text-gray-500" />
                    {isOwnProfile && isEditing ? (
                      <Input
                        value={editedProfile.contactInfo?.github || ''}
                        onChange={(e) => setEditedProfile({ ...editedProfile, contactInfo: { ...editedProfile.contactInfo, github: e.target.value }})}
                        placeholder="GitHub URL"
                        className="flex-1"
                      />
                    ) : (
                      <a href={user.contactInfo?.github} className="text-blue-600 hover:underline">
                        {user.contactInfo?.github || 'Not provided'}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Linkedin size={16} className="text-gray-500" />
                    {isOwnProfile && isEditing ? (
                      <Input
                        value={editedProfile.contactInfo?.linkedin || ''}
                        onChange={(e) => setEditedProfile({ ...editedProfile, contactInfo: { ...editedProfile.contactInfo, linkedin: e.target.value }})}
                        placeholder="LinkedIn URL"
                        className="flex-1"
                      />
                    ) : (
                      <a href={user.contactInfo?.linkedin} className="text-blue-600 hover:underline">
                        {user.contactInfo?.linkedin || 'Not provided'}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {isOwnProfile && isEditing && (
              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
                  <Save size={16} className="mr-2" />
                  Save Changes
                </Button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 md:p-8">
            <Tabs defaultValue="my-projects" className="w-full">
              <TabsList className={`grid w-full ${isOwnProfile ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'} bg-gray-100 gap-1`}>
                <TabsTrigger value="my-projects">My Projects</TabsTrigger>
                <TabsTrigger value="backed-projects">Backed Projects</TabsTrigger>
                {isOwnProfile && (
                  <TabsTrigger value="theme-settings">Theme Settings</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="my-projects" className="mt-6">
                {isLoadingProjects ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading projects...</p>
                  </div>
                ) : userProjects.length > 0 ? (
                  <div className="space-y-4">
                    {userProjects.map((project: Project) => (
                      <div key={project._id?.toString()} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold mb-2">
                              <Link href={`/projects/${project._id}`} className="text-gray-900 hover:text-maroon">
                                {project.title}
                              </Link>
                            </h3>
                            <p className="text-gray-600 text-sm mb-2">{project.description}</p>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {project.tags?.map((tag) => (
                                <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <p>Status: <span className="capitalize font-medium">{project.status}</span></p>
                            <p className="mt-1">Created: {new Date(project.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-500">
                          <div className="flex gap-4">
                            <span>👁️ {project.analytics?.views || 0} views</span>
                            <span>❤️ {project.likes?.length || 0} likes</span>
                            <span>💬 {project.analytics?.totalComments || 0} comments</span>
                          </div>
                          <Link href={`/projects/${project._id}`}>
                            <Button variant="outline" size="sm">
                              View Project
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No projects yet</h3>
                    <p className="text-gray-500 mb-4">
                      {isOwnProfile 
                        ? "Create your first project and share it with the community!"
                        : "This user hasn't created any projects yet."
                      }
                    </p>
                    {isOwnProfile && (
                      <Link href="/create-project">
                        <Button className="bg-green-600 hover:bg-green-700">
                          Create New Project
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="backed-projects" className="mt-6">
                {isLoadingBackedProjects ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading backed projects...</p>
                  </div>
                ) : backedProjects.length > 0 ? (
                  <div className="space-y-4">
                    {backedProjects.map((project: Project) => (
                      <div key={project._id?.toString()} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold mb-2">
                              <Link href={`/projects/${project._id}`} className="text-gray-900 hover:text-maroon">
                                {project.title}
                              </Link>
                            </h3>
                            <p className="text-gray-600 text-sm mb-2">{project.description}</p>
                            <p className="text-gray-500 text-xs mb-2">
                              by {project.ownerId?.fullName || project.ownerId?.username}
                            </p>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {project.tags?.map((tag) => (
                                <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <p>Status: <span className="capitalize font-medium">{project.status}</span></p>
                            <p className="mt-1">Created: {new Date(project.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-500">
                          <div className="flex gap-4">
                            <span>👁️ {project.analytics?.views || 0} views</span>
                            <span>❤️ {project.likes?.length || 0} likes</span>
                            <span>💬 {project.analytics?.totalComments || 0} comments</span>
                          </div>
                          <Link href={`/projects/${project._id}`}>
                            <Button variant="outline" size="sm">
                              View Project
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No backed projects yet</h3>
                    <p className="text-gray-500 mb-4">
                      {isOwnProfile 
                        ? "Explore the forum to find interesting projects to support!"
                        : "This user hasn't backed any projects yet."
                      }
                    </p>
                    {isOwnProfile && (
                      <Link href="/forum">
                        <Button variant="outline">
                          Browse Projects
                        </Button>
                      </Link>
                    )}
                  </div>
                                )}
              </TabsContent>

              {isOwnProfile && (
                <TabsContent value="theme-settings" className="mt-6">
                  <ThemeSettings />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
