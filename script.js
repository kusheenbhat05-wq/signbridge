/* =====================================================
   SIGNBRIDGE
   Live Camera + MediaPipe Hand Tracking
===================================================== */

import {
    FilesetResolver,
    HandLandmarker
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/vision_bundle.mjs";


/* =====================================================
   GLOBAL VARIABLES
===================================================== */

let cameraStream = null;
let cameraOpen = false;

let handLandmarker = null;
let animationFrameId = null;

let lastVideoTime = -1;


/* =====================================================
   MEDIAPIPE MODEL
===================================================== */

async function createHandLandmarker() {

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

                        delegate: "GPU"
                    },

                    runningMode: "VIDEO",

                    numHands: 2,

                    minHandDetectionConfidence: 0.5,

                    minHandPresenceConfidence: 0.5,

                    minTrackingConfidence: 0.5
                }
            );

        console.log(
            "SignBridge: Hand Landmarker ready."
        );

        return true;

    } catch (error) {

        console.error(
            "Could not load Hand Landmarker:",
            error
        );

        return false;
    }
}


/* =====================================================
   OPEN CAMERA
===================================================== */

async function openCamera() {

    if (cameraOpen) {
        closeCamera();
        return;
    }

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


        cameraOpen = true;

        createCameraInterface();


        const modelReady =
            await createHandLandmarker();


        if (!modelReady) {

            updateDetectionText(
                "Model loading failed"
            );

            return;
        }


        startHandTracking();


    } catch (error) {

        console.error(
            "Camera error:",
            error
        );

        alert(
            "Camera access was not available.\n\n" +
            "Please allow camera permission and make sure " +
            "you are opening SignBridge through HTTPS / GitHub Pages."
        );

    }
}


/* =====================================================
   CREATE CAMERA INTERFACE
===================================================== */

function createCameraInterface() {

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
                aria-label="Close camera"
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


                <!-- HAND LANDMARK CANVAS -->

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
                    Starting camera...
                </div>


                <div
                    class="result-hint"
                    id="trackingHint"
                >
                    Initialising hand detection.
                </div>

            </div>

        </div>

    `;


    document.body.appendChild(
        overlay
    );


    const video =
        document.getElementById(
            "cameraVideo"
        );


    video.srcObject =
        cameraStream;


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


/* =====================================================
   START HAND TRACKING
===================================================== */

function startHandTracking() {

    const video =
        document.getElementById(
            "cameraVideo"
        );


    const canvas =
        document.getElementById(
            "handCanvas"
        );


    if (
        !video ||
        !canvas ||
        !handLandmarker
    ) {
        return;
    }


    const context =
        canvas.getContext("2d");


    function detectHands() {

        if (
            !cameraOpen ||
            !video ||
            !handLandmarker
        ) {
            return;
        }


        if (
            video.readyState <
            HTMLMediaElement.HAVE_CURRENT_DATA
        ) {

            animationFrameId =
                requestAnimationFrame(
                    detectHands
                );

            return;
        }


        if (
            video.currentTime !==
            lastVideoTime
        ) {

            lastVideoTime =
                video.currentTime;


            canvas.width =
                video.videoWidth;

            canvas.height =
                video.videoHeight;


            context.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
            );


            try {

                const results =
                    handLandmarker.detectForVideo(
                        video,
                        performance.now()
                    );


                drawHandLandmarks(
                    results,
                    canvas,
                    context
                );


                updateTrackingStatus(
                    results
                );


            } catch (error) {

                console.error(
                    "Hand detection error:",
                    error
                );

            }

        }


        animationFrameId =
            requestAnimationFrame(
                detectHands
            );

    }


    detectHands();

}


/* =====================================================
   DRAW HAND LANDMARKS
===================================================== */

function drawHandLandmarks(
    results,
    canvas,
    context
) {

    if (
        !results ||
        !results.landmarks
    ) {
        return;
    }


    results.landmarks.forEach(
        (landmarks) => {

            /*
                MediaPipe hand landmarks
                contain 21 points.

                We draw each point and connect
                the hand structure visually.
            */


            const connections = [

                [0, 1],
                [1, 2],
                [2, 3],
                [3, 4],

                [0, 5],
                [5, 6],
                [6, 7],
                [7, 8],

                [5, 9],
                [9, 10],
                [10, 11],
                [11, 12],

                [9, 13],
                [13, 14],
                [14, 15],
                [15, 16],

                [13, 17],
                [17, 18],
                [18, 19],
                [19, 20],

                [0, 17]
            ];


            /* DRAW CONNECTIONS */

            context.beginPath();

            connections.forEach(
                ([start, end]) => {

                    const startPoint =
                        landmarks[start];

                    const endPoint =
                        landmarks[end];


                    context.moveTo(
                        startPoint.x *
                            canvas.width,

                        startPoint.y *
                            canvas.height
                    );


                    context.lineTo(
                        endPoint.x *
                            canvas.width,

                        endPoint.y *
                            canvas.height
                    );

                }
            );


            context.strokeStyle =
                "#e47b67";

            context.lineWidth = 3;

            context.stroke();


            /* DRAW LANDMARK POINTS */

            landmarks.forEach(
                (point) => {

                    context.beginPath();


                    context.arc(
                        point.x *
                            canvas.width,

                        point.y *
                            canvas.height,

                        5,

                        0,

                        Math.PI * 2
                    );


                    context.fillStyle =
                        "#ffffff";

                    context.fill();


                    context.strokeStyle =
                        "#7655a8";

                    context.lineWidth = 2;

                    context.stroke();

                }
            );

        }
    );

}


/* =====================================================
   TRACKING STATUS
===================================================== */

function updateTrackingStatus(
    results
) {

    const result =
        document.getElementById(
            "detectedSign"
        );


    const hint =
        document.getElementById(
            "trackingHint"
        );


    if (!result || !hint) {
        return;
    }


    const handsDetected =
        results &&
        results.landmarks
            ? results.landmarks.length
            : 0;


    if (handsDetected === 0) {

        result.textContent =
            "No hand detected";

        hint.textContent =
            "Place your hand inside the frame.";

        return;
    }


    if (handsDetected === 1) {

        result.textContent =
            "Hand detected ✓";

        hint.textContent =
            "21 hand landmarks are being tracked.";

        return;
    }


    result.textContent =
        `${handsDetected} hands detected ✓`;

    hint.textContent =
        "Both hands are being tracked.";

}


/* =====================================================
   UPDATE RESULT TEXT
===================================================== */

function updateDetectionText(
    message
) {

    const result =
        document.getElementById(
            "detectedSign"
        );

    const hint =
        document.getElementById(
            "trackingHint"
        );


    if (result) {

        result.textContent =
            message;

    }


    if (hint) {

        hint.textContent =
            "Please try again.";

    }

}


/* =====================================================
   CLOSE CAMERA
===================================================== */

function closeCamera() {

    cameraOpen = false;


    if (animationFrameId) {

        cancelAnimationFrame(
            animationFrameId
        );

        animationFrameId = null;

    }


    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(
                track => track.stop()
            );

        cameraStream = null;

    }


    handLandmarker = null;

    lastVideoTime = -1;


    const overlay =
        document.getElementById(
            "cameraOverlay"
        );


    if (overlay) {

        overlay.remove();

    }

}


/* =====================================================
   SIGN BUTTON
===================================================== */

document.addEventListener(
    "click",
    (event) => {

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


        if (
            title.textContent.trim() ===
            "Sign → Text"
        ) {

            openCamera();

        }

    }
);


/* =====================================================
   SCROLL REVEAL
===================================================== */

const revealElements =
    document.querySelectorAll(
        ".mode-card, .about-section, .cta-section"
    );


const revealObserver =
    new IntersectionObserver(
        (entries) => {

            entries.forEach(
                (entry) => {

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
            threshold: 0.15
        }
    );


revealElements.forEach(
    (element) => {

        element.classList.add(
            "reveal"
        );

        revealObserver.observe(
            element
        );

    }
);


/* =====================================================
   BUTTON MICRO INTERACTION
===================================================== */

const buttons =
    document.querySelectorAll(
        ".primary-btn, .secondary-btn, .mode-button"
    );


buttons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                button.style.transform =
                    "scale(0.96)";


                setTimeout(
                    () => {

                        button.style.transform =
                            "";

                    },
                    130
                );

            }
        );

    }
);


/* =====================================================
   NAVBAR EFFECT
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
                "rgba(247, 240, 231, 0.88)";

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
    (event) => {

        cursorGlow.style.left =
            `${event.clientX}px`;

        cursorGlow.style.top =
            `${event.clientY}px`;

    }
);


/* =====================================================
   FOOTER YEAR
===================================================== */

const footerYear =
    document.querySelector(
        "footer > span"
    );


if (footerYear) {

    footerYear.textContent =
        `© ${new Date().getFullYear()} SignBridge`;

}
