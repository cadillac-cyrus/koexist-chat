import { useEffect, useRef } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

export default function EmojiPicker({ onSelect, onClose }) {
  const pickerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div 
      ref={pickerRef}
      className="absolute bottom-full right-0 mb-2 z-50"
    >
      <Picker
        data={data}
        onEmojiSelect={onSelect}
        theme="dark"
        previewPosition="none"
        skinTonePosition="none"
        searchPosition="none"
        perLine={8}
        maxFrequentRows={2}
      />
    </div>
  );
}
