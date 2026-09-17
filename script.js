/* =========================
   SIGNBRIDGE
   Camera + Hand Tracking V1
========================= */

let cameraStream = null;
let cameraOpen = false;


/* =========================
   COMING SOON
========================= */

function showComingSoon(mode) {
    alert(
        `${mode}\n\nThis feature is coming next!`
    );
}


/* =========================
   CAMERA
========================= */

async function openCamera() {

    if (cameraOpen) {
        closeCamera();
        return;
    }

    try {

        cameraStream = await navigator.mediaDevices.getUserMedia({
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

    } catch (error) {

        console.error(error);

        alert(
            "Camera access was not available.\n\n" +
            "Please allow camera permission and make sure " +
            "you are opening SignBridge through HTTPS / GitHub Pages."
        );

    }
}


/* =========================
   CREATE CAMERA UI
========================= */

function createCameraInterface() {

    const overlay = document.createElement("div");

    overlay.id = "cameraOverlay";

    overlay.innerHTML = `
        <div class="camera-modal">

            <button class="camera-close" id="closeCamera">
                ×
            </button>

            <div class="camera-header">
                <div>
                    <span>LIVE TRANSLATION</span>
                    <h2>Show your sign</h2>
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

                <div class="camera-guide">

                    <div class="guide-corner top-left"></div>
                    <div class="guide-corner top-right"></div>
                    <div class="guide-corner bottom-left"></div>
                    <div class="guide-corner bottom-right"></div>

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
                    DETECTED SIGN
                </div>

                <div id="detectedSign">
                    Waiting...
                </div>

                <div class="result-hint">
                    Hand tracking will appear here.
                </div>

            </div>

        </div>
    `;

    document.body.appendChild(overlay);


    const video = document.getElementById("cameraVideo");

    video.srcObject = cameraStream;


    document
        .getElementById("closeCamera")
        .addEventListener("click", closeCamera);


    overlay.addEventListener("click", (event) => {

        if (event.target === overlay) {
            closeCamera();
        }

    });


    startHandTracking();

}


/* =========================
   CLOSE CAMERA
========================= */

function closeCamera() {

    if (cameraStream) {

        cameraStream.getTracks().forEach(track => {
            track.stop();
        });

        cameraStream = null;
    }

    cameraOpen = false;

    const overlay =
        document.getElementById("cameraOverlay");

    if (overlay) {
        overlay.remove();
    }

}


/* =========================
   HAND TRACKING FOUNDATION
========================= */

async function startHandTracking() {

    const video =
        document.getElementById("cameraVideo");

    if (!video) return;

    /*
        MediaPipe will be connected in the next stage.

        For now we confirm that the camera is
        successfully receiving a live video stream.
    */

    const result =
        document.getElementById("detectedSign");

    if (result) {

        result.textContent =
            "Camera ready";

    }

}


/* =========================
   CONNECT SIGN BUTTON
========================= */

document.addEventListener("click", (event) => {

    const button =
        event.target.closest(".mode-button");

    if (!button) return;

    const card =
        button.closest(".mode-card");

    if (!card) return;

    const title =
        card.querySelector("h3");

    if (!title) return;

    if (title.textContent.trim() === "Sign → Text") {

        openCamera();

    }

});


/* =========================
   SCROLL REVEAL
========================= */

const revealElements = document.querySelectorAll(
    ".mode-card, .about-section, .cta-section"
);

const revealObserver =
    new IntersectionObserver(
        (entries) => {

            entries.forEach((entry) => {

                if (entry.isIntersecting) {

                    entry.target.classList.add("visible");

                    revealObserver.unobserve(
                        entry.target
                    );

                }

            });

        },
        {
            threshold: 0.15
        }
    );


revealElements.forEach((element) => {

    element.classList.add("reveal");

    revealObserver.observe(element);

});


/* =========================
   BUTTON MICRO INTERACTION
========================= */

const buttons = document.querySelectorAll(
    ".primary-btn, .secondary-btn, .mode-button"
);

buttons.forEach((button) => {

    button.addEventListener("click", () => {

        button.style.transform =
            "scale(0.96)";

        setTimeout(() => {

            button.style.transform = "";

        }, 130);

    });

});


/* =========================
   NAVBAR EFFECT
========================= */

const navbar =
    document.querySelector(".navbar");

window.addEventListener("scroll", () => {

    if (!navbar) return;

    if (window.scrollY > 30) {

        navbar.style.background =
            "rgba(247, 240, 231, 0.88)";

        navbar.style.backdropFilter =
            "blur(14px)";

    } else {

        navbar.style.background = "";
        navbar.style.backdropFilter = "";

    }

});


/* =========================
   CURSOR GLOW
========================= */

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


/* =========================
   FOOTER YEAR
========================= */

const footerYear =
    document.querySelector("footer > span");

if (footerYear) {

    footerYear.textContent =
        `© ${new Date().getFullYear()} SignBridge`;

}
