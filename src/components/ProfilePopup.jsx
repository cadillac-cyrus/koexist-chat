import React, { useEffect, useState } from 'react';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { UserCircleIcon, XMarkIcon } from '@heroicons/react/24/solid';

const ProfilePopup = ({ userId, onClose }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const db = getFirestore();
        const userDoc = await getDoc(doc(db, 'users', userId));
        
        if (userDoc.exists()) {
          setProfileData(userDoc.data());
        } else {
          setError('User not found');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [userId]);

  const getFullImageUrl = (path) => {
    if (!path) return null;
    return path.startsWith('https') ? path : `https://koexist-server.onrender.com${path}`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 relative animate-fade-in">
          <div className="text-white text-center">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 relative animate-fade-in">
          <div className="text-red-400 text-center">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 relative animate-fade-in" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        <div className="text-center mb-6">
          <div className="relative inline-block">
            {profileData?.photoURL ? (
              <img
                src={getFullImageUrl(profileData.photoURL)}
                alt={profileData.displayName}
                className="w-24 h-24 rounded-full object-cover border-4 border-accent-blue mx-auto"
                onError={(e) => {
                  console.error('Image failed to load:', profileData.photoURL);
                  e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                }}
              />
            ) : (
              <UserCircleIcon className="w-24 h-24 text-gray-400 mx-auto" />
            )}
            <div className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-gray-800 ${
              profileData?.online ? 'bg-green-500' : 'bg-gray-500'
            }`} />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-white text-center mb-1">
              {profileData?.displayName || 'No display name'}
            </h2>
            <p className="text-sm text-gray-400 text-center">
              {profileData?.online ? 'Online' : 'Offline'}
            </p>
          </div>

          {profileData?.bio && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Bio</h3>
              <p className="text-white text-sm">{profileData.bio}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePopup;
