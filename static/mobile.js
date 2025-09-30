const doc = document;
const menuOpen = doc.querySelector(".menu");
const menuClose = doc.querySelector(".close");
const overlay = doc.querySelector(".overlay");

menuOpen.addEventListener("click", () => {
    overlay.classList.add("overlay--active");
});

menuClose.addEventListener("click", () => {
    overlay.classList.remove("overlay--active");
});
const haraya = document.getElementById("Haraya");
setInterval(() => {
    haraya.classList.toggle("switch");
}, 5000); // every 5s


var counter = 200;
var opacityCount = 0;
var lastScroll = 0;