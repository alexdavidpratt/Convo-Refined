import React, { useState, useEffect } from 'react';
import { Brain, Clock, MessageSquare, Trash2, Plus, Archive } from 'lucide-react';
import { ConversationForm } from './components/ConversationForm';
import { ConversationTracker } from './components/ConversationTracker';
import { Auth } from './components/Auth';
import { supabase } from './lib/supabase';
import type { Topic, Response, Conversation } from './types';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

export default function App() {
  const [session, setSession] = useState(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showConversationList, setShowConversationList] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchConversations();
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Failed to load conversations');
      return;
    }
    
    const sanitizedData = (data || []).map(conv => ({
      ...conv,
      topics: conv.topics || [],
      responses: conv.responses || [],
      participants: conv.participants || [],
      images: conv.images || []
    }));

    setConversations(sanitizedData);
  };

  const handleStartConversation = async (title: string, description: string, participants: string[], topics: Topic[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const newConversation = {
      title,
      description,
      participants,
      user_id: user.id,
      topics,
      responses: [],
      images: []
    };

    const { error } = await supabase
      .from('conversations')
      .insert([newConversation]);

    if (error) {
      console.error('Error saving conversation:', error);
      toast.error('Failed to create conversation');
      return;
    }

    toast.success('Conversation created successfully');
    fetchConversations();
    setShowNewConversation(false);
  };

  const handleDeleteConversation = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this conversation?');
    if (!confirmed) return;

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
      return;
    }

    toast.success('Conversation deleted');
    fetchConversations();
    if (currentConversation?.id === id) {
      setCurrentConversation(null);
    }
  };

  const handleSaveResponse = async (response: Response) => {
    if (!currentConversation) return;

    const updatedResponses = [...(currentConversation.responses || []), response];
    const updatedConversation = {
      ...currentConversation,
      responses: updatedResponses
    };

    const { error } = await supabase
      .from('conversations')
      .update({ responses: updatedResponses })
      .eq('id', currentConversation.id);

    if (error) {
      console.error('Error saving response:', error);
      toast.error('Failed to save response');
      return;
    }

    setCurrentConversation(updatedConversation);
    setConversations(conversations.map(conv => 
      conv.id === currentConversation.id ? updatedConversation : conv
    ));
    toast.success('Response saved successfully');
  };

  const handleDeleteResponse = async (responseId: string) => {
    if (!currentConversation) return;

    const confirmed = window.confirm('Are you sure you want to delete this response?');
    if (!confirmed) return;

    const updatedResponses = currentConversation.responses.filter(r => r.id !== responseId);
    const updatedConversation = {
      ...currentConversation,
      responses: updatedResponses
    };

    const { error } = await supabase
      .from('conversations')
      .update({ responses: updatedResponses })
      .eq('id', currentConversation.id);

    if (error) {
      console.error('Error deleting response:', error);
      toast.error('Failed to delete response');
      return;
    }

    toast.success('Response deleted');
    setCurrentConversation(updatedConversation);
    setConversations(conversations.map(conv => 
      conv.id === currentConversation.id ? updatedConversation : conv
    ));
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setCurrentConversation(conversation);
    setShowConversationList(false); // Hide the conversation list when a conversation is selected
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!session) {
    return <Auth onAuthSuccess={() => fetchConversations()} />;
  }

  if (!showNewConversation && !showConversationList && !currentConversation) {
    const recentConversations = conversations.slice(0, 3);

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-8 h-8 text-blue-500" />
                <h1 className="text-2xl font-bold text-gray-900">CONVO</h1>
              </div>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-6">
              <div className="bg-blue-500 p-6 rounded-full">
                <Brain className="w-16 h-16 text-white" />
              </div>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Remember Every Important Conversation
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12">
              CONVO helps you capture, analyze, and recall key moments from your important discussions,
              ensuring no valuable insight is ever lost.
            </p>
            
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowNewConversation(true)}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Start New Conversation
              </button>
              <button
                onClick={() => setShowConversationList(true)}
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
              >
                <Archive className="w-5 h-5 mr-2" />
                View Past Conversations
              </button>
            </div>
          </div>

          {recentConversations.length > 0 && (
            <div className="mt-16">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Recent Conversations</h3>
                <button
                  onClick={() => setShowConversationList(true)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View all
                </button>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                {recentConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                  >
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-medium text-gray-900">{conv.title}</h4>
                        <span className="flex items-center text-sm text-gray-500">
                          <Clock className="w-4 h-4 mr-1" />
                          {new Date(conv.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {conv.description && (
                        <p className="text-gray-600 mb-3 line-clamp-2">{conv.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          <span>{conv.topics?.length || 0} topics</span>
                        </div>
                        <span>•</span>
                        <span>{conv.responses?.length || 0} responses</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-8 h-8 text-blue-500" />
              <h1 className="text-2xl font-bold text-gray-900">CONVO</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setCurrentConversation(null);
                  setShowNewConversation(false);
                  setShowConversationList(false);
                }}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Back to Home
              </button>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {showNewConversation ? (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-4">Start a New Conversation Thread</h2>
            <ConversationForm onSave={handleStartConversation} />
          </div>
        ) : showConversationList ? (
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Your Conversations</h2>
              <button
                onClick={() => setShowNewConversation(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Conversation
              </button>
            </div>
            
            <div className="space-y-4">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div
                    onClick={() => handleSelectConversation(conv)}
                    className="w-full p-6 text-left cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{conv.title}</h4>
                      <span className="flex items-center text-sm text-gray-500">
                        <Clock className="w-4 h-4 mr-1" />
                        {new Date(conv.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {conv.description && (
                      <p className="text-gray-600 mb-3">{conv.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>{conv.topics?.length || 0} topics</span>
                      </div>
                      <span>•</span>
                      <span>{conv.responses?.length || 0} responses</span>
                      <span>•</span>
                      <span>{conv.participants?.length || 0} participants</span>
                    </div>
                  </div>
                  <div className="px-6 py-3 border-t border-gray-100">
                    <button
                      onClick={() => handleDeleteConversation(conv.id)}
                      className="text-red-500 hover:text-red-600 flex items-center gap-1 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Conversation
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : currentConversation && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">{currentConversation.title}</h2>
                {currentConversation.description && (
                  <p className="text-gray-600 mt-1">{currentConversation.description}</p>
                )}
                <div className="flex gap-2 mt-2">
                  {currentConversation.participants?.map((participant, index) => (
                    <span
                      key={index}
                      className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-sm"
                    >
                      {participant}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  setCurrentConversation(null);
                  setShowConversationList(true);
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Back to Conversations
              </button>
            </div>
            <ConversationTracker
              topics={currentConversation.topics || []}
              responses={currentConversation.responses || []}
              participants={currentConversation.participants || []}
              onSaveResponse={handleSaveResponse}
              onDeleteResponse={handleDeleteResponse}
            />
          </div>
        )}
      </main>
    </div>
  );
}