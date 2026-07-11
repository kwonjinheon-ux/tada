document.querySelectorAll(".hero-search button").forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.remove("is-ta-da");
    void button.offsetWidth;
    button.classList.add("is-ta-da");
  });

  button.addEventListener("animationend", () => {
    button.classList.remove("is-ta-da");
  });
});
