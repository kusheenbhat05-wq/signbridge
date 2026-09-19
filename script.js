// ============================================================
// SIGNBRIDGE — MAIN SCRIPT
// MediaPipe Hands + Camera + Drawing
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    // ------------------------------------------------------------
    // ELEMENTS
    // ------------------------------------------------------------

    const openCameraButton = document.getElementById("openCameraButton");
    const textVoiceButton = document.getElementById("textVoiceButton");
    const voiceTextButton = document.getElementById("voiceTextButton");

    // ------------------------------------------------------------
    // CAMERA MODAL
    // ------------------------------------------------------------

    let cameraModal = null;
    let videoElement = null;
    let canvasElement = null;
    let canvasCtx = null;

    let camera = null;
    let hands = null;

    let cameraRunning = false;
    let handsReady = false;


    // ------------------------------------------------------------
    // CREATE CAMERA MODAL
    // ------------------------------------------------------------

    function createCameraModal() {

        if (document.getElementById("signbridgeCameraModal")) {
            return;
        }

        cameraModal = document.createElement("div");

        cameraModal.id = "signbridgeCameraModal";
        cameraModal.className = "camera-modal";

        cameraModal.innerHTML = `
            <div class="camera-box">

                <button class="camera-close" id="closeCameraButton">
                    ×
                </button>

                <div class="camera-header">
                    <div>
                        <span class="camera-eyebrow">
                            LIVE TRANSLATION
                        </span>

                        <h2>Show your sign</h2>
                    </div>

                    <div class="camera-status">
                        <span class="status-dot"></span>
                        CAMERA ACTIVE
                    </div>
                </div>

                <div class="camera-view">

                    <video
                        id="signbridgeVideo"
                        autoplay
                        playsinline
                        muted>
                    </video>

                    <canvas id="signbridgeCanvas"></canvas>

                    <div class="camera-guide">
                        <div class="guide-corner top-left"></div>
                        <div class="guide-corner top-right"></div>
                        <div class="guide-corner bottom-left"></div>
                        <div class="guide-corner bottom-right"></div>

                        <span>
                            Place your hand inside the frame
                        </span>
                    </div>

                    <div class="recognition-result">
                        <small>HAND TRACKING</small>

                        <strong id="recognitionText">
                            Starting...
                        </strong>
                    </div>

                </div>

                <div class="camera-footer">

                    <div>
                        <span class="footer-label">
                            DETECTION
                        </span>

                        <span id="handCount">
                            Initializing...
                        </span>
                    </div>

                    <div>
                        <span class="footer-label">
                            STATUS
                        </span>

                        <span id="trackingStatus">
                            Loading...
                        </span>
                    </div>

                </div>

            </div>
        `;

        document.body.appendChild(cameraModal);

        videoElement =
            document.getElementById("signbridgeVideo");

        canvasElement =
            document.getElementById("signbridgeCanvas");

        canvasCtx =
            canvasElement.getContext("2d");

        document
            .getElementById("closeCameraButton")
            .addEventListener("click", closeCamera);

        // Close when clicking outside camera box
        cameraModal.addEventListener("click", (event) => {

            if (event.target === cameraModal) {
                closeCamera();
            }

        });

    }


    // ------------------------------------------------------------
    // UPDATE STATUS
    // ------------------------------------------------------------

    function updateStatus(message) {

        const recognitionText =
            document.getElementById("recognitionText");

        const handCount =
            document.getElementById("handCount");

        const trackingStatus =
            document.getElementById("trackingStatus");

        if (recognitionText) {
            recognitionText.textContent = message;
        }

        if (trackingStatus) {
            trackingStatus.textContent = message;
        }

    }


    // ------------------------------------------------------------
    // OPEN CAMERA
    // ------------------------------------------------------------

    async function openCamera() {

        createCameraModal();

        cameraModal.classList.add("active");

        updateStatus("Loading hand tracking...");

        try {

            // ----------------------------------------------------
            // CHECK BROWSER SUPPORT
            // ----------------------------------------------------

            if (!navigator.mediaDevices ||
                !navigator.mediaDevices.getUserMedia) {

                throw new Error(
                    "Camera API is not supported in this browser."
                );

            }


            // ----------------------------------------------------
            // INITIALIZE MEDIAPIPE HANDS
            // ----------------------------------------------------

            if (!hands) {

                hands = new Hands({

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


                hands.onResults(onHandResults);

                handsReady = true;

            }


            // ----------------------------------------------------
            // START CAMERA
            // ----------------------------------------------------

            if (!camera) {

                camera = new Camera(videoElement, {

                    onFrame: async () => {

                        if (!cameraRunning) {
                            return;
                        }

                        try {

                            await hands.send({
                                image: videoElement
                            });

                        } catch (error) {

                            console.error(
                                "MediaPipe frame error:",
                                error
                            );

                        }

                    },

                    width: 1280,

                    height: 720

                });

            }


            cameraRunning = true;

            camera.start();

            updateStatus("Show your hand");

        } catch (error) {

            console.error(
                "SignBridge camera error:",
                error
            );

            updateStatus("Camera / tracking failed");

            const handCount =
                document.getElementById("handCount");

            if (handCount) {

                handCount.textContent =
                    "Check browser permissions";

            }

        }

    }


    // ------------------------------------------------------------
    // MEDIAPIPE RESULTS
    // ------------------------------------------------------------

    function onHandResults(results) {

        if (!canvasElement || !canvasCtx) {
            return;
        }


        // --------------------------------------------------------
        // MAKE CANVAS SAME SIZE AS VIDEO
        // --------------------------------------------------------

        const width =
            videoElement.videoWidth || 1280;

        const height =
            videoElement.videoHeight || 720;


        if (
            canvasElement.width !== width ||
            canvasElement.height !== height
        ) {

            canvasElement.width = width;

            canvasElement.height = height;

        }


        // --------------------------------------------------------
        // CLEAR
        // --------------------------------------------------------

        canvasCtx.save();

        canvasCtx.clearRect(
            0,
            0,
            canvasElement.width,
            canvasElement.height
        );


        // --------------------------------------------------------
        // DRAW HAND LANDMARKS
        // --------------------------------------------------------

        if (
            results.multiHandLandmarks &&
            results.multiHandLandmarks.length > 0
        ) {

            const count =
                results.multiHandLandmarks.length;


            // Status
            const handCount =
                document.getElementById("handCount");

            const recognitionText =
                document.getElementById("recognitionText");

            const trackingStatus =
                document.getElementById("trackingStatus");


            if (handCount) {

                handCount.textContent =
                    count === 1
                        ? "1 hand detected"
                        : `${count} hands detected`;

            }


            if (recognitionText) {

                recognitionText.textContent =
                    count === 1
                        ? "HAND DETECTED ✓"
                        : `${count} HANDS DETECTED ✓`;

            }


            if (trackingStatus) {

                trackingStatus.textContent =
                    "Tracking active";

            }


            // Draw every detected hand
            for (
                const landmarks
                of results.multiHandLandmarks
            ) {

                // Connecting skeleton
                drawConnectors(
                    canvasCtx,
                    landmarks,
                    HAND_CONNECTIONS,
                    {
                        color: "#e47b67",
                        lineWidth: 5
                    }
                );


                // Landmark dots
                drawLandmarks(
                    canvasCtx,
                    landmarks,
                    {
                        color: "#7655a8",
                        lineWidth: 2,
                        radius: 6
                    }
                );

            }

        } else {

            // ----------------------------------------------------
            // NO HAND
            // ----------------------------------------------------

            const handCount =
                document.getElementById("handCount");

            const recognitionText =
                document.getElementById("recognitionText");

            const trackingStatus =
                document.getElementById("trackingStatus");


            if (handCount) {
                handCount.textContent = "No hand detected";
            }

            if (recognitionText) {
                recognitionText.textContent =
                    "SHOW YOUR HAND";
            }

            if (trackingStatus) {
                trackingStatus.textContent =
                    "Waiting for hand";
            }

        }


        canvasCtx.restore();

    }


    // ------------------------------------------------------------
    // CLOSE CAMERA
    // ------------------------------------------------------------

    function closeCamera() {

        cameraRunning = false;

        if (videoElement) {

            const stream =
                videoElement.srcObject;

            if (stream) {

                stream
                    .getTracks()
                    .forEach(track => track.stop());

            }

            videoElement.srcObject = null;

        }


        if (cameraModal) {

            cameraModal.classList.remove("active");

        }

        if (canvasCtx && canvasElement) {

            canvasCtx.clearRect(
                0,
                0,
                canvasElement.width,
                canvasElement.height
            );

        }

    }


    // ------------------------------------------------------------
    // OPEN CAMERA BUTTON
    // ------------------------------------------------------------

    if (openCameraButton) {

        openCameraButton.addEventListener(
            "click",
            openCamera
        );

    }


    // ------------------------------------------------------------
    // ESC KEY CLOSE
    // ------------------------------------------------------------

    document.addEventListener("keydown", (event) => {

        if (event.key === "Escape") {

            closeCamera();

        }

    });


    // ============================================================
    // TEXT → VOICE
    // ============================================================

    if (textVoiceButton) {

        textVoiceButton.addEventListener(
            "click",
            () => {

                const text =
                    prompt(
                        "Enter something you want SignBridge to speak:"
                    );


                if (!text) {
                    return;
                }


                if (!("speechSynthesis" in window)) {

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


    // ============================================================
    // VOICE → TEXT
    // ============================================================

    if (voiceTextButton) {

        voiceTextButton.addEventListener(
            "click",
            () => {

                const SpeechRecognition =
                    window.SpeechRecognition ||
                    window.webkitSpeechRecognition;


                if (!SpeechRecognition) {

                    alert(
                        "Voice recognition is not supported in this browser. Please use Google Chrome."
                    );

                    return;

                }


                const recognition =
                    new SpeechRecognition();


                recognition.lang =
                    "en-US";

                recognition.continuous =
                    false;

                recognition.interimResults =
                    false;


                recognition.onstart = () => {

                    voiceTextButton.textContent =
                        "Listening...";

                };


                recognition.onresult =
                    (event) => {

                        const transcript =
                            event
                                .results[0][0]
                                .transcript;


                        alert(
                            "You said:\n\n" +
                            transcript
                        );

                    };


                recognition.onerror =
                    (event) => {

                        console.error(
                            "Speech recognition error:",
                            event.error
                        );

                    };


                recognition.onend = () => {

                    voiceTextButton.textContent =
                        "Use Microphone";

                };


                recognition.start();

            }
        );

    }


    // ============================================================
    // NAVBAR SCROLL
    // ============================================================

    const navbar =
        document.querySelector(".navbar");

    window.addEventListener(
        "scroll",
        () => {

            if (!navbar) {
                return;
            }

            if (window.scrollY > 40) {

                navbar.classList.add(
                    "scrolled"
                );

            } else {

                navbar.classList.remove(
                    "scrolled"
                );

            }

        }
    );


    // ============================================================
    // REVEAL ANIMATION
    // ============================================================

    const revealElements =
        document.querySelectorAll(".reveal");


    if ("IntersectionObserver" in window) {

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

                            }

                        }
                    );

                },
                {
                    threshold: 0.12
                }
            );


        revealElements.forEach(
            element => observer.observe(element)
        );

    } else {

        revealElements.forEach(
            element =>
                element.classList.add("visible")
        );

    }


    // ============================================================
    // CURSOR GLOW
    // ============================================================

    const cursorGlow =
        document.createElement("div");

    cursorGlow.className =
        "cursor-glow";

    document.body.appendChild(
        cursorGlow
    );


    document.addEventListener(
        "mousemove",
        (event) => {

            cursorGlow.style.left =
                `${event.clientX}px`;

            cursorGlow.style.top =
                `${event.clientY}px`;

        }
    );


    // ============================================================
    // INITIAL MESSAGE
    // ============================================================

    console.log(
        "%cSignBridge initialized ✓",
        "font-size:16px;font-weight:bold;"
    );

});
