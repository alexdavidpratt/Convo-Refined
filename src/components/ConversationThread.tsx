import React, { useMemo } from 'react';
import { MessageSquare } from 'lucide-react';

const ConversationThread = ({ topics, responses, onDeleteResponse }) => {
  // Group responses by topic
  const responsesByTopic = useMemo(() => {
    const grouped = {};
    topics.forEach(topic => {
      grouped[topic.id] = responses.filter(response => 
        response.topicId === topic.id
      ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    });
    return grouped;
  }, [topics, responses]);

  return (
    <div className="space-y-8">
      {topics.map(topic => (
        <div key={topic.id} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start gap-3 mb-4">
            <MessageSquare className="w-5 h-5 text-blue-500 mt-1" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">{topic.title}</h3>
              <p className="text-gray-600">{topic.description}</p>
            </div>
          </div>

          <div className="space-y-4 ml-8">
            {responsesByTopic[topic.id]?.length > 0 ? (
              responsesByTopic[topic.id].map(response => (
                <div key={response.id} className="group">
                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {response.participant[0].toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {response.participant}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(response.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <button
                          onClick={() => onDeleteResponse(response.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="mt-1 text-gray-700 whitespace-pre-wrap">
                        {response.content}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm italic">
                No responses for this topic yet
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConversationThread;