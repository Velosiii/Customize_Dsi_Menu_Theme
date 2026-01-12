const fileInput = document.getElementById("fileInput");
const convertBtn = document.getElementById("convertBtn");

convertBtn.onclick = async () => {
  if (!fileInput.files.length) {
    alert("MP3 dosyası seç");
    return;
  }

  const file = fileInput.files[0];
  const arrayBuffer = await file.arrayBuffer();

  const audioCtx = new AudioContext();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  const length = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;

  // MONO buffer oluştur
  const monoBuffer = audioCtx.createBuffer(1, length, sampleRate);
  const monoData = monoBuffer.getChannelData(0);

  const ch0 = audioBuffer.getChannelData(0);
  const ch1 = audioBuffer.numberOfChannels > 1
    ? audioBuffer.getChannelData(1)
    : ch0;

  // Stereo → Mono (ortalama)
  for (let i = 0; i < length; i++) {
    monoData[i] = (ch0[i] + ch1[i]) / 2;
  }

  // WAV'e çevir
  const wavBlob = bufferToWav(monoBuffer);

  // İndir
  const url = URL.createObjectURL(wavBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bgm.wav";
  a.click();
  URL.revokeObjectURL(url);
};

// WAV encoder
function bufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);

  let offset = 0;

  const writeString = s => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset++, s.charCodeAt(i));
    }
  };

  writeString("RIFF");
  view.setUint32(offset, length - 8, true); offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, numOfChan, true); offset += 2;
  view.setUint32(offset, buffer.sampleRate, true); offset += 4;
  view.setUint32(offset, buffer.sampleRate * 2, true); offset += 4;
  view.setUint16(offset, numOfChan * 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  writeString("data");
  view.setUint32(offset, length - offset - 4, true); offset += 4;

  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: "audio/wav" });
}
