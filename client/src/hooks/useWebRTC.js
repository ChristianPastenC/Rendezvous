import { useState, useEffect, useRef, useCallback } from 'react';
import WebRTCService from '../lib/webrtcService';

export const useWebRTC = (socket, currentUser) => {
  const [inCall, setInCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [currentCallType, setCurrentCallType] = useState('video');

  const webrtcRef = useRef(null);
  const remoteUserIdRef = useRef(null);

  const inCallRef = useRef(inCall);

  useEffect(() => {
    inCallRef.current = inCall;
  }, [inCall]);
  
  const resetCallState = useCallback(() => {
    setInCall(false);
    setLocalStream(null);
    setRemoteStream(null);
    setIncomingCallData(null);
    remoteUserIdRef.current = null;
  }, []);

  useEffect(() => {
    if (!socket || !currentUser) return;

    const webrtcService = new WebRTCService(socket);
    webrtcRef.current = webrtcService;

    webrtcService.onIncomingCall = ({ from, offer, callType, callerName }) => {
      if (inCallRef.current) {
        webrtcService.rejectCall(from);
        return;
      }
      setIncomingCallData({ from, offer, callType, callerName });
    };

    webrtcService.onRemoteStream = (stream) => {
      setRemoteStream(stream);
    };

    webrtcService.onCallEnded = () => {
      resetCallState();
    };

    return () => {
      if (webrtcRef.current && remoteUserIdRef.current) {
        webrtcRef.current.hangUp(remoteUserIdRef.current);
      }
      webrtcService.cleanup();
      webrtcRef.current = null;
    };

  }, [socket, currentUser, resetCallState]);
  

  const startCall = useCallback(async (targetUserId, callType) => {
    if (!webrtcRef.current || inCall) return;
    try {
      setCurrentCallType(callType);
      const stream = await webrtcRef.current.startLocalStream(callType);
      setLocalStream(stream);

      const callerName = currentUser?.displayName || 'Usuario';
      await webrtcRef.current.createOffer(targetUserId, callType, callerName);

      setInCall(true);
      remoteUserIdRef.current = targetUserId;
    } catch (e) {
      console.error("Fallo al iniciar la llamada:", e);
      resetCallState();
    }
  }, [inCall, currentUser, resetCallState]);

  const acceptCall = useCallback(async () => {
    if (!webrtcRef.current || !incomingCallData) return;
    try {
      const { from, offer, callType } = incomingCallData;

      setCurrentCallType(callType);
      const stream = await webrtcRef.current.startLocalStream(callType);
      setLocalStream(stream);

      await webrtcRef.current.acceptCall(from, offer, callType);

      setInCall(true);
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

    webrtcRef.current.rejectCall(incomingCallData.from);
    setIncomingCallData(null);
  }, [incomingCallData]);

  const hangUp = useCallback(() => {
    const remoteId = remoteUserIdRef.current;
    if (!webrtcRef.current || !remoteId) return;

    webrtcRef.current.hangUp(remoteId);
  }, []);

  return {
    inCall,
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