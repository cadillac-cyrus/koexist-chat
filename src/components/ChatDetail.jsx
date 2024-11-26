import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  getDoc, 
  writeBatch, 
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  PaperAirplaneIcon, 
  ArrowLeftIcon,
  FaceSmileIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  XMarkIcon,
  UserGroupIcon,
  InformationCircleIcon,
  EllipsisVerticalIcon,
  UserPlusIcon,
  PencilIcon,
  ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { 
  sendMessage, 
  markMessagesAsRead, 
  updateTypingStatus,
  deleteMessage
} from '../utils/firebaseChat';
import _ from 'lodash';
import EmojiPicker from './EmojiPicker';
import MessageReactions from './MessageReactions';
import MessageBubble from './MessageBubble';
import { formatDistanceToNow } from 'date-fns';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import ProfilePopup from './ProfilePopup';
import { requestNotificationPermission, showNotification } from '../utils/notifications';

export default function ChatDetail() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatInfo, setChatInfo] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [otherUser, setOtherUser] = useState(null);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showGroupActions, setShowGroupActions] = useState(false);
  const [groupActionType, setGroupActionType] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const typingTimeoutRef = useRef(null);

  const getFullImageUrl = (path) => {
    if (!path) return null;
    return path.startsWith('http') ? path : `http://localhost:3001${path}`;
  };

  const handleCancel = () => {
    setIsModalOpen(false); // Or any other logic for canceling
  };

  useEffect(() => {
    if (!chatId || !user) return;

    requestNotificationPermission();

    const chatRef = doc(db, 'chats', chatId);
    const unsubChat = onSnapshot(chatRef, (doc) => {
      if (!doc.exists()) {
        console.log('Chat document not found');
        return;
      }

      const chatData = doc.data();
      console.log('Received chat data:', chatData);
      setChatInfo(chatData);

      if (chatData.type === 'group') {
        // Handle group chat
        setOtherUser({
          displayName: chatData.name,
          photoURL: null, // You can add a group photo feature later
          isGroup: true,
          participants: Object.entries(chatData.participantDetails).map(([id, details]) => ({
            uid: id,
            displayName: details.displayName || details.email?.split('@')[0],
            email: details.email,
            photoURL: details.photoURL,
            online: details.online || false,
            lastSeen: details.lastSeen || null
          }))
        });
      } else if (chatData.participants && chatData.participantDetails) {
        // Handle private chat
        const currentUserId = user?.uid;
        const otherUserId = currentUserId 
          ? chatData.participants.find(id => id !== currentUserId)
          : chatData.participants[0];

        console.log('Found other user ID:', otherUserId);

        if (otherUserId) {
          const otherUserDetails = chatData.participantDetails[otherUserId];
          console.log('Found other user details:', otherUserDetails);

          if (otherUserDetails) {
            setOtherUser({
              uid: otherUserId,
              displayName: otherUserDetails.displayName || otherUserDetails.email?.split('@')[0] || 'Unknown User',
              email: otherUserDetails.email,
              photoURL: otherUserDetails.photoURL,
              online: otherUserDetails.online || false,
              lastSeen: otherUserDetails.lastSeen || null,
              isGroup: false
            });
          }
        }
      }

      if (chatData.typing && user?.uid) {
        const typingUsers = chatData.typing;
        const someoneElseTyping = Object.entries(typingUsers).some(([uid, timestamp]) => {
          if (!timestamp || uid === user.uid) return false;
          const TYPING_TIMEOUT = 5000;
          return Date.now() - timestamp.toMillis() < TYPING_TIMEOUT;
        });
        setIsTyping(someoneElseTyping);
      } else {
        setIsTyping(false);
      }

      if (chatData.unreadMessages?.[user.uid] > 0) {
        updateDoc(chatRef, {
          [`unreadMessages.${user.uid}`]: 0
        });
      }
    }, (error) => {
      console.error('Error in chat subscription:', error);
      setIsLoading(false);
    });

    let unsubMessages;
    if (user?.uid) {
      const messagesQuery = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('timestamp', 'asc')
      );

      unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
        const newMessages = [];
        snapshot.forEach((doc) => {
          newMessages.push({ id: doc.id, ...doc.data() });
        });
        setMessages(newMessages);

        // Show notification for the latest message if it's not from the current user
        const latestMessage = newMessages[newMessages.length - 1];
        if (latestMessage && latestMessage.senderId !== user.uid) {
          const senderName = latestMessage.senderName || 'Someone';
          showNotification(`New message from ${senderName}`, {
            body: latestMessage.text || 'New message received',
            tag: chatId, // Prevent multiple notifications from the same chat
          });
        }

        if (user?.uid) {
          markMessagesAsRead(chatId, user.uid).catch(console.error);
        }
        setIsLoading(false);
      }, (error) => {
        console.error('Error in messages subscription:', error);
        setIsLoading(false);
      });
    }

    return () => {
      console.log('Cleaning up subscriptions');
      unsubChat();
      if (unsubMessages) {
        unsubMessages();
      }
    };
  }, [chatId, user?.uid, navigate]);

  const handleTyping = async (isTyping) => {
    if (!chatId || !user?.uid) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    await updateTypingStatus(chatId, user.uid, isTyping);

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(async () => {
        await updateTypingStatus(chatId, user.uid, false);
      }, 5000);
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    handleTyping(e.target.value.length > 0);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      // Create base message data
      const messageData = {
        text: newMessage.trim(),
        sender: {
          uid: user.uid,
          displayName: user.displayName
        },
        timestamp: serverTimestamp(),
        chatId: chatId // Add chatId to the message data
      };

      // Only add replyTo if it exists
      if (replyTo?.id) {
        messageData.replyTo = replyTo.id;
      }

      // Emit the message event for Pusher notification
      socket.emit('new-message', messageData);

      const chatRef = doc(db, 'chats', chatId);
      const batch = writeBatch(db);

      // Add the message
      const messageRef = doc(collection(db, 'chats', chatId, 'messages'));
      batch.set(messageRef, messageData);

      // Create base update data
      const updateData = {
        lastMessage: {
          text: newMessage.trim(),
          senderId: user.uid,
          timestamp: serverTimestamp(),
        },
        lastMessageTime: serverTimestamp(),
      };

      // Remove from archived for all participants when new message is sent
      if (chatInfo.archivedBy?.length > 0) {
        updateData.archivedBy = [];
      }

      // Increment unread count for other participants
      if (chatInfo.participants) {
        chatInfo.participants.forEach(participantId => {
          if (participantId !== user.uid) {
            updateData[`unreadMessages.${participantId}`] = (chatInfo.unreadMessages?.[participantId] || 0) + 1;
          }
        });
      }

      batch.update(chatRef, updateData);
      await batch.commit();

      setNewMessage('');
      setReplyTo(null);
      handleTyping(false);
    } catch (error) {
      console.error('Error sending message:', error);
      // Optionally show error to user
      // setError('Failed to send message');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(chatId, messageId, user.uid);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleGroupAction = async (actionType) => {
    setGroupActionType(actionType);
    setShowGroupActions(true);
  };

  const handleAddMembers = async () => {
    if (!selectedMembers.length) return;
    
    try {
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (!chatDoc.exists()) return;
      
      const chatData = chatDoc.data();
      const newParticipants = selectedMembers.map(member => member.uid);
      
      await updateDoc(chatRef, {
        participants: arrayUnion(...newParticipants),
        participantDetails: {
          ...chatData.participantDetails,
          ...Object.fromEntries(
            selectedMembers.map(member => [
              member.uid,
              {
                uid: member.uid,
                displayName: member.displayName,
                email: member.email,
                photoURL: member.photoURL
              }
            ])
          )
        }
      });
      
      setShowGroupActions(false);
      setSelectedMembers([]);
    } catch (error) {
      console.error('Error adding members:', error);
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (!chatDoc.exists()) return;
      
      const chatData = chatDoc.data();
      const { [memberId]: removedMember, ...updatedParticipantDetails } = chatData.participantDetails;
      
      await updateDoc(chatRef, {
        participants: arrayRemove(memberId),
        participantDetails: updatedParticipantDetails
      });
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const handleChangeGroupName = async () => {
    if (!newGroupName.trim()) return;
    
    try {
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        groupName: newGroupName.trim()
      });
      
      setShowGroupActions(false);
      setNewGroupName('');
    } catch (error) {
      console.error('Error changing group name:', error);
    }
  };

  const handleLeaveGroup = async () => {
    try {
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (!chatDoc.exists()) return;
      
      const chatData = chatDoc.data();
      const { [user.uid]: removedUser, ...updatedParticipantDetails } = chatData.participantDetails;
      
      await updateDoc(chatRef, {
        participants: arrayRemove(user.uid),
        participantDetails: updatedParticipantDetails
      });
      
      navigate('/');
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-dark-primary">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-header-content">
          <button
            onClick={() => navigate('/chats')}
            className="chat-header-button"
            aria-label="Back to chats"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>

          <button
            onClick={() => !otherUser?.isGroup && setShowProfilePopup(true)}
            className="chat-header-user"
          >
            <div className="chat-header-avatar">
              {otherUser?.isGroup ? (
                <>
                  <div className="chat-header-group-icon">
                    <UserGroupIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="chat-header-member-count">
                    <span className="text-xs text-white font-medium">
                      {otherUser.participants?.length || 0}
                    </span>
                  </div>
                </>
              ) : otherUser?.photoURL ? (
                <img
                  src={getFullImageUrl(otherUser.photoURL)}
                  alt={otherUser.displayName}
                  className="chat-header-avatar-image"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                  }}
                />
              ) : (
                <UserCircleIcon className="chat-header-avatar-image text-gray-400" />
              )}
            </div>
            <div className="chat-header-info">
              <div className="chat-header-name-container">
                <h2 className="chat-header-name">
                  {otherUser?.isGroup ? chatInfo?.groupName || 'Group Chat' : otherUser?.displayName || 'Loading...'}
                </h2>
                {!otherUser?.isGroup && (
                  <span className={`online-indicator ${otherUser?.online ? 'bg-green-400' : 'bg-gray-400'}`} />
                )}
              </div>
              {otherUser?.isGroup ? (
                <p className="chat-header-status">
                  {otherUser.participants?.length || 0} members
                </p>
              ) : (
                <p className={`chat-header-status ${isTyping ? 'typing' : ''}`}>
                  {isTyping ? 'typing...' : otherUser?.online ? 'online' : 'offline'}
                </p>
              )}
            </div>
          </button>

          <div className="chat-header-actions">
            {otherUser?.isGroup && (
              <>
                <button
                  onClick={() => setShowGroupInfo(true)}
                  className="chat-header-button"
                  title="Group Info"
                >
                  <InformationCircleIcon className="h-5 w-5" />
                </button>
                {chatInfo?.groupSettings?.canChangeGroupName && (
                  <button
                    onClick={() => setShowGroupActions(true)}
                    className="chat-header-button"
                    title="Group Actions"
                  >
                    <EllipsisVerticalIcon className="h-5 w-5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Profile Popup */}
      {showProfilePopup && otherUser && !otherUser.isGroup && (
        <ProfilePopup 
          userId={otherUser.uid} 
          onClose={() => setShowProfilePopup(false)} 
        />
      )}

      {/* Group Info Modal */}
      {showGroupInfo && otherUser?.isGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Group Info</h2>
              <button
                onClick={() => setShowGroupInfo(false)}
                className="text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400">Members</h3>
                <div className="mt-2 space-y-2">
                  {otherUser.participants?.map(participant => (
                    <div key={participant.uid} className="flex items-center space-x-3">
                      {participant.photoURL ? (
                        <img
                          src={getFullImageUrl(participant.photoURL)}
                          alt={participant.displayName}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <UserCircleIcon className="h-8 w-8 text-gray-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">
                          {participant.displayName}
                          {participant.uid === user.uid && " (You)"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {participant.online ? "Online" : "Offline"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Actions Modal */}
      {showGroupActions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowGroupActions(false)}></div>
          <div className="relative w-full max-w-lg glass-panel rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Group Actions</h3>
            
            <div className="space-y-4">
              {chatInfo?.groupSettings?.canAddMembers && (
                <button
                  onClick={() => handleGroupAction('add')}
                  className="w-full flex items-center px-4 py-3 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <UserPlusIcon className="h-5 w-5 mr-3" />
                  Add Members
                </button>
              )}
              
              {chatInfo?.groupSettings?.canChangeGroupName && (
                <button
                  onClick={() => handleGroupAction('rename')}
                  className="w-full flex items-center px-4 py-3 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <PencilIcon className="h-5 w-5 mr-3" />
                  Change Group Name
                </button>
              )}
              
              {chatInfo?.groupSettings?.canLeaveGroup && (
                <button
                  onClick={handleLeaveGroup}
                  className="w-full flex items-center px-4 py-3 rounded-xl text-red-400 hover:bg-white/10 transition-colors"
                >
                  <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-3" />
                  Leave Group
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-gray-500">
            No messages yet
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwnMessage={message.sender?.uid === user?.uid}
              onDelete={() => handleDeleteMessage(message.id)}
              onReply={() => setReplyTo(message)}
              showReplyButton={!message.deleted}
              replyToMessage={message.replyTo ? messages.find(m => m.id === message.replyTo) : null}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <div className="px-4 py-2 bg-gray-800 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ArrowUturnLeftIcon className="h-4 w-4 mr-2 text-accent-blue" />
              <span className="text-sm text-gray-400">
                Replying to {replyTo.sender?.displayName || 'message'}
              </span>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="text-gray-400 hover:text-white"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-1 text-sm text-gray-300 truncate">
            {replyTo.text}
          </div>
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-gray-400 hover:text-white"
          >
            <FaceSmileIcon className="h-6 w-6" />
          </button>

          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message"
            className="flex-1 bg-gray-700 text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue"
          />

          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="text-accent-blue hover:text-blue-400 disabled:opacity-50 disabled:hover:text-accent-blue"
          >
            <PaperAirplaneIcon className="h-6 w-6" />
          </button>
        </div>

        {showEmojiPicker && (
          <div className="absolute bottom-20 right-4">
            <EmojiPicker
              onSelect={(emoji) => {
                setNewMessage(prev => prev + emoji.native);
                setShowEmojiPicker(false);
              }}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}
      </form>
    </div>
  );
}
