import React, { useEffect, useMemo, useRef, useState } from 'react';
import { chatApi, usersApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Input } from '@/components/ui/input';
import TranslatedMarkdown from '@/components/TranslatedMarkdown';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function ChatPage() {
  const { user, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState('');
  const eventSourceRef = useRef<EventSource | null>(null);
  const [showMessagesMobile, setShowMessagesMobile] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const res = await chatApi.listConversations();
        if (res.success && res.data) {
          setConversations(res.data.conversations);
          if (res.data.conversations.length && !activeId) {
            const firstId = String((res.data.conversations[0] as any)._id);
            setActiveId(firstId);
          }
        }
      } catch (_e) {
        // ignore (likely unauth or stale session)
      }
    })();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!activeId) return;
    (async () => {
      try {
        const res = await chatApi.listMessages(activeId, { limit: 100 });
        if (res.success && res.data) {
          setMessages(res.data.messages);
        }
      } catch (_e) {
        // ignore
      }
    })();

    // SSE stream
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    const es = chatApi.stream(activeId, (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (payload?.type === 'message' && payload.data?.message) {
          setMessages((prev) => [...prev, payload.data.message]);
        } else if (payload?.type === 'message_edited' && payload.data?.message) {
          setMessages((prev) => prev.map((m) => String(m._id) === String(payload.data.message._id) ? payload.data.message : m));
        } else if (payload?.type === 'message_deleted' && payload.data?.messageId) {
          setMessages((prev) => prev.map((m) => String(m._id) === String(payload.data.messageId) ? { ...m, isDeleted: true, content: '' } : m));
        } else if (payload?.type === 'group_updated' && payload.data?.conversation) {
          // Handle group info updates (name, description changes)
          setConversations((prev) => prev.map((c) =>
            String(c._id) === String(payload.data.conversation._id)
              ? { ...c, ...payload.data.conversation }
              : c
          ));
        } else if (payload?.type === 'member_joined' && payload.data?.user && payload.data?.conversationId) {
          // Handle new member joining
          const newUser = payload.data.user;
          setConversations((prev) => prev.map((c) =>
            String(c._id) === String(payload.data.conversationId)
              ? { ...c, participants: [...(c.participants || []), newUser] }
              : c
          ));
        } else if (payload?.type === 'member_left' && payload.data?.userId && payload.data?.conversationId) {
          // Handle member leaving
          setConversations((prev) => prev.map((c) =>
            String(c._id) === String(payload.data.conversationId)
              ? { ...c, participants: (c.participants || []).filter((p: any) => String(p._id) !== String(payload.data.userId)) }
              : c
          ));
        } else if (payload?.type === 'typing_started' && payload.data?.userId && payload.data?.conversationId) {
          // Handle typing indicators
          if (String(payload.data.conversationId) === String(activeId)) {
            setTypingUsers(prev => {
              if (!prev.includes(payload.data.userId) && payload.data.userId !== String(user?._id || '')) {
                return [...prev, payload.data.userId];
              }
              return prev;
            });
          }
        } else if (payload?.type === 'typing_stopped' && payload.data?.userId && payload.data?.conversationId) {
          // Handle typing stopped
          if (String(payload.data.conversationId) === String(activeId)) {
            setTypingUsers(prev => prev.filter(id => id !== String(payload.data.userId)));
          }
        }
      } catch (error) {
        console.error('Error handling SSE event:', error);
      }
    });
    eventSourceRef.current = es;
    return () => { es.close(); };
  }, [activeId]);

  const send = async () => {
    if (!draft || !activeId) return;
    try {
      const res = await chatApi.sendMessage(activeId, { content: draft });
      if (res.success && res.data) {
        setDraft('');
        // Clear typing indicator
        const currentConversation = conversations.find(c => String(c._id) === String(activeId));
        if (currentConversation?.type === 'group' && typingUsers.includes(String(user?._id || ''))) {
          try {
            await chatApi.stopTyping(activeId);
          } catch (error) {
            console.error('Error stopping typing on send:', error);
          }
        }
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        setTypingUsers(prev => prev.filter(id => id !== String(user?._id || '')));
      }
    } catch (_e) {
      // ignore
    }
  };

  // Handle typing indicator
  const handleDraftChange = async (value: string) => {
    setDraft(value);

    // Send typing indicator for group chats
    const currentConversation = conversations.find(c => String(c._id) === String(activeId));
    if (currentConversation?.type === 'group' && activeId) {
      try {
        if (value && !typingUsers.includes(String(user?._id || ''))) {
          // Start typing
          await chatApi.startTyping(activeId);
          setTypingUsers(prev => [...prev, String(user?._id || '')]);

          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }

          typingTimeoutRef.current = setTimeout(async () => {
            // Stop typing after 3 seconds of inactivity
            try {
              await chatApi.stopTyping(activeId);
            } catch (error) {
              console.error('Error stopping typing:', error);
            }
            setTypingUsers(prev => prev.filter(id => id !== String(user?._id || '')));
            typingTimeoutRef.current = null;
          }, 3000);
        } else if (!value && typingUsers.includes(String(user?._id || ''))) {
          // Stop typing immediately when cleared
          try {
            await chatApi.stopTyping(activeId);
          } catch (error) {
            console.error('Error stopping typing:', error);
          }
          setTypingUsers(prev => prev.filter(id => id !== String(user?._id || '')));
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
          }
        } else if (value && typingUsers.includes(String(user?._id || ''))) {
          // Reset typing timeout if still typing
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }

          typingTimeoutRef.current = setTimeout(async () => {
            try {
              await chatApi.stopTyping(activeId);
            } catch (error) {
              console.error('Error stopping typing:', error);
            }
            setTypingUsers(prev => prev.filter(id => id !== String(user?._id || '')));
            typingTimeoutRef.current = null;
          }, 3000);
        }
      } catch (error) {
        console.error('Error sending typing indicator:', error);
      }
    }
  };

  // DM and Group picker state
  const [isDmOpen, setIsDmOpen] = useState(false);
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [groupUserQuery, setGroupUserQuery] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [groupUserResults, setGroupUserResults] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [recentContacts, setRecentContacts] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [isGroupManagementOpen, setIsGroupManagementOpen] = useState(false);
  const [groupManagementUsers, setGroupManagementUsers] = useState<any[]>([]);
  const [groupManagementQuery, setGroupManagementQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const id = setTimeout(async () => {
      if (!isDmOpen && !isGroupOpen) return;
      try {
        if (isDmOpen && userQuery) {
          const res = await usersApi.searchUsers(userQuery, 10);
          if (res.success && res.data) setUserResults(res.data.items);
        } else if (isGroupOpen && groupUserQuery) {
          console.log('Searching for group users with query:', groupUserQuery);
          const res = await usersApi.searchUsers(groupUserQuery, 20);
          console.log('Group user search result:', res);
          if (res.success && res.data) setGroupUserResults(res.data.items);
        } else {
          // Load recent contacts and a page of all users for dropdown
          const [rc, lu] = await Promise.all([
            chatApi.getRecentContacts(),
            usersApi.listUsers({ page: 1, limit: 100 }),
          ]);
          console.log('Recent contacts response:', rc);
          console.log('List users response:', lu);
          if (rc.success && rc.data) setRecentContacts(rc.data.items);
          if (lu.success && lu.data) setAllUsers(lu.data.items);
          setUserResults([]);
          setGroupUserResults([]);
        }
      } catch (e) {
        console.error('Error loading users:', e);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [userQuery, groupUserQuery, isDmOpen, isGroupOpen]);

  const startDm = async (targetId: string) => {
    const res = await chatApi.createConversation({ type: 'dm', participants: [targetId as any] });
    if (res.success && res.data) {
      const conv = res.data.conversation;
      // Always refresh populated participants
      try {
        const fresh = await chatApi.getConversation(String(conv._id));
        const finalConv = fresh.success && fresh.data ? fresh.data.conversation : conv;
        setConversations((prev) => {
          const exists = prev.some((c) => String(c._id) === String(finalConv._id));
          return exists ? prev.map((c) => String(c._id) === String(finalConv._id) ? finalConv : c) : [finalConv, ...prev];
        });
      } catch {
        setConversations((prev) => {
          const exists = prev.some((c) => String(c._id) === String(conv._id));
          return exists ? prev : [conv, ...prev];
        });
      }
      setActiveId(String(conv._id));
      setIsDmOpen(false);
      setUserQuery('');
      setUserResults([]);
    }
  };

  const createGroupChat = async () => {
    if (!groupName.trim() || selectedUsers.length < 2) {
      alert('Please enter a group name and select at least 2 users');
      return;
    }

    try {
      const participantIds = [...selectedUsers.map(u => u._id), user?._id];
      console.log('Creating group chat with:', {
        type: 'group',
        name: groupName.trim(),
        description: groupDescription.trim() || undefined,
        participants: participantIds
      });

      const res = await chatApi.createConversation({
        type: 'group',
        name: groupName.trim(),
        description: groupDescription.trim() || undefined,
        participants: participantIds
      });

      console.log('Group creation response:', res);

      if (res.success && res.data?.conversation) {
        const conv = res.data.conversation;
        // Always refresh populated participants
        try {
          const fresh = await chatApi.getConversation(String(conv._id));
          const finalConv = fresh.success && fresh.data ? fresh.data.conversation : conv;
          setConversations((prev) => [finalConv, ...prev]);
        } catch {
          setConversations((prev) => [conv, ...prev]);
        }
        setActiveId(String(conv._id));
        setIsGroupOpen(false);
        setGroupUserQuery('');
        setGroupUserResults([]);
        setSelectedUsers([]);
        setGroupName('');
        setGroupDescription('');
        alert('Group chat created successfully!');
      } else {
        console.error('Group creation failed:', res);
        alert(`Failed to create group chat: ${res.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating group chat:', error);
      alert('Failed to create group chat. Please try again.');
    }
  };

  const addUserToGroup = (clickedUser: any) => {
    console.log('=== ADD USER TO GROUP ===');
    console.log('User being added:', clickedUser);
    console.log('User._id:', clickedUser._id);
    console.log('Current user ID:', user?._id);
    console.log('Current selected users:', selectedUsers);
    console.log('Selected user IDs:', selectedUsers.map(u => u._id));

    const isAlreadySelected = selectedUsers.some(u => String(u._id) === String(clickedUser._id));
    const isCurrentUser = String(clickedUser._id) === String(user?._id || '');

    console.log('Is already selected:', isAlreadySelected);
    console.log('Is current user:', isCurrentUser);

    if (!isAlreadySelected && !isCurrentUser) {
      console.log('✅ Adding user to selection');
      setSelectedUsers(prev => [...prev, clickedUser]);
    } else {
      console.log('❌ User not added:', isAlreadySelected ? 'already selected' : 'is current user');
    }

    setGroupUserQuery('');
    setGroupUserResults([]);
  };

  const removeUserFromGroup = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u._id !== userId));
  };

  // Group management functions
  const openGroupManagement = () => {
    const currentConversation = conversations.find(c => String(c._id) === String(activeId));
    if (currentConversation && currentConversation.type === 'group') {
      setGroupManagementUsers(currentConversation.participants || []);
      setIsGroupManagementOpen(true);
    }
  };

  const addUserToGroupChat = async (userId: string) => {
    if (!activeId) return;
    try {
      const res = await chatApi.addParticipant(activeId, userId);
      if (res.success && res.data?.conversation) {
        // Update local conversation state
        setConversations(prev => prev.map(c =>
          String(c._id) === String(activeId) ? res.data!.conversation : c
        ));
        alert('User added to group successfully!');
      } else {
        alert(`Failed to add user: ${res.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding user to group:', error);
      alert('Failed to add user to group. Please try again.');
    }
  };

  const removeUserFromGroupChat = async (userId: string) => {
    if (!activeId || userId === String(user?._id || '')) return; // Can't remove yourself
    try {
      const res = await chatApi.removeParticipant(activeId, userId);
      if (res.success && res.data?.conversation) {
        // Update local conversation state
        setConversations(prev => prev.map(c =>
          String(c._id) === String(activeId) ? res.data!.conversation : c
        ));
        alert('User removed from group successfully!');
      } else {
        alert(`Failed to remove user: ${res.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error removing user from group:', error);
      alert('Failed to remove user from group. Please try again.');
    }
  };

  const updateGroupInfo = async (name: string, description: string) => {
    if (!activeId) return;
    try {
      const res = await chatApi.updateConversation(activeId, { name, description });
      if (res.success && res.data?.conversation) {
        // Update local conversation state
        setConversations(prev => prev.map(c =>
          String(c._id) === String(activeId) ? res.data!.conversation : c
        ));
        alert('Group info updated successfully!');
      } else {
        alert(`Failed to update group info: ${res.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating group info:', error);
      alert('Failed to update group info. Please try again.');
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const beginEdit = (messageId: string, current: string) => {
    setEditingId(String(messageId));
    setEditDraft(current);
  };
  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await chatApi.editMessage(String(editingId), editDraft);
      if (res.success && res.data?.message) {
        setMessages((prev) => prev.map((m) => String(m._id) === String(editingId) ? res.data?.message : m));
        setEditingId(null);
        setEditDraft('');
      }
    } catch (_e) {
      // ignore
    }
  };
  const cancelEdit = () => { setEditingId(null); setEditDraft(''); };
  const removeMessage = async (messageId: string) => {
    try {
      const res = await chatApi.deleteMessage(String(messageId));
      if (res.success) {
        setMessages((prev) => prev.map((m) => String(m._id) === String(messageId) ? { ...m, isDeleted: true, content: '' } : m));
      }
    } catch (_e) {
      // ignore
    }
  };

  return (
    <div className="flex h-[100dvh] sm:h-screen">
      <div className="w-full sm:w-80 md:w-96 border-r p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold">Chats</div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/">
              <Button size="sm" variant="ghost" className="w-full sm:w-auto">Home</Button>
            </Link>
            {isAuthenticated ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button size="sm" onClick={() => setIsDmOpen(true)} className="w-full sm:w-auto">New DM</Button>
                <Button size="sm" onClick={() => setIsGroupOpen(true)} className="w-full sm:w-auto">New Group</Button>
              </div>
            ) : (
              <Link href="/profile">
                <Button size="sm" variant="outline" className="w-full sm:w-auto">Sign in to DM</Button>
              </Link>
            )}
          </div>
        </div>
        <div className="space-y-1 overflow-auto">
          {conversations.map((c) => {
            const other = (c.type === 'dm' && Array.isArray(c.participants)) ? c.participants.find((p: any) => String(p._id) !== String(user?._id)) : null;
            const title = c.name || (c.type==='dm' ? (other?.fullName || other?.username || 'Direct Message') : 'Group Chat');
            const participantCount = c.participants?.length || 0;

            // Create group avatar from first 3 participants
            const groupParticipants = c.type === 'group' && Array.isArray(c.participants)
              ? c.participants.filter((p: any) => String(p._id) !== String(user?._id)).slice(0, 3)
              : [];

            return (
            <button
              key={String(c._id)}
              onClick={() => { setActiveId(String(c._id)); setShowMessagesMobile(true); }}
              className={`w-full text-left px-4 py-3 sm:px-2 sm:py-1 rounded transition-colors min-h-[70px] sm:min-h-auto touch-manipulation ${
                activeId===String(c._id)?'bg-muted':'hover:bg-muted active:bg-muted/80'
              }`}
            >
              <div className="flex items-center gap-2">
                {c.type === 'dm' && other ? (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={other.profileImage || ''} />
                    <AvatarFallback>{(other.fullName || other.username || '?').slice(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                ) : c.type === 'group' && groupParticipants.length > 0 ? (
                  <div className="h-8 w-8 relative">
                    {groupParticipants.length === 1 ? (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={groupParticipants[0].profileImage || ''} />
                        <AvatarFallback>{(groupParticipants[0].fullName || groupParticipants[0].username || '?').slice(0,2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="flex">
                        {groupParticipants.map((participant: any, index: number) => (
                          <Avatar
                            key={participant._id}
                            className="h-6 w-6 border-2 border-background"
                            style={{
                              marginLeft: index > 0 ? '-8px' : '0',
                              zIndex: groupParticipants.length - index
                            }}
                          >
                            <AvatarImage src={participant.profileImage || ''} />
                            <AvatarFallback className="text-xs">
                              {(participant.fullName || participant.username || '?').slice(0,1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">G</span>
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium flex items-center justify-between">
                    <span>{title}</span>
                    {c.type === 'group' && participantCount > 2 && (
                      <span className="text-xs text-muted-foreground">{participantCount}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date((c.updatedAt||c.lastMessageAt||c.createdAt)).toLocaleString()}</div>
                  {c.type === 'group' && c.description && (
                    <div className="text-xs text-muted-foreground truncate max-w-48">{c.description}</div>
                  )}
                </div>
              </div>
            </button>
          );})}
        </div>
      </div>
      <div className={`${showMessagesMobile ? 'flex' : 'hidden'} sm:flex flex-1 flex-col`}> 
        {/* Mobile header with back button */}
        <div className="sm:hidden border-b p-4 flex items-center justify-between sticky top-0 bg-background z-10 min-h-[60px]">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => setShowMessagesMobile(false)} className="flex-shrink-0">
              ← Back
            </Button>
            <div className="font-medium text-sm truncate">
              {(() => {
                const c = conversations.find((x) => String(x._id) === String(activeId));
                if (!c) return 'Conversation';
                const other = (c.type === 'dm' && Array.isArray(c.participants)) ? c.participants.find((p: any) => String(p._id) !== String(user?._id)) : null;
                return c.name || (c.type==='dm' ? (other?.fullName || other?.username || 'Direct Message') : 'Group Chat');
              })()}
            </div>
          </div>
          {(() => {
            const c = conversations.find((x) => String(x._id) === String(activeId));
            return c?.type === 'group' ? (
              <Button size="sm" variant="ghost" onClick={openGroupManagement}>
                Manage
              </Button>
            ) : null;
          })()}
        </div>
        {/* Desktop header with recipient */}
        <div className="hidden sm:flex border-b p-3 items-center justify-between sticky top-0 bg-background z-10">
          <div className="flex items-center gap-2">
            {(() => {
              const c = conversations.find((x) => String(x._id) === String(activeId));
              if (!c) return <div className="font-medium">Conversation</div>;
              const other = (c.type === 'dm' && Array.isArray(c.participants)) ? c.participants.find((p: any) => String(p._id) !== String(user?._id)) : null;
              const groupParticipants = c.type === 'group' && Array.isArray(c.participants)
                ? c.participants.filter((p: any) => String(p._id) !== String(user?._id)).slice(0, 3)
                : [];

              return (
                <div className="flex items-center gap-2">
                  {c.type === 'dm' && other ? (
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={other.profileImage || ''} />
                      <AvatarFallback>{(other?.fullName || other?.username || '?').slice(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  ) : c.type === 'group' && groupParticipants.length > 0 ? (
                    <div className="h-7 w-7 relative">
                      {groupParticipants.length === 1 ? (
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={groupParticipants[0].profileImage || ''} />
                          <AvatarFallback>{(groupParticipants[0].fullName || groupParticipants[0].username || '?').slice(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="flex">
                          {groupParticipants.map((participant: any, index: number) => (
                            <Avatar
                              key={participant._id}
                              className="h-5 w-5 border-2 border-background"
                              style={{
                                marginLeft: index > 0 ? '-6px' : '0',
                                zIndex: groupParticipants.length - index
                              }}
                            >
                              <AvatarImage src={participant.profileImage || ''} />
                              <AvatarFallback className="text-xs">
                                {(participant.fullName || participant.username || '?').slice(0,1).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-7 w-7 bg-muted rounded-full flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">G</span>
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{c.name || (c.type==='dm' ? (other?.fullName || other?.username || 'Direct Message') : 'Group Chat')}</div>
                    {c.type === 'group' && c.participants && (
                      <div className="text-xs text-muted-foreground">
                        {c.participants.length} members
                        {c.description && ` • ${c.description}`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
          {(() => {
            const c = conversations.find((x) => String(x._id) === String(activeId));
            return c?.type === 'group' ? (
              <Button size="sm" variant="ghost" onClick={openGroupManagement} className="flex-shrink-0">
                Manage
              </Button>
            ) : null;
          })()}
        </div>
        <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-3 sm:space-y-2">
          {messages.map((m, index) => {
            const isCurrentUser = m.senderId === user?._id;
            const currentConversation = conversations.find(c => String(c._id) === String(activeId));
            const isGroup = currentConversation?.type === 'group';
            const sender = isGroup && !isCurrentUser
              ? currentConversation.participants?.find((p: any) => String(p._id) === String(m.senderId))
              : null;
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const showSenderName = isGroup && !isCurrentUser && (!prevMessage || prevMessage.senderId !== m.senderId);

            return (
              <div key={m._id} className={`group max-w-xl ${isCurrentUser ? 'ml-auto text-right' : ''}`}>
                <div className="flex items-center gap-2 justify-between">
                  <div className="text-xs text-muted-foreground">
                    {showSenderName && sender && (
                      <span className="font-medium text-foreground mr-2">
                        {sender.fullName || sender.username}
                      </span>
                    )}
                    {new Date(m.createdAt).toLocaleTimeString()}
                    {m.edited && !m.isDeleted ? ' (edited)' : ''}
                    {editingId === m._id && (
                      <span className="text-yellow-600 dark:text-yellow-400 font-medium ml-2">
                        editing...
                      </span>
                    )}
                  </div>
                  {isCurrentUser && !m.isDeleted && (
                    <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => beginEdit(m._id, m.content || '')}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => removeMessage(m._id)}>Delete</Button>
                    </div>
                  )}
                </div>
                              <div className={`inline-block rounded px-3 py-2 text-left w-full ${
                editingId === m._id
                  ? 'bg-yellow-100 border-2 border-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-600'
                  : isCurrentUser
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary'
              }`}>
                  {editingId === m._id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e)=>{ if(e.key==='Enter'){ saveEdit(); } }}
                        className="bg-yellow-50 border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500 dark:bg-yellow-950/20 dark:border-yellow-700 dark:focus:border-yellow-600 dark:focus:ring-yellow-600"
                      />
                      <Button size="sm" onClick={saveEdit}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                    </div>
                  ) : (
                    m.isDeleted ? (
                      <div className="text-muted-foreground text-sm italic">Message deleted</div>
                    ) : (
                      <TranslatedMarkdown
                        sourceType="message"
                        sourceId={String(m._id)}
                        field="content"
                        text={m.content || ''}
                      />
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Typing indicator for group chats */}
        {(() => {
          const currentConversation = conversations.find(c => String(c._id) === String(activeId));
          const typingUsersInGroup = typingUsers.filter(id => id !== String(user?._id || ''));
          if (currentConversation?.type === 'group' && typingUsersInGroup.length > 0) {
            const typingNames = typingUsersInGroup
              .map(id => {
                const participant = currentConversation.participants?.find((p: any) => String(p._id) === String(id));
                return participant?.fullName || participant?.username || 'Someone';
              })
              .join(', ');
            return (
              <div className="px-4 py-2 text-xs text-muted-foreground">
                {typingNames} {typingUsersInGroup.length === 1 ? 'is' : 'are'} typing...
              </div>
            );
          }
          return null;
        })()}

        <div className="border-t p-4 flex gap-3 sticky bottom-0 bg-background min-h-[70px] items-end">
          <Input
            placeholder="Type a message"
            value={draft}
            onChange={(e) => handleDraftChange(e.target.value)}
            onKeyDown={(e)=>{ if(e.key==='Enter'){ send(); } }}
            className="min-h-[44px] text-base"
          />
          <Button onClick={send} size="lg" className="px-6">
            Send
          </Button>
        </div>
      </div>

      {isDmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-4 z-50">
          <div className="bg-background w-full max-w-lg rounded-lg shadow-lg p-4 sm:p-6 flex flex-col gap-4 max-h-[80vh] sm:max-h-[90vh] overflow-hidden"
               style={{ marginBottom: window.innerWidth < 640 ? '0' : 'auto' }}>
            <div className="flex items-center justify-between">
              <div className="font-semibold">Start a new DM</div>
              <Button variant="ghost" onClick={() => setIsDmOpen(false)}>Close</Button>
            </div>
            <Input
              autoFocus
              placeholder="Search by name or username"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
            />
            <div className="max-h-80 overflow-auto divide-y">
              {!userQuery && recentContacts.length > 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">Recent contacts</div>
              )}
              {!userQuery && recentContacts.map((u) => (
                <button key={String(u._id)} className="w-full text-left p-3 hover:bg-muted flex items-center gap-3" onClick={() => startDm(String(u._id))}>
                  <img src={u.profileImage || ''} alt="" className="w-8 h-8 rounded-full bg-muted object-cover" />
                  <div>
                    <div className="font-medium text-sm">{u.fullName || u.username}</div>
                    <div className="text-xs text-muted-foreground">@{u.username}</div>
                  </div>
                </button>
              ))}
              {!userQuery && (
                <div className="px-3 py-2 text-xs text-muted-foreground">All users</div>
              )}
              {!userQuery && allUsers.map((u) => (
                <button key={String(u._id)} className="w-full text-left p-3 hover:bg-muted flex items-center gap-3" onClick={() => startDm(String(u._id))}>
                  <img src={u.profileImage || ''} alt="" className="w-8 h-8 rounded-full bg-muted object-cover" />
                  <div>
                    <div className="font-medium text-sm">{u.fullName || u.username}</div>
                    <div className="text-xs text-muted-foreground">@{u.username}</div>
                  </div>
                </button>
              ))}
              {userQuery && userResults.map((u) => (
                <button key={String(u._id)} className="w-full text-left p-3 hover:bg-muted flex items-center gap-3" onClick={() => startDm(String(u._id))}>
                  <img src={u.profileImage || ''} alt="" className="w-8 h-8 rounded-full bg-muted object-cover" />
                  <div>
                    <div className="font-medium text-sm">{u.fullName || u.username}</div>
                    <div className="text-xs text-muted-foreground">@{u.username}</div>
                  </div>
                </button>
              ))}
              {!userQuery && !recentContacts.length && <div className="p-3 text-sm text-muted-foreground">No recent contacts</div>}
              {userQuery && !userResults.length && <div className="p-3 text-sm text-muted-foreground">No users</div>}
            </div>
          </div>
        </div>
      )}

      {isGroupOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-4 z-50">
          <div className="bg-background w-full max-w-lg rounded-lg shadow-lg p-4 sm:p-6 flex flex-col gap-4 max-h-[80vh] sm:max-h-[90vh] overflow-hidden"
               style={{ marginBottom: window.innerWidth < 640 ? '0' : 'auto' }}>
            <div className="flex items-center justify-between">
              <div className="font-semibold">Create a new group chat</div>
              <Button variant="ghost" onClick={() => {
                setIsGroupOpen(false);
                setGroupUserQuery('');
                setGroupUserResults([]);
                setSelectedUsers([]);
                setGroupName('');
                setGroupDescription('');
              }}>Close</Button>
            </div>

            <div className="space-y-3">
              <Input
                placeholder="Group name *"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={120}
              />
              <Input
                placeholder="Group description (optional)"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                maxLength={500}
              />
            </div>

            {/* Selected users */}
            {selectedUsers.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Selected members ({selectedUsers.length})</div>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <div key={user._id} className="flex items-center gap-2 bg-muted px-2 py-1 rounded-full">
                      <img src={user.profileImage || ''} alt="" className="w-4 h-4 rounded-full bg-muted object-cover" />
                      <span className="text-xs">{user.fullName || user.username}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => removeUserFromGroup(user._id)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User search */}
            <div className="space-y-2">
              <Input
                placeholder="Search users to add"
                value={groupUserQuery}
                onChange={(e) => setGroupUserQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && groupUserResults.length > 0) {
                    addUserToGroup(groupUserResults[0]);
                  }
                }}
              />
              <div className="max-h-60 overflow-auto divide-y border rounded">
                {!groupUserQuery && recentContacts.length > 0 && (
                  <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/50">Recent contacts</div>
                )}
                {!groupUserQuery && recentContacts.filter(u => !selectedUsers.some(su => su._id === u._id) && u._id !== user?._id).map((u) => (
                  <button
                    key={String(u._id)}
                    className="w-full text-left p-3 hover:bg-muted flex items-center gap-3"
                    onClick={() => addUserToGroup(u)}
                  >
                    <img src={u.profileImage || ''} alt="" className="w-8 h-8 rounded-full bg-muted object-cover" />
                    <div>
                      <div className="font-medium text-sm">{u.fullName || u.username}</div>
                      <div className="text-xs text-muted-foreground">@{u.username}</div>
                    </div>
                  </button>
                ))}
                {!groupUserQuery && (
                  <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/50">All users</div>
                )}
                {!groupUserQuery && allUsers.filter(u => !selectedUsers.some(su => su._id === u._id) && u._id !== user?._id).map((u) => (
                  <button
                    key={String(u._id)}
                    className="w-full text-left p-3 hover:bg-muted flex items-center gap-3"
                    onClick={() => addUserToGroup(u)}
                  >
                    <img src={u.profileImage || ''} alt="" className="w-8 h-8 rounded-full bg-muted object-cover" />
                    <div>
                      <div className="font-medium text-sm">{u.fullName || u.username}</div>
                      <div className="text-xs text-muted-foreground">@{u.username}</div>
                    </div>
                  </button>
                ))}
                {groupUserQuery && groupUserResults.filter(u => !selectedUsers.some(su => su._id === u._id) && u._id !== user?._id).map((u) => (
                  <button
                    key={String(u._id)}
                    className="w-full text-left p-3 hover:bg-muted flex items-center gap-3"
                    onClick={() => addUserToGroup(u)}
                  >
                    <img src={u.profileImage || ''} alt="" className="w-8 h-8 rounded-full bg-muted object-cover" />
                    <div>
                      <div className="font-medium text-sm">{u.fullName || u.username}</div>
                      <div className="text-xs text-muted-foreground">@{u.username}</div>
                    </div>
                  </button>
                ))}
                {!groupUserQuery && !recentContacts.filter(u => !selectedUsers.some(su => su._id === u._id) && u._id !== user?._id).length && <div className="p-3 text-sm text-muted-foreground">No more users to add</div>}
                {groupUserQuery && !groupUserResults.filter(u => !selectedUsers.some(su => su._id === u._id) && u._id !== user?._id).length && <div className="p-3 text-sm text-muted-foreground">No users found</div>}
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsGroupOpen(false);
                  setGroupUserQuery('');
                  setGroupUserResults([]);
                  setSelectedUsers([]);
                  setGroupName('');
                  setGroupDescription('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={createGroupChat}
                className="flex-1"
                disabled={!groupName.trim() || selectedUsers.length < 2}
              >
                Create Group
              </Button>
            </div>
          </div>
        </div>
      )}

      {isGroupManagementOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-4 z-50">
          <div className="bg-background w-full max-w-lg rounded-lg shadow-lg p-4 sm:p-6 flex flex-col gap-4 max-h-[80vh] sm:max-h-[90vh] overflow-hidden"
               style={{ marginBottom: window.innerWidth < 640 ? '0' : 'auto' }}>
            <div className="flex items-center justify-between">
              <div className="font-semibold">Manage Group</div>
              <Button variant="ghost" onClick={() => {
                setIsGroupManagementOpen(false);
                setGroupManagementQuery('');
              }}>Close</Button>
            </div>

            {(() => {
              const currentConversation = conversations.find(c => String(c._id) === String(activeId));
              if (!currentConversation) return null;

              return (
                <>
                  {/* Group Info Section */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Group Information</div>
                    <Input
                      placeholder="Group name"
                      value={currentConversation.name || ''}
                      onChange={(e) => updateGroupInfo(e.target.value, currentConversation.description || '')}
                      maxLength={120}
                    />
                    <Input
                      placeholder="Group description"
                      value={currentConversation.description || ''}
                      onChange={(e) => updateGroupInfo(currentConversation.name || '', e.target.value)}
                      maxLength={500}
                    />
                  </div>

                  {/* Members Section */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium">
                      Members ({groupManagementUsers.length})
                    </div>
                    <div className="max-h-60 overflow-auto space-y-1">
                      {groupManagementUsers.map((participant: any) => {
                        const isCurrentUser = String(participant._id) === String(user?._id);
                        return (
                          <div key={participant._id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={participant.profileImage || ''} />
                                <AvatarFallback>
                                  {(participant.fullName || participant.username || '?').slice(0,2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm">
                                  {participant.fullName || participant.username}
                                  {isCurrentUser && ' (You)'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  @{participant.username}
                                </div>
                              </div>
                            </div>
                            {!isCurrentUser && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeUserFromGroupChat(participant._id)}
                                className="text-destructive hover:text-destructive"
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add Members Section */}
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Add Members</div>
                    <Input
                      placeholder="Search users to add"
                      value={groupManagementQuery}
                      onChange={(e) => setGroupManagementQuery(e.target.value)}
                    />
                    <div className="max-h-40 overflow-auto divide-y border rounded">
                      {groupManagementQuery && allUsers
                        .filter(u =>
                          !groupManagementUsers.some(p => String(p._id) === String(u._id)) &&
                          String(u._id) !== String(user?._id) &&
                          (u.fullName?.toLowerCase().includes(groupManagementQuery.toLowerCase()) ||
                           u.username?.toLowerCase().includes(groupManagementQuery.toLowerCase()))
                        )
                        .map((u) => (
                          <button
                            key={String(u._id)}
                            className="w-full text-left p-3 hover:bg-muted flex items-center gap-3"
                            onClick={() => addUserToGroupChat(String(u._id))}
                          >
                            <img src={u.profileImage || ''} alt="" className="w-8 h-8 rounded-full bg-muted object-cover" />
                            <div>
                              <div className="font-medium text-sm">{u.fullName || u.username}</div>
                              <div className="text-xs text-muted-foreground">@{u.username}</div>
                            </div>
                          </button>
                        ))}
                      {groupManagementQuery && allUsers.filter(u =>
                        !groupManagementUsers.some(p => String(p._id) === String(u._id)) &&
                        String(u._id) !== String(user?._id) &&
                        (u.fullName?.toLowerCase().includes(groupManagementQuery.toLowerCase()) ||
                         u.username?.toLowerCase().includes(groupManagementQuery.toLowerCase()))
                      ).length === 0 && (
                        <div className="p-3 text-sm text-muted-foreground">No users found</div>
                      )}
                    </div>
                  </div>

                  {/* Group Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsGroupManagementOpen(false);
                        setGroupManagementQuery('');
                      }}
                      className="flex-1"
                    >
                      Done
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        if (!activeId) return;
                        if (confirm('Are you sure you want to leave this group?')) {
                          try {
                            const res = await chatApi.leaveGroup(activeId);
                            if (res.success) {
                              setIsGroupManagementOpen(false);
                              // Remove from conversations list
                              setConversations(prev => prev.filter(c => String(c._id) !== String(activeId)));
                              setActiveId(null);
                              alert('You have left the group.');
                            } else {
                              alert(`Failed to leave group: ${res.error || 'Unknown error'}`);
                            }
                          } catch (error) {
                            console.error('Error leaving group:', error);
                            alert('Failed to leave group. Please try again.');
                          }
                        }
                      }}
                      className="flex-1"
                    >
                      Leave Group
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

