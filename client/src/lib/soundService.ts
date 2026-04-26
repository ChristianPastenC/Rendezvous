const sounds = {
  incomingCall: new Audio('/sounds/incoming-call.mp3'),
  outgoingCall: new Audio('/sounds/outgoing-call.mp3'),
  messageReceived: new Audio('/sounds/new-notification.mp3'),
  callEnded: new Audio('/sounds/call-ended.mp3'),
} as const;

export type SoundName = keyof typeof sounds;

sounds.incomingCall.loop = true;
sounds.outgoingCall.loop = true;

export const playSound = (soundName: SoundName): void => {
  const sound = sounds[soundName];
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch((error: unknown) => {
      console.warn(`[Sound] Could not play "${soundName}":`, error);
    });
  }
};

export const stopSound = (soundName: SoundName): void => {
  const sound = sounds[soundName];
  if (sound && !sound.paused) {
    sound.pause();
    sound.currentTime = 0;
  }
};
