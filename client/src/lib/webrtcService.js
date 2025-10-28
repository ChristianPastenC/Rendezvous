// client/src/lib/webrtcService.js
class WebRTCService {
  /**
   * @param {import('socket.io-client').Socket} socket - The Socket.IO client instance for signaling.
   */
  constructor(socket) {
    this.socket = socket;
    this.peerConnections = new Map();
    this.localStream = null;

    /** @type {((stream: MediaStream, uid: string) => void) | null} */
    this.onRemoteStream = null;
    /** @type {(() => void) | null} */
    this.onCallEnded = null;
    /** @type {((data: { from: string, offer: RTCSessionDescriptionInit, callType: 'video'|'audio', callerName: string }) => void) | null} */
    this.onIncomingCall = null;
    /** @type {((from: string) => void) | null} */
    this.onCallRinging = null;

    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    };

    this.registerSocketListeners();
  }

  /**
   * Registers all necessary Socket.IO event listeners for WebRTC signaling.
   * @private
   */
  registerSocketListeners() {
    this.socket.on('webrtc:offer', ({ from, offer, callType, callerName }) => {
      this.socket.emit('webrtc:ringing', { recipientUid: from });

      if (this.onIncomingCall) {
        this.onIncomingCall({ from, offer, callType, callerName });
      }
    });

    this.socket.on('webrtc:answer', async ({ from, answer }) => {
      const pc = this.peerConnections.get(from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    this.socket.on('webrtc:ice-candidate', async ({ from, candidate }) => {
      const pc = this.peerConnections.get(from);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          throw new Error('[WebRTC] Error al agregar candidato ICE:', error);
        }
      }
    });

    this.socket.on('webrtc:ringing', ({ from }) => {
      if (this.onCallRinging) {
        this.onCallRinging(from);
      }
    });

    this.socket.on('webrtc:hang-up', ({ from }) => {
      this.endCall(from);
    });

    this.socket.on('webrtc:call-rejected', ({ from }) => {
      this.endCall(from);
    });
  }

  /**
   * Creates a new RTCPeerConnection for a given recipient.
   * @param {string} recipientUid - The UID of the user to connect with.
   * @returns {RTCPeerConnection} The created peer connection instance.
   * @private
   */
  createPeerConnection(recipientUid) {
    const pc = new RTCPeerConnection(this.iceServers);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc:ice-candidate', {
          recipientUid,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      if (this.onRemoteStream) {
        this.onRemoteStream(event.streams[0], recipientUid);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.endCall(recipientUid);
      }
    };

    this.peerConnections.set(recipientUid, pc);
    return pc;
  }

  /**
   * Gets the user's local media stream (camera and/or microphone).
   * @param {'video' | 'audio'} [callType='video'] - The type of media to request.
   * @returns {Promise<MediaStream>} A promise that resolves with the local MediaStream.
   * @async
   */
  async startLocalStream(callType = 'video') {
    try {
      const constraints = {
        audio: true,
        video: callType === 'video' ? { width: 1280, height: 720 } : false
      };
      
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
      }
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Adds all tracks from the local stream to a given RTCPeerConnection.
   * @param {RTCPeerConnection} pc - The peer connection to add tracks to.
   * @private
   */
  addLocalStreamToPC(pc) {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }
  }

  /**
   * Creates and sends a WebRTC offer to a recipient.
   * @param {string} recipientUid - The UID of the user to call.
   * @param {'video' | 'audio'} [callType='video'] - The type of call.
   * @param {string} [callerName='Usuario'] - The display name of the caller.
   * @async
   */
  async createOffer(recipientUid, callType = 'video', callerName = 'Usuario') {
    const pc = this.createPeerConnection(recipientUid);
    this.addLocalStreamToPC(pc);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.socket.emit('webrtc:offer', { recipientUid, offer, callType, callerName });
  }

  /**
   * Accepts an incoming call offer by creating and sending an answer.
   * @param {string} fromUid - The UID of the caller.
   * @param {RTCSessionDescriptionInit} offer - The received offer.
   * @async
   */
  async acceptCall(fromUid, offer) {
    const pc = this.createPeerConnection(fromUid);
    this.addLocalStreamToPC(pc);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.socket.emit('webrtc:answer', { recipientUid: fromUid, answer });
  }

  /**
   * Rejects an incoming call by sending a rejection signal.
   * @param {string} fromUid - The UID of the caller to reject.
   */
  rejectCall(fromUid) {
    this.socket.emit('webrtc:call-rejected', { recipientUid: fromUid });
  }

  /**
   * Initiates the hang-up process by sending a signal and cleaning up locally.
   * @param {string} recipientUid - The UID of the other user in the call.
   */
  hangUp(recipientUid) {
    this.socket.emit('webrtc:hang-up', { recipientUid });
    this.endCall(recipientUid);
  }

  /**
   * Cleans up a specific peer connection and associated resources.
   * @param {string} uid - The UID of the user whose connection to end.
   * @private
   */
  endCall(uid) {
    const pc = this.peerConnections.get(uid);
    if (pc) {
      pc.close();
      this.peerConnections.delete(uid);
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.onCallEnded) {
      this.onCallEnded();
    }
  }

  /**
   * Toggles the enabled state of the local audio track.
   * @param {boolean} enabled - True to enable audio, false to disable.
   */
  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Toggles the enabled state of the local video track.
   * @param {boolean} enabled - True to enable video, false to disable.
   */
  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Cleans up all active peer connections and local streams.
   */
  cleanup() {
    this.peerConnections.forEach((pc, uid) => {
      this.endCall(uid);
    });
    this.peerConnections.clear();
  }
}

export default WebRTCService;