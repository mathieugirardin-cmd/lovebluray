const ZXING_CDN_URL = 'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm';
const BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

function normalizeBarcode(value) {
  return String(value || '').replace(/\D/g, '');
}

function stopStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
}

async function loadZxing() {
  return import(/* @vite-ignore */ ZXING_CDN_URL);
}

async function startZxingScanner(video, onDetected) {
  const { BrowserMultiFormatReader } = await loadZxing();
  const reader = new BrowserMultiFormatReader();
  let stopped = false;

  const controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
    if (stopped || !result) {
      return;
    }

    const code = normalizeBarcode(result.getText?.() || result.text);
    if (code.length >= 8) {
      onDetected(code);
    }
  });

  return {
    type: 'zxing',
    stop() {
      stopped = true;
      controls?.stop?.();
    },
  };
}

async function startNativeBarcodeDetector(video, onDetected) {
  if (!('BarcodeDetector' in window)) {
    throw new Error('Scanner code-barres indisponible sur ce navigateur.');
  }

  const detector = new window.BarcodeDetector({ formats: BARCODE_FORMATS });
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  });

  let stopped = false;
  let frame = 0;
  video.srcObject = stream;
  await video.play();

  const tick = async () => {
    if (stopped) {
      return;
    }

    try {
      const barcodes = await detector.detect(video);
      const code = normalizeBarcode(barcodes?.[0]?.rawValue);
      if (code.length >= 8) {
        onDetected(code);
        return;
      }
    } catch {
      // Keep scanning; single-frame detection errors are common on mobile.
    }

    frame = window.requestAnimationFrame(tick);
  };

  frame = window.requestAnimationFrame(tick);

  return {
    type: 'native',
    stop() {
      stopped = true;
      window.cancelAnimationFrame(frame);
      stopStream(stream);
      video.srcObject = null;
    },
  };
}

export async function startBarcodeScanner({ video, onDetected, onStatus }) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('La caméra n’est pas disponible sur ce navigateur.');
  }

  try {
    onStatus?.('Ouverture de la caméra avec ZXing...');
    return await startZxingScanner(video, onDetected);
  } catch (error) {
    onStatus?.('ZXing indisponible, tentative avec le scanner du navigateur...');
    return startNativeBarcodeDetector(video, onDetected).catch(() => {
      if (error?.name === 'NotAllowedError') {
        throw new Error('Autorisation caméra refusée. Autorise la caméra puis réessaie.');
      }
      throw error;
    });
  }
}
