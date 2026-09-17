/* =====================================================
   SIGNBRIDGE
   Camera + MediaPipe Hand Tracking
===================================================== */

let cameraStream = null;
let cameraOpen = false;

let handLandmarker = null;
let animationFrameId = null;
let lastVideoTime = -1;


/* =====================================================
   MEDIAPIPE
===================================================== */

async function loadHandModel() {

    try {

        const vision = await import(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/vision_bundle.mjs"
        );

        const {
            FilesetResolver,
            HandLandmarker
        } = vision;


        const filesetResolver =
            await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm"
            );


        handLandmarker =
            await HandLandmarker.createFromOptions(
                filesetResolver,
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
            "SignBridge: Hand model ready."
        );

        return true;

    } catch (error) {

        console.error(
            "MediaPipe loading error:",
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

        /* First open camera */

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


        /* Show camera immediately */

        createCameraInterface();


        const video =
            document.getElementById(
                "cameraVideo"
            );


        await video.play();


        updateDetectionText(
            "Loading hand tracking..."
        );


        /* Load MediaPipe */

        const modelReady =
            await loadHandModel();


        if (!modelReady) {

            updateDetectionText(
                "Camera ready"
            );

            updateTrackingHint(
                "Hand tracking could not load. Check your internet connection."
            );

            return;
        }


        updateDetectionText(
            "Show your hand"
        );

        updateTrackingHint(
            "Place your hand inside the frame."
        );


        startHandTracking();


    } catch (error) {

        console.error(
            "Camera error:",
            error
        );


        cameraOpen = false;


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
            "Please allow camera permission and try again."
        );

    }

}


/* =====================================================
   CAMERA INTERFACE
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
                    Starting camera...
                </div>


                <div
                    class="result-hint"
                    id="trackingHint"
                >
                    Initialising...
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
   HAND TRACKING
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
            !handLandmarker
        ) {

            return;

        }


        if (
            video.readyState >=
            HTMLMediaElement.HAVE_CURRENT_DATA
        ) {

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
                        "Detection error:",
                        error
                    );

                }

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
   DRAW LANDMARKS
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


    results.landmarks.forEach(
        (landmarks) => {


            /* Lines */

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


            /* Points */

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

    const hands =
        results &&
        results.landmarks
            ? results.landmarks.length
            : 0;


    if (hands === 0) {

        updateDetectionText(
            "No hand detected"
        );

        updateTrackingHint(
            "Place your hand inside the frame."
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
   SIGN → TEXT BUTTON
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
   OTHER BUTTONS
===================================================== */

function showComingSoon(mode) {

    alert(
        `${mode}\n\nThis feature is coming next!`
    );

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
