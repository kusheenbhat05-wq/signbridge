document.addEventListener("DOMContentLoaded", () => {
  /* =========================================================
     SIGNBRIDGE
     Camera + MediaPipe Hands + Text-to-Speech + Voice-to-Text
     ========================================================= */

  const openCameraBtn = document.getElementById("openCameraBtn");
  const textToVoiceBtn = document.getElementById("textToVoiceBtn");
  const voiceToTextBtn = document.getElementById("voiceToTextBtn");

  let cameraOverlay = null;
  let videoElement = null;
  let handCanvas = null;
  let canvasCtx = null;

  let mediaStream = null;
  let hands = null;

  let cameraRunning = false;
  let processingFrame = false;
  let animationFrameId = null;

  /* =========================================================
     HELPERS
     ========================================================= */

  function setStatus(message, type = "normal") {
    const status = document.getElementById("cameraStatus");
    if (!status) return;

    status.textContent = message;

    status.classList.remove(
      "success",
      "error",
      "warning"
    );

    if (type === "success") status.classList.add("success");
    if (type === "error") status.classList.add("error");
    if (type === "warning") status.classList.add("warning");
  }

  function setDetectedSign(text) {
    const detected = document.getElementById("detectedSign");

    if (detected) {
      detected.textContent = text;
    }
  }

  function clearCanvas() {
    if (!canvasCtx || !handCanvas) return;

    canvasCtx.clearRect(
      0,
      0,
      handCanvas.width,
      handCanvas.height
    );
  }

  /* =========================================================
     CAMERA MODAL
     ========================================================= */

  function createCameraModal() {
    if (cameraOverlay) return;

    cameraOverlay = document.createElement("div");
    cameraOverlay.id = "cameraOverlay";

    cameraOverlay.innerHTML = `
      <div class="camera-modal">

        <div class="camera-header">
          <div>
            <span class="live-indicator"></span>
            <span>LIVE SIGN DETECTION</span>
          </div>

          <button
            class="camera-close"
            id="closeCameraBtn"
            aria-label="Close camera"
          >
            ×
          </button>
        </div>

        <div class="camera-status" id="cameraStatus">
          Opening camera...
        </div>

        <div class="camera-view">

          <video
            id="signbridgeVideo"
            autoplay
            playsinline
            muted
          ></video>

          <canvas id="handCanvas"></canvas>

          <div class="camera-guide">
            <span class="guide-corner top-left"></span>
            <span class="guide-corner top-right"></span>
            <span class="guide-corner bottom-left"></span>
            <span class="guide-corner bottom-right"></span>
          </div>

        </div>

        <div class="recognition-result">

          <div class="result-label">
            DETECTED SIGN
          </div>

          <div id="detectedSign">
            SHOW YOUR HAND
          </div>

          <div class="result-hint">
            Keep your hand inside the frame
          </div>

        </div>

      </div>
    `;

    document.body.appendChild(cameraOverlay);

    videoElement = document.getElementById("signbridgeVideo");
    handCanvas = document.getElementById("handCanvas");

    canvasCtx = handCanvas.getContext("2d");

    document
      .getElementById("closeCameraBtn")
      .addEventListener("click", closeCamera);

    cameraOverlay.addEventListener("click", (event) => {
      if (event.target === cameraOverlay) {
        closeCamera();
      }
    });
  }

  /* =========================================================
     START CAMERA
     ========================================================= */

  async function startCamera() {
    createCameraModal();

    cameraOverlay.classList.add("active");

    setStatus("Opening camera...", "warning");
    setDetectedSign("STARTING...");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus(
        "Camera is not supported by this browser.",
        "error"
      );

      setDetectedSign("CAMERA ERROR");
      return;
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: {
            ideal: 1280
          },
          height: {
            ideal: 720
          }
        },
        audio: false
      });

      videoElement.srcObject = mediaStream;

      await videoElement.play();

      cameraRunning = true;

      setStatus("Camera ready — loading hand tracking...", "success");
      setDetectedSign("LOADING...");

      await initializeHands();

    } catch (error) {
      console.error("Camera error:", error);

      cameraRunning = false;

      if (error.name === "NotAllowedError") {
        setStatus(
          "Camera permission blocked. Allow camera access.",
          "error"
        );
      } else if (error.name === "NotFoundError") {
        setStatus(
          "No camera was found on this device.",
          "error"
        );
      } else if (error.name === "NotReadableError") {
        setStatus(
          "Camera is already being used by another app.",
          "error"
        );
      } else {
        setStatus(
          "Unable to open camera.",
          "error"
        );
      }

      setDetectedSign("CAMERA ERROR");
    }
  }

  /* =========================================================
     MEDIAPIPE INITIALIZATION
     ========================================================= */

  async function initializeHands() {
    if (!cameraRunning) return;

    if (typeof Hands === "undefined") {
      console.error("MediaPipe Hands library not found.");

      setStatus(
        "Hand tracking library failed to load.",
        "error"
      );

      setDetectedSign("TRACKING ERROR");
      return;
    }

    try {
      setStatus(
        "Loading hand tracking...",
        "warning"
      );

      hands = new Hands({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      hands.onResults(handleHandResults);

      setStatus(
        "Hand tracking ready — show your hand",
        "success"
      );

      setDetectedSign("SHOW YOUR HAND");

      startFrameLoop();

    } catch (error) {
      console.error(
        "MediaPipe initialization error:",
        error
      );

      setStatus(
        "Hand tracking failed to initialize.",
        "error"
      );

      setDetectedSign("TRACKING ERROR");
    }
  }

  /* =========================================================
     FRAME LOOP
     ========================================================= */

  function startFrameLoop() {
    if (!cameraRunning) return;

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    const processFrame = async () => {
      if (!cameraRunning) return;

      if (
        videoElement &&
        videoElement.readyState >= 2 &&
        !processingFrame
      ) {
        processingFrame = true;

        try {
          await hands.send({
            image: videoElement
          });
        } catch (error) {
          console.error(
            "MediaPipe frame error:",
            error
          );
        } finally {
          processingFrame = false;
        }
      }

      animationFrameId =
        requestAnimationFrame(processFrame);
    };

    processFrame();
  }

  /* =========================================================
     HAND RESULTS
     ========================================================= */

  function handleHandResults(results) {
    if (!cameraRunning) return;

    if (!videoElement || !handCanvas || !canvasCtx) {
      return;
    }

    const width =
      videoElement.videoWidth || 1280;

    const height =
      videoElement.videoHeight || 720;

    if (
      handCanvas.width !== width ||
      handCanvas.height !== height
    ) {
      handCanvas.width = width;
      handCanvas.height = height;
    }

    clearCanvas();

    const landmarks =
      results.multiHandLandmarks || [];

    /* ---------------------------------------------------------
       NO HAND
       --------------------------------------------------------- */

    if (landmarks.length === 0) {
      setStatus(
        "Hand tracking ready — show your hand",
        "success"
      );

      setDetectedSign("SHOW YOUR HAND");

      return;
    }

    /* ---------------------------------------------------------
       HAND DETECTED
       --------------------------------------------------------- */

    const handCount = landmarks.length;

    if (handCount === 1) {
      setStatus(
        "1 hand detected",
        "success"
      );
    } else {
      setStatus(
        `${handCount} hands detected`,
        "success"
      );
    }

    setDetectedSign(
      handCount === 1
        ? "HAND DETECTED"
        : `${handCount} HANDS DETECTED`
    );

    /* ---------------------------------------------------------
       DRAW LANDMARKS
       --------------------------------------------------------- */

    if (
      typeof drawConnectors === "function" &&
      typeof drawLandmarks === "function" &&
      typeof HAND_CONNECTIONS !== "undefined"
    ) {
      for (const landmarksSet of landmarks) {

        drawConnectors(
          canvasCtx,
          landmarksSet,
          HAND_CONNECTIONS,
          {
            color: "#e47b67",
            lineWidth: 4
          }
        );

        drawLandmarks(
          canvasCtx,
          landmarksSet,
          {
            color: "#7655a8",
            lineWidth: 2,
            radius: 5
          }
        );
      }
    } else {
      /*
       * Fallback drawing if MediaPipe drawing utilities
       * are unavailable.
       */

      for (const landmarksSet of landmarks) {

        canvasCtx.fillStyle = "#7655a8";

        for (const point of landmarksSet) {

          const x =
            point.x * handCanvas.width;

          const y =
            point.y * handCanvas.height;

          canvasCtx.beginPath();

          canvasCtx.arc(
            x,
            y,
            6,
            0,
            Math.PI * 2
          );

          canvasCtx.fill();
        }
      }
    }
  }

  /* =========================================================
     CLOSE CAMERA
     ========================================================= */

  function closeCamera() {
    cameraRunning = false;
    processingFrame = false;

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    /* Stop camera */

    if (mediaStream) {
      mediaStream
        .getTracks()
        .forEach((track) => track.stop());

      mediaStream = null;
    }

    /* Stop video */

    if (videoElement) {
      videoElement.pause();
      videoElement.srcObject = null;
    }

    /* Close MediaPipe */

    if (hands) {
      try {
        hands.close();
      } catch (error) {
        console.warn(
          "MediaPipe close warning:",
          error
        );
      }

      hands = null;
    }

    clearCanvas();

    if (cameraOverlay) {
      cameraOverlay.classList.remove("active");

      setTimeout(() => {
        if (
          cameraOverlay &&
          cameraOverlay.parentNode
        ) {
          cameraOverlay.parentNode.removeChild(
            cameraOverlay
          );
        }

        cameraOverlay = null;
        videoElement = null;
        handCanvas = null;
        canvasCtx = null;

      }, 250);
    }
  }

  /* =========================================================
     OPEN CAMERA BUTTON
     ========================================================= */

  if (openCameraBtn) {
    openCameraBtn.addEventListener(
      "click",
      startCamera
    );
  }

  /* =========================================================
     ESC KEY
     ========================================================= */

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape" &&
        cameraOverlay
      ) {
        closeCamera();
      }
    }
  );

  /* =========================================================
     TEXT → VOICE
     ========================================================= */

  if (textToVoiceBtn) {
    textToVoiceBtn.addEventListener(
      "click",
      () => {

        const textInput =
          document.querySelector(
            "#textInput"
          ) ||
          document.querySelector(
            "textarea"
          );

        if (!textInput) return;

        const text =
          textInput.value.trim();

        if (!text) {
          alert(
            "Please enter some text first."
          );

          return;
        }

        if (
          !("speechSynthesis" in window)
        ) {
          alert(
            "Text-to-speech is not supported in this browser."
          );

          return;
        }

        window.speechSynthesis.cancel();

        const speech =
          new SpeechSynthesisUtterance(text);

        speech.lang = "en-US";
        speech.rate = 0.95;
        speech.pitch = 1;

        window.speechSynthesis.speak(
          speech
        );
      }
    );
  }

  /* =========================================================
     VOICE → TEXT
     ========================================================= */

  if (voiceToTextBtn) {

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

      voiceToTextBtn.addEventListener(
        "click",
        () => {
          alert(
            "Voice recognition is not supported in this browser. Try Google Chrome."
          );
        }
      );

    } else {

      const recognition =
        new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {

        voiceToTextBtn.classList.add(
          "recording"
        );

        voiceToTextBtn.setAttribute(
          "aria-label",
          "Listening..."
        );
      };

      recognition.onresult = (event) => {

        const transcript =
          event.results[0][0].transcript;

        const textInput =
          document.querySelector(
            "#textInput"
          ) ||
          document.querySelector(
            "textarea"
          );

        if (textInput) {
          textInput.value = transcript;

          textInput.dispatchEvent(
            new Event("input", {
              bubbles: true
            })
          );
        }
      };

      recognition.onerror = (event) => {
        console.error(
          "Speech recognition error:",
          event.error
        );
      };

      recognition.onend = () => {

        voiceToTextBtn.classList.remove(
          "recording"
        );

        voiceToTextBtn.setAttribute(
          "aria-label",
          "Voice to text"
        );
      };

      voiceToTextBtn.addEventListener(
        "click",
        () => {

          try {
            recognition.start();
          } catch (error) {
            console.warn(
              "Recognition could not start:",
              error
            );
          }

        }
      );
    }
  }

  /* =========================================================
     SCROLL REVEAL
     ========================================================= */

  const revealElements =
    document.querySelectorAll(
      ".reveal, .fade-up, .project-card, .feature-card"
    );

  if (
    revealElements.length &&
    "IntersectionObserver" in window
  ) {

    const observer =
      new IntersectionObserver(
        (entries) => {

          entries.forEach(
            (entry) => {

              if (
                entry.isIntersecting
              ) {

                entry.target.classList.add(
                  "visible"
                );

                observer.unobserve(
                  entry.target
                );
              }

            }
          );

        },
        {
          threshold: 0.12
        }
      );

    revealElements.forEach(
      (element) => {
        observer.observe(element);
      }
    );
  }

  /* =========================================================
     CURSOR GLOW
     ========================================================= */

  const cursorGlow =
    document.querySelector(
      ".cursor-glow"
    );

  if (cursorGlow) {

    document.addEventListener(
      "mousemove",
      (event) => {

        cursorGlow.style.left =
          `${event.clientX}px`;

        cursorGlow.style.top =
          `${event.clientY}px`;

      }
    );
  }

});
