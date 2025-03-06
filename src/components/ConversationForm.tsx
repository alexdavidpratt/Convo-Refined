import React, { useState } from 'react';
import { PlusCircle, MessageSquare, UserPlus, X, Calendar } from 'lucide-react';
import type { Topic } from '../types';
import { supabase } from '../lib/supabase';

interface ConversationFormProps {
  onSave: (title: string, description: string, participants: string[], topics: Topic[], scheduledDate?: string) => void;
}

export function ConversationForm({ onSave }: ConversationFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [newParticipant, setNewParticipant] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [newTopic, setNewTopic] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Get current user's name
  React.useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (profile && profile.full_name && !participants.includes(profile.full_name)) {
          setParticipants([profile.full_name]);
        }
      }
    };
    getCurrentUser();
  }, []);

  const handleAddParticipant = () => {
    if (newParticipant.trim() && !participants.includes(newParticipant.trim())) {
      setParticipants([...participants, newParticipant.trim()]);
      setNewParticipant('');
    }
  };

  const handleAddTopic = () => {
    if (newTopic.trim()) {
      setTopics([
        ...topics,
        { id: crypto.randomUUID(), content: newTopic.trim(), isCompleted: false }
      ]);
      setNewTopic('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && participants.length > 0) {
      const dateTime = scheduledDate && scheduledTime 
        ? `${scheduledDate}T${scheduledTime}` 
        : undefined;
      
      onSave(title.trim(), description.trim(), participants, topics, dateTime);
      setTitle('');
      setDescription('');
      setParticipants([]);
      setTopics([]);
      setScheduledDate('');
      setScheduledTime('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Conversation Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title for this conversation..."
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this conversation about?"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Date (optional)
            </label>
            <input
              type="date"
              id="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
              Time (optional)
            </label>
            <input
              type="time"
              id="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Participants
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newParticipant}
              onChange={(e) => setNewParticipant(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddParticipant())}
              placeholder="Add participant name..."
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAddParticipant}
              className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              <UserPlus className="w-6 h-6" />
            </button>
          </div>
          {participants.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {participants.map((participant, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800"
                >
                  {participant}
                  {index !== 0 && ( // Don't allow removing the current user
                    <button
                      type="button"
                      onClick={() => setParticipants(participants.filter((_, i) => i !== index))}
                      className="hover:text-blue-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Discussion Topics
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTopic())}
              placeholder="Add discussion topics..."
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleAddTopic}
              className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              <PlusCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <ul className="space-y-2">
          {topics.map((topic) => (
            <li
              key={topic.id}
              className="flex items-center gap-2 p-3 rounded-lg bg-gray-50"
            >
              <MessageSquare className="w-5 h-5 text-blue-500" />
              <span className="flex-1">{topic.content}</span>
              <button
                type="button"
                onClick={() => setTopics(topics.filter(t => t.id !== topic.id))}
                className="text-red-500 hover:text-red-600"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="submit"
        disabled={!title.trim() || participants.length === 0}
        className="w-full py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Create Conversation Thread
      </button>
    </form>
  );
}