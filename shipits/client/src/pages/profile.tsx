import { useState, useEffect, useRef } from "react";
import { Link, useParams } from "wouter";
import { User, MapPin, Calendar, Github, Linkedin, Twitter, Mail, Edit3, Save, X, Camera, Menu, UserPlus, UserCheck, Award, Flame, Heart, Eye, MessageSquare, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { usersApi, uploadApi, projectsApi, reportsApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import type { User as UserType, Project } from "@shared/schema";
import { compressProfileImage, formatFileSize } from "@/lib/imageCompression";
import { ThemeSettings } from "@/components/ThemeSettings";
import TranslatedMarkdown from "@/components/TranslatedMarkdown";

export default function Profile() {
  const { user: currentUser, updateUser, isAuthenticated } = useAuth();
  const { id } = useParams();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserType>>({});
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUserReport, setShowUserReport] = useState(false);
  const [userReportReason, setUserReportReason] = useState<'spam' | 'abuse' | 'harassment' | 'hate' | 'sexual' | 'self-harm' | 'copyright' | 'other'>('spam');
  const [userReportDetails, setUserReportDetails] = useState('');

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
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);

  // Load follow state and counts
  useEffect(() => {
    const loadFollowData = async () => {
      try {
        if (!user?._id) return;
        const [followersRes, followingRes] = await Promise.all([
          usersApi.getFollowers(user._id!.toString()),
          usersApi.getFollowing(user._id!.toString()),
        ]);
        const followers = followersRes?.success ? followersRes.data?.users || [] : [];
        const following = followingRes?.success ? followingRes.data?.users || [] : [];
        setFollowersCount(followers.length);
        setFollowingCount(following.length);
        if (currentUser?._id) {
          setIsFollowing(followers.some((u: any) => u._id === currentUser._id));
        }
      } catch (e) {
        // ignore
      }
    };
    loadFollowData();
  }, [user?._id, currentUser?._id]);

  const handleToggleFollow = async () => {
    if (!isAuthenticated || !user?._id || isOwnProfile) return;
    try {
      if (isFollowing) {
        await usersApi.unfollowUser(user._id!.toString());
        setIsFollowing(false);
        setFollowersCount((c) => Math.max(0, c - 1));
        toast({
          title: "Unfollowed",
          description: `You are no longer following ${user.fullName || user.username}.`,
        });
      } else {
        await usersApi.followUser(user._id!.toString());
        setIsFollowing(true);
        setFollowersCount((c) => c + 1);
        toast({
          title: "Following",
          description: `You are now following ${user.fullName || user.username}.`,
        });
      }
    } catch (e: any) {
      console.error('Follow/unfollow error:', e);
      toast({
        title: "Error",
        description: `Failed to ${isFollowing ? 'unfollow' : 'follow'} user. Please try again.`,
        variant: "destructive",
      });
    }
  };

  // Fetch user's projects
  const { data: userProjectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['userProjects', user?._id],
    queryFn: () => user?._id ? projectsApi.getProjects({ ownerId: user._id.toString(), limit: 100 }) : null,
    enabled: !!user?._id,
  });

  const userProjects = userProjectsData?.success ? userProjectsData.data?.items : [];

  // Fetch user's backed projects (subscriptions)
  const { data: backedProjectsData, isLoading: isLoadingBackedProjects } = useQuery({
    queryKey: ['userBackedProjects', user?._id],
    queryFn: () => user?._id ? usersApi.getUserSubscriptions(user._id.toString()) : null,
    enabled: !!user?._id,
  });

  const backedProjects = backedProjectsData?.success ? backedProjectsData.data?.projects : [];

  // Fetch user's collaborations
  const { data: collaborationsData, isLoading: isLoadingCollaborations } = useQuery({
    queryKey: ['userCollaborations', user?._id],
    queryFn: () => user?._id ? usersApi.getUserCollaborations(user._id.toString()) : null,
    enabled: !!user?._id,
  });

  const userCollaborations = collaborationsData?.success ? collaborationsData.data?.projects : [];

  // Gamification: metrics & badges
  const { data: metricsData } = useQuery({
    queryKey: ['userMetrics', user?._id],
    queryFn: () => user?._id ? usersApi.getUserMetrics(user._id.toString()) : null,
    enabled: !!user?._id,
  });
  const metrics = metricsData?.success ? metricsData.data : null;

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
      
      if (response.success && response.data?.user) {
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

      // Upload the compressed image to the server
      const uploadResult = await uploadApi.uploadProcessedImages([{
        filename: `profile-${Date.now()}.jpg`,
        originalName: file.name,
        data: compressionResult.dataUrl,
        size: compressionResult.compressedSize,
        mimetype: 'image/jpeg'
      }]);

      if (uploadResult.success && uploadResult.data?.files && uploadResult.data.files.length > 0) {
        const uploadedFile = uploadResult.data.files[0];
        // Update the edited profile with the uploaded image URL
        setEditedProfile(prev => ({ ...prev, profileImage: (uploadedFile as any).url }));

        toast({
          title: "Profile picture uploaded",
          description: `Image processed and uploaded successfully (${compressionResult.compressionRatio.toFixed(1)}x compression).`,
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Profile picture upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingProfilePic(false);
    }
  };

  const handleRemoveProfilePicture = () => {
    setEditedProfile(prev => ({ ...prev, profileImage: '' }));
    toast({
      title: "Profile picture removed",
      description: "Your profile picture will be removed when you save changes.",
    });
  };

  const handleReportUser = async () => {
    if (!isAuthenticated || !user?._id) {
      toast({ title: 'Authentication Required', description: 'Please log in to report.', variant: 'destructive' });
      return;
    }
    try {
      const res = await reportsApi.createReport({ targetType: 'user', targetId: user._id!.toString(), reason: userReportReason, details: userReportDetails || undefined });
      if (res.success) {
        toast({ title: 'Reported', description: 'Thanks. Moderators will review this profile.' });
        setShowUserReport(false);
        setUserReportDetails('');
      } else {
        throw new Error(res.error || 'Failed to report');
      }
    } catch (e: any) {
      toast({ title: 'Report Failed', description: e.message || 'Please try again later.', variant: 'destructive' });
    }
  };

  // Report user modal
  const reportUserModal = showUserReport ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-4 space-y-3">
        <div className="text-lg font-semibold">Report User</div>
        <div className="text-sm text-gray-600">Select a reason and optionally add details.</div>
        <div>
          <select className="w-full border rounded px-2 py-2" value={userReportReason} onChange={(e) => setUserReportReason(e.target.value as any)}>
            <option value="spam">Spam</option>
            <option value="abuse">Abuse</option>
            <option value="harassment">Harassment</option>
            <option value="hate">Hate</option>
            <option value="sexual">Sexual</option>
            <option value="self-harm">Self-harm</option>
            <option value="copyright">Copyright</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <Textarea placeholder="Additional details (optional)" value={userReportDetails} onChange={(e) => setUserReportDetails(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowUserReport(false)}>Cancel</Button>
          <Button onClick={handleReportUser} className="bg-orange-600 hover:bg-orange-700">Submit Report</Button>
        </div>
      </div>
    </div>
  ) : null;
  
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
      {reportUserModal}
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
                <Link href="/lists" className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide">
                  LISTS
                </Link>
                <Link href="/dashboard" className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide">
                  DASHBOARD
                </Link>
                <Link href="/#contact" className="text-black hover:text-maroon transition-colors duration-300 font-medium tracking-wide">
                  CONTACT
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
                <Link href="/lists" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                    LISTS
                  </Button>
                </Link>
                <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                    DASHBOARD
                  </Button>
                </Link>
                <Link href="/#contact" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                    CONTACT
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
                      src={isOwnProfile && isEditing ? (editedProfile.profileImage || user.profileImage) || undefined : user.profileImage || undefined}
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
                  {/* Gamification: quick metrics and badges */}
                  {metrics && (
                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-700">
                        <span className="inline-flex items-center gap-1"><Flame className="w-4 h-4 text-orange-500" /> Streak: {metrics.streaks?.currentStreak || 0}d</span>
                        <span className="inline-flex items-center gap-1"><Heart className="w-4 h-4 text-rose-500" /> Likes: {metrics.totals?.totalLikesReceived || 0}</span>
                        <span className="inline-flex items-center gap-1"><Eye className="w-4 h-4 text-blue-500" /> Views: {metrics.totals?.totalViews || 0}</span>
                        <span className="inline-flex items-center gap-1"><User className="w-4 h-4 text-emerald-600" /> Projects: {metrics.statistics?.projectsCreated || 0}</span>
                        <span className="inline-flex items-center gap-1"><MessageSquare className="w-4 h-4 text-indigo-600" /> Comments: {metrics.statistics?.commentsPosted || 0}</span>
                      </div>
                      {metrics.badges?.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          {metrics.badges.slice(0, 5).map((b: any) => (
                            <span key={b.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200 text-xs">
                              <Award className="w-3 h-3" /> {b.name}
                            </span>
                          ))}
                          {metrics.badges.length > 5 && (
                            <span className="text-xs text-gray-500">+{metrics.badges.length - 5} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Progress toward next milestones */}
                  {metrics && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(() => {
                        const comments = metrics.statistics?.commentsPosted || 0;
                        const target = comments >= 10 ? 50 : 10;
                        const pct = Math.min(100, Math.round((comments / target) * 100));
                        return (
                          <div>
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>Comments Progress</span>
                              <span>{comments}/{target}</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-2 bg-indigo-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })()}
                      {(() => {
                        const projects = metrics.statistics?.projectsCreated || 0;
                        const target = projects >= 1 ? 5 : 1;
                        const pct = Math.min(100, Math.round((projects / target) * 100));
                        return (
                          <div>
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>Projects Progress</span>
                              <span>{projects}/{target}</span>
                            </div>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-2 bg-emerald-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
              
              {isOwnProfile && (
                <div className="w-full sm:w-auto flex justify-center gap-2">
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
                  {!isOwnProfile && (
                    <Button onClick={handleToggleFollow} variant="outline" size={isMobile ? "sm" : "default"}>
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-4 h-4 mr-2" /> Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" /> Follow
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
              {!isOwnProfile && (
                <div className="w-full sm:w-auto flex justify-center gap-2 mt-2">
                  <Button variant="outline" size={isMobile ? 'sm' : 'default'} onClick={() => setShowUserReport(true)}>
                    <Flag className="w-4 h-4 mr-2" /> Report User
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div>
                <h3 className="font-semibold mb-4">About</h3>
                <div className="text-sm text-gray-600 mb-3 flex gap-4">
                  <span>{followersCount} Followers</span>
                  <span>{followingCount} Following</span>
                </div>
                {isOwnProfile && isEditing ? (
                  <Textarea
                    value={editedProfile.bio}
                    onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    className="min-h-[120px]"
                  />
                ) : user.bio ? (
                  <TranslatedMarkdown
                    sourceType="user"
                    sourceId={user._id?.toString() || ''}
                    field="bio"
                    text={user.bio}
                    className="text-gray-700"
                  />
                ) : (
                  <p className="text-gray-700">No bio available.</p>
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
                <div className="flex-1 text-sm text-gray-700 flex flex-col gap-2">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editedProfile.isFollowersListPublic ?? true}
                      onChange={(e) => setEditedProfile({ ...editedProfile, isFollowersListPublic: e.target.checked })}
                    />
                    Make my followers list public
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editedProfile.isFollowingListPublic ?? true}
                      onChange={(e) => setEditedProfile({ ...editedProfile, isFollowingListPublic: e.target.checked })}
                    />
                    Make my following list public
                  </label>
                </div>
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
              <TabsList className={`grid w-full ${isOwnProfile ? 'grid-cols-1 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'} bg-gray-100 gap-1`}>
                <TabsTrigger value="my-projects">My Projects</TabsTrigger>
                <TabsTrigger value="backed-projects">Backed Projects</TabsTrigger>
                <TabsTrigger value="collaborations">My Collaborations</TabsTrigger>
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
                ) : (userProjects || []).length > 0 ? (
                  <div className="space-y-4">
                    {(userProjects || []).map((project: Project) => (
                      <div key={project._id?.toString()} className="border border-border rounded-lg p-6 hover:shadow-md transition-shadow bg-card">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold mb-2">
                                <Link href={`/forum/project/${project._id}`} className="text-foreground hover:text-maroon">
                                {project.title}
                              </Link>
                            </h3>
                            <p className="text-muted-foreground text-sm mb-2">{project.description}</p>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {project.tags?.map((tag) => (
                                <span key={tag} className="px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <p>Status: <span className="capitalize font-medium">{project.status}</span></p>
                            <p className="mt-1">Created: {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown'}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                          <div className="flex gap-4">
                            <span>👁️ {project.analytics?.views || 0} views</span>
                            <span>❤️ {project.likes?.length || 0} likes</span>
                            <span>💬 {project.analytics?.totalComments || 0} comments</span>
                          </div>
                          <Link href={`/forum/project/${project._id}`}>
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
                ) : (backedProjects || []).length > 0 ? (
                  <div className="space-y-4">
                    {(backedProjects || []).map((project: Project) => (
                      <div key={project._id?.toString()} className="border border-border rounded-lg p-6 hover:shadow-md transition-shadow bg-card">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold mb-2">
                                <Link href={`/forum/project/${project._id}`} className="text-foreground hover:text-maroon">
                                {project.title}
                              </Link>
                            </h3>
                            <p className="text-muted-foreground text-sm mb-2">{project.description}</p>
                            <p className="text-muted-foreground/70 text-xs mb-2">
                              by {(project.ownerId as any)?.fullName || (project.ownerId as any)?.username}
                            </p>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {project.tags?.map((tag) => (
                                <span key={tag} className="px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <p>Status: <span className="capitalize font-medium">{project.status}</span></p>
                            <p className="mt-1">Created: {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Unknown'}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                          <div className="flex gap-4">
                            <span>👁️ {project.analytics?.views || 0} views</span>
                            <span>❤️ {project.likes?.length || 0} likes</span>
                            <span>💬 {project.analytics?.totalComments || 0} comments</span>
                          </div>
                          <Link href={`/forum/project/${project._id}`}>
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

              <TabsContent value="collaborations" className="mt-6">
                {isLoadingCollaborations ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading collaborations...</p>
                  </div>
                ) : (userCollaborations || []).length > 0 ? (
                  <div className="space-y-4">
                    {(userCollaborations || []).map((project: Project) => (
                      <div key={project._id?.toString()} className="border border-border rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow bg-card">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold mb-2">
                              <Link href={`/forum/project/${project._id?.toString() || ''}`} className="text-foreground hover:text-maroon line-clamp-2 sm:line-clamp-1">
                                {project.title}
                              </Link>
                            </h3>
                            <p className="text-muted-foreground text-sm mb-3">
                              <TranslatedMarkdown
                                sourceType="project"
                                sourceId={project._id?.toString() || ''}
                                field="description"
                                text={project.description}
                                className="line-clamp-3 sm:line-clamp-2"
                              />
                            </p>
                            <p className="text-muted-foreground/70 text-xs mb-3">
                              Created by {(project.ownerId as any)?.fullName || (project.ownerId as any)?.username}
                            </p>

                            {/* Tags - Mobile Optimized */}
                            {project.tags && project.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 sm:gap-2 mb-3">
                                {project.tags.slice(0, isMobile ? 3 : 6).map((tag) => (
                                  <span key={tag} className="px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs">
                                    #{tag}
                                  </span>
                                ))}
                                {isMobile && project.tags.length > 3 && (
                                  <span className="px-2 py-1 bg-muted/50 text-muted-foreground/70 rounded-full text-xs">
                                    +{project.tags.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* Collaboration Badge - Mobile Optimized */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 w-fit">
                                <User className="w-3 h-3" />
                                Collaborator
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Team of {(project.collaborators?.length || 0) + 1} member{((project.collaborators?.length || 0) + 1) !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          
                          {/* Status Section - Mobile Optimized */}
                          <div className="flex sm:flex-col sm:text-right text-sm text-muted-foreground gap-4 sm:gap-0 shrink-0">
                            <div>
                              <span className="sm:hidden text-xs font-medium">Status: </span>
                              <span className="capitalize font-medium">{project.status}</span>
                            </div>
                            <div className="sm:mt-1">
                              <span className="sm:hidden text-xs">Updated: </span>
                              <span className="text-xs sm:text-sm">{project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'Unknown'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                          <div className="flex gap-4">
                            <span>👁️ {project.analytics?.views || 0} views</span>
                            <span>❤️ {project.likes?.length || 0} likes</span>
                            <span>💬 {project.analytics?.totalComments || 0} comments</span>
                          </div>
                          <Link href={`/forum/project/${project._id}`}>
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
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No collaborations yet</h3>
                    <p className="text-gray-500 mb-4">
                      {isOwnProfile 
                        ? "You haven't been added as a collaborator to any projects yet. Start collaborating with other creators!"
                        : "This user isn't collaborating on any projects yet."
                      }
                    </p>
                    {isOwnProfile && (
                      <Link href="/forum">
                        <Button variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                          Explore Projects to Join
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
