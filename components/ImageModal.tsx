

import React from 'react';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <img src={imageUrl} alt="Full size preview" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" />
        <button onClick={onClose} className="absolute -top-4 -right-4 bg-dark-card text-dark-text rounded-full h-10 w-10 flex items-center justify-center text-xl hover:bg-brand-coral hover:text-white transition-colors">
          &times;
        </button>
      </div>
    </div>
  );
};