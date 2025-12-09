import { auth } from '@/app/(auth)/auth';
import { ChatSDKError } from '@/lib/errors';
import { myProvider } from '@/lib/ai/providers';
import { generateText } from 'ai';
import { z } from 'zod';

const requestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    }),
  ),
});

/**
 * Parses AI-generated text to extract suggestion strings.
 * Tries to parse as JSON first, then falls back to line-by-line extraction.
 * Removes common formatting like quotes, numbers, dashes, and list markers.
 */
function parseSuggestionsFromText(text: string): string[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !line.startsWith('[') &&
        !line.startsWith(']') &&
        !line.startsWith('{') &&
        !line.startsWith('}'),
    )
    .map((line) => line.replace(/^["\-\d.]+\s*/, '').replace(/["]+$/, ''))
    .slice(0, 3);

  return lines;
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:api').toResponse();
    }

    const json = await request.json();
    const { messages } = requestSchema.parse(json);

    // Get the last few messages for context (up to 5 messages)
    const recentMessages = messages.slice(-5);

    // Use AI to generate contextual smart reply suggestions
    const { text } = await generateText({
      model: myProvider.languageModel('chat-model'),
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that generates smart reply suggestions. 
Given a conversation context, generate 3 short, contextually relevant reply options that a user might want to send.
Each reply should be concise (3-7 words), natural, and directly related to the last assistant message.
Return the suggestions as a JSON array of strings, like: ["suggestion 1", "suggestion 2", "suggestion 3"]
Make the suggestions diverse - include a follow-up question, an acknowledgment, and a request for more details.`,
        },
        ...recentMessages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        {
          role: 'user',
          content:
            'Generate 3 smart reply suggestions based on this conversation.',
        },
      ],
      temperature: 0.7,
    });

    // Try to parse the AI response as JSON
    try {
      const suggestions = JSON.parse(text);
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        return Response.json({ replies: suggestions.slice(0, 3) });
      }
    } catch (parseError) {
      // If JSON parsing fails, extract suggestions from text line by line
      const lines = parseSuggestionsFromText(text);
      if (lines.length > 0) {
        return Response.json({ replies: lines });
      }
    }

    // Fallback suggestions if AI generation fails
    return Response.json({
      replies: [
        'Tell me more',
        'That makes sense',
        'What about alternatives?',
      ],
    });
  } catch (error) {
    console.error('Error generating smart replies:', error);
    return new ChatSDKError('offline:api', 'Failed to generate smart replies').toResponse();
  }
}
