export const withCameraTimeout = async <T>(operation: Promise<T>): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Camera startup timed out')), 15_000);
    })]);
  } finally { if (timer) clearTimeout(timer); }
};

export const requestCamera = async (video: HTMLVideoElement) => {
  let expired = false;
  const capture = navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  void capture.then((lateStream) => { if (expired) stopCamera(lateStream); }, () => {});
  let stream: MediaStream;
  try { stream = await withCameraTimeout(capture); }
  catch (error) { expired = true; throw error; }
  video.srcObject = stream;
  try { await withCameraTimeout(video.play()); return stream; }
  catch (error) { stopCamera(stream); throw error; }
};

export const stopCamera = (stream: MediaStream | undefined) => {
  stream?.getTracks().forEach((track) => track.stop());
};
