document.addEventListener("DOMContentLoaded", () => {

    const openCameraButton = document.getElementById("openCameraButton");
    const textVoiceButton = document.getElementById("textVoiceButton");
    const voiceTextButton = document.getElementById("voiceTextButton");

    let cameraModal = null;
    let videoElement = null;
    let canvasElement = null;
    let canvasCtx = null;

    let hands = null;
    let cameraStream = null;
    let cameraRunning = false;


    // ============================================================
    // CREATE CAMERA MODAL
    // ============================================================

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
                            Starting camera...
                        </strong>

                    </div>

                </div>

                <div class="camera-footer">

                    <div>
                        <span class="footer-label">
                            DETECTION
                        </span>

                        <span id="handCount">
                            Starting...
                        </span>
                    </div>

                    <div>
                        <span class="footer-label">
                            STATUS
                        </span>

                        <span id="trackingStatus">
                            Camera starting...
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

        cameraModal.addEventListener("click", (event) => {

            if (event.target === cameraModal) {
                closeCamera();
            }

        });

    }


    // ============================================================
    // STATUS
    // ============================================================

    function setStatus(text) {

        const recognitionText =
            document.getElementById("recognitionText");

        const handCount =
            document.getElementById("handCount");

        const trackingStatus =
            document.getElementById("trackingStatus");

        if (recognitionText) {
            recognitionText.textContent = text;
        }

        if (trackingStatus) {
            trackingStatus.textContent = text;
        }

        if (handCount && text === "Camera ready") {
            handCount.textContent = "Waiting for hand";
        }

    }


    // ============================================================
    // START CAMERA DIRECTLY
    // ============================================================

    async function startRealCamera() {

        try {

            cameraStream =
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

            videoElement.srcObject =
                cameraStream;

            await videoElement.play();

            cameraRunning = true;

            setStatus("Camera ready");

            const handCount =
                document.getElementById("handCount");

            if (handCount) {
                handCount.textContent =
                    "Loading hand tracking...";
            }

            // Start tracking separately
            startHandTracking();

        } catch (error) {

            console.error(
                "Camera permission/error:",
                error
            );

            const recognitionText =
                document.getElementById("recognitionText");

            const trackingStatus =
                document.getElementById("trackingStatus");

            const handCount =
                document.getElementById("handCount");

            if (recognitionText) {
                recognitionText.textContent =
                    "CAMERA FAILED";
            }

            if (trackingStatus) {
                trackingStatus.textContent =
                    "Allow camera permission";
            }

            if (handCount) {
                handCount.textContent =
                    error.message || "Camera unavailable";
            }

        }

    }


    // ============================================================
    // START MEDIAPIPE
    // ============================================================

    async function startHandTracking() {

        try {

            // Check whether MediaPipe loaded
            if (
                typeof Hands === "undefined"
            ) {

                console.error(
                    "MediaPipe Hands library not loaded."
                );

                setStatus(
                    "Camera working • Tracking unavailable"
                );

                return;
            }


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


            hands.onResults(
                handleHandResults
            );


            setStatus(
                "Hand tracking ready"
            );


            // Start sending camera frames
            processCameraFrames();


        } catch (error) {

            console.error(
                "MediaPipe initialization failed:",
                error
            );

            setStatus(
                "Camera working • Tracking unavailable"
            );

        }

    }


    // ============================================================
    // SEND FRAMES TO MEDIAPIPE
    // ============================================================

    async function processCameraFrames() {

        if (
            !cameraRunning ||
            !hands
        ) {
            return;
        }

        try {

            await hands.send({
                image: videoElement
            });

        } catch (error) {

            console.error(
                "Hand tracking frame error:",
                error
            );

        }

        requestAnimationFrame(
            processCameraFrames
        );

    }


    // ============================================================
    // HAND RESULTS
    // ============================================================

    function handleHandResults(results) {

        if (!canvasElement || !canvasCtx) {
            return;
        }


        const width =
            videoElement.videoWidth || 1280;

        const height =
            videoElement.videoHeight || 720;


        canvasElement.width = width;
        canvasElement.height = height;


        canvasCtx.clearRect(
            0,
            0,
            width,
            height
        );


        if (
            results.multiHandLandmarks &&
            results.multiHandLandmarks.length > 0
        ) {

            const count =
                results.multiHandLandmarks.length;


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


            results.multiHandLandmarks.forEach(
                (landmarks) => {

                    drawConnectors(
                        canvasCtx,
                        landmarks,
                        HAND_CONNECTIONS,
                        {
                            color: "#e47b67",
                            lineWidth: 5
                        }
                    );


                    drawLandmarks(
                        canvasCtx,
                        landmarks,
                        {
                            color: "#7655a8",
                            lineWidth: 2,
                            radius: 5
                        }
                    );

                }
            );


        } else {

            const handCount =
                document.getElementById("handCount");

            const recognitionText =
                document.getElementById("recognitionText");

            const trackingStatus =
                document.getElementById("trackingStatus");


            if (handCount) {
                handCount.textContent =
                    "No hand detected";
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

    }


    // ============================================================
    // CLOSE CAMERA
    // ============================================================

    function closeCamera() {

        cameraRunning = false;


        if (cameraStream) {

            cameraStream
                .getTracks()
                .forEach(
                    track => track.stop()
                );

            cameraStream = null;

        }


        if (videoElement) {
            videoElement.srcObject = null;
        }


        if (hands) {

            try {
                hands.close();
            } catch (error) {
                console.log(error);
            }

            hands = null;

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


    // ============================================================
    // CAMERA BUTTON
    // ============================================================

    if (openCameraButton) {

        openCameraButton.addEventListener(
            "click",
            () => {

                createCameraModal();

                cameraModal.classList.add(
                    "active"
                );

                startRealCamera();

            }
        );

    }


    // ============================================================
    // ESC TO CLOSE
    // ============================================================

    document.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Escape") {
                closeCamera();
            }

        }
    );


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
                    new SpeechSynthesisUtterance(
                        text
                    );

                speech.lang = "en-US";
                speech.rate = 0.95;

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
                        "Voice recognition is not supported here. Please use Google Chrome."
                    );

                    return;
                }

                const recognition =
                    new SpeechRecognition();

                recognition.lang = "en-US";
                recognition.continuous = false;
                recognition.interimResults = false;

                recognition.onstart = () => {

                    voiceTextButton.textContent =
                        "Listening...";

                };

                recognition.onresult =
                    (event) => {

                        const transcript =
                            event.results[0][0]
                                .transcript;

                        alert(
                            "You said:\n\n" +
                            transcript
                        );

                    };

                recognition.onerror =
                    (event) => {

                        console.error(
                            "Speech recognition:",
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
    // SCROLL REVEAL
    // ============================================================

    const revealElements =
        document.querySelectorAll(".reveal");

    if (
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

                            }

                        }
                    );

                },
                {
                    threshold: 0.12
                }
            );

        revealElements.forEach(
            element =>
                observer.observe(element)
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


    console.log(
        "SignBridge loaded successfully ✓"
    );

});
