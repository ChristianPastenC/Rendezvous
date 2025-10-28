import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HangUpIcon, MicOffIcon, MicOnIcon, SpinnerIcon, UserIcon, VideoOnIcon, VideoOffIcon } from '../../assets/Icons';

const VideoCallModal = ({ localStream, remoteStream, onHangUp, callType = 'video', callState }) => {
  const { t } = useTranslation();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isRemoteVideoOff, setIsRemoteVideoOff] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream && !isVideoOff) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoOff]);

  useEffect(() => {
    if (remoteStream) {
      if (callType === 'video' && remoteVideoRef.current && !isRemoteVideoOff) {
        remoteVideoRef.current.srcObject = remoteStream;
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

        const videoTrack = remoteStream.getVideoTracks()[0];
        if (videoTrack) {
          setIsRemoteVideoOff(!videoTrack.enabled);

          const handleRemoteMute = () => setIsRemoteVideoOff(true);
          const handleRemoteUnmute = () => setIsRemoteVideoOff(false);

          videoTrack.addEventListener('mute', handleRemoteMute);
          videoTrack.addEventListener('unmute', handleRemoteUnmute);

          return () => {
            videoTrack.removeEventListener('mute', handleRemoteMute);
            videoTrack.removeEventListener('unmute', handleRemoteUnmute);
          };
        }
      }
      else if (callType === 'audio' && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      }
    } else {
      setIsRemoteVideoOff(false);
    }
  }, [remoteStream, callType, isRemoteVideoOff]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => { track.enabled = !track.enabled; });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream && callType === 'video') {
      localStream.getVideoTracks().forEach(track => { track.enabled = !track.enabled; });
      setIsVideoOff(!isVideoOff);
    }
  };

  if (callState === 'ended') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
        <div className="text-white text-2xl font-semibold p-8 rounded-lg">
          {t('calls.video.ended')}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="w-full h-full flex items-center justify-center bg-black">
        {callType === 'video' && remoteStream && !isRemoteVideoOff ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
        ) : callType === 'video' && (remoteStream && isRemoteVideoOff) ? (
          <div className="flex flex-col items-center text-neutral-400">
            <div className="w-32 h-32 mb-5 rounded-full bg-neutral-800 flex items-center justify-center">
              <UserIcon className="w-16 h-16 text-neutral-500" />
            </div>
            <p className="text-xl font-medium">{t('calls.video.remoteCameraOff')}</p>
          </div>
        ) : callType === 'audio' ? (
          <div className="flex flex-col items-center text-white">
            <div className="w-32 h-32 mb-5 rounded-full bg-neutral-800 flex items-center justify-center">
              <UserIcon className="w-16 h-16 text-neutral-400" />
            </div>
            <p className="text-xl font-medium">{t('calls.video.inAudioCall')}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-neutral-400">
            <SpinnerIcon className="w-12 h-12 animate-spin text-neutral-300 mb-4" />
            <p className="text-lg">{t('calls.video.connecting')}</p>
          </div>
        )}
      </div>

      {callType === 'video' && localStream && (
        <div className="absolute top-6 right-6 w-48 h-36 bg-neutral-900 rounded-xl overflow-hidden shadow-2xl">
          {!isVideoOff ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-neutral-800">
              <UserIcon className="w-12 h-12 text-neutral-500" />
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex justify-center items-center gap-4 p-3 bg-black/40 backdrop-blur-md rounded-full">
        <button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${isMuted
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-neutral-700 hover:bg-neutral-600'
            }`}
          title={isMuted ? t('calls.video.unmute') : t('calls.video.mute')}
        >
          {isMuted ? (
            <MicOffIcon className="w-6 h-6 text-white" />
          ) : (
            <MicOnIcon className="w-6 h-6 text-white" />
          )}
        </button>

        {callType === 'video' && (
          <button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${isVideoOff
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-neutral-700 hover:bg-neutral-600'
              }`}
            title={isVideoOff ? t('calls.video.videoOn') : t('calls.video.videoOff')}
          >
            {isVideoOff ? (
              <VideoOffIcon className="w-6 h-6 text-white" />
            ) : (
              <VideoOnIcon className="w-6 h-6 text-white" />
            )}
          </button>
        )}

        <button
          onClick={onHangUp}
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
          title={t('calls.video.hangUp')}
        >
          <HangUpIcon className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
};

export default VideoCallModal;