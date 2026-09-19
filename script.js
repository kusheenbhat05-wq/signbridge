document.addEventListener("DOMContentLoaded", () => {

  /* =========================================================
     ELEMENTS
     ========================================================= */

  const openCameraBtn =
    document.getElementById("openCameraBtn");

  const heroCameraBtn =
    document.getElementById("heroCameraBtn");

  const featureCameraBtn =
    document.getElementById("featureCameraBtn");

  const textToVoiceBtn =
    document.getElementById("textToVoiceBtn");

  const voiceToTextBtn =
    document.getElementById("voiceToTextBtn");

  const textInput =
    document.getElementById("textInput");


  /* =========================================================
     CAMERA VARIABLES
     ========================================================= */

  let overlay = null;
  let video = null;
  let canvas = null;
  let ctx = null;

  let stream = null;
  let hands = null;

  let running = false;
  let processing = false;
  let frameId = null;

  let lastGesture = "";
  let gestureStableCount = 0;


  /* =========================================================
     CAMERA UI
     ========================================================= */

  function createCamera() {

    if (overlay) return;

    overlay = document.createElement("div");
    overlay.id = "cameraOverlay";

    overlay.innerHTML = `
      <div class="camera-modal">

        <div class="camera-header">

          <div>
            <span class="live-indicator"></span>
            LIVE SIGN DETECTION
          </div>

          <button
            class="camera-close"
            id="closeCamera"
          >
            ×
          </button>

        </div>

        <div
          class="camera-status"
          id="cameraStatus"
        >
          Opening camera...
        </div>

        <div class="camera-view">

          <video
            id="signbridgeVideo"
            autoplay
            playsinline
            muted
          ></video>

          <canvas
            id="handCanvas"
          ></canvas>

          <div class="camera-guide">

            <span
              class="guide-corner top-left"
            ></span>

            <span
              class="guide-corner top-right"
            ></span>

            <span
              class="guide-corner bottom-left"
            ></span>

            <span
              class="guide-corner bottom-right"
            ></span>

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
            Hold a gesture steady for recognition
          </div>

        </div>

      </div>
    `;

    document.body.appendChild(overlay);

    video =
      document.getElementById("signbridgeVideo");

    canvas =
      document.getElementById("handCanvas");

    ctx =
      canvas.getContext("2d");

    document
      .getElementById("closeCamera")
      .addEventListener(
        "click",
        closeCamera
      );

    overlay.addEventListener(
      "click",
      (event) => {

        if (event.target === overlay) {
          closeCamera();
        }

      }
    );

  }


  /* =========================================================
     UI HELPERS
     ========================================================= */

  function status(message) {

    const element =
      document.getElementById(
        "cameraStatus"
      );

    if (element) {
      element.textContent = message;
    }

  }


  function detected(message) {

    const element =
      document.getElementById(
        "detectedSign"
      );

    if (element) {
      element.textContent = message;
    }

  }


  /* =========================================================
     START CAMERA
     ========================================================= */

  async function openCamera() {

    createCamera();

    overlay.classList.add("active");

    status("Requesting camera access...");
    detected("STARTING...");

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {

      status(
        "Camera API is not supported."
      );

      detected("CAMERA ERROR");

      return;
    }

    try {

      stream =
        await navigator.mediaDevices.getUserMedia({
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

      video.srcObject = stream;

      await video.play();

      running = true;

      status(
        "Camera ready • Loading hand tracking..."
      );

      detected("LOADING...");

      await setupHands();

    } catch (error) {

      console.error(
        "Camera error:",
        error
      );

      running = false;

      if (
        error.name ===
        "NotAllowedError"
      ) {

        status(
          "Camera permission denied."
        );

      } else if (
        error.name ===
        "NotFoundError"
      ) {

        status(
          "No camera found."
        );

      } else {

        status(
          "Could not start camera."
        );

      }

      detected("CAMERA ERROR");

    }

  }


  /* =========================================================
     MEDIAPIPE
     ========================================================= */

  async function setupHands() {

    if (
      typeof Hands === "undefined"
    ) {

      status(
        "MediaPipe failed to load."
      );

      detected(
        "TRACKING ERROR"
      );

      return;
    }

    try {

      hands =
        new Hands({

          locateFile: (file) => {

            return (
              "https://cdn.jsdelivr.net/npm/" +
              "@mediapipe/hands/" +
              file
            );

          }

        });

      hands.setOptions({

        maxNumHands: 1,

        modelComplexity: 1,

        minDetectionConfidence: 0.55,

        minTrackingConfidence: 0.55

      });

      hands.onResults(
        handleResults
      );

      status(
        "Hand tracking ready • Show a gesture"
      );

      detected(
        "SHOW YOUR HAND"
      );

      processFrames();

    } catch (error) {

      console.error(
        "MediaPipe error:",
        error
      );

      status(
        "Could not initialize hand tracking."
      );

      detected(
        "TRACKING ERROR"
      );

    }

  }


  /* =========================================================
     FRAME LOOP
     ========================================================= */

  function processFrames() {

    if (!running) return;

    async function loop() {

      if (!running) return;

      if (
        video.readyState >= 2 &&
        !processing
      ) {

        processing = true;

        try {

          await hands.send({
            image: video
          });

        } catch (error) {

          console.error(
            "Frame processing error:",
            error
          );

        }

        processing = false;

      }

      frameId =
        requestAnimationFrame(loop);

    }

    loop();

  }


  /* =========================================================
     HAND RESULTS
     ========================================================= */

  function handleResults(results) {

    if (!running) return;

    const width =
      video.videoWidth || 1280;

    const height =
      video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(
      0,
      0,
      width,
      height
    );

    const detectedHands =
      results.multiHandLandmarks || [];


    /* -------------------------------------------------------
       NO HAND
       ------------------------------------------------------- */

    if (
      detectedHands.length === 0
    ) {

      lastGesture = "";
      gestureStableCount = 0;

      status(
        "Hand tracking ready • Show a gesture"
      );

      detected(
        "SHOW YOUR HAND"
      );

      return;
    }


    /* -------------------------------------------------------
       LANDMARKS
       ------------------------------------------------------- */

    const landmarks =
      detectedHands[0];


    drawHand(landmarks);


    /* -------------------------------------------------------
       RECOGNIZE GESTURE
       ------------------------------------------------------- */

    const gesture =
      recognizeGesture(
        landmarks
      );


    if (!gesture) {

      status(
        "Hand detected • Try a gesture"
      );

      detected(
        "ANALYZING..."
      );

      return;
    }


    /* -------------------------------------------------------
       STABILIZE GESTURE
       ------------------------------------------------------- */

    if (
      gesture === lastGesture
    ) {

      gestureStableCount++;

    } else {

      lastGesture = gesture;

      gestureStableCount = 0;

    }


    status(
      "Gesture detected • Hold steady"
    );


    if (
      gestureStableCount >= 5
    ) {

      detected(
        gesture
      );

    } else {

      detected(
        "ANALYZING..."
      );

    }

  }


  /* =========================================================
     DRAW HAND
     ========================================================= */

  function drawHand(landmarks) {

    if (
      typeof drawConnectors ===
        "function" &&
      typeof HAND_CONNECTIONS !==
        "undefined"
    ) {

      drawConnectors(
        ctx,
        landmarks,
        HAND_CONNECTIONS,
        {
          color: "#e47b67",
          lineWidth: 4
        }
      );

    }


    if (
      typeof drawLandmarks ===
      "function"
    ) {

      drawLandmarks(
        ctx,
        landmarks,
        {
          color: "#7655a8",
          lineWidth: 2,
          radius: 5
        }
      );

    }

  }


  /* =========================================================
     LANDMARK HELPERS
     ========================================================= */

  function distance(a, b) {

    const x =
      a.x - b.x;

    const y =
      a.y - b.y;

    const z =
      (a.z || 0) -
      (b.z || 0);

    return Math.sqrt(
      x * x +
      y * y +
      z * z
    );

  }


  function fingerExtended(
    landmarks,
    tip,
    pip
  ) {

    return (
      distance(
        landmarks[tip],
        landmarks[0]
      ) >
      distance(
        landmarks[pip],
        landmarks[0]
      ) * 1.08
    );

  }


  function getFingerState(
    landmarks
  ) {

    return {

      index: fingerExtended(
        landmarks,
        8,
        6
      ),

      middle: fingerExtended(
        landmarks,
        12,
        10
      ),

      ring: fingerExtended(
        landmarks,
        16,
        14
      ),

      pinky: fingerExtended(
        landmarks,
        20,
        18
      )

    };

  }


  /* =========================================================
     GESTURE RECOGNITION
     ========================================================= */

  function recognizeGesture(
    landmarks
  ) {

    const fingers =
      getFingerState(
        landmarks
      );


    const thumbTip =
      landmarks[4];

    const indexTip =
      landmarks[8];


    /* -------------------------------------------------------
       OK
       Thumb + index close together
       ------------------------------------------------------- */

    const thumbIndexDistance =
      distance(
        thumbTip,
        indexTip
      );


    if (
      thumbIndexDistance <
      0.07 &&
      fingers.middle &&
      fingers.ring &&
      fingers.pinky
    ) {

      return "OK";

    }


    /* -------------------------------------------------------
       OPEN HAND
       ------------------------------------------------------- */

    if (
      fingers.index &&
      fingers.middle &&
      fingers.ring &&
      fingers.pinky
    ) {

      return "OPEN HAND";

    }


    /* -------------------------------------------------------
       PEACE
       ------------------------------------------------------- */

    if (
      fingers.index &&
      fingers.middle &&
      !fingers.ring &&
      !fingers.pinky
    ) {

      return "PEACE";

    }


    /* -------------------------------------------------------
       ONE
       ------------------------------------------------------- */

    if (
      fingers.index &&
      !fingers.middle &&
      !fingers.ring &&
      !fingers.pinky
    ) {

      return "ONE";

    }


    /* -------------------------------------------------------
       FIST
       ------------------------------------------------------- */

    if (
      !fingers.index &&
      !fingers.middle &&
      !fingers.ring &&
      !fingers.pinky
    ) {

      return "FIST";

    }


    return null;

  }


  /* =========================================================
     CLOSE CAMERA
     ========================================================= */

  function closeCamera() {

    running = false;

    processing = false;

    lastGesture = "";

    gestureStableCount = 0;


    if (frameId) {

      cancelAnimationFrame(
        frameId
      );

      frameId = null;

    }


    if (stream) {

      stream
        .getTracks()
        .forEach(
          track => track.stop()
        );

      stream = null;

    }


    if (video) {

      video.pause();

      video.srcObject = null;

    }


    if (hands) {

      try {
        hands.close();
      } catch (error) {
        console.warn(error);
      }

      hands = null;

    }


    if (overlay) {

      overlay.classList.remove(
        "active"
      );

      setTimeout(() => {

        if (
          overlay &&
          overlay.parentNode
        ) {

          overlay.parentNode.removeChild(
            overlay
          );

        }

        overlay = null;
        video = null;
        canvas = null;
        ctx = null;

      }, 250);

    }

  }


  /* =========================================================
     CAMERA BUTTONS
     ========================================================= */

  if (openCameraBtn) {

    openCameraBtn.addEventListener(
      "click",
      openCamera
    );

  }


  if (heroCameraBtn) {

    heroCameraBtn.addEventListener(
      "click",
      openCamera
    );

  }


  if (featureCameraBtn) {

    featureCameraBtn.addEventListener(
      "click",
      openCamera
    );

  }


  /* =========================================================
     ESCAPE
     ========================================================= */

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape" &&
        overlay
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

        const text =
          textInput.value.trim();


        if (!text) {

          alert(
            "Please type something first."
          );

          return;

        }


        if (
          !window.speechSynthesis
        ) {

          alert(
            "Text-to-speech is not supported."
          );

          return;

        }


        speechSynthesis.cancel();


        const speech =
          new SpeechSynthesisUtterance(
            text
          );


        speech.lang =
          "en-US";

        speech.rate =
          0.95;

        speech.pitch =
          1;


        speechSynthesis.speak(
          speech
        );

      }
    );

  }


  /* =========================================================
     VOICE → TEXT
     ========================================================= */

  if (voiceToTextBtn) {

    const Recognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;


    if (!Recognition) {

      voiceToTextBtn.addEventListener(
        "click",
        () => {

          alert(
            "Voice recognition works best in Google Chrome."
          );

        }
      );

    } else {

      const recognition =
        new Recognition();


      recognition.lang =
        "en-US";

      recognition.continuous =
        false;

      recognition.interimResults =
        false;


      recognition.onstart =
        () => {

          voiceToTextBtn.textContent =
            "🔴 Listening...";

        };


      recognition.onresult =
        event => {

          const transcript =
            event.results[0][0]
              .transcript;

          textInput.value =
            transcript;

        };


      recognition.onerror =
        event => {

          console.error(
            "Speech recognition:",
            event.error
          );

        };


      recognition.onend =
        () => {

          voiceToTextBtn.textContent =
            "🎙 Voice → Text";

        };


      voiceToTextBtn.addEventListener(
        "click",
        () => {

          try {

            recognition.start();

          } catch (error) {

            console.log(
              "Recognition already active."
            );

          }

        }
      );

    }

  }


  /* =========================================================
     INITIALIZED
     ========================================================= */

  console.log(
    "SignBridge gesture recognition loaded."
  );

});
