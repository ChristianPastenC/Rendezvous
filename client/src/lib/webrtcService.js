class WebRTCService {
  constructor(socket) {
    this.socket = socket;
    this.peerConnections = new Map();
    this.localStream = null;
    this.onRemoteStream = null;
    this.onCallEnded = null;
    this.onIncomingCall = null;
    this.onCallRinging = null;

    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    };

    this.registerSocketListeners();
  }

  registerSocketListeners() {
    this.socket.on('webrtc:offer', ({ from, offer, callType, callerName }) => {
      console.log('[WebRTC] Oferta recibida de:', from);

      this.socket.emit('webrtc:ringing', { recipientUid: from });

      if (this.onIncomingCall) {
        this.onIncomingCall({ from, offer, callType, callerName });
      }
    });

    this.socket.on('webrtc:answer', async ({ from, answer }) => {
      console.log('[WebRTC] Respuesta recibida de:', from);
      const pc = this.peerConnections.get(from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    this.socket.on('webrtc:ice-candidate', async ({ from, candidate }) => {
      console.log('[WebRTC] Candidato ICE recibido de:', from);
      const pc = this.peerConnections.get(from);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error('[WebRTC] Error al agregar candidato ICE:', error);
        }
      }
    });

    this.socket.on('webrtc:ringing', ({ from }) => {
      console.log('[WebRTC] Tono de llamada de:', from);
      if (this.onCallRinging) {
        this.onCallRinging(from);
      }
    });

    this.socket.on('webrtc:hang-up', ({ from }) => {
      console.log('[WebRTC] Llamada terminada por:', from);
      this.endCall(from);
    });

    this.socket.on('webrtc:call-rejected', ({ from }) => {
      console.log('[WebRTC] Llamada rechazada por:', from);
      this.endCall(from);
    });
  }

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
      console.log('[WebRTC] Stream remoto recibido de:', recipientUid);
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
      console.error('[WebRTC] Error al obtener stream local:', error);
      throw error;
    }
  }

  addLocalStreamToPC(pc) {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }
  }

  async createOffer(recipientUid, callType = 'video', callerName = 'Usuario') {
    const pc = this.createPeerConnection(recipientUid);
    this.addLocalStreamToPC(pc);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.socket.emit('webrtc:offer', { recipientUid, offer, callType, callerName });
  }

  async acceptCall(fromUid, offer) {
    const pc = this.createPeerConnection(fromUid);
    this.addLocalStreamToPC(pc);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.socket.emit('webrtc:answer', { recipientUid: fromUid, answer });
  }

  rejectCall(fromUid) {
    this.socket.emit('webrtc:call-rejected', { recipientUid: fromUid });
  }

  hangUp(recipientUid) {
    this.socket.emit('webrtc:hang-up', { recipientUid });
    this.endCall(recipientUid);
  }

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

  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  cleanup() {
    this.peerConnections.forEach((pc, uid) => {
      this.endCall(uid);
    });
    this.peerConnections.clear();
  }
}

export default WebRTCService;