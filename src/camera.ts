export const requestCamera = async (video: HTMLVideoElement) => {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  video.srcObject = stream;
  await video.play();
  return stream;
};

export const stopCamera = (stream: MediaStream | undefined) => {
  stream?.getTracks().forEach((track) => track.stop());
};
