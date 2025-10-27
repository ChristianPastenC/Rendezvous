import { HangUpIcon, PhoneRingIcon } from "../../assets/Icons";

const OutgoingCallModal = ({ targetName, status, onCancel }) => {
  const statusText = status === 'calling' ? 'Llamando...' : 'Tono...';

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="flex flex-col items-center text-center">
        <div
          className={`w-28 h-28 mb-6 rounded-full bg-gray-100 flex items-center justify-center ${status === 'ringing' ? 'animate-pulse' : ''}`}
        >
          <PhoneRingIcon className="w-12 h-12 text-blue-600" />
        </div>
        <h2 className="text-3xl font-semibold text-gray-900 mb-2">
          {targetName || 'Usuario'}
        </h2>
        <p className="text-lg text-gray-600 mb-12">{statusText}</p>
        <button
          onClick={onCancel}
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
          title="Cancelar"
        >
          <HangUpIcon className="w-8 h-8 text-white" />
        </button>
      </div>
    </div>
  );
};

export default OutgoingCallModal;