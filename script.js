/* =========================
   SIGNBRIDGE
   Interactive Foundation
========================= */


/* =========================
   COMING SOON MESSAGE
========================= */

function showComingSoon(mode) {

    const message = `
        ${mode}

        This feature is being built.
        SignBridge is currently in its visual prototype stage.

        Camera-based sign recognition,
        speech and real-time translation
        are coming next.
    `;

    alert(message);
}


/* =========================
   SCROLL REVEAL
========================= */

const revealElements = document.querySelectorAll(
    ".mode-card, .about-section, .cta-section"
);

const revealObserver = new IntersectionObserver(
    (entries) => {

        entries.forEach((entry) => {

            if (entry.isIntersecting) {

                entry.target.classList.add("visible");

                revealObserver.unobserve(entry.target);
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

        button.style.transform = "scale(0.96)";

        setTimeout(() => {

            button.style.transform = "";

        }, 130);

    });

});


/* =========================
   NAVBAR SCROLL EFFECT
========================= */

const navbar = document.querySelector(".navbar");

window.addEventListener("scroll", () => {

    if (window.scrollY > 30) {

        navbar.style.background = "rgba(247, 240, 231, 0.88)";
        navbar.style.backdropFilter = "blur(14px)";

    } else {

        navbar.style.background = "";
        navbar.style.backdropFilter = "";

    }

});


/* =========================
   CURSOR GLOW
========================= */

const cursorGlow = document.createElement("div");

cursorGlow.className = "cursor-glow";

document.body.appendChild(cursorGlow);


document.addEventListener("mousemove", (event) => {

    cursorGlow.style.left = `${event.clientX}px`;
    cursorGlow.style.top = `${event.clientY}px`;

});


/* =========================
   DYNAMIC YEAR
========================= */

const footerYear = document.querySelector("footer > span");

if (footerYear) {

    footerYear.textContent =
        `© ${new Date().getFullYear()} SignBridge`;

}
