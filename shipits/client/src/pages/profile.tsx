import { useState, useEffect } from "react";
import { Link, useParams } from "wouter";
import { User, MapPin, Calendar, Github, Linkedin, Twitter, Mail, Edit3, Save, X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { usersApi, uploadApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import type { User as UserType } from "@shared/schema";
import { compressProfileImage, formatFileSize } from "@/lib/imageCompression";

export default function Profile() {
  const { user: currentUser, updateUser } = useAuth();
  const { id } = useParams();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserType>>({});
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);

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
          <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  {(isOwnProfile && isEditing ? editedProfile.profileImage : user.profileImage) ? (
                    <img
                      src={isOwnProfile && isEditing ? editedProfile.profileImage || user.profileImage : user.profileImage}
                      alt={user.fullName || 'Profile'}
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
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleProfilePictureUpload(e.target.files)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={uploadingProfilePic}
                        />
                        {uploadingProfilePic ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        ) : (
                          <Camera className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow-sm whitespace-nowrap">
                        Hover to change photo
                      </div>
                    </>
                  )}
                  
                  {isOwnProfile && isEditing && (editedProfile.profileImage !== null && (editedProfile.profileImage || user.profileImage)) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveProfilePicture}
                      className="absolute -bottom-2 -right-2 w-8 h-8 p-0 rounded-full bg-red-500 hover:bg-red-600 text-white border-red-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2">{isOwnProfile && isEditing ? <Input value={editedProfile.fullName} onChange={(e) => setEditedProfile({...editedProfile, fullName: e.target.value})} /> : user.fullName}</h1>
                  <p className="text-gray-600 mb-1">@{user.username} • {user.college}</p>
                  <p className="text-gray-500 text-sm">Class of {user.graduationYear}</p>
                </div>
              </div>
              
              {isOwnProfile && (
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
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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

          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <Tabs defaultValue="my-projects" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100">
                <TabsTrigger value="my-projects">My Projects</TabsTrigger>
                <TabsTrigger value="backed-projects">Backed Projects</TabsTrigger>
              </TabsList>

              <TabsContent value="my-projects" className="mt-6">
                <div className="text-center py-12">
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No projects yet</h3>
                  <p className="text-gray-500 mb-4">Create your first project and share it with the community!</p>
                  <Link href="/create-project">
                    <Button className="bg-green-600 hover:bg-green-700">
                      Create New Project
                    </Button>
                  </Link>
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
