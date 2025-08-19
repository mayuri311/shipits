import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, projectsApi } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { X, UserPlus, Search, Users } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import type { User, Project } from '@shared/schema';

interface CollaboratorManagerProps {
  project: Project;
}

export function CollaboratorManager({ project }: CollaboratorManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const { data: collaborators } = useQuery<User[]>({
    queryKey: ['collaborators', project._id],
    queryFn: () => Promise.resolve(project.collaborators as User[]),
    initialData: project.collaborators as User[],
  });
  
  // Fetch all users when the component mounts
  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await usersApi.listUsers({ limit: 100 }); // Fetch up to 100 users
        if (response.success) {
          setAllUsers(response.data.items);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    }
    fetchUsers();
  }, []);

  const { mutate: addCollaborator, isPending: isAdding } = useMutation({
    mutationFn: (userId: string) => projectsApi.addCollaborator(project._id, userId),
    onSuccess: (response) => {
      // Invalidate project queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['project', project._id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['collaborators', project._id] });
      
      // Clear search query after successful add
      setSearchQuery('');
      
      toast({ title: 'Collaborator added', description: 'The user has been added as a collaborator.' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error adding collaborator', 
        description: error?.response?.data?.error || error.message, 
        variant: 'destructive' 
      });
    },
  });

  const { mutate: removeCollaborator, isPending: isRemoving } = useMutation({
    mutationFn: (userId: string) => projectsApi.removeCollaborator(project._id, userId),
    onSuccess: () => {
      // Invalidate project queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['project', project._id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['collaborators', project._id] });
      
      toast({ title: 'Collaborator removed', description: 'The user has been removed as a collaborator.' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error removing collaborator', 
        description: error?.response?.data?.error || error.message, 
        variant: 'destructive' 
      });
    },
  });

  const filteredUsers = searchQuery
    ? allUsers.filter(user =>
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allUsers;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold">Manage Collaborators</h3>
      </div>
      
      <div className="space-y-4 sm:space-y-6">
        {/* Search Section */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={isMobile ? "Search users..." : "Search by username or name to filter"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <p className="text-xs text-gray-500">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
            </p>
          )}
        </div>

        {/* Search Results */}
        {filteredUsers.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">Available Users</h4>
            <div className="border rounded-md divide-y max-h-48 sm:max-h-60 overflow-y-auto">
              {filteredUsers.map((user) => (
                <div key={user._id} className="p-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.fullName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      @{user.username}
                    </p>
                  </div>
                  <Button 
                    size={isMobile ? "sm" : "sm"} 
                    onClick={() => addCollaborator(user._id)} 
                    disabled={isAdding}
                    className={`${isMobile ? 'px-3' : 'px-4'} shrink-0`}
                  >
                    {isMobile ? (
                      <UserPlus className="w-4 h-4" />
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Collaborators */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
            Current Collaborators
            {collaborators && collaborators.length > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                {collaborators.length}
              </span>
            )}
          </h4>
          {collaborators && collaborators.length > 0 ? (
            <div className="space-y-2">
              {collaborators.map((user) => (
                <div key={user._id} className="flex items-center justify-between gap-3 bg-gray-50 p-3 rounded-md">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.fullName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      @{user.username}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCollaborator(user._id)}
                    disabled={isRemoving}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0 p-2"
                    title="Remove collaborator"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No collaborators yet</p>
              <p className="text-xs mt-1">Search and add users above to start collaborating!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
