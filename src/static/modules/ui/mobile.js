// Mobile menu functionality

export function toggleMobileMenu() {
  const mobileMenu = document.getElementById("mobileMenu");
  const isHidden = mobileMenu.classList.contains("hidden");

  if (isHidden) {
    mobileMenu.classList.remove("hidden");
    // Sync search values
    const searchInput = document.getElementById("searchInput");
    const searchInputMobile = document.getElementById("searchInputMobile");
    searchInputMobile.value = searchInput.value;
  } else {
    mobileMenu.classList.add("hidden");
  }
}

export function closeMobileMenu() {
  const mobileMenu = document.getElementById("mobileMenu");
  mobileMenu.classList.add("hidden");
}
