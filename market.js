const productGrid = document.querySelector("[data-product-grid]");
const viewButtons = document.querySelectorAll("[data-view-mode]");
const productCards = document.querySelectorAll(".product-card");
const filterToggle = document.querySelector("[data-filter-toggle]");
const filterPanel = document.querySelector("[data-filter-panel]");
const filterBackdrop = document.querySelector("[data-filter-backdrop]");
const filterClose = document.querySelector("[data-filter-close]");
let hasManualViewChoice = false;

productCards.forEach((card) => {
  const saveButton = card.querySelector(".save-button");

  saveButton?.addEventListener("click", () => {
    const isSaved = saveButton.classList.toggle("is-saved");
    const icon = saveButton.querySelector("i");

    saveButton.classList.remove("is-popping");
    void saveButton.offsetWidth;
    saveButton.classList.add("is-popping");
    saveButton.setAttribute("aria-pressed", String(isSaved));

    if (icon) {
      icon.classList.toggle("fa-solid", isSaved);
      icon.classList.toggle("fa-regular", !isSaved);
    }
  });
});

const setListSaveButtonPosition = (isListView) => {
  productCards.forEach((card) => {
    const media = card.querySelector(".product-media");
    const saveButton = card.querySelector(".save-button");

    if (!media || !saveButton) {
      return;
    }

    if (isListView) {
      card.append(saveButton);
      return;
    }

    media.append(saveButton);
  });
};

const setViewMode = (mode) => {
  if (!productGrid || !mode) {
    return;
  }

  const isListView = mode === "list";
  productGrid.classList.toggle("is-list-view", isListView);
  setListSaveButtonPosition(isListView);

  viewButtons.forEach((item) => {
    const isActive = item.dataset.viewMode === mode;
    item.classList.toggle("is-selected", isActive);
    item.setAttribute("aria-pressed", String(isActive));
  });
};

const setResponsiveDefaultView = () => {
  setViewMode(window.innerWidth < 1024 ? "list" : "grid");
};

viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.viewMode;
    hasManualViewChoice = true;
    setViewMode(mode);
  });
});

setResponsiveDefaultView();

const setFilterOpen = (isOpen) => {
  if (!filterPanel || !filterToggle || !filterBackdrop) {
    return;
  }

  filterPanel.classList.toggle("is-open", isOpen);
  filterBackdrop.classList.toggle("is-open", isOpen);
  filterToggle.classList.toggle("is-open", isOpen);
  filterToggle.setAttribute("aria-expanded", String(isOpen));
  filterToggle.setAttribute("aria-label", isOpen ? "Close marketplace filters" : "Open marketplace filters");
  document.body.classList.toggle("has-open-filter", isOpen);
};

filterToggle?.addEventListener("click", () => {
  setFilterOpen(!filterPanel?.classList.contains("is-open"));
});

filterClose?.addEventListener("click", () => setFilterOpen(false));
filterBackdrop?.addEventListener("click", () => setFilterOpen(false));

window.addEventListener("resize", () => {
  if (window.innerWidth >= 768) {
    setFilterOpen(false);
  }

  if (!hasManualViewChoice) {
    setResponsiveDefaultView();
  }
});
