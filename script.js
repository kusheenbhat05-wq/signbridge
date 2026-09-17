/* =====================================================
   SIGNBRIDGE
   Camera + Real-Time Hand Landmark Detection
===================================================== */

import {
    FilesetResolver,
    HandLandmarker,
    DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/vision_bundle.mjs";


/* =====================================================
   GLOBALS
===================================================== */

let cameraStream = null;
let handLandmarker = null;
let drawingUtils = null;

let cameraRunning = false;
let animationFrame = null;

let lastTimestamp = 0;


/* =====================================================
   MODEL
===================================================== */

async function createHandLandmarker() {

    updateDetectionText("Loading hand tracking...");
    updateTrackingHint("Preparing the hand detection model...");

    try {

        const vision =
            await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm"
            );


        handLandmarker =
            await HandLandmarker.createFromOptions(
                vision,
                {
                    baseOptions: {
                        modelAssetPath:
                            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",

                        delegate: "CPU"
                    },

                    runningMode: "VIDEO",

                    numHands: 2,

                    minHandDetectionConfidence: 0.3,

                    minHandPresenceConfidence: 0.3,

                    minTrackingConfidence: 0.3
                }
            );


        console.log(
            "SIGNBRIDGE: Hand Landmarker loaded successfully."
        );

        return true;

    } catch (error) {

        console.error(
            "SIGNBRIDGE: Hand Landmarker failed:",
            error
        );

        updateDetectionText(
            "Hand tracking failed"
        );

        updateTrackingHint(
            "The camera is working, but the detection model could not start."
        );

        return false;
    }
}


/* =====================================================
   OPEN CAMERA
===================================================== */

async function openCamera() {

    if (cameraRunning) {
        return;
    }


    try {

        /* ---------------------------------------------
           CAMERA PERMISSION
        --------------------------------------------- */

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


        cameraRunning = true;


        /* ---------------------------------------------
           CREATE CAMERA UI
        --------------------------------------------- */

        createCameraInterface();


        const video =
            document.getElementById(
                "cameraVideo"
            );


        video.srcObject =
            cameraStream;


        await video.play();


        /* ---------------------------------------------
           LOAD MODEL
        --------------------------------------------- */

        const loaded =
            await createHandLandmarker();


        if (!loaded) {
            return;
        }


        /* ---------------------------------------------
           CANVAS
        --------------------------------------------- */

        const canvas =
            document.getElementById(
                "handCanvas"
            );


        drawingUtils =
            new DrawingUtils(
                canvas.getContext("2d")
            );


        updateDetectionText(
            "Show your hand"
        );

        updateTrackingHint(
            "Place your hand inside the frame."
        );


        /* ---------------------------------------------
           START DETECTION
        --------------------------------------------- */

        startDetection(
            video,
            canvas
        );


    } catch (error) {

        console.error(
            "SIGNBRIDGE CAMERA ERROR:",
            error
        );


        cameraRunning = false;


        if (cameraStream) {

            cameraStream
                .getTracks()
                .forEach(
                    track => track.stop()
                );

            cameraStream = null;
        }


        alert(
            "Camera could not be opened.\n\n" +
            "Please make sure camera permission is allowed."
        );

    }
}


/* =====================================================
   CAMERA UI
===================================================== */

function createCameraInterface() {

    const oldOverlay =
        document.getElementById(
            "cameraOverlay"
        );


    if (oldOverlay) {
        oldOverlay.remove();
    }


    const overlay =
        document.createElement("div");


    overlay.id =
        "cameraOverlay";


    overlay.innerHTML = `

        <div class="camera-modal">

            <button
                class="camera-close"
                id="closeCamera"
                type="button"
            >
                ×
            </button>


            <div class="camera-header">

                <div>

                    <span>
                        LIVE TRANSLATION
                    </span>

                    <h2>
                        Show your sign
                    </h2>

                </div>


                <div class="live-indicator">

                    <span></span>

                    LIVE

                </div>

            </div>


            <div class="camera-view">

                <video
                    id="cameraVideo"
                    autoplay
                    playsinline
                    muted
                ></video>


                <canvas
                    id="handCanvas"
                ></canvas>


                <div class="camera-guide">

                    <div
                        class="guide-corner top-left"
                    ></div>

                    <div
                        class="guide-corner top-right"
                    ></div>

                    <div
                        class="guide-corner bottom-left"
                    ></div>

                    <div
                        class="guide-corner bottom-right"
                    ></div>


                    <p>
                        Place your hand inside the frame
                    </p>

                </div>


                <div class="camera-status">

                    <span></span>

                    CAMERA ACTIVE

                </div>

            </div>


            <div class="recognition-result">

                <div class="result-label">
                    HAND TRACKING
                </div>


                <div id="detectedSign">
                    Starting...
                </div>


                <div
                    class="result-hint"
                    id="trackingHint"
                >
                    Initialising camera...
                </div>

            </div>

        </div>

    `;


    document.body.appendChild(
        overlay
    );


    document
        .getElementById(
            "closeCamera"
        )
        .addEventListener(
            "click",
            closeCamera
        );


    overlay.addEventListener(
        "click",
        event => {

            if (
                event.target === overlay
            ) {

                closeCamera();

            }

        }
    );
}


/* =====================================================
   START DETECTION
===================================================== */

function startDetection(
    video,
    canvas
) {

    if (
        !handLandmarker ||
        !video ||
        !canvas
    ) {

        return;
    }


    const context =
        canvas.getContext("2d");


    function detect() {

        if (!cameraRunning) {
            return;
        }


        /* ---------------------------------------------
           MAKE CANVAS SAME SIZE AS VIDEO
        --------------------------------------------- */

        if (
            video.videoWidth > 0 &&
            video.videoHeight > 0
        ) {

            if (
                canvas.width !==
                video.videoWidth
            ) {

                canvas.width =
                    video.videoWidth;
            }


            if (
                canvas.height !==
                video.videoHeight
            ) {

                canvas.height =
                    video.videoHeight;
            }

        }


        /* ---------------------------------------------
           CLEAR OLD LANDMARKS
        --------------------------------------------- */

        context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );


        /* ---------------------------------------------
           DETECT HAND
        --------------------------------------------- */

        if (
            video.readyState >=
            HTMLMediaElement.HAVE_CURRENT_DATA
        ) {

            try {

                /*
                 * MediaPipe requires an increasing
                 * timestamp for VIDEO mode.
                 */

                const now =
                    Date.now();


                lastTimestamp =
                    Math.max(
                        now,
                        lastTimestamp + 1
                    );


                const result =
                    handLandmarker.detectForVideo(
                        video,
                        lastTimestamp
                    );


                drawResults(
                    result,
                    canvas,
                    context
                );


                updateResultText(
                    result
                );


            } catch (error) {

                console.error(
                    "Detection error:",
                    error
                );

            }

        }


        animationFrame =
            requestAnimationFrame(
                detect
            );
    }


    detect();
}


/* =====================================================
   DRAW HAND LANDMARKS
===================================================== */

function drawResults(
    result,
    canvas,
    context
) {

    if (
        !result ||
        !result.landmarks ||
        result.landmarks.length === 0
    ) {

        return;
    }


    for (
        const landmarks
        of result.landmarks
    ) {

        /*
         * Draw the official MediaPipe
         * hand connections.
         */

        drawingUtils.drawConnectors(
            landmarks,
            HandLandmarker.HAND_CONNECTIONS,
            {
                color: "#e47b67",
                lineWidth: 5
            }
        );


        /*
         * Draw landmark points.
         */

        drawingUtils.drawLandmarks(
            landmarks,
            {
                color: "#7655a8",
                lineWidth: 2,
                radius: 5
            }
        );

    }
}


/* =====================================================
   RESULT TEXT
===================================================== */

function updateResultText(
    result
) {

    const hands =
        result &&
        result.landmarks
            ? result.landmarks.length
            : 0;


    if (hands === 0) {

        updateDetectionText(
            "No hand detected"
        );

        updateTrackingHint(
            "Move your hand inside the frame."
        );

        return;
    }


    if (hands === 1) {

        updateDetectionText(
            "Hand detected ✓"
        );

        updateTrackingHint(
            "21 hand landmarks are being tracked."
        );

        return;
    }


    updateDetectionText(
        `${hands} hands detected ✓`
    );


    updateTrackingHint(
        "Both hands are being tracked."
    );
}


/* =====================================================
   TEXT HELPERS
===================================================== */

function updateDetectionText(
    text
) {

    const element =
        document.getElementById(
            "detectedSign"
        );


    if (element) {

        element.textContent =
            text;

    }
}


function updateTrackingHint(
    text
) {

    const element =
        document.getElementById(
            "trackingHint"
        );


    if (element) {

        element.textContent =
            text;

    }
}


/* =====================================================
   CLOSE CAMERA
===================================================== */

function closeCamera() {

    cameraRunning = false;


    if (animationFrame) {

        cancelAnimationFrame(
            animationFrame
        );

        animationFrame = null;
    }


    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(
                track => track.stop()
            );

        cameraStream = null;
    }


    if (handLandmarker) {

        try {
            handLandmarker.close();
        } catch (error) {
            console.log(error);
        }

        handLandmarker = null;
    }


    drawingUtils = null;

    lastTimestamp = 0;


    const overlay =
        document.getElementById(
            "cameraOverlay"
        );


    if (overlay) {

        overlay.remove();

    }
}


/* =====================================================
   BUTTONS
===================================================== */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                ".mode-button"
            );


        if (!button) {
            return;
        }


        const card =
            button.closest(
                ".mode-card"
            );


        if (!card) {
            return;
        }


        const title =
            card.querySelector("h3");


        if (!title) {
            return;
        }


        const mode =
            title.textContent.trim();


        /* ---------------------------------------------
           SIGN → TEXT
        --------------------------------------------- */

        if (
            mode === "Sign → Text"
        ) {

            openCamera();

            return;
        }


        /* ---------------------------------------------
           TEXT → VOICE
        --------------------------------------------- */

        if (
            mode === "Text → Voice"
        ) {

            textToVoice();

            return;
        }


        /* ---------------------------------------------
           VOICE → TEXT
        --------------------------------------------- */

        if (
            mode === "Voice → Text"
        ) {

            voiceToText();

            return;
        }

    }
);


/* =====================================================
   TEXT → VOICE
===================================================== */

function textToVoice() {

    const text =
        prompt(
            "Type something for SignBridge to speak:"
        );


    if (
        !text ||
        text.trim() === ""
    ) {

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


    const speech =
        new SpeechSynthesisUtterance(
            text
        );


    speech.lang =
        "en-IN";


    speech.rate =
        0.95;


    window.speechSynthesis.speak(
        speech
    );
}


/* =====================================================
   VOICE → TEXT
===================================================== */

function voiceToText() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        alert(
            "Voice recognition is not supported in this browser."
        );

        return;
    }


    const recognition =
        new SpeechRecognition();


    recognition.lang =
        "en-IN";


    recognition.interimResults =
        false;


    recognition.continuous =
        false;


    recognition.onstart =
        () => {

            alert(
                "Listening... Speak now."
            );

        };


    recognition.onresult =
        event => {

            const text =
                event
                    .results[0][0]
                    .transcript;


            alert(
                "You said:\n\n" +
                text
            );

        };


    recognition.onerror =
        error => {

            console.error(
                "Speech recognition error:",
                error
            );

            alert(
                "Could not understand the voice."
            );

        };


    recognition.start();
}


/* =====================================================
   SCROLL REVEAL
===================================================== */

const revealElements =
    document.querySelectorAll(
        ".mode-card, .about-section, .cta-section"
    );


const revealObserver =
    new IntersectionObserver(
        entries => {

            entries.forEach(
                entry => {

                    if (
                        entry.isIntersecting
                    ) {

                        entry.target
                            .classList
                            .add("visible");


                        revealObserver
                            .unobserve(
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
    element => {

        element.classList.add(
            "reveal"
        );


        revealObserver.observe(
            element
        );

    }
);


/* =====================================================
   NAVBAR
===================================================== */

const navbar =
    document.querySelector(
        ".navbar"
    );


window.addEventListener(
    "scroll",
    () => {

        if (!navbar) {
            return;
        }


        if (
            window.scrollY > 30
        ) {

            navbar.style.background =
                "rgba(247,240,231,0.88)";

            navbar.style.backdropFilter =
                "blur(14px)";

        } else {

            navbar.style.background =
                "";

            navbar.style.backdropFilter =
                "";

        }

    }
);


/* =====================================================
   CURSOR GLOW
===================================================== */

const cursorGlow =
    document.createElement(
        "div"
    );


cursorGlow.className =
    "cursor-glow";


document.body.appendChild(
    cursorGlow
);


document.addEventListener(
    "mousemove",
    event => {

        cursorGlow.style.left =
            `${event.clientX}px`;

        cursorGlow.style.top =
            `${event.clientY}px`;

    }
);


/* =====================================================
   CONSOLE
===================================================== */

console.log(
    "%cSIGNBRIDGE",
    "font-size:24px;font-weight:bold;color:#7655a8;"
);

console.log(
    "Accessibility project initialized."
);
