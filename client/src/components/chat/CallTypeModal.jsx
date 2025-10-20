// src/components/chat/CallTypeModal.jsx

const CallTypeModal = ({ onSelectType, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full mx-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 text-center">
          Selecciona el tipo de llamada
        </h2>

        <div className="space-y-3 sm:space-y-4">
          <button
            onClick={() => onSelectType('video')}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-lg transition-colors flex items-center justify-center gap-3 text-sm sm:text-base"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Videollamada
          </button>

          <button
            onClick={() => onSelectType('audio')}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-lg transition-colors flex items-center justify-center gap-3 text-sm sm:text-base"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Llamada de voz
          </button>

          <button
            onClick={onCancel}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-colors text-sm sm:text-base"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallTypeModal;