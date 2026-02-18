// assets/js/main.js
// Shared functionality across all pages

// --- Theme handling --------------------------------------------------------
const root = document.documentElement;
const themeToggleBtn = document.getElementById("themeToggle");

function applyTheme(theme) {
  root.setAttribute("data-theme", theme);
  localStorage.setItem("hh-theme", theme);

  if (!themeToggleBtn) return;
  const icon = themeToggleBtn.querySelector("i");
  if (theme === "light") {
    icon.classList.remove("fa-moon");
    icon.classList.add("fa-sun");
    themeToggleBtn.setAttribute("aria-label", "Switch to dark mode");
  } else {
    icon.classList.remove("fa-sun");
    icon.classList.add("fa-moon");
    themeToggleBtn.setAttribute("aria-label", "Switch to light mode");
  }
}

// Load saved theme or default to dark
const savedTheme = localStorage.getItem("hh-theme") || "dark";
applyTheme(savedTheme);

if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const current = root.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
  });
}

// --- DOM references --------------------------------------------------------
const backToTopBtn = document.getElementById("backToTop");
const yearSpan = document.getElementById("year");
const toggle = document.getElementById("nav-toggle");
const mobileNav = document.querySelector(".mobile-nav");

// --- Utilities -------------------------------------------------------------
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}


// Back to top button
window.addEventListener("scroll", () => {
  if (!backToTopBtn) return;
  if (window.scrollY > 400) {
    backToTopBtn.classList.add("visible");
  } else {
    backToTopBtn.classList.remove("visible");
  }
});

if (backToTopBtn) {
  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// Scroll reveal using IntersectionObserver with improved performance
const revealEls = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Use requestAnimationFrame for smoother animation start
        requestAnimationFrame(() => {
          entry.target.classList.add("visible");
        });
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: "50px" }
);

revealEls.forEach((el) => observer.observe(el));

// Smooth scroll performance optimization
let ticking = false;
function updateScroll() {
  // Add any scroll-dependent animations here if needed
  ticking = false;
}

document.addEventListener("scroll", () => {
  if (!ticking) {
    window.requestAnimationFrame(updateScroll);
    ticking = true;
  }
}, { passive: true });

// Desktop submenu hover delay to prevent flicker
const navItems = document.querySelectorAll(".nav-item-with-submenu");
let hoverTimeout;
navItems.forEach((item) => {
  item.addEventListener("mouseenter", () => {
    clearTimeout(hoverTimeout);
  });
  item.addEventListener("mouseleave", () => {
    hoverTimeout = setTimeout(() => {
      // Submenu naturally hides on mouse leave due to CSS
    }, 150);
  });
});

// Mobile nav toggle
if (toggle && mobileNav) {
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    mobileNav.classList.toggle("open");
    document.body.classList.toggle("nav-open");
  });

  // Mobile submenu toggle functionality with accordion behavior
  const submenuToggles = mobileNav.querySelectorAll(".mobile-submenu-toggle");
  submenuToggles.forEach((toggle) => {
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const parent = toggle.closest(".mobile-submenu-item");
      
      // Close all other open submenus (accordion behavior)
      const allSubmenuItems = mobileNav.querySelectorAll(".mobile-submenu-item.open");
      allSubmenuItems.forEach((item) => {
        if (item !== parent) {
          item.classList.remove("open");
        }
      });
      
      // Toggle current submenu
      parent.classList.toggle("open");
    });
  });

  // Close nav when a regular link is clicked (excluding submenu toggles)
  const navLinks = mobileNav.querySelectorAll("a:not(.mobile-submenu-toggle)");
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      mobileNav.classList.remove("open");
      document.body.classList.remove("nav-open");
    });
  });

  // Close nav when clicking outside with better event handling
  function closeNav(e) {
    // Check if click is outside both nav and toggle button
    const isClickOutside = 
      e.target !== mobileNav && 
      !mobileNav.contains(e.target) && 
      e.target !== toggle && 
      !toggle.contains(e.target);
    
    if (isClickOutside && mobileNav.classList.contains("open")) {
      mobileNav.classList.remove("open");
      document.body.classList.remove("nav-open");
    }
  }
  
  document.addEventListener("click", closeNav, true); // Use capture phase
  document.addEventListener("touchstart", closeNav, true);

  // Close nav on escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && mobileNav.classList.contains("open")) {
      mobileNav.classList.remove("open");
      document.body.classList.remove("nav-open");
      toggle.focus();
    }
  });
}

  // Smooth scroll with offset
function smoothScroll(target, offset = 70) {
  const element = document.querySelector(target);
  if (!element) return;
  const offsetTop = element.offsetTop - offset;
  window.scrollTo({ top: offsetTop, behavior: "smooth" });
}

// Handle hash-based anchor navigation on page load and hash changes
function handleAnchorNavigation() {
  const hash = window.location.hash;
  if (!hash) return;
  
  // Remove the # and use as selector
  const targetId = hash.substring(1);
  if (!targetId) return;
  
  // Function to find element and scroll
  const findAndScroll = () => {
    // Try multiple ways to find the element
    let element = document.getElementById(targetId);
    if (!element) {
      element = document.querySelector(`[name="${targetId}"]`);
    }
    if (!element) {
      element = document.querySelector(`[data-anchor="${targetId}"]`);
    }
    
    if (element && element.offsetParent !== null) {
      // Element found and is visible, scroll to it
      const headerHeight = 120; // Increased to account for fixed header
      const elementTop = element.getBoundingClientRect().top + window.scrollY - headerHeight;
      
      try {
        window.scrollTo({
          top: Math.max(0, elementTop),
          behavior: 'smooth'
        });
      } catch (e) {
        // Fallback for browsers that don't support smooth scroll
        window.scrollTo(0, Math.max(0, elementTop));
      }
      
      // Focus the element for accessibility
      if (element.tabIndex === -1) {
        element.setAttribute('tabindex', '-1');
      }
      element.focus();
      
      console.log(`✅ Scrolled to anchor: #${targetId}`);
      return true;
    }
    return false;
  };
  
  // Try immediately
  if (findAndScroll()) return;
  
  // Try with progressive delays for dynamic content and lazy-loaded elements
  setTimeout(() => findAndScroll(), 50);
  setTimeout(() => findAndScroll(), 150);
  setTimeout(() => {
    if (findAndScroll()) {
      console.log(`✅ Found anchor after 300ms delay: #${targetId}`);
    }
  }, 300);
  setTimeout(() => {
    if (findAndScroll()) {
      console.log(`✅ Found anchor after 500ms delay: #${targetId}`);
    } else {
      console.warn(`⚠️  Could not find anchor element: #${targetId}`);
    }
  }, 500);
}

// Run on page load - wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(handleAnchorNavigation, 100);
  });
} else {
  setTimeout(handleAnchorNavigation, 100);
}

// Handle hash changes (including browser back/forward)
window.addEventListener("hashchange", () => {
  setTimeout(handleAnchorNavigation, 50);
});

// Also handle when user clicks an anchor link directly
document.addEventListener("click", (e) => {
  const link = e.target.closest("a[href*=\"#\"]");
  if (!link) return;
  
  const href = link.getAttribute("href");
  if (!href || !href.includes("#")) return;
  
  // Extract the hash part
  const hashMatch = href.match(/#(.+)$/);
  if (!hashMatch) return;
  
  const hash = hashMatch[1];
  
  // For same-page anchors, prevent default and handle ourselves
  const currentPath = window.location.pathname;
  const linkPath = new URL(href, window.location.origin).pathname;
  
  if (currentPath === linkPath || !linkPath || linkPath === '/') {
    // Same page anchor
    e.preventDefault();
    window.location.hash = '#' + hash;
    setTimeout(handleAnchorNavigation, 50);
  }
});

// Add accessibility features
document.addEventListener("keydown", (e) => {
  // Skip to main content (Alt + M)
  if (e.altKey && e.key === "m") {
    const mainContent = document.querySelector("main") || document.querySelector(".container");
    if (mainContent) mainContent.focus();
  }

  // Go back (Alt + B)
  if (e.altKey && e.key === "b") {
    window.history.back();
  }
});

// Enhance performance with intersection observer for images
const imageObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const img = entry.target;
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.classList.add("loaded");
        observer.unobserve(img);
      }
    }
  });
}, { rootMargin: "50px" });

// Lazy load images
document.querySelectorAll("img[data-src]").forEach((img) => {
  imageObserver.observe(img);
});

// Optimize font loading with critical fonts
if (document.fonts) {
  Promise.all([
    document.fonts.load('400 1em Inter'),
    document.fonts.load('500 1em Inter'),
    document.fonts.load('600 1em Inter'),
    document.fonts.load('700 1em Inter')
  ]).then(() => {
    document.body.classList.add('fonts-loaded');
  }).catch(() => {
    // Fallback if fonts fail to load
    document.body.classList.add('fonts-loaded');
  });
}
// --- Regional Ambassador Form Handling --------------------------------
console.log("🔍 Initializing regional ambassador form handler");
const memberForm = document.getElementById("memberForm");
console.log("memberForm element:", memberForm);

if (memberForm) {
  console.log("✓ memberForm found, attaching submit handler");
  memberForm.addEventListener("submit", async (e) => {
    console.log("📝 Form submit event triggered");
    e.preventDefault();
    
    // Collect form data with validation and logging
    const formElements = {
      firstName: document.getElementById("firstName"),
      lastName: document.getElementById("lastName"),
      email: document.getElementById("email"),
      phone: document.getElementById("phone"),
      region: document.getElementById("region"),
      expertise: document.getElementById("expertise"),
      bio: document.getElementById("bio")
    };
    
    console.log("Form elements found:", Object.keys(formElements).reduce((acc, key) => {
      acc[key] = formElements[key] ? "✓" : "✗";
      return acc;
    }, {}));
    
    const firstName = formElements.firstName?.value?.trim();
    const lastName = formElements.lastName?.value?.trim();
    const email = formElements.email?.value?.trim();
    const phone = formElements.phone?.value?.trim();
    const region = formElements.region?.value?.trim();
    const expertise = formElements.expertise?.value?.trim();
    const bio = formElements.bio?.value?.trim() || "";
    
    console.log("Collected values:", {firstName, lastName, email, phone, region, expertise, bio});
    
    // Validate all required fields
    if (!firstName || !lastName || !email || !phone || !region || !expertise) {
      console.error("❌ Validation failed. Missing:", {
        firstName: !firstName ? "YES" : "NO",
        lastName: !lastName ? "YES" : "NO",
        email: !email ? "YES" : "NO",
        phone: !phone ? "YES" : "NO",
        region: !region ? "YES" : "NO",
        expertise: !expertise ? "YES" : "NO"
      });
      
      const missingFields = [];
      if (!firstName) missingFields.push("First Name");
      if (!lastName) missingFields.push("Last Name");
      if (!email) missingFields.push("Email");
      if (!phone) missingFields.push("Phone");
      if (!region) missingFields.push("Region");
      if (!expertise) missingFields.push("Expertise");
      
      const errorMsg = document.createElement("div");
      errorMsg.className = "notification notification-error visible";
      errorMsg.textContent = "✗ Please fill in all required fields: " + missingFields.join(", ");
      document.body.appendChild(errorMsg);
      setTimeout(() => errorMsg.remove(), 5000);
      return;
    }

    const formData = {
      firstName,
      lastName,
      email,
      phone,
      region,
      expertise,
      bio,
      timestamp: new Date().toISOString()
    };

    console.log("📤 Sending form data:", formData);

    try {
      // Submit to backend API
      const response = await fetch("/api/ambassadors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      console.log("📥 Response received:", {status: response.status, data});

      if (response.ok && data.success) {
        // Show success message
        const successMsg = document.createElement("div");
        successMsg.className = "notification notification-success visible";
        successMsg.textContent = "✓ Application submitted successfully! We'll review your application and contact you soon.";
        document.body.appendChild(successMsg);

        // Reset form
        memberForm.reset();
        
        // Scroll to notification
        successMsg.scrollIntoView({ behavior: "smooth", block: "center" });

        // Auto remove notification
        setTimeout(() => {
          successMsg.remove();
        }, 5000);
      } else {
        throw new Error(data.error || "Failed to submit application");
      }
    } catch (error) {
      console.error("❌ Form submission error:", error);
      
      // Show error message
      const errorMsg = document.createElement("div");
      errorMsg.className = "notification notification-error visible";
      errorMsg.textContent = "✗ Error: " + (error.message || "Failed to submit application. Please try again.");
      document.body.appendChild(errorMsg);

      // Scroll to notification
      errorMsg.scrollIntoView({ behavior: "smooth", block: "center" });

      // Auto remove notification
      setTimeout(() => {
        errorMsg.remove();
      }, 5000);
    }
  });
} else {
  console.warn("⚠️ memberForm not found on page");
}