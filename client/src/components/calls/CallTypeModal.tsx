import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CallType } from '@rendezvous/shared';
import type { MediaDeviceSelection } from '../../lib/webrtcService';
import { CallIcon, VideoOnIcon } from '../../assets/Icons';

interface CallTypeModalProps {
  onSelectType: (callType: CallType, devices?: MediaDeviceSelection) => void;
  onCancel: () => void;
}

const CallTypeModal = ({ onSelectType, onCancel }: CallTypeModalProps) => {
  const { t } = useTranslation();
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const [permissionNotice, setPermissionNotice] = useState<string>('');
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);

  const stopPreviewStream = () => {
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((track) => track.stop());
      previewStreamRef.current = null;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const enumerate = async () => {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        const mics = devices.filter((d) => d.kind === 'audioinput');
        const cams = devices.filter((d) => d.kind === 'videoinput');
        setAudioDevices(mics);
        setVideoDevices(cams);
        if (mics[0]?.deviceId) setSelectedAudioId(mics[0].deviceId);
        if (cams[0]?.deviceId) setSelectedVideoId(cams[0].deviceId);
      } catch {
        // Ignore enumeration errors before permission is granted
      }
    };
    void enumerate();

    return () => {
      cancelled = true;
      stopPreviewStream();
    };
  }, []);

  const handleTogglePreview = async () => {
    if (previewEnabled) {
      stopPreviewStream();
      setPreviewEnabled(false);
      return;
    }

    setPermissionNotice('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: selectedAudioId ? { deviceId: { exact: selectedAudioId } } : true,
        video: selectedVideoId ? { deviceId: { exact: selectedVideoId } } : true,
      });
      previewStreamRef.current = stream;
      setPreviewEnabled(true);
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
      }

      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
        setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
      }
    } catch {
      setPermissionNotice(
        t(
          'calls.typeModal.permissionDenied',
          'Could not access camera or microphone preview. Check browser media permissions.'
        )
      );
    }
  };

  useEffect(() => {
    if (previewEnabled && previewVideoRef.current && previewStreamRef.current) {
      previewVideoRef.current.srcObject = previewStreamRef.current;
    }
  }, [previewEnabled]);

  const handleStart = (callType: CallType) => {
    stopPreviewStream();
    onSelectType(callType, {
      audioDeviceId: selectedAudioId || undefined,
      videoDeviceId: selectedVideoId || undefined,
    });
  };

  const handleClose = () => {
    stopPreviewStream();
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 max-w-md w-full mx-4 space-y-5">
        <h2 className="text-2xl font-bold text-gray-900 text-center">
          {t('calls.typeModal.title')}
        </h2>

        {/* Pre-call Device Check & Preview */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t('calls.typeModal.deviceSettings', 'Audio & Camera Check')}
            </span>
            <button
              type="button"
              onClick={() => void handleTogglePreview()}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              {previewEnabled
                ? t('calls.typeModal.stopPreview', 'Stop Preview')
                : t('calls.typeModal.testDevices', 'Test Camera & Mic')}
            </button>
          </div>

          {previewEnabled && (
            <div className="w-full h-36 bg-gray-900 rounded-lg overflow-hidden">
              <video
                ref={previewVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {permissionNotice && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
              {permissionNotice}
            </p>
          )}

          {audioDevices.length > 0 && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                {t('calls.typeModal.microphoneLabel', 'Microphone')}
              </label>
              <select
                value={selectedAudioId}
                onChange={(e) => setSelectedAudioId(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800"
              >
                {audioDevices.map((d, idx) => (
                  <option key={d.deviceId || idx} value={d.deviceId}>
                    {d.label || `${t('calls.typeModal.microphoneLabel', 'Microphone')} ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {videoDevices.length > 0 && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                {t('calls.typeModal.cameraLabel', 'Camera')}
              </label>
              <select
                value={selectedVideoId}
                onChange={(e) => setSelectedVideoId(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-800"
              >
                {videoDevices.map((d, idx) => (
                  <option key={d.deviceId || idx} value={d.deviceId}>
                    {d.label || `${t('calls.typeModal.cameraLabel', 'Camera')} ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleStart('video')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-3"
          >
            <VideoOnIcon className="w-6 h-6" />
            {t('calls.typeModal.video')}
          </button>

          <button
            onClick={() => handleStart('audio')}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-3"
          >
            <CallIcon className="w-6 h-6" />
            {t('calls.typeModal.audio')}
          </button>

          <button
            onClick={handleClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2.5 px-6 rounded-lg transition-colors"
          >
            {t('calls.typeModal.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallTypeModal;
