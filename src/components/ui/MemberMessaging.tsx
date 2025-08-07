'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Send, 
  Search, 
  Filter, 
  Plus, 
  Archive,
  Trash2,
  Clock,
  User,
  Building,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  MailOpen
} from 'lucide-react';

interface Message {
  id: string;
  sender: {
    id: string;
    name: string;
    email: string;
    company?: string;
    memberType: string;
  };
  recipient: {
    id: string;
    name: string;
    email: string;
    company?: string;
    memberType: string;
  };
  subject?: string;
  content: string;
  messageType: string;
  isRead: boolean;
  readAt?: string;
  priority: string;
  threadId?: string;
  isArchived: boolean;
  createdAt: string;
}

interface MemberMessagingProps {
  onComposeMessage?: () => void;
  onViewMessage?: (messageId: string) => void;
  onViewThread?: (threadId: string) => void;
}

const MESSAGE_TYPES = [
  { value: 'all', label: 'All Messages' },
  { value: 'sent', label: 'Sent' },
  { value: 'received', label: 'Received' },
];

const PRIORITY_COLORS = {
  LOW: 'bg-gray-100 text-gray-800',
  NORMAL: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};

export function MemberMessaging({ 
  onComposeMessage, 
  onViewMessage,
  onViewThread 
}: MemberMessagingProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchMessages();
  }, [selectedType, unreadOnly, page]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        type: selectedType,
        page: page.toString(),
        limit: '20',
        ...(unreadOnly && { unreadOnly: 'true' }),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/community/messages?${params}`);
      if (!response.ok) throw new Error('Failed to fetch messages');

      const data = await response.json();
      setMessages(data.messages);
      setTotalPages(data.pagination.totalPages);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMessages();
  };

  const handleMarkAsRead = async (messageId: string, isRead: boolean) => {
    try {
      const response = await fetch(`/api/community/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead }),
      });

      if (!response.ok) throw new Error('Failed to update message');

      // Update the message in the list
      setMessages(prev => prev.map(message => 
        message.id === messageId 
          ? { ...message, isRead, readAt: isRead ? new Date().toISOString() : undefined }
          : message
      ));

      // Update unread count
      if (isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        setUnreadCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error updating message:', error);
    }
  };

  const handleArchive = async (messageId: string, isArchived: boolean) => {
    try {
      const response = await fetch(`/api/community/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived }),
      });

      if (!response.ok) throw new Error('Failed to archive message');

      // Remove from current view if archiving
      if (isArchived) {
        setMessages(prev => prev.filter(message => message.id !== messageId));
      }
    } catch (error) {
      console.error('Error archiving message:', error);
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      const response = await fetch(`/api/community/messages/${messageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete message');

      // Remove from current view
      setMessages(prev => prev.filter(message => message.id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleBulkAction = async (action: 'read' | 'unread' | 'archive' | 'delete') => {
    if (selectedMessages.size === 0) return;

    const messageIds = Array.from(selectedMessages);
    
    try {
      const promises = messageIds.map(messageId => {
        switch (action) {
          case 'read':
            return handleMarkAsRead(messageId, true);
          case 'unread':
            return handleMarkAsRead(messageId, false);
          case 'archive':
            return handleArchive(messageId, true);
          case 'delete':
            return handleDelete(messageId);
          default:
            return Promise.resolve();
        }
      });

      await Promise.all(promises);
      setSelectedMessages(new Set());
    } catch (error) {
      console.error('Error performing bulk action:', error);
    }
  };

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const selectAllMessages = () => {
    if (selectedMessages.size === messages.length) {
      setSelectedMessages(new Set());
    } else {
      setSelectedMessages(new Set(messages.map(m => m.id)));
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const getPriorityColor = (priority: string) => {
    return PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.NORMAL;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-16 bg-gray-200 rounded mb-4"></div>
              <div className="flex justify-between">
                <div className="h-3 bg-gray-200 rounded w-32"></div>
                <div className="flex space-x-2">
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Messages</h2>
          <p className="text-gray-600">
            Communicate directly with fellow NAMC members
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-red-100 text-red-800">
                {unreadCount} unread
              </Badge>
            )}
          </p>
        </div>
        {onComposeMessage && (
          <Button onClick={onComposeMessage} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Compose Message
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </form>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {MESSAGE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="unreadOnly"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="unreadOnly" className="ml-2 text-sm text-gray-700">
                Show unread only
              </label>
            </div>
          </div>
        )}
      </Card>

      {/* Bulk Actions */}
      {selectedMessages.size > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {selectedMessages.size} message{selectedMessages.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('read')}
              >
                <MailOpen className="h-4 w-4 mr-1" />
                Mark Read
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('unread')}
              >
                <Mail className="h-4 w-4 mr-1" />
                Mark Unread
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('archive')}
              >
                <Archive className="h-4 w-4 mr-1" />
                Archive
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('delete')}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Messages List */}
      <div className="space-y-2">
        {messages.length === 0 ? (
          <Card className="p-8 text-center">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No messages found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search terms or filters.' : 'Your inbox is empty.'}
            </p>
            {onComposeMessage && (
              <Button onClick={onComposeMessage}>
                Send Your First Message
              </Button>
            )}
          </Card>
        ) : (
          <>
            {/* Select All Header */}
            <Card className="p-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedMessages.size === messages.length && messages.length > 0}
                  onChange={selectAllMessages}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">
                  Select all messages
                </span>
              </div>
            </Card>

            {messages.map((message) => {
              const isCurrentUserSender = message.sender.id === session?.user?.id;
              const otherParty = isCurrentUserSender ? message.recipient : message.sender;
              
              return (
                <Card 
                  key={message.id} 
                  className={`p-4 hover:shadow-md transition-shadow cursor-pointer ${
                    !message.isRead && !isCurrentUserSender ? 'bg-blue-50 border-blue-200' : ''
                  } ${selectedMessages.has(message.id) ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => onViewMessage?.(message.id)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedMessages.has(message.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleMessageSelection(message.id);
                      }}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className={`text-sm ${!message.isRead && !isCurrentUserSender ? 'font-semibold' : 'font-medium'}`}>
                              {isCurrentUserSender ? `To: ${otherParty.name}` : `From: ${otherParty.name}`}
                            </span>
                          </div>
                          {otherParty.company && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <Building className="h-3 w-3" />
                              <span className="text-xs">{otherParty.company}</span>
                            </div>
                          )}
                          {message.priority !== 'NORMAL' && (
                            <Badge className={getPriorityColor(message.priority)}>
                              {message.priority}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimeAgo(message.createdAt)}</span>
                        </div>
                      </div>
                      
                      {message.subject && (
                        <h4 className={`text-sm mb-1 ${!message.isRead && !isCurrentUserSender ? 'font-semibold' : 'font-medium'}`}>
                          {message.subject}
                        </h4>
                      )}
                      
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {message.content}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {message.threadId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewThread?.(message.threadId!);
                              }}
                              className="text-xs"
                            >
                              <MessageCircle className="h-3 w-3 mr-1" />
                              View Thread
                            </Button>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {!isCurrentUserSender && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(message.id, !message.isRead);
                              }}
                              className="text-xs"
                            >
                              {message.isRead ? (
                                <>
                                  <Mail className="h-3 w-3 mr-1" />
                                  Mark Unread
                                </>
                              ) : (
                                <>
                                  <MailOpen className="h-3 w-3 mr-1" />
                                  Mark Read
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchive(message.id, true);
                            }}
                            className="text-xs"
                          >
                            <Archive className="h-3 w-3 mr-1" />
                            Archive
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(message.id);
                            }}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 py-2 text-sm text-gray-700">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}