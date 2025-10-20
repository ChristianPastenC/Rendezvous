// src/components/chat/IncomingCallModal.jsx

const IncomingCallModal = ({ callerName, callType, onAccept, onReject }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full mx-4 text-center">
        <div className="mb-4 sm:mb-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 rounded-full bg-blue-500 flex items-center justify-center">
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Llamada entrante</h2>
          <p className="text-gray-700 text-base sm:text-lg">{callerName}</p>
          <p className="text-gray-500 text-sm mt-2">
            {callType === 'video' ? 'Videollamada' : 'Llamada de voz'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <button
            onClick={onReject}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Rechazar
          </button>
          <button
            onClick={onAccept}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;