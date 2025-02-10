/* script.js */
document.addEventListener("DOMContentLoaded", () => {
    const ctaButton = document.querySelector(".cta-button");

    if (ctaButton) {
        ctaButton.addEventListener("click", () => {
            scrollToSection("features");
        });
    }
});

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: "smooth" });
    }
}

window.addEventListener("scroll", () => {
    const header = document.querySelector("header");
    if (window.scrollY > 50) {
        header.style.background = "rgba(0, 0, 0, 0.9)";
    } else {
        header.style.background = "rgba(0, 0, 0, 0.8)";
    }
});

// Add animations on scroll
document.addEventListener("scroll", () => {
    document.querySelectorAll(".feature-card").forEach((card) => {
        if (card.getBoundingClientRect().top < window.innerHeight - 50) {
            card.style.opacity = "1";
            card.style.transform = "translateY(0)";
        }
    });
});

// Data visualization animations
const visualizationContainer = document.querySelector(".visualization-container");
if (visualizationContainer) {
    visualizationContainer.addEventListener("mouseenter", () => {
        visualizationContainer.style.transform = "scale(1.05)";
        visualizationContainer.style.transition = "transform 0.3s ease-in-out";
    });
    visualizationContainer.addEventListener("mouseleave", () => {
        visualizationContainer.style.transform = "scale(1)";
    });
}
