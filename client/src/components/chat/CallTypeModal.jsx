import { useTranslation } from 'react-i18next';
import { CallIcon, VideoOnIcon } from '../../assets/Icons';

const CallTypeModal = ({ onSelectType, onCancel }) => {
  const { t } = useTranslation();
  
  return (
    <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          {t('calls.typeModal.title')}
        </h2>

        <div className="space-y-4">
          <button
            onClick={() => onSelectType('video')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3"
          >
            <VideoOnIcon className="w-6 h-6" />
            {t('calls.typeModal.video')}
          </button>

          <button
            onClick={() => onSelectType('audio')}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3"
          >
            <CallIcon className="w-6 h-6" />
            {t('calls.typeModal.audio')}
          </button>

          <button
            onClick={onCancel}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {t('calls.typeModal.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallTypeModal;