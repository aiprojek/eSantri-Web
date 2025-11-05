import React from 'react';

interface UpdateNotificationProps {
  onUpdate: () => void;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({ onUpdate }) => {
  return (
    <div
      className="fixed bottom-5 right-5 z-[200] w-full max-w-sm p-4 bg-teal-800 text-white rounded-lg shadow-2xl animate-slide-in-bottom no-print"
      role="alert"
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <i className="bi bi-cloud-arrow-down-fill text-2xl"></i>
        </div>
        <div className="ml-4 text-sm font-medium">
          Versi baru eSantri Web tersedia.
        </div>
      </div>
      <div className="mt-3 text-right">
        <button
          onClick={onUpdate}
          className="px-4 py-2 text-sm font-semibold bg-white text-teal-800 rounded-md hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-teal-800 focus:ring-white"
        >
          Muat Ulang untuk Memperbarui
        </button>
      </div>
      <style>{`
        @keyframes slide-in-bottom {
          0% {
            transform: translateY(100%);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-in-bottom {
          animation: slide-in-bottom 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
        }
      `}</style>
    </div>
  );
};

export default UpdateNotification;
