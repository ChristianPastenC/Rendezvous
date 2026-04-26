import type { CallType, WebRTCIncomingOfferPayload } from '@rendezvous/shared';
import type { TypedClientSocket } from './socket';

class WebRTCService {
  private socket: TypedClientSocket;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private localStream: MediaStream | null = null;
  private iceServers: RTCConfiguration;

  public onRemoteStream: ((stream: MediaStream, uid: string) => void) | null = null;
  public onCallEnded: (() => void) | null = null;
  public onIncomingCall: ((data: WebRTCIncomingOfferPayload) => void) | null = null;
  public onCallRinging: ((from: string) => void) | null = null;

  constructor(socket: TypedClientSocket) {
    this.socket = socket;
    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    this.registerSocketListeners();
  }

  private registerSocketListeners(): void {
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
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
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

  private createPeerConnection(recipientUid: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.iceServers);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc:ice-candidate', {
          recipientUid,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    pc.ontrack = (event) => {
      if (this.onRemoteStream && event.streams[0]) {
        this.onRemoteStream(event.streams[0], recipientUid);
      }
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        this.endCall(recipientUid);
      }
    };

    this.peerConnections.set(recipientUid, pc);
    return pc;
  }

  async startLocalStream(callType: CallType = 'video'): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: callType === 'video' ? { width: 1280, height: 720 } : false,
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
    }
    this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    return this.localStream;
  }

  private addLocalStreamToPC(pc: RTCPeerConnection): void {
    if (this.localStream) {
      const stream = this.localStream;
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }
  }

  async createOffer(
    recipientUid: string,
    callType: CallType = 'video',
    callerName = 'User'
  ): Promise<void> {
    const pc = this.createPeerConnection(recipientUid);
    this.addLocalStreamToPC(pc);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.socket.emit('webrtc:offer', { recipientUid, offer, callType, callerName });
  }

  async acceptCall(fromUid: string, offer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.createPeerConnection(fromUid);
    this.addLocalStreamToPC(pc);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.socket.emit('webrtc:answer', { recipientUid: fromUid, answer });
  }

  rejectCall(fromUid: string): void {
    this.socket.emit('webrtc:call-rejected', { recipientUid: fromUid });
  }

  hangUp(recipientUid: string): void {
    this.socket.emit('webrtc:hang-up', { recipientUid });
    this.endCall(recipientUid);
  }

  private endCall(uid: string): void {
    const pc = this.peerConnections.get(uid);
    if (pc) {
      pc.close();
      this.peerConnections.delete(uid);
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    if (this.onCallEnded) {
      this.onCallEnded();
    }
  }

  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  cleanup(): void {
    this.peerConnections.forEach((_pc, uid) => {
      this.endCall(uid);
    });
    this.peerConnections.clear();
  }
}

export default WebRTCService;
