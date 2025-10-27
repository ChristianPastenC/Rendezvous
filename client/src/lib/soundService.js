const sounds = {
  incomingCall: new Audio('/sounds/incoming-call.mp3'),
  outgoingCall: new Audio('/sounds/outgoing-call.mp3'),
  messageReceived: new Audio('/sounds/new-notification.mp3'),
  callEnded: new Audio('/sounds/call-ended.mp3'),
};

sounds.incomingCall.loop = true;
sounds.outgoingCall.loop = true;

export const playSound = (soundName) => {
  const sound = sounds[soundName];
  if (sound) {
    sound.currentTime = 0;
    sound.play().catch(error => {
      console.warn(`[SoundService] No se pudo reproducir el sonido "${soundName}":`, error);
    });
  } else {
    console.warn(`[SoundService] Sonido no encontrado: ${soundName}`);
  }
};

export const stopSound = (soundName) => {
  const sound = sounds[soundName];
  if (sound && !sound.paused) {
    sound.pause();
    sound.currentTime = 0;
  }
};