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


  /* =========================================================
     CAMERA MODAL
     ========================================================= */

  function createCamera() {

    if (overlay) return;

    overlay =
      document.createElement("div");

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
            DETECTED
          </div>

          <div id="detectedSign">
            SHOW YOUR HAND
          </div>

          <div class="result-hint">
            Place your hand inside the frame
          </div>

        </div>

      </div>

    `;

    document.body.appendChild(overlay);


    video =
      document.getElementById(
        "signbridgeVideo"
      );

    canvas =
      document.getElementById(
        "handCanvas"
      );

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

        if (
          event.target === overlay
        ) {
          closeCamera();
        }

      }
    );

  }


  /* =========================================================
     STATUS
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
     OPEN CAMERA
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
        await navigator.mediaDevices
          .getUserMedia({

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


      detected(
        "CAMERA ERROR"
      );

    }

  }


  /* =========================================================
     MEDIAPIPE HANDS
     ========================================================= */

  async function setupHands() {

    if (
      typeof Hands ===
      "undefined"
    ) {

      console.error(
        "MediaPipe Hands is missing."
      );

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

        maxNumHands: 2,

        modelComplexity: 1,

        minDetectionConfidence: 0.5,

        minTrackingConfidence: 0.5

      });


      hands.onResults(
        handleResults
      );


      status(
        "Hand tracking ready • Show your hand"
      );

      detected(
        "SHOW YOUR HAND"
      );


      processFrames();


    } catch (error) {

      console.error(
        "MediaPipe setup error:",
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
     PROCESS CAMERA FRAMES
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


    const handsDetected =
      results.multiHandLandmarks || [];


    /* -------------------------------------------------------
       NO HAND
       ------------------------------------------------------- */

    if (
      handsDetected.length === 0
    ) {

      status(
        "Hand tracking ready • Show your hand"
      );

      detected(
        "SHOW YOUR HAND"
      );

      return;

    }


    /* -------------------------------------------------------
       HAND FOUND
       ------------------------------------------------------- */

    const count =
      handsDetected.length;


    status(
      `${count} ${
        count === 1
          ? "hand"
          : "hands"
      } detected`
    );


    detected(
      count === 1
        ? "HAND DETECTED"
        : `${count} HANDS DETECTED`
    );


    /* -------------------------------------------------------
       DRAW LANDMARKS
       ------------------------------------------------------- */

    handsDetected.forEach(
      (landmarks) => {

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
    );

  }


  /* =========================================================
     CLOSE CAMERA
     ========================================================= */

  function closeCamera() {

    running = false;

    processing = false;


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
          (track) => track.stop()
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

        console.warn(
          "MediaPipe close:",
          error
        );

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
    (event) => {

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
          !("speechSynthesis" in window)
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


        speech.lang = "en-US";

        speech.rate = 0.95;

        speech.pitch = 1;


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

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

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
        new SpeechRecognition();


      recognition.lang =
        "en-US";

      recognition.continuous =
        false;

      recognition.interimResults =
        false;


      recognition.onstart = () => {

        voiceToTextBtn.textContent =
          "🔴 Listening...";

      };


      recognition.onresult =
        (event) => {

          const result =
            event.results[0][0]
              .transcript;


          textInput.value =
            result;

        };


      recognition.onerror =
        (event) => {

          console.error(
            "Speech recognition:",
            event.error
          );

        };


      recognition.onend = () => {

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
              "Recognition already running."
            );

          }

        }
      );

    }

  }


  /* =========================================================
     INITIAL LOG
     ========================================================= */

  console.log(
    "SignBridge initialized successfully."
  );

});
