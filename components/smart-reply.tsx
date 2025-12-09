'use client';

import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { memo } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatMessage } from '@/lib/types';
import equal from 'fast-deep-equal';

interface SmartReplyProps {
  chatId: string;
  replies: string[];
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  isLoading: boolean;
}

function PureSmartReply({
  chatId,
  replies,
  sendMessage,
  isLoading,
}: SmartReplyProps) {
  if (isLoading || replies.length === 0) {
    return null;
  }

  return (
    <div
      data-testid="smart-replies"
      className="flex flex-wrap gap-2 w-full px-4 mx-auto max-w-3xl"
    >
      {replies.map((reply) => (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.05 * replies.indexOf(reply) }}
          key={`smart-reply-${reply}`}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              sendMessage({
                role: 'user',
                parts: [{ type: 'text', text: reply }],
              });
            }}
            className="rounded-full text-sm h-auto py-2 px-4 hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            {reply}
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SmartReply = memo(
  PureSmartReply,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) return false;
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.replies.length !== nextProps.replies.length) return false;
    if (!equal(prevProps.replies, nextProps.replies)) return false;

    return true;
  },
);
