export type UserStatus = 'online' | 'offline';

export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
  photoURL: string | null;
  publicKey: string | null;
  status: UserStatus;
  lastSeen: string | null;
}

export interface MessageAuthorInfo {
  uid: string;
  displayName: string;
  photoURL: string | null;
}

export interface EncryptedMessage {
  id: string;
  encryptedPayload: Record<string, string>;
  authorId: string;
  authorInfo: MessageAuthorInfo;
  createdAt: string;
  conversationId?: string;
  groupId?: string | null;
}

export interface DecryptedMessageContent {
  type: 'text' | 'image' | 'file';
  content: string;
  fileUrl?: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'text';
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
  createdAt?: unknown;
  channelId?: string | null;
}

export interface ConversationItem {
  id: string;
  type: 'dm' | 'group';
  name: string;
  photoURL?: string | null;
  userData?: UserProfile;
  groupData?: Group;
  lastMessage?: EncryptedMessage | null;
}

// --- REST API DTOs ---

export interface SyncAuthRequest {
  token: string;
}

export interface UpdateProfileRequest {
  displayName: string;
  photoURL?: string | null;
}

export interface SaveKeysRequest {
  publicKey: string;
  wrappedPrivateKey: string;
}

export interface UserKeysResponse {
  publicKey: string;
  wrappedPrivateKey: string;
}

export interface CreateGroupRequest {
  name: string;
  memberIds?: string[];
}

export interface AddGroupMemberRequest {
  userIdToAdd: string;
}

// --- Socket.IO Event Contracts ---

export type CallType = 'video' | 'audio';

export interface SendMessagePayload {
  conversationId: string;
  isDirectMessage: boolean;
  groupId?: string | null;
  encryptedPayload: Record<string, string>;
}

export interface StatusUpdatePayload {
  uid: string;
  status: UserStatus;
  lastSeen: string | null;
  photoURL?: string;
  displayName?: string;
}

export interface WebRTCOfferPayload {
  recipientUid: string;
  offer: RTCSessionDescriptionInit;
  callType: CallType;
  callerName?: string;
}

export interface WebRTCIncomingOfferPayload {
  from: string;
  offer: RTCSessionDescriptionInit;
  callType: CallType;
  callerName: string;
}

export interface WebRTCAnswerPayload {
  recipientUid: string;
  answer: RTCSessionDescriptionInit;
}

export interface WebRTCIncomingAnswerPayload {
  from: string;
  answer: RTCSessionDescriptionInit;
}

export interface WebRTCIceCandidatePayload {
  recipientUid: string;
  candidate: RTCIceCandidateInit;
}

export interface WebRTCIncomingIceCandidatePayload {
  from: string;
  candidate: RTCIceCandidateInit;
}

export interface WebRTCRecipientPayload {
  recipientUid: string;
}

export interface WebRTCFromPayload {
  from: string;
}

export interface ClientToServerEvents {
  'security:register-public-key': (payload: { publicKey: string }) => void;
  subscribeToStatus: (userIds: string[]) => void;
  joinChannel: (payload: { conversationId: string }) => void;
  leaveChannel: (payload: { conversationId: string }) => void;
  sendMessage: (payload: SendMessagePayload) => void;
  'webrtc:offer': (payload: WebRTCOfferPayload) => void;
  'webrtc:answer': (payload: WebRTCAnswerPayload) => void;
  'webrtc:ice-candidate': (payload: WebRTCIceCandidatePayload) => void;
  'webrtc:ringing': (payload: WebRTCRecipientPayload) => void;
  'webrtc:hang-up': (payload: WebRTCRecipientPayload) => void;
  'webrtc:call-rejected': (payload: WebRTCRecipientPayload) => void;
}

export interface ServerToClientEvents {
  statusUpdate: (payload: StatusUpdatePayload) => void;
  encryptedMessage: (payload: EncryptedMessage) => void;
  messageError: (payload: { message: string }) => void;
  newConversation: (payload: ConversationItem) => void;
  'webrtc:offer': (payload: WebRTCIncomingOfferPayload) => void;
  'webrtc:answer': (payload: WebRTCIncomingAnswerPayload) => void;
  'webrtc:ice-candidate': (payload: WebRTCIncomingIceCandidatePayload) => void;
  'webrtc:ringing': (payload: WebRTCFromPayload) => void;
  'webrtc:hang-up': (payload: WebRTCFromPayload) => void;
  'webrtc:call-rejected': (payload: WebRTCFromPayload) => void;
  'webrtc:error': (payload: { message: string }) => void;
}
