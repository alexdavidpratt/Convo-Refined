import React, { useState, useRef, useMemo } from 'react';
import { MessageCircle, Save, Mic, StopCircle, User, Bot, Trash2, Share2 } from 'lucide-react';
import type { Topic, Response } from '../types';
import { analyzeResponse } from '../lib/gemini';
import toast from 'react-hot-toast';

interface ConversationTrackerProps {
  topics: Topic[];
  responses: Response[];
  participants: string[];
  onSaveResponse: (response: Response) => void;
  onDeleteResponse?: (responseId: string) => void;
}

export function ConversationTracker({ 
  topics = [], 
  responses = [], 
  participants = [], 
  onSaveResponse, 
  onDeleteResponse 
}: ConversationTrackerProps) {
  const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
  const [response, setResponse] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunks = useRef<Blob[]>([]);

  // Get responses for current topic only
  const currentTopicResponses = useMemo(() => {
    if (!currentTopic) return [];
    return responses
      .filter(r => r.topicId === currentTopic.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [currentTopic, responses]);

  // Collect all key points across responses for the current topic
  const allKeyPoints = useMemo(() => {
    return currentTopicResponses
      .filter(r => r.keyPoints && r.keyPoints.length > 0)
      .map(r => ({
        speaker: r.speaker,
        timestamp: r.timestamp,
        points: r.keyPoints
      }));
  }, [currentTopicResponses]);

  const startRecording = async () => {
    if (!selectedSpeaker) {
      toast.error('Please select who is speaking first');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize Web Speech API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setResponse(prev => prev + finalTranscript);
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        toast.error('Speech recognition error. Please try again.');
        stopRecording();
      };
      
      recognition.start();
      recognitionRef.current = recognition;
      
      // Initialize MediaRecorder as backup
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunks.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        chunks.current = [];
        
        // Here you could implement additional speech-to-text processing
        // using the recorded audio blob as a fallback
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not start recording. Please check your microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    toast.success('Recording stopped');
  };

  const handleSaveResponse = async () => {
    if (!selectedSpeaker) {
      toast.error('Please select who is speaking');
      return;
    }

    if (!currentTopic) {
      toast.error('Please select a topic first');
      return;
    }

    if (response.trim()) {
      setIsAnalyzing(true);
      setError(null);
      try {
        const keyPoints = await analyzeResponse(response.trim());
        const newResponse = {
          id: crypto.randomUUID(),
          topicId: currentTopic.id,
          content: response.trim(),
          timestamp: new Date(),
          keyPoints,
          speaker: selectedSpeaker,
          participants: selectedRecipients.length > 0 ? selectedRecipients.join(', ') : 'everyone'
        };
        onSaveResponse(newResponse);
        setResponse('');
        setSelectedRecipients([]);
        toast.success('Response saved and analyzed');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to analyze response';
        setError(message);
        toast.error(message);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleRecipientToggle = (participant: string) => {
    setSelectedRecipients(prev => 
      prev.includes(participant)
        ? prev.filter(p => p !== participant)
        : [...prev, participant]
    );
  };

  const handleShare = () => {
    const summary = {
      title: currentTopic?.content,
      keyPoints: allKeyPoints.flatMap(entry => entry.points),
      participants: participants,
      responses: currentTopicResponses.length
    };

    const text = `
Meeting Summary:
${summary.title}

Key Points:
${summary.keyPoints.map(point => `• ${point}`).join('\n')}

Participants: ${summary.participants.join(', ')}
Total Responses: ${summary.responses}
    `.trim();

    if (navigator.share) {
      navigator.share({
        title: 'Meeting Summary',
        text: text
      }).catch(error => {
        console.error('Error sharing:', error);
        fallbackShare(text);
      });
    } else {
      fallbackShare(text);
    }
  };

  const fallbackShare = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Summary copied to clipboard'))
      .catch(() => toast.error('Failed to copy summary'));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Discussion Topics</h3>
        {currentTopic && (
          <button
            onClick={handleShare}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Summary
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topics.map((topic) => {
          const topicResponseCount = responses.filter(r => r.topicId === topic.id).length;
          return (
            <button
              key={topic.id}
              onClick={() => setCurrentTopic(topic)}
              className={`p-4 rounded-lg text-left transition-colors ${
                currentTopic?.id === topic.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <MessageCircle className="w-5 h-5 mb-2" />
              <p>{topic.content}</p>
              <div className="mt-2 text-sm opacity-75">
                {topicResponseCount} {topicResponseCount === 1 ? 'response' : 'responses'}
              </div>
            </button>
          );
        })}
      </div>

      {currentTopic && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Discussion: {currentTopic.content}</h3>
            <div className="text-sm text-gray-500">
              {currentTopicResponses.length} {currentTopicResponses.length === 1 ? 'response' : 'responses'}
            </div>
          </div>
          
          <div className="space-y-6 mb-6">
            {currentTopicResponses.map((resp) => (
              <div 
                key={resp.id} 
                className={`flex ${resp.speaker === selectedSpeaker ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${resp.speaker === selectedSpeaker ? 'order-1' : 'order-2'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center ${
                      resp.speaker === selectedSpeaker ? 'order-2' : 'order-1'
                    }`}>
                      {resp.speaker[0].toUpperCase()}
                    </div>
                    <div className={`flex-1 ${resp.speaker === selectedSpeaker ? 'order-1' : 'order-2'}`}>
                      <div className={`rounded-lg p-3 ${
                        resp.speaker === selectedSpeaker 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-sm font-medium ${
                            resp.speaker === selectedSpeaker ? 'text-blue-50' : 'text-blue-600'
                          }`}>
                            {resp.speaker}
                          </span>
                          {resp.participants && resp.participants !== 'everyone' && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              resp.speaker === selectedSpeaker 
                                ? 'bg-blue-400 text-white' 
                                : 'bg-gray-200 text-gray-500'
                            }`}>
                              To: {resp.participants}
                            </span>
                          )}
                        </div>
                        <p>{resp.content}</p>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {new Date(resp.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
                {onDeleteResponse && (
                  <button
                    onClick={() => onDeleteResponse(resp.id)}
                    className={`p-2 text-gray-400 hover:text-red-500 transition-colors ${
                      resp.speaker === selectedSpeaker ? 'order-2 ml-2' : 'order-1 mr-2'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Speaker
              </label>
              <select
                value={selectedSpeaker}
                onChange={(e) => setSelectedSpeaker(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select who is speaking...</option>
                {participants.map((participant, index) => (
                  <option key={index} value={participant}>
                    {participant}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Speaking to
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedRecipients([])}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedRecipients.length === 0
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Everyone
                </button>
                {participants.filter(p => p !== selectedSpeaker).map((participant, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecipientToggle(participant)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedRecipients.includes(participant)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {participant}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Record your response..."
                className="w-full h-32 p-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`absolute bottom-4 right-4 p-2 rounded-full ${
                  isRecording ? 'bg-red-500' : 'bg-blue-500'
                } text-white hover:opacity-90 transition-opacity`}
              >
                {isRecording ? (
                  <StopCircle className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </button>
            </div>
            
            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded-lg mt-4">
                {error}
              </div>
            )}
            
            <button
              onClick={handleSaveResponse}
              disabled={isAnalyzing || !response.trim() || !selectedSpeaker}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              <Save className="w-5 h-5" />
              {isAnalyzing ? 'Analyzing...' : 'Save Response'}
            </button>
          </div>

          {allKeyPoints.length > 0 && (
            <div className="mt-8 border-t pt-6">
              <h4 className="text-lg font-semibold mb-4">Discussion Summary</h4>
              <div className="bg-purple-50 rounded-lg p-4">
                <ul className="space-y-2">
                  {Array.from(new Set(allKeyPoints.flatMap(entry => entry.points))).map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-purple-700">
                      <span className="font-bold">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}