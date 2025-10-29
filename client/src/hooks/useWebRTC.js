// client/src/hooks/useWebRTC.js
import { useState, useEffect, useRef, useCallback } from 'react';
import WebRTCService from '../lib/webrtcService';
import { playSound, stopSound } from '../lib/soundService';

/**
 * Custom hook to manage the WebRTC call lifecycle.
 * It uses a WebRTCService class to abstract the complexities of RTCPeerConnection and signaling.
 * @param {import('socket.io-client').Socket | null} socket - The Socket.IO client instance for signaling.
 * @param {object | null} currentUser - The authenticated Firebase user object.
 * @returns {{
 *  inCall: boolean,
 *  callState: 'idle' | 'calling' | 'ringing' | 'incoming' | 'connected' | 'ended',
 *  localStream: MediaStream | null,
 *  remoteStream: MediaStream | null,
 *  incomingCallData: object | null,
 *  currentCallType: 'video' | 'audio',
 *  startCall: (targetUserId: string, callType: 'video' | 'audio') => Promise<void>,
 *  acceptCall: () => Promise<void>,
 *  rejectCall: () => void,
 *  hangUp: () => void
 * }} An object containing the call state and functions to manage the call.
 */
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
  const pendingOfferRef = useRef(null);

  // Refs to hold the latest state values to avoid stale closures in callbacks.
  const inCallRef = useRef(inCall);
  useEffect(() => {
    inCallRef.current = inCall;
  }, [inCall]);

  // Refs to hold the latest state values to avoid stale closures in callbacks.
  const callStateRef = useRef(callState);
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  /**
   * Resets all call-related state to its initial values.
   * This function is used to clean up after a call has ended or been rejected.
   * It also clears any pending timers for the 'ended' state message.
   * @memberof useWebRTC
   */
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

  /**
   * Main effect to initialize and manage the WebRTC service and its event listeners.
   * It sets up handlers for all signaling events received from the WebRTCService,
   * such as incoming calls, remote streams, and call termination.
   */
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

      // Store the offer data without requesting media permissions yet
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


  /**
   * Initiates an outgoing call to a specified user.
   * It requests media permissions first, then starts the local stream and creates the offer.
   * @param {string} targetUserId - The UID of the user to call.
   * @param {'video' | 'audio'} callType - The type of call to initiate.
   * @memberof useWebRTC
   */
  const startCall = useCallback(async (targetUserId, callType) => {
    if (!webrtcRef.current || inCallRef.current || callStateRef.current !== 'idle') return;

    try {
      setCurrentCallType(callType);
      setCallState('calling');
      remoteUserIdRef.current = targetUserId;

      // Request media permissions
      const stream = await webrtcRef.current.startLocalStream(callType);
      setLocalStream(stream);

      // After getting permissions, create and send the offer
      const callerName = currentUser?.displayName || 'Usuario';
      await webrtcRef.current.createOffer(targetUserId, callType, callerName);

    } catch (error) {
      console.error('Error starting call:', error);
      // If permission denied or error, reset state
      resetCallState();
      throw error;
    }
  }, [currentUser, resetCallState]);

  /**
   * Accepts an incoming call.
   * It stops the incoming call sound, requests media permissions,
   * starts the local stream, and creates an answer to the pending offer.
   * @memberof useWebRTC
   */
  const acceptCall = useCallback(async () => {
    if (!webrtcRef.current || !incomingCallData || !pendingOfferRef.current) return;

    stopSound('incomingCall');

    try {
      const { from, offer, callType } = pendingOfferRef.current;

      setCurrentCallType(callType);

      // Request media permissions when user explicitly accepts the call
      const stream = await webrtcRef.current.startLocalStream(callType);
      setLocalStream(stream);

      // After getting permissions, accept the call with the stored offer
      await webrtcRef.current.acceptCall(from, offer, callType);

      setInCall(true);
      setCallState('connected');
      remoteUserIdRef.current = from;
      setIncomingCallData(null);
      pendingOfferRef.current = null;

    } catch (error) {
      console.error('Error accepting call:', error);
      // If permission denied or error, reject the call
      if (pendingOfferRef.current) {
        webrtcRef.current.rejectCall(pendingOfferRef.current.from);
      }
      resetCallState();
      throw error;
    }
  }, [incomingCallData, resetCallState]);

  /**
   * Rejects an incoming call.
   * It stops the incoming call sound and notifies the WebRTC service to send a rejection signal.
   * @memberof useWebRTC
   */
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

  /**
   * Hangs up the current call, whether it's outgoing, incoming, or connected.
   * It stops any call-related sounds and tells the WebRTC service to terminate the connection.
   * @memberof useWebRTC
   */
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