import { AcceptCallIcon, DeclineCallIcon, IncomingCallIcon } from "../../assets/Icons";

const IncomingCallModal = ({ callerName, callType, onAccept, onReject }) => {
  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-md z-50 flex items-center justify-center p-4">

      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-auto text-center">

        <div className="mb-7">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gray-100 flex items-center justify-center">
            <IncomingCallIcon className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Llamada entrante</h2>
          <p className="text-lg font-medium text-gray-800">{callerName}</p>
          <p className="text-gray-500 text-sm mt-1">
            {callType === 'video' ? 'Videollamada' : 'Llamada de voz'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">

          <button
            onClick={onReject}
            className="flex items-center justify-center gap-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-red-600 font-semibold py-3 px-4 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            <DeclineCallIcon className="w-6 h-6" />
            <span>Rechazar</span>
          </button>

          <button
            onClick={onAccept}
            className="flex items-center justify-center gap-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-400"
          >
            <AcceptCallIcon className="w-6 h-6" />
            <span>Aceptar</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default IncomingCallModal;