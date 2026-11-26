import { useState, useEffect, useRef, useCallback } from 'react';
import type { User } from 'firebase/auth';
import type { CallType, WebRTCIncomingOfferPayload } from '@rendezvous/shared';
import WebRTCService, { type MediaDeviceSelection } from '../lib/webrtcService';
import type { TypedClientSocket } from '../lib/socket';
import { playSound, stopSound } from '../lib/soundService';

export type CallState = 'idle' | 'calling' | 'ringing' | 'incoming' | 'connected' | 'ended';

const MISSED_CALL_TIMEOUT_MS = 30000;

export const useWebRTC = (socket: TypedClientSocket | null, currentUser: User | null) => {
  const [inCall, setInCall] = useState(false);
  const [callState, setCallState] = useState<CallState>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingCallData, setIncomingCallData] = useState<WebRTCIncomingOfferPayload | null>(null);
  const [currentCallType, setCurrentCallType] = useState<CallType>('video');
  const [callError, setCallError] = useState<string | null>(null);

  const clearCallError = useCallback(() => {
    setCallError(null);
  }, []);

  const webrtcRef = useRef<WebRTCService | null>(null);
  const remoteUserIdRef = useRef<string | null>(null);
  const callEndedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const missedCallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingOfferRef = useRef<{
    from: string;
    offer: RTCSessionDescriptionInit;
    callType: CallType;
  } | null>(null);

  const inCallRef = useRef(inCall);
  useEffect(() => {
    inCallRef.current = inCall;
  }, [inCall]);

  const callStateRef = useRef(callState);
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const clearMissedCallTimer = useCallback(() => {
    if (missedCallTimerRef.current) {
      clearTimeout(missedCallTimerRef.current);
      missedCallTimerRef.current = null;
    }
  }, []);

  const resetCallState = useCallback(() => {
    setInCall(false);
    setCallState('idle');
    setLocalStream(null);
    setRemoteStream(null);
    setIncomingCallData(null);
    remoteUserIdRef.current = null;
    pendingOfferRef.current = null;
    clearMissedCallTimer();
    if (callEndedTimerRef.current) {
      clearTimeout(callEndedTimerRef.current);
      callEndedTimerRef.current = null;
    }
  }, [clearMissedCallTimer]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      stopSound('incomingCall');
      stopSound('outgoingCall');
      if (webrtcRef.current && remoteUserIdRef.current) {
        webrtcRef.current.hangUp(remoteUserIdRef.current);
      } else if (webrtcRef.current && pendingOfferRef.current) {
        webrtcRef.current.rejectCall(pendingOfferRef.current.from);
      }
      webrtcRef.current?.cleanup();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    if (!socket || !currentUser) return;

    const webrtcService = new WebRTCService(socket);
    webrtcRef.current = webrtcService;

    webrtcService.onIncomingCall = ({ from, offer, callType, callerName }) => {
      if (inCallRef.current || callStateRef.current !== 'idle') {
        webrtcService.sendBusy(from);
        return;
      }

      playSound('incomingCall');
      setCallState('incoming');
      setIncomingCallData({ from, offer, callType, callerName });
      pendingOfferRef.current = { from, offer, callType };
      remoteUserIdRef.current = from;

      clearMissedCallTimer();
      missedCallTimerRef.current = setTimeout(() => {
        if (callStateRef.current === 'incoming') {
          stopSound('incomingCall');
          webrtcService.rejectCall(from);
          setCallError(`Missed call from ${callerName || 'User'}.`);
          resetCallState();
        }
      }, MISSED_CALL_TIMEOUT_MS);
    };

    webrtcService.onCallRinging = (from) => {
      if (remoteUserIdRef.current === from) {
        playSound('outgoingCall');
        setCallState('ringing');
      }
    };

    webrtcService.onCallBusy = (from) => {
      if (remoteUserIdRef.current === from) {
        stopSound('outgoingCall');
        clearMissedCallTimer();
        setCallError('Recipient is currently busy on another call.');
      }
    };

    webrtcService.onRemoteStream = (stream) => {
      stopSound('outgoingCall');
      clearMissedCallTimer();
      setRemoteStream(stream);
      setCallState('connected');
      setInCall(true);
    };

    webrtcService.onCallError = (message) => {
      setCallError(message);
    };

    webrtcService.onCallEnded = () => {
      clearMissedCallTimer();
      if (
        callStateRef.current === 'connected' ||
        callStateRef.current === 'calling' ||
        callStateRef.current === 'ringing' ||
        callStateRef.current === 'incoming'
      ) {
        stopSound('incomingCall');
        stopSound('outgoingCall');
        playSound('callEnded');
      }

      setCallState('ended');
      setLocalStream(null);
      setRemoteStream(null);
      setIncomingCallData(null);
      pendingOfferRef.current = null;

      if (callEndedTimerRef.current) {
        clearTimeout(callEndedTimerRef.current);
      }

      callEndedTimerRef.current = setTimeout(() => {
        resetCallState();
      }, 2000);
    };

    return () => {
      clearMissedCallTimer();
      if (webrtcRef.current && remoteUserIdRef.current) {
        webrtcRef.current.hangUp(remoteUserIdRef.current);
      }
      webrtcService.cleanup();
      webrtcRef.current = null;
      if (callEndedTimerRef.current) {
        clearTimeout(callEndedTimerRef.current);
      }
    };
  }, [socket, currentUser, resetCallState, clearMissedCallTimer]);

  const startCall = useCallback(
    async (
      targetUserId: string,
      callType: CallType,
      devices?: MediaDeviceSelection
    ) => {
      if (!webrtcRef.current || inCallRef.current || callStateRef.current !== 'idle') return;

      try {
        setCurrentCallType(callType);
        setCallState('calling');
        remoteUserIdRef.current = targetUserId;

        const stream = await webrtcRef.current.startLocalStream(callType, devices);
        setLocalStream(stream);

        const callerName = currentUser?.displayName || 'User';
        await webrtcRef.current.createOffer(targetUserId, callType, callerName);

        clearMissedCallTimer();
        missedCallTimerRef.current = setTimeout(() => {
          if (
            (callStateRef.current === 'calling' || callStateRef.current === 'ringing') &&
            remoteUserIdRef.current === targetUserId
          ) {
            stopSound('outgoingCall');
            webrtcRef.current?.hangUp(targetUserId);
            setCallError('No answer. The call timed out.');
          }
        }, MISSED_CALL_TIMEOUT_MS);
      } catch (error) {
        console.error('[WebRTC] Error starting call:', error);
        resetCallState();
        throw error;
      }
    },
    [currentUser, resetCallState, clearMissedCallTimer]
  );

  const acceptCall = useCallback(async () => {
    if (!webrtcRef.current || !incomingCallData || !pendingOfferRef.current) return;

    stopSound('incomingCall');
    clearMissedCallTimer();

    try {
      const { from, offer, callType } = pendingOfferRef.current;
      setCurrentCallType(callType);

      const stream = await webrtcRef.current.startLocalStream(callType);
      setLocalStream(stream);

      await webrtcRef.current.acceptCall(from, offer);

      setInCall(true);
      setCallState('connected');
      remoteUserIdRef.current = from;
      setIncomingCallData(null);
      pendingOfferRef.current = null;
    } catch (error) {
      console.error('[WebRTC] Error accepting call:', error);
      if (pendingOfferRef.current) {
        webrtcRef.current.rejectCall(pendingOfferRef.current.from);
      }
      resetCallState();
      throw error;
    }
  }, [incomingCallData, resetCallState, clearMissedCallTimer]);

  const rejectCall = useCallback(() => {
    if (!webrtcRef.current || !incomingCallData) return;

    stopSound('incomingCall');
    clearMissedCallTimer();

    if (pendingOfferRef.current) {
      webrtcRef.current.rejectCall(pendingOfferRef.current.from);
    }

    setIncomingCallData(null);
    pendingOfferRef.current = null;
    remoteUserIdRef.current = null;
    setCallState('idle');
  }, [incomingCallData, clearMissedCallTimer]);

  const hangUp = useCallback(() => {
    stopSound('outgoingCall');
    stopSound('incomingCall');
    clearMissedCallTimer();

    if (callEndedTimerRef.current) {
      clearTimeout(callEndedTimerRef.current);
      callEndedTimerRef.current = null;
    }

    const remoteId = remoteUserIdRef.current;

    if (!webrtcRef.current || !remoteId) {
      resetCallState();
      return;
    }

    webrtcRef.current.hangUp(remoteId);
  }, [resetCallState, clearMissedCallTimer]);

  return {
    inCall,
    callState,
    localStream,
    remoteStream,
    incomingCallData,
    currentCallType,
    callError,
    clearCallError,
    startCall,
    acceptCall,
    rejectCall,
    hangUp,
  };
};
