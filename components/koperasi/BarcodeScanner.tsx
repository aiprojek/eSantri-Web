import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';

/**
 * Simple barcode/NIS scanner component.
 * Uses the device camera to continuously decode QR or Code128 barcodes.
 * When a code is successfully read, it calls `onDetected` with the string value.
 */
interface BarcodeScannerProps {
  /** Callback invoked with the decoded text */
  onDetected: (code: string) => void;
  /** Optional CSS class for the video element */
  className?: string;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onDetected, className }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    let stopped = false;

    const start = async () => {
      if (!videoRef.current) return;
      try {
        const controls = await codeReader.decodeFromVideoDevice(undefined, videoRef.current, (result, err, scannerControls) => {
          if (stopped) return;
          if (result) {
            onDetected(result.getText());
            stopped = true;
            scannerControls.stop();
          } else if (err && !(err instanceof NotFoundException)) {
            console.error(err);
            setError('Terjadi kesalahan saat memindai.');
          }
        });

        controlsRef.current = controls;
        if (stopped) controls.stop();
      } catch (e) {
        if (stopped) return;
        console.error(e);
        setError('Kamera tidak dapat diakses.');
      }
    };

    void start();

    return () => {
      stopped = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [onDetected]);

  return (
    <div className="relative">
      <video ref={videoRef} className={className || 'w-full h-auto'} autoPlay playsInline muted />
      {error && <div className="absolute inset-0 bg-red-500 bg-opacity-25 flex items-center justify-center text-white">{error}</div>}
    </div>
  );
};
