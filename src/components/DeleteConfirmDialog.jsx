import { XMarkIcon } from '@heroicons/react/24/outline';
import { Fragment } from 'react';

export default function DeleteConfirmDialog({ isOpen, onConfirm, onClose, isDeleting }) {
  if (!isOpen) return null;

  const handleCloseModal = () => {
    onClose(); // Use onClose to close the modal
  };

  const handleCancel = () => {
    handleCloseModal();
  };

  return (
    <div className="dialog-overlay">
      {/* Backdrop */}
      <div 
        className="dialog-backdrop"
        onClick={handleCloseModal}
      />
      
      {/* Dialog */}
      <div className="dialog-content">
        <div className="absolute top-4 right-4">
          <button
            onClick={handleCloseModal}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <h3 className="dialog-title">
          Delete Message
        </h3>
        
        <p className="dialog-message">
          Are you sure you want to delete this message? This action cannot be undone.
        </p>

        <div className="dialog-actions">
          <button
            onClick={handleCancel}
            className="dialog-button dialog-button-cancel"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="dialog-button dialog-button-delete"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
