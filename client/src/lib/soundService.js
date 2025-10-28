// client/src/lib/soundService.js
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
      throw error;
    });
  } else {
    return;
  }
};

export const stopSound = (soundName) => {
  const sound = sounds[soundName];
  if (sound && !sound.paused) {
    sound.pause();
    sound.currentTime = 0;
  }
};