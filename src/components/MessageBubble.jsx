import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import {
  CheckIcon,
  CheckCircleIcon,
  TrashIcon,
  ArrowUturnLeftIcon
} from '@heroicons/react/24/solid';
import MessageReactions from './MessageReactions';
import DeleteConfirmDialog from './DeleteConfirmDialog';

export default function MessageBubble({ 
  message, 
  isOwnMessage, 
  onDelete, 
  onReply, 
  showReplyButton = true,
  replyToMessage = null 
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { user } = useAuth();
  const timestamp = message?.timestamp?.toDate();

  const getMessageStatus = () => {
    if (!message || message.deleted) return null;
    
    if (Object.keys(message.readBy || {}).length > 0) {
      return (
        <CheckCircleIcon 
          className="h-4 w-4 text-blue-500" 
          title="Read"
        />
      );
    }
    
    if (message.status === 'sent') {
      return (
        <CheckIcon 
          className="h-4 w-4 text-gray-400" 
          title="Sent"
        />
      );
    }
    
    return null;
  };

  if (!message) {
    return null;
  }

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4 relative group`}>
      <div
        className={`
          relative max-w-sm px-4 py-2 rounded-lg shadow
          ${isOwnMessage ? 'bg-accent-blue text-white' : 'bg-gray-700 text-white'}
          ${message.deleted ? 'italic opacity-50' : ''}
        `}
      >
        {!isOwnMessage && message.sender && !message.deleted && (
          <div className="text-xs text-blue-400 mb-1 font-medium">
            {message.sender.displayName || 'Unknown User'}
          </div>
        )}
        {replyToMessage && (
          <div className="mb-2 text-sm border-l-4 border-gray-500 pl-2 py-1 opacity-75">
            <div className="font-medium">
              {replyToMessage.sender?.displayName || 'User'}
            </div>
            <div className="truncate">
              {replyToMessage.text || 'Message unavailable'}
            </div>
          </div>
        )}

        <div className="flex items-end gap-2">
          <p className="text-sm break-words">
            {message.deleted ? "This message was deleted" : (message.text || 'Message unavailable')}
          </p>
          <div className="flex items-center gap-1 text-xs opacity-75">
            {timestamp && (
              <span className="ml-2">
                {format(timestamp, 'HH:mm')}
              </span>
            )}
            {isOwnMessage && getMessageStatus()}
          </div>
        </div>

        {!message.deleted && (
          <div className={`
            absolute top-0 ${isOwnMessage ? 'left-0' : 'right-0'} transform ${isOwnMessage ? '-translate-x-full' : 'translate-x-full'}
            flex items-center gap-2 px-2 opacity-0 group-hover:opacity-100 transition-opacity
          `}>
            {showReplyButton && (
              <button
                onClick={() => onReply(message)}
                className="p-1 rounded-full hover:bg-gray-700 transition-colors"
                title="Reply"
              >
                <ArrowUturnLeftIcon className="h-4 w-4 text-gray-300" />
              </button>
            )}
            {isOwnMessage && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1 rounded-full hover:bg-gray-700 transition-colors"
                title="Delete"
              >
                <TrashIcon className="h-4 w-4 text-gray-300" />
              </button>
            )}
          </div>
        )}

        <MessageReactions message={message} />
      </div>

      <DeleteConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete(message.id);
          setShowDeleteConfirm(false);
        }}
      />
    </div>
  );
}
