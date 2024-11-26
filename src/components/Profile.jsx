import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, getFirestore, onSnapshot } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { UserCircleIcon, CameraIcon } from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';
import { saveImageToServer, getImagePath } from '../utils/imageUtils';

export default function Profile({ userId }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [bio, setBio] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profileData, setProfileData] = useState(null);
  const db = getFirestore();

  const isOwnProfile = !userId || userId === user?.uid;

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const userRef = doc(db, 'users', userId || user.uid);
        const unsubscribe = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            setProfileData(data);
            if (isOwnProfile) {
              setDisplayName(data.displayName || '');
              setBio(data.bio || '');
            }
          }
        });

        return () => unsubscribe();
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile data');
      }
    };

    if (user || userId) {
      fetchProfileData();
    }
  }, [user, userId, db, isOwnProfile]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      setError('');

      // Save image to server
      const imagePath = await saveImageToServer(file, user.uid);
      console.log('Saved image path:', imagePath);

      // Update auth profile
      await updateProfile(user, {
        photoURL: imagePath
      });

      // Update Firestore user document with the image path
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        photoURL: imagePath
      });

      setPhotoURL(imagePath);
      setSuccess('Profile photo updated successfully!');
    } catch (err) {
      console.error('Error updating profile photo:', err);
      setError('Failed to update profile photo. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getFullImageUrl = (path) => {
    if (!path) return null;
    return path.startsWith('https') ? path : `https://koexist-server.onrender.com${path}`;
  };

  const displayPhotoURL = getFullImageUrl(photoURL || profileData?.photoURL);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display name cannot be empty');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await updateProfile(user, {
        displayName: displayName.trim()
      });

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        bio: bio.trim()
      });

      setIsEditing(false);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!profileData) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-gray-400">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-white">
            {isOwnProfile ? 'Profile Settings' : `${profileData.displayName}'s Profile`}
          </h1>
          {!isOwnProfile && (
            <button
              onClick={() => navigate(`/chat/${userId}`)}
              className="button-primary px-4 py-2"
            >
              Send Message
            </button>
          )}
        </div>

        {/* Profile Photo Section */}
        <div className="mb-8 text-center">
          <div className="relative inline-block">
            {displayPhotoURL ? (
              <img
                src={displayPhotoURL}
                alt={profileData?.displayName || 'Profile'}
                className="w-32 h-32 rounded-full object-cover border-4 border-accent-blue"
                onError={(e) => {
                  console.error('Image failed to load:', displayPhotoURL);
                  e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                }}
              />
            ) : (
              <UserCircleIcon className="w-32 h-32 text-gray-400" />
            )}
            {isOwnProfile && (
              <label className="absolute bottom-0 right-0 bg-accent-blue p-2 rounded-full cursor-pointer hover:bg-blue-600 transition-colors">
                <CameraIcon className="h-5 w-5 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Display Name
            </label>
            {isOwnProfile && isEditing ? (
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                placeholder="Enter your display name"
              />
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-white">
                  {profileData.displayName || 'No display name set'}
                </span>
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="button-secondary px-4 py-2"
                  >
                    Edit
                  </button>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Bio
            </label>
            {isOwnProfile && isEditing ? (
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                placeholder="Tell us about yourself"
                rows={3}
              />
            ) : (
              <div className="text-white bg-gray-700 rounded-lg px-4 py-2 min-h-[4rem]">
                {profileData.bio || 'No bio yet'}
              </div>
            )}
          </div>

          {isOwnProfile && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <div className="text-white bg-gray-700 rounded-lg px-4 py-2">
                {user.email}
              </div>
            </div>
          )}

          {/* Error and Success Messages */}
          {error && (
            <div className="text-red-400 text-sm mt-2">{error}</div>
          )}
          {success && (
            <div className="text-green-400 text-sm mt-2">{success}</div>
          )}

          {/* Submit Button */}
          {isOwnProfile && isEditing && (
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="button-primary px-6 py-2 flex-1"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setDisplayName(profileData.displayName || '');
                  setBio(profileData.bio || '');
                }}
                className="button-secondary px-6 py-2"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
