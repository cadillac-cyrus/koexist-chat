import { useState } from 'react';
import { FaceSmileIcon } from '@heroicons/react/24/outline';
import { addReaction, removeReaction } from '../utils/firebaseChat';
import EmojiPicker from './EmojiPicker';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function MessageReactions({ message, chatId, currentUserId }) {
  const [showPicker, setShowPicker] = useState(false);

  if (!message || !chatId || !currentUserId) {
    return null;
  }

  const handleReaction = async (emoji) => {
    if (!message.id) {
      console.error('Message ID is missing');
      return;
    }

    const emojiString = typeof emoji === 'string' ? emoji : emoji.native;
    const reactions = message.reactions || {};
    const userReacted = reactions[emojiString]?.includes(currentUserId);

    try {
      if (userReacted) {
        await removeReaction(chatId, message.id, currentUserId, emojiString);
      } else {
        await addReaction(chatId, message.id, currentUserId, emojiString);
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const handleEmojiSelect = (emoji) => {
    handleReaction(emoji);
    setShowPicker(false);
  };

  const getReactionCount = (emoji) => {
    return (message.reactions?.[emoji] || []).length;
  };

  const hasUserReacted = (emoji) => {
    return message.reactions?.[emoji]?.includes(currentUserId) || false;
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(message.reactions || {}).map(([emoji, users]) => (
          users.length > 0 && (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className={`
                px-2 py-0.5 text-xs rounded-full
                ${hasUserReacted(emoji) 
                  ? 'bg-accent-blue text-white' 
                  : 'bg-gray-700 text-white hover:bg-gray-600'}
              `}
            >
              {emoji} {users.length}
            </button>
          )
        ))}
      </div>

      <div className="absolute -right-8 top-0">
        <div className="relative">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="p-1.5 rounded-full hover:bg-gray-700 transition-colors"
          >
            <FaceSmileIcon className="h-4 w-4 text-gray-400" />
          </button>

          {showPicker && (
            <div className="absolute right-0 z-50">
              <EmojiPicker onSelect={handleEmojiSelect} quickReactions={QUICK_REACTIONS} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
