import type { CallType, WebRTCIncomingOfferPayload } from '@rendezvous/shared';
import type { TypedClientSocket } from './socket';

export interface MediaDeviceSelection {
  audioDeviceId?: string;
  videoDeviceId?: string;
}

class WebRTCService {
  private socket: TypedClientSocket;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private localStream: MediaStream | null = null;
  private iceServers: RTCConfiguration;
  private hasTurnConfigured: boolean;
  private iceRestartAttempts = new Map<string, number>();
  private disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

  public onRemoteStream: ((stream: MediaStream, uid: string) => void) | null = null;
  public onCallEnded: (() => void) | null = null;
  public onIncomingCall: ((data: WebRTCIncomingOfferPayload) => void) | null = null;
  public onCallRinging: ((from: string) => void) | null = null;
  public onCallBusy: ((from: string) => void) | null = null;
  public onCallError: ((message: string) => void) | null = null;

  constructor(socket: TypedClientSocket) {
    this.socket = socket;
    const iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    const turnUrl = import.meta.env.VITE_TURN_URL;
    this.hasTurnConfigured = Boolean(turnUrl);
    if (turnUrl) {
      const turnServer: RTCIceServer = { urls: turnUrl };
      if (import.meta.env.VITE_TURN_USERNAME) {
        turnServer.username = import.meta.env.VITE_TURN_USERNAME;
      }
      if (import.meta.env.VITE_TURN_CREDENTIAL) {
        turnServer.credential = import.meta.env.VITE_TURN_CREDENTIAL;
      }
      iceServers.push(turnServer);
    }

    this.iceServers = { iceServers };

    this.registerSocketListeners();
  }

  private registerSocketListeners(): void {
    this.socket.on('webrtc:offer', async ({ from, offer, callType, callerName }) => {
      const existingPc = this.peerConnections.get(from);
      if (existingPc) {
        // Handle renegotiation / automatic ICE restart offer from remote peer
        try {
          await existingPc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await existingPc.createAnswer();
          await existingPc.setLocalDescription(answer);
          this.socket.emit('webrtc:answer', { recipientUid: from, answer });
          return;
        } catch (err) {
          console.warn('[WebRTC] Failed to process ICE restart offer:', err);
        }
      }

      this.socket.emit('webrtc:ringing', { recipientUid: from });

      if (this.onIncomingCall) {
        this.onIncomingCall({ from, offer, callType, callerName });
      }
    });

    this.socket.on('webrtc:answer', async ({ from, answer }) => {
      const pc = this.peerConnections.get(from);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          this.iceRestartAttempts.set(from, 0);
        } catch (err) {
          console.error('[WebRTC] Failed to set remote answer:', err);
          this.onCallError?.('Failed to establish peer connection.');
          this.endCall(from);
        }
      }
    });

    this.socket.on('webrtc:ice-candidate', async ({ from, candidate }) => {
      const pc = this.peerConnections.get(from);
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[WebRTC] Ignoring invalid or late ICE candidate:', err);
        }
      }
    });

    this.socket.on('webrtc:ringing', ({ from }) => {
      if (this.onCallRinging) {
        this.onCallRinging(from);
      }
    });

    this.socket.on('webrtc:busy', ({ from }) => {
      if (this.onCallBusy) {
        this.onCallBusy(from);
      }
      this.endCall(from);
    });

    this.socket.on('webrtc:hang-up', ({ from }) => {
      this.endCall(from);
    });

    this.socket.on('webrtc:call-rejected', ({ from }) => {
      this.endCall(from);
    });

    this.socket.on('webrtc:error', ({ message }) => {
      this.onCallError?.(message);
    });
  }

  private getTurnGuidanceSuffix(): string {
    return this.hasTurnConfigured
      ? 'Verify that your TURN server credentials (VITE_TURN_URL / VITE_TURN_USERNAME / VITE_TURN_CREDENTIAL) are reachable.'
      : 'Both peers may be behind symmetric NATs or strict firewalls. Configure VITE_TURN_URL, VITE_TURN_USERNAME, and VITE_TURN_CREDENTIAL in client/.env to enable relay fallback.';
  }

  private async attemptIceRestart(recipientUid: string, pc: RTCPeerConnection): Promise<boolean> {
    const attempts = this.iceRestartAttempts.get(recipientUid) ?? 0;
    if (attempts >= 1) {
      return false;
    }
    this.iceRestartAttempts.set(recipientUid, attempts + 1);

    try {
      if (typeof pc.restartIce === 'function') {
        pc.restartIce();
      }
      const restartOffer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(restartOffer);
      this.socket.emit('webrtc:offer', {
        recipientUid,
        offer: restartOffer,
        callType: 'video',
      });
      return true;
    } catch {
      return false;
    }
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
      if (pc.connectionState === 'connected') {
        const timer = this.disconnectTimers.get(recipientUid);
        if (timer) {
          clearTimeout(timer);
          this.disconnectTimers.delete(recipientUid);
        }
      } else if (pc.connectionState === 'disconnected') {
        // Give transient network drops 4 seconds to recover or restart ICE before tearing down
        const existingTimer = this.disconnectTimers.get(recipientUid);
        if (!existingTimer) {
          void this.attemptIceRestart(recipientUid, pc);
          const timer = setTimeout(() => {
            this.disconnectTimers.delete(recipientUid);
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
              this.endCall(recipientUid);
            }
          }, 4000);
          this.disconnectTimers.set(recipientUid, timer);
        }
      } else if (pc.connectionState === 'failed') {
        void (async () => {
          const restarted = await this.attemptIceRestart(recipientUid, pc);
          if (!restarted) {
            this.onCallError?.(
              `Call connection failed. ${this.getTurnGuidanceSuffix()}`
            );
            this.endCall(recipientUid);
          }
        })();
      } else if (pc.connectionState === 'closed') {
        this.endCall(recipientUid);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        void (async () => {
          const restarted = await this.attemptIceRestart(recipientUid, pc);
          if (!restarted) {
            this.onCallError?.(
              `ICE negotiation failed to reach peer. ${this.getTurnGuidanceSuffix()}`
            );
            this.endCall(recipientUid);
          }
        })();
      }
    };

    this.peerConnections.set(recipientUid, pc);
    return pc;
  }

  async startLocalStream(
    callType: CallType = 'video',
    devices?: MediaDeviceSelection
  ): Promise<MediaStream> {
    const audioConstraint: boolean | MediaTrackConstraints = devices?.audioDeviceId
      ? { deviceId: { exact: devices.audioDeviceId } }
      : true;

    const videoConstraint: boolean | MediaTrackConstraints =
      callType === 'video'
        ? devices?.videoDeviceId
          ? { deviceId: { exact: devices.videoDeviceId }, width: 1280, height: 720 }
          : { width: 1280, height: 720 }
        : false;

    const constraints: MediaStreamConstraints = {
      audio: audioConstraint,
      video: videoConstraint,
    };

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (error) {
      const errName = error instanceof DOMException ? error.name : '';
      let message = 'Unable to access microphone or camera.';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        message = 'Camera or microphone permission was denied.';
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        message = 'No camera or microphone device was found.';
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        message = 'Camera or microphone is already in use by another application.';
      }
      this.onCallError?.(message);
      throw new Error(message);
    }
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

  sendBusy(fromUid: string): void {
    this.socket.emit('webrtc:busy', { recipientUid: fromUid });
  }

  hangUp(recipientUid: string): void {
    this.socket.emit('webrtc:hang-up', { recipientUid });
    this.endCall(recipientUid);
  }

  private endCall(uid: string): void {
    const timer = this.disconnectTimers.get(uid);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(uid);
    }
    this.iceRestartAttempts.delete(uid);

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
    this.disconnectTimers.forEach((timer) => clearTimeout(timer));
    this.disconnectTimers.clear();
    this.iceRestartAttempts.clear();
    this.peerConnections.forEach((_pc, uid) => {
      this.endCall(uid);
    });
    this.peerConnections.clear();
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
  }
}

export default WebRTCService;
