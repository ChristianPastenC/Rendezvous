import { useState, useEffect, useRef, useCallback } from 'react';
import WebRTCService from '../lib/webrtcService';
import { playSound, stopSound } from '../lib/soundService';

export const useWebRTC = (socket, currentUser) => {
  const [inCall, setInCall] = useState(false);
  const [callState, setCallState] = useState('idle'); // 'idle', 'calling', 'ringing', 'incoming', 'connected', 'ended'
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [currentCallType, setCurrentCallType] = useState('video');

  const webrtcRef = useRef(null);
  const remoteUserIdRef = useRef(null);
  const callEndedTimerRef = useRef(null);

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
      console.log('Llamada terminada, mostrando mensaje...');

      if (callStateRef.current === 'connected' ||
        callStateRef.current === 'calling' ||
        callStateRef.current === 'ringing' ||
        callStateRef.current === 'incoming') {

        stopSound('incomingCall');
        stopSound('outgoingCall');
        playSound('callEnded');
      }
      
      setCallState('ended');
      setLocalStream(null);
      setRemoteStream(null);
      setIncomingCallData(null);

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


  const startCall = useCallback(async (targetUserId, callType) => {
    if (!webrtcRef.current || inCallRef.current || callStateRef.current !== 'idle') return;
    try {
      setCurrentCallType(callType);
      const stream = await webrtcRef.current.startLocalStream(callType);
      setLocalStream(stream);

      const callerName = currentUser?.displayName || 'Usuario';
      await webrtcRef.current.createOffer(targetUserId, callType, callerName);

      setCallState('calling');
      remoteUserIdRef.current = targetUserId;
    } catch (e) {
      console.error("Fallo al iniciar la llamada:", e);
      resetCallState();
    }
  }, [currentUser, resetCallState]);

  const acceptCall = useCallback(async () => {
    if (!webrtcRef.current || !incomingCallData) return;

    stopSound('incomingCall');
  
    try {
      const { from, offer, callType } = incomingCallData;

      setCurrentCallType(callType);
      const stream = await webrtcRef.current.startLocalStream(callType);
      setLocalStream(stream);

      await webrtcRef.current.acceptCall(from, offer, callType);

      setInCall(true);
      setCallState('connected');
      remoteUserIdRef.current = from;
      setIncomingCallData(null);
    } catch (e) {
      console.error("Fallo al aceptar la llamada:", e);
      if (incomingCallData) {
        webrtcRef.current.rejectCall(incomingCallData.from);
      }
      resetCallState();
    }
  }, [incomingCallData, resetCallState]);

  const rejectCall = useCallback(() => {
    if (!webrtcRef.current || !incomingCallData) return;

    stopSound('incomingCall');
  
    webrtcRef.current.rejectCall(incomingCallData.from);
    setIncomingCallData(null);
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