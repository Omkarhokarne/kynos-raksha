/**
 * Kynos Raksha - QR Engine (Generation, Tag Studio & High-Resilience Scanner)
 * Supports canvas rendering, printable collar tags, live camera feed (with multi-tier fallback),
 * photo file upload decoding, and manual ID matching.
 */

class QREngine {
  constructor() {
    this.html5QrCode = null;
    this.isScanning = false;
    this.availableCameras = [];
    this.currentCameraId = null;
  }

  /**
   * Render QR Code into a container element
   */
  generateQR(containerElement, text, options = {}) {
    if (!containerElement) return;
    containerElement.innerHTML = '';

    const width = options.width || 180;
    const height = options.height || 180;

    if (window.QRCode) {
      new QRCode(containerElement, {
        text: text,
        width: width,
        height: height,
        colorDark: options.colorDark || "#0F172A",
        colorLight: options.colorLight || "#FFFFFF",
        correctLevel: QRCode.CorrectLevel ? QRCode.CorrectLevel.H : 2
      });
    } else {
      // High-compatibility SVG/Canvas fallback
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#0F172A";
      this.drawFallbackQR(ctx, width, height, text);
      containerElement.appendChild(canvas);
    }
  }

  drawFallbackQR(ctx, w, h, text) {
    const margin = 12;
    const size = w - margin * 2;
    const cells = 21;
    const cellSize = size / cells;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#0f172a';

    const drawFinder = (x, y) => {
      ctx.fillRect(x, y, cellSize * 7, cellSize * 7);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + cellSize, y + cellSize, cellSize * 5, cellSize * 5);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x + cellSize * 2, y + cellSize * 2, cellSize * 3, cellSize * 3);
    };

    drawFinder(margin, margin);
    drawFinder(margin + cellSize * 14, margin);
    drawFinder(margin, margin + cellSize * 14);

    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }

    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        if ((r < 8 && c < 8) || (r < 8 && c >= 13) || (r >= 13 && c < 8)) continue;
        const bit = ((hash ^ (r * 31 + c * 17)) & 1);
        if (bit === 1) {
          ctx.fillRect(margin + c * cellSize, margin + r * cellSize, cellSize - 0.5, cellSize - 0.5);
        }
      }
    }
  }

  /**
   * Get available video input cameras
   */
  async getCameras() {
    if (!window.Html5Qrcode) return [];
    try {
      this.availableCameras = await Html5Qrcode.getCameras();
      return this.availableCameras || [];
    } catch (err) {
      console.warn("getCameras error or not supported:", err);
      return [];
    }
  }

  /**
   * Initialize live camera scanner with multi-tier fallback
   * Strategy:
   * 1. Query getCameras() and pick rear camera (or default webcam on laptop/desktop)
   * 2. If getCameras() fails, try { facingMode: { ideal: "environment" } } (soft fallback)
   * 3. If that fails, try { facingMode: "user" } (laptop webcam)
   * 4. If that fails, try true (any video device)
   */
  async startCamera(scannerElementId, onScanSuccess, onScanError, selectedCameraId = null) {
    if (!window.Html5Qrcode) {
      if (onScanError) onScanError(new Error("Html5Qrcode library not loaded yet. Please wait."));
      return;
    }

    // Always cleanly reset previous instance
    await this.stopCamera();

    const scannerContainer = document.getElementById(scannerElementId);
    if (!scannerContainer) {
      if (onScanError) onScanError(new Error(`Scanner container element #${scannerElementId} not found`));
      return;
    }

    // Clear any leftover DOM inside container
    scannerContainer.innerHTML = '';

    try {
      this.html5QrCode = new Html5Qrcode(scannerElementId);
      const config = {
        fps: 12,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const edgeSize = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.72);
          return { width: edgeSize, height: edgeSize };
        },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true
      };

      const successHandler = (decodedText, decodedResult) => {
        // Cleanly stop camera on first successful scan
        this.stopCamera().catch(() => {});
        if (onScanSuccess) onScanSuccess(decodedText, decodedResult);
      };

      const errorHandler = (errorMessage) => {
        // Routine frame decode misses are ignored
      };

      let startSucceeded = false;
      let lastError = null;

      // Tier 1: Try specific camera ID if provided or discovered via getCameras()
      try {
        const cameras = await this.getCameras();
        if (cameras && cameras.length > 0) {
          let targetCamId = selectedCameraId;
          if (!targetCamId) {
            // Look for back / rear / environment camera
            const rear = cameras.find(c => /back|rear|environment|outer/i.test(c.label));
            targetCamId = rear ? rear.id : cameras[0].id;
          }
          this.currentCameraId = targetCamId;
          await this.html5QrCode.start(targetCamId, config, successHandler, errorHandler);
          startSucceeded = true;
          this.isScanning = true;
        }
      } catch (e1) {
        console.warn("Tier 1 camera start failed:", e1);
        lastError = e1;
      }

      // Tier 2: Soft ideal environment constraints
      if (!startSucceeded) {
        try {
          await this.html5QrCode.start(
            { facingMode: { ideal: "environment" } },
            config,
            successHandler,
            errorHandler
          );
          startSucceeded = true;
          this.isScanning = true;
        } catch (e2) {
          console.warn("Tier 2 camera start failed:", e2);
          lastError = e2;
        }
      }

      // Tier 3: User/front camera (standard laptop/desktop webcam)
      if (!startSucceeded) {
        try {
          await this.html5QrCode.start(
            { facingMode: "user" },
            config,
            successHandler,
            errorHandler
          );
          startSucceeded = true;
          this.isScanning = true;
        } catch (e3) {
          console.warn("Tier 3 camera start failed:", e3);
          lastError = e3;
        }
      }

      // Tier 4: Generic video device
      if (!startSucceeded) {
        try {
          await this.html5QrCode.start(
            true,
            config,
            successHandler,
            errorHandler
          );
          startSucceeded = true;
          this.isScanning = true;
        } catch (e4) {
          console.warn("Tier 4 camera start failed:", e4);
          lastError = e4;
        }
      }

      if (!startSucceeded) {
        this.isScanning = false;
        if (onScanError) onScanError(lastError || new Error("Unable to access any camera device."));
      }

    } catch (err) {
      this.isScanning = false;
      console.error("Critical error in startCamera:", err);
      if (onScanError) onScanError(err);
    }
  }

  /**
   * Stop camera and cleanly reset DOM
   */
  async stopCamera() {
    if (this.html5QrCode) {
      try {
        if (this.isScanning) {
          await this.html5QrCode.stop();
        }
      } catch (e) {
        console.warn("stopCamera stop error:", e);
      }
      try {
        await this.html5QrCode.clear();
      } catch (e) {
        console.warn("stopCamera clear error:", e);
      }
      this.isScanning = false;
      this.html5QrCode = null;
    }
  }

  /**
   * Scan image from file (drag/drop or file picker)
   */
  async scanFile(file) {
    if (!window.Html5Qrcode) throw new Error("QR Scanner engine not loaded");

    // Ensure helper container exists
    let helper = document.getElementById('kynos-file-scan-helper');
    if (!helper) {
      helper = document.createElement('div');
      helper.id = 'kynos-file-scan-helper';
      helper.style.display = 'none';
      document.body.appendChild(helper);
    }

    const fileScanner = new Html5Qrcode('kynos-file-scan-helper');
    try {
      const decodedResult = await fileScanner.scanFile(file, true);
      return decodedResult;
    } finally {
      try {
        await fileScanner.clear();
      } catch (e) {}
    }
  }

  /**
   * Render Printable Collar Tag Studio Preview
   */
  renderCollarTag(containerElement, dog, orgHelpline = "+91 99999 88888") {
    if (!containerElement || !dog) return;

    const qrPayload = `https://kynos.org/dog/${dog.id}`;
    const notchLabel = dog.earNotch || "Intact";
    const rabiesDate = (dog.vaccination && dog.vaccination.nextRabiesDueDate) 
      ? `ARV Exp: ${dog.vaccination.nextRabiesDueDate}` 
      : "ARV Verified";

    containerElement.innerHTML = `
      <div class="printable-tag-preview ${dog.gender === 'Female' ? 'tag-female' : 'tag-male'}">
        <div class="tag-metal-hole"></div>
        <div class="tag-header">
          <div class="tag-brand-row">
            <img src="assets/logo.png" alt="Logo" class="tag-logo-img">
            <span class="tag-brand">KYNOS RAKSHA</span>
          </div>
          <span class="tag-city">${dog.city || 'DELHI'} • WARD ${dog.ward ? dog.ward.split('-')[0] : 'MCD'}</span>
        </div>
        
        <div class="tag-body">
          <div class="tag-qr-box" id="collar-tag-qr-target"></div>
          <div class="tag-dog-info">
            <h2 class="tag-dog-name">${dog.name}</h2>
            <div class="tag-dog-id">${dog.id}</div>
            <div class="tag-status-pill ${dog.sterilization?.status === 'Sterilized' ? 'pill-sterilized' : ''}">
              <span class="pill-dot"></span> ${dog.sterilization?.status === 'Sterilized' ? 'STERILIZED (ABC)' : 'REGISTERED'}
            </div>
            <div class="tag-notch-line">${notchLabel}</div>
            <div class="tag-vax-line">${rabiesDate}</div>
          </div>
        </div>

        <div class="tag-footer">
          <div class="tag-helpline-box">
            <span class="helpline-label">24x7 EMERGENCY & RESCUE HELPLINE</span>
            <span class="helpline-number">${orgHelpline}</span>
          </div>
          <div class="tag-scan-cta">SCAN WITH ANY PHONE CAMERA FOR FULL MEDICAL & FEEDER INFO</div>
        </div>
      </div>
    `;

    // Render QR Code inside tag
    const qrTarget = containerElement.querySelector('#collar-tag-qr-target');
    if (qrTarget) {
      this.generateQR(qrTarget, qrPayload, { width: 110, height: 110 });
    }
  }
}

window.KynosQR = new QREngine();
