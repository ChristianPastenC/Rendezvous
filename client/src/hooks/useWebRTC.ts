import { useState, useEffect, useRef, useCallback } from 'react';
import type { User } from 'firebase/auth';
import type { CallType, WebRTCIncomingOfferPayload } from '@rendezvous/shared';
import WebRTCService from '../lib/webrtcService';
import type { TypedClientSocket } from '../lib/socket';
import { playSound, stopSound } from '../lib/soundService';

export type CallState = 'idle' | 'calling' | 'ringing' | 'incoming' | 'connected' | 'ended';

export const useWebRTC = (socket: TypedClientSocket | null, currentUser: User | null) => {
  const [inCall, setInCall] = useState(false);
  const [callState, setCallState] = useState<CallState>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingCallData, setIncomingCallData] = useState<WebRTCIncomingOfferPayload | null>(null);
  const [currentCallType, setCurrentCallType] = useState<CallType>('video');

  const webrtcRef = useRef<WebRTCService | null>(null);
  const remoteUserIdRef = useRef<string | null>(null);
  const callEndedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const resetCallState = useCallback(() => {
    setInCall(false);
    setCallState('idle');
    setLocalStream(null);
    setRemoteStream(null);
    setIncomingCallData(null);
    remoteUserIdRef.current = null;
    pendingOfferRef.current = null;
    if (callEndedTimerRef.current) {
      clearTimeout(callEndedTimerRef.current);
      callEndedTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!socket || !currentUser) return;

    const webrtcService = new WebRTCService(socket);
    webrtcRef.current = webrtcService;

    webrtcService.onIncomingCall = ({ from, offer, callType, callerName }) => {
      if (inCallRef.current || callStateRef.current !== 'idle') {
        webrtcService.rejectCall(from);
        return;
      }

      playSound('incomingCall');
      setCallState('incoming');
      setIncomingCallData({ from, offer, callType, callerName });
      pendingOfferRef.current = { from, offer, callType };
    };

    webrtcService.onCallRinging = (from) => {
      if (remoteUserIdRef.current === from) {
        playSound('outgoingCall');
        setCallState('ringing');
      }
    };

    webrtcService.onRemoteStream = (stream) => {
      stopSound('outgoingCall');
      setRemoteStream(stream);
      setCallState('connected');
      setInCall(true);
    };

    webrtcService.onCallEnded = () => {
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
      if (webrtcRef.current && remoteUserIdRef.current) {
        webrtcRef.current.hangUp(remoteUserIdRef.current);
      }
      webrtcService.cleanup();
      webrtcRef.current = null;
      if (callEndedTimerRef.current) {
        clearTimeout(callEndedTimerRef.current);
      }
    };
  }, [socket, currentUser, resetCallState]);

  const startCall = useCallback(
    async (targetUserId: string, callType: CallType) => {
      if (!webrtcRef.current || inCallRef.current || callStateRef.current !== 'idle') return;

      try {
        setCurrentCallType(callType);
        setCallState('calling');
        remoteUserIdRef.current = targetUserId;

        const stream = await webrtcRef.current.startLocalStream(callType);
        setLocalStream(stream);

        const callerName = currentUser?.displayName || 'User';
        await webrtcRef.current.createOffer(targetUserId, callType, callerName);
      } catch (error) {
        console.error('[WebRTC] Error starting call:', error);
        resetCallState();
        throw error;
      }
    },
    [currentUser, resetCallState]
  );

  const acceptCall = useCallback(async () => {
    if (!webrtcRef.current || !incomingCallData || !pendingOfferRef.current) return;

    stopSound('incomingCall');

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
  }, [incomingCallData, resetCallState]);

  const rejectCall = useCallback(() => {
    if (!webrtcRef.current || !incomingCallData) return;

    stopSound('incomingCall');

    if (pendingOfferRef.current) {
      webrtcRef.current.rejectCall(pendingOfferRef.current.from);
    }

    setIncomingCallData(null);
    pendingOfferRef.current = null;
    setCallState('idle');
  }, [incomingCallData]);

  const hangUp = useCallback(() => {
    stopSound('outgoingCall');
    stopSound('incomingCall');

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
  }, [resetCallState]);

  return {
    inCall,
    callState,
    localStream,
    remoteStream,
    incomingCallData,
    currentCallType,
    startCall,
    acceptCall,
    rejectCall,
    hangUp,
  };
};
