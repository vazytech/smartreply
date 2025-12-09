import { useState, useEffect } from 'react';
import type { ChatMessage } from '@/lib/types';

function extractTextFromMessage(msg: ChatMessage): string {
  const textParts = msg.parts?.filter((part) => part.type === 'text');
  return textParts?.map((part) => part.text).join(' ') || '';
}

function formatMessagesForAPI(messages: ChatMessage[]) {
  return messages
    .map((msg) => ({
      role: msg.role,
      content: extractTextFromMessage(msg),
    }))
    .filter((msg) => msg.content.length > 0);
}

export function useSmartReplies({
  messages,
  status,
}: {
  messages: ChatMessage[];
  status: string;
}) {
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Only generate smart replies when:
    // 1. There are messages
    // 2. The chat is ready (not loading)
    // 3. The last message is from the assistant
    if (
      messages.length === 0 ||
      status !== 'ready' ||
      messages[messages.length - 1]?.role !== 'assistant'
    ) {
      setSmartReplies([]);
      return;
    }

    const generateSmartReplies = async () => {
      setIsGenerating(true);
      try {
        // Convert messages to simple format for API
        const formattedMessages = formatMessagesForAPI(messages);

        const response = await fetch('/api/smart-reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: formattedMessages,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setSmartReplies(data.replies || []);
        } else {
          setSmartReplies([]);
        }
      } catch (error) {
        console.error('Error generating smart replies:', error);
        setSmartReplies([]);
      } finally {
        setIsGenerating(false);
      }
    };

    generateSmartReplies();
  }, [messages, status]);

  return { smartReplies, isGenerating };
}
