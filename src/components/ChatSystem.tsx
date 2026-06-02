/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Send, FileText, UploadCloud, User as UserIcon, Paperclip, MessageSquare } from "lucide-react";
import { User, Message } from "../types";

interface ChatSystemProps {
  currentUser: User;
  token: string;
  partnerId?: string; // Optional starting recipient
}

export default function ChatSystem({ currentUser, token, partnerId }: ChatSystemProps) {
  const [contacts, setContacts] = useState<User[]>([]);
  const [activeContact, setActiveContact] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newText, setNewText] = useState("");
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load Contacts list on start
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await fetch("/api/chat/contacts", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.contacts) {
          setContacts(data.contacts);
          
          // Determine who the starting recipient should be
          if (partnerId) {
            const indexMatch = data.contacts.find((c: User) => c.id === partnerId);
            if (indexMatch) {
              setActiveContact(indexMatch);
            } else {
              try {
                // Fetch user profile from API directly if not in historical contacts list
                const uRes = await fetch(`/api/users/${partnerId}`, {
                  headers: { "Authorization": `Bearer ${token}` }
                });
                const uData = await uRes.json();
                if (uRes.ok && uData.user) {
                  setActiveContact(uData.user);
                  setContacts(prev => {
                    if (prev.some(c => c.id === uData.user.id)) return prev;
                    return [uData.user, ...prev];
                  });
                } else {
                  const mockUser = cidFallback(partnerId);
                  setActiveContact(mockUser);
                  setContacts(prev => [mockUser, ...prev]);
                }
              } catch (errU) {
                const mockUser = cidFallback(partnerId);
                setActiveContact(mockUser);
                setContacts(prev => [mockUser, ...prev]);
              }
            }
          } else if (data.contacts.length > 0) {
            setActiveContact(data.contacts[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load contacts list", err);
      }
    };

    fetchContacts();
  }, [partnerId]);

  // Fallback profiles
  const cidFallback = (id: string): User => {
    if (id === "usr_free1") {
      return { id: "usr_free1", name: "Aanya Patel", email: "aanya@pixels.dev", role: "freelancer", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150", location: "Downtown Austin, TX", isVerified: true, isBanned: false, reputationScore: 99, twoFactorEnabled: false, createdAt: "" };
    }
    if (id === "usr_free2") {
      return { id: "usr_free2", name: "Devon Cooper", email: "devon@codeminer.io", role: "freelancer", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150", location: "Downtown Austin, TX", isVerified: true, isBanned: false, reputationScore: 97, twoFactorEnabled: true, createdAt: "" };
    }
    if (id === "usr_client1") {
      return { id: "usr_client1", name: "Sophia Martinez", email: "sophia@bloomstudio.com", role: "client", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", location: "Downtown Austin, TX", isVerified: true, isBanned: false, reputationScore: 98, twoFactorEnabled: false, createdAt: "" };
    }
    return { id, name: "Liam Chen", email: "liam@techvibe.io", role: "client", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150", location: "Seattle, WA", isVerified: true, isBanned: false, reputationScore: 95, twoFactorEnabled: true, createdAt: "" };
  };

  // Lock messages list and load chats of activeContact
  useEffect(() => {
    if (!activeContact) return;

    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/chat/conversation/${activeContact.id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok && data.messages) {
          setMessages(data.messages);
        }
      } catch (err) {
        console.error("Messages list fetch failed", err);
      }
    };

    loadMessages();

    // Setup active updater poll (for real-time mock interaction!)
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [activeContact]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (fileData?: { fileName: string; fileUrl: string }) => {
    if (!activeContact || (!newText.trim() && !fileData)) return;

    const payload = {
      receiverId: activeContact.id,
      text: newText,
      fileName: fileData?.fileName,
      fileUrl: fileData?.fileUrl
    };

    setNewText("");
    
    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.message) {
        setMessages(prev => [...prev, data.message]);
        
        // Auto simulation of typing & response matching if they mention specific terms!
        if (!fileData) {
          triggerFauxTypingIndicator();
        }
      }
    } catch (err) {
      console.error("Message deliver failure", err);
    }
  };

  const triggerFauxTypingIndicator = () => {
    setTimeout(() => {
      setTyping(true);
      setTimeout(async () => {
        setTyping(false);
        // Feed mock automated answer!
        try {
          await fetch("/api/chat/message", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              receiverId: currentUser.id,
              senderId: activeContact?.id,
              text: `Acknowledged! I will monitor the SkillSphere dashboard and get back to you regarding terms soon.`
            })
          });
        } catch (e) {
          console.error(e);
        }
      }, 2500);
    }, 1000);
  };

  const selectContact = (c: User) => {
    setActiveContact(c);
  };

  // CV / PDF portfolio file share simulation
  const triggerResumePortfolioShare = () => {
    const files = [
      { name: "Aanya_Patel_UX_Portfolio_2026.pdf", url: "#" },
      { name: "Devon_Cooper_MERN_System_Architecture.pdf", url: "#" },
      { name: "Technical_Freelance_Contract_Signed.pdf", url: "#" }
    ];
    const pick = files[Math.floor(Math.random() * files.length)];
    handleSendMessage({ fileName: pick.name, fileUrl: pick.url });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 bg-white border border-green-200 rounded-xl overflow-hidden shadow-lg h-[650px] md:h-[calc(100vh-140px)] font-sans text-xs">
      
      {/* 1. CONTACTS SIDEBAR */}
      <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-green-150 bg-green-50/20 flex flex-col h-[180px] md:h-full min-h-0">
        <div className="p-4 border-b border-green-150">
          <span className="text-xs font-bold text-green-900 uppercase tracking-widest block mb-1">
            TUNNEL CHAT ROOM
          </span>
          <p className="text-[11px] text-slate-500 leading-tight">
            Encrypted stream link with active nodes.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-green-100">
          {contacts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No active secure communication streams. Open a contract node bid thread to initiate direct tunnel channels.
            </div>
          ) : (
            contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => selectContact(c)}
                className={`w-full p-4 flex items-center gap-3 text-left transition-colors ${
                  activeContact?.id === c.id ? "bg-green-100/70 text-green-900 font-semibold" : "hover:bg-green-50/40 text-slate-650"
                }`}
              >
                <div className="relative">
                  <div className="w-10 h-10 flex items-center justify-center bg-green-100 border border-green-200 rounded-lg text-green-800 text-sm font-bold flex-shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-600 border-2 border-white rounded-full" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate text-slate-800">{c.name}</div>
                  <div className="text-[10px] text-slate-500 truncate capitalize">
                    {c.title || c.role} • {c.location}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 2. MAIN MSG VIEW */}
      <div className="md:col-span-3 flex flex-col bg-slate-50/50 h-[470px] md:h-full min-h-0">
        {activeContact ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-green-200 bg-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center bg-green-10 border border-green-205 rounded-lg text-green-800 text-sm font-bold shrink-0">
                  {activeContact.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 leading-normal">{activeContact.name}</div>
                  <div className="text-[10px] font-sans text-green-700 uppercase tracking-widest font-bold">
                    ACTIVE STREAM LINK • {activeContact.role}
                  </div>
                </div>
              </div>

              <button
                onClick={triggerResumePortfolioShare}
                className="text-xs text-green-700 hover:text-green-900 px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-250 rounded-lg flex items-center gap-1.5 transition-all font-bold"
              >
                <Paperclip className="w-3.5 h-3.5" />
                Share Portfolio
              </button>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth" id="chat-messages-scroll-container" style={{ scrollbarWidth: "thin" }}>
              {messages.map((m) => {
                const isMe = m.senderId === currentUser.id;
                return (
                  <div
                    key={m.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-md rounded-xl px-4 py-2.5 text-xs relative border shadow-sm ${
                        isMe
                          ? "bg-green-600 border-green-650 text-white rounded-tr-none"
                          : "bg-white border-green-150 text-slate-700 rounded-tl-none"
                      }`}
                    >
                      {/* Document portfolio file embed */}
                      {m.fileName && (
                        <div className={`flex items-center gap-2 mb-2 p-2 rounded-lg border ${
                          isMe ? "bg-green-700 border-green-800" : "bg-green-50 border-green-150"
                        }`}>
                          <FileText className={`w-4 h-4 ${isMe ? "text-white" : "text-green-700"}`} />
                          <div className="text-left font-semibold truncate max-w-[200px]">
                            {m.fileName}
                          </div>
                        </div>
                      )}

                      <div className="text-left leading-relaxed">{m.text}</div>
                      
                      <div className={`text-[9px] mt-1.5 text-right select-none font-sans ${isMe ? "text-green-200" : "text-slate-400"}`}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing simulation */}
              {typing && (
                <div className="flex justify-start">
                  <div className="bg-white border border-green-150 text-slate-600 rounded-xl px-4 py-2 text-xs flex items-center gap-2 shadow-sm">
                    <span className="font-medium">{activeContact.name} is writing...</span>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-green-650 rounded-full animate-bounce delay-75" />
                      <div className="w-1.5 h-1.5 bg-green-650 rounded-full animate-bounce delay-150" />
                      <div className="w-1.5 h-1.5 bg-green-650 rounded-full animate-bounce delay-300" />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={bottomRef} />
            </div>

            {/* Input Box Actions */}
            <div className="p-4 border-t border-green-200 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Draft your secure node transmission safely here..."
                  className="flex-1 px-4 py-2.5 bg-green-55/10 border border-green-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-green-400 font-sans placeholder-slate-400"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center transition-colors font-bold shadow"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center p-8 text-center text-slate-400">
            <MessageSquare className="w-12 h-12 text-green-200 mb-2 animate-pulse" />
            <h3 className="text-green-800 font-bold text-sm">SECURE ACTIVE CHAT CHANNEL</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Select an ongoing node contract manager or matching gig candidate from the sidebar lists to establish an authorized private peer thread immediately.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
