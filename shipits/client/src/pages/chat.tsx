import React, { useEffect, useMemo, useRef, useState } from 'react';
import { chatApi, usersApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Input } from '@/components/ui/input';
import TranslatedMarkdown from '@/components/TranslatedMarkdown';

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
        }
      } catch {}
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
      }
    } catch (_e) {
      // ignore
    }
  };

  // DM picker state
  const [isDmOpen, setIsDmOpen] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [recentContacts, setRecentContacts] = useState<any[]>([]);

  useEffect(() => {
    const id = setTimeout(async () => {
      if (!isDmOpen) return;
      try {
        if (userQuery) {
          const res = await usersApi.searchUsers(userQuery, 10);
          if (res.success && res.data) setUserResults(res.data.items);
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
        }
      } catch (e) {
        console.error('Error loading users for DM:', e);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [userQuery, isDmOpen]);

  const startDm = async (targetId: string) => {
    const res = await chatApi.createConversation({ type: 'dm', participants: [targetId] } as any);
    if (res.success && res.data) {
      setConversations((prev) => [res.data.conversation, ...prev]);
      setActiveId(String(res.data.conversation._id));
      setIsDmOpen(false);
      setUserQuery('');
      setUserResults([]);
    }
  };

  return (
    <div className="flex h-screen">
      <div className="w-full sm:w-72 border-r p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold">Chats</div>
          <div className="flex gap-2">
            <Link href="/">
              <Button size="sm" variant="ghost">Home</Button>
            </Link>
            {isAuthenticated ? (
              <Button size="sm" onClick={() => setIsDmOpen(true)}>New DM</Button>
            ) : (
              <Link href="/profile">
                <Button size="sm" variant="outline">Sign in to DM</Button>
              </Link>
            )}
          </div>
        </div>
        <div className="space-y-1 overflow-auto">
          {conversations.map((c) => (
            <button
              key={String(c._id)}
              onClick={() => { setActiveId(String(c._id)); setShowMessagesMobile(true); }}
              className={`w-full text-left px-2 py-1 rounded ${activeId===String(c._id)?'bg-muted':'hover:bg-muted'}`}
            >
              <div className="text-sm font-medium">{c.name || (c.type==='dm' ? 'Direct Message' : 'Group Chat')}</div>
              <div className="text-xs text-muted-foreground">{new Date(c.updatedAt).toLocaleString()}</div>
            </button>
          ))}
        </div>
      </div>
      <div className={`${showMessagesMobile ? 'flex' : 'hidden'} sm:flex flex-1 flex-col`}>
        {/* Mobile header with back button */}
        <div className="sm:hidden border-b p-3 flex items-center gap-2">
          <Button variant="ghost" onClick={() => setShowMessagesMobile(false)}>Back</Button>
          <div className="font-medium">Conversation</div>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {messages.map((m) => (
            <div key={m._id} className={`max-w-xl ${m.senderId===user?._id? 'ml-auto text-right':''}`}>
              <div className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleTimeString()}</div>
              <div className="inline-block bg-secondary rounded px-3 py-2 text-left">
                <TranslatedMarkdown
                  sourceType="message"
                  sourceId={String(m._id)}
                  field="content"
                  text={m.content || ''}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t p-3 flex gap-2">
          <Input placeholder="Type a message" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter'){ send(); } }} />
          <Button onClick={send}>Send</Button>
        </div>
      </div>

      {isDmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-4 z-50">
          <div className="bg-background w-full max-w-lg rounded-lg shadow-lg p-4 flex flex-col gap-3">
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
    </div>
  );
}

