import { useEffect, useRef, useState } from "react";
import {
  CameraPreview,
  CameraPreviewOptions,
} from "@capacitor-community/camera-preview";
import "./CameraPreview.css";

type IDCardCameraProps = {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
};

export default function IDCardCamera({
  onCapture,
  onClose,
}: IDCardCameraProps) {
  const [cameraReady, setCameraReady] = useState(false);
  const capturingRef = useRef(false);

  useEffect(() => {
    const root = document.getElementById("root");

    document.documentElement.classList.add("camera-preview-open");
    document.body.classList.add("camera-preview-open");
    root?.classList.add("camera-preview-open");

    document.documentElement.style.setProperty("background", "transparent", "important");
    document.body.style.setProperty("background", "transparent", "important");
    root?.style.setProperty("background", "transparent", "important");

    void startCamera();

    return () => {
      document.documentElement.classList.remove("camera-preview-open");
      document.body.classList.remove("camera-preview-open");
      root?.classList.remove("camera-preview-open");

      document.documentElement.style.removeProperty("background");
      document.body.style.removeProperty("background");
      root?.style.removeProperty("background");

      void stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const viewportWidth = Math.round(
        window.innerWidth || document.documentElement.clientWidth,
      );
      const viewportHeight = Math.round(
        window.innerHeight || document.documentElement.clientHeight,
      );

      const options: CameraPreviewOptions =   {
        position: "rear",
        toBack: true,
        parent: "cameraPreviewContainer",

        // เป็นขนาดพื้นที่ preview ไม่ใช่ความละเอียดกล้อง
        width: viewportWidth,
        height: viewportHeight,

        enableOpacity: true,

        enableZoom: true,
        lockAndroidOrientation: true,
        disableAudio: true,

        // มีผลเฉพาะ iOS
        enableHighResolution: true,
      };

      await CameraPreview.start(options);

      // รอให้กล้องปรับ exposure และ focus
      await new Promise((resolve) => setTimeout(resolve, 1200));
      
      setCameraReady(true);
    } catch (error) {
      console.error("Cannot start camera:", error);
    }
  };

  const stopCamera = async () => {
    try {
      await CameraPreview.stop();
    } catch (error) {
      console.warn("Camera already stopped:", error);
    }
  };

  const captureCard = async () => {
    if (!cameraReady || capturingRef.current) {
      return;
    }

    capturingRef.current = true;

    try {
      const result = await CameraPreview.capture({
        quality: 100,
        width: 3024,
        height: 1905,
      });

      if (!result.value) {
        throw new Error("ไม่พบข้อมูลภาพ");
      }

      const blob = base64ToBlob(result.value, "image/jpeg");

      await stopCamera();
      onCapture(blob);
      onClose();
    } catch (error) {
      console.error("Capture failed:", error);
    } finally {
      capturingRef.current = false;
    }
  };

  const closeCamera = async () => {
    await stopCamera();
    onClose();
  };

  return (
    <div className="id-camera-page">
      <div id="cameraPreviewContainer" className="camera-preview-host" aria-hidden="true" />

      <div className="camera-header">
        <button
          type="button"
          className="camera-close"
          onClick={closeCamera}
        >
          ✕
        </button>

        <div>
          <h2>ถ่ายบัตรประชาชน</h2>
          <p>วางบัตรให้อยู่ภายในกรอบ</p>
        </div>
      </div>

      <div className="card-guide-area">
        <div className="screen-mask mask-top" />
        <div className="screen-mask mask-left" />

        <div className="id-card-frame">
          <span className="corner top-left" />
          <span className="corner top-right" />
          <span className="corner bottom-left" />
          <span className="corner bottom-right" />

          <div className="card-direction">
            <div className="garuda-guide" />
            <div className="chip-guide" />
            <div className="barcode-guide" />
            <div className="photo-guide" />

            <div className="direction-text">
              <strong>ด้านหน้าบัตร</strong>
              <span>ตั้งบัตรแนวตั้ง รูปถ่ายมุมขวาบน</span>
            </div>
          </div>
        </div>

        <div className="screen-mask mask-right" />
        <div className="screen-mask mask-bottom" />
      </div>

      <div className="camera-footer">
        <p>ถ่ายในที่สว่าง และหลีกเลี่ยงแสงสะท้อน</p>

        <button
          type="button"
          className="capture-button"
          disabled={!cameraReady}
          onClick={captureCard}
          aria-label="ถ่ายรูป"
        >
          <span />
        </button>
      </div>
    </div>
  );
}

function base64ToBlob(
  base64: string,
  mimeType = "image/jpeg",
): Blob {
  const cleanBase64 = base64
    .replace(/^data:[^;]+;base64,/, "")
    .replace(/\s/g, "");

  const binary = atob(cleanBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], {
    type: mimeType,
  });
}

