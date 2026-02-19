// assets/js/contact.js
// Unified contact form handler with purpose-based field visibility

console.log('🟢 contact.js loaded at top level');

// Function to initialize form handlers when DOM is ready
function initializeFormHandlers() {
  console.log('🔵 initializeFormHandlers() called');
  
  const unifiedForm = document.getElementById("contactForm");

  console.log('📋 Unified form element:', unifiedForm);
  
  if (!unifiedForm) {
    console.error('❌ Unified form not found!');
    return;
  }

  // Handle purpose selection to show/hide conditional fields
  const purposeSelect = unifiedForm.querySelector('[name="purpose"]');
  if (purposeSelect) {
    purposeSelect.addEventListener('change', function() {
      const purpose = this.value;
      console.log('🎯 Purpose changed to:', purpose);
      
      // Hide all field groups first
      unifiedForm.querySelectorAll('[data-field-type]').forEach(el => {
        el.style.display = 'none';
        el.querySelectorAll('input, textarea, select').forEach(field => {
          field.required = false;
        });
      });

      // Show/hide based on purpose
      if (purpose === 'Contact Inquiry') {
        const contactFields = unifiedForm.querySelector('[data-field-type="contact"]');
        if (contactFields) {
          contactFields.style.display = 'block';
          contactFields.querySelectorAll('[data-required="true"]').forEach(field => {
            field.required = true;
          });
        }
      } else if (purpose === 'Join Initiative') {
        const joinFields = unifiedForm.querySelector('[data-field-type="join"]');
        if (joinFields) {
          joinFields.style.display = 'block';
          joinFields.querySelectorAll('[data-required="true"]').forEach(field => {
            field.required = true;
          });
        }
      } else if (purpose === 'Ambassador Application') {
        const ambassadorFields = unifiedForm.querySelector('[data-field-type="ambassador"]');
        if (ambassadorFields) {
          ambassadorFields.style.display = 'block';
          ambassadorFields.querySelectorAll('[data-required="true"]').forEach(field => {
            field.required = true;
          });
        }
      }
    });
    
    // Trigger change on page load to set initial state
    purposeSelect.dispatchEvent(new Event('change'));
  }

  // Enhanced form submission with validation
  unifiedForm.addEventListener("submit", async (e) => {
    console.log('🔴 FORM SUBMIT EVENT FIRED!');
    e.preventDefault();
    e.stopPropagation();

    // Get form data
    const formData = new FormData(unifiedForm);
    const data = Object.fromEntries(formData);
    const purpose = data.purpose;

    console.log('📦 Form data:', data);
    console.log('Purpose selected:', purpose);

    // Validate form
    const validation = FormValidator.validateForm(data);

    // Show validation errors
    const errorElements = unifiedForm.querySelectorAll(".form-error");
    errorElements.forEach((el) => el.remove());

    if (!validation.isValid) {
      Object.keys(validation.errors).forEach((field) => {
        const input = unifiedForm.querySelector(`[name="${field}"]`);
        if (input) {
          const errorDiv = document.createElement("div");
          errorDiv.className = "form-error";
          errorDiv.textContent = validation.errors[field];
          input.parentElement.appendChild(errorDiv);
          input.classList.add("error");
        }
      });
      Notification.error("Please fix the errors above");
      return;
    }

    // Show loading state
    const submitBtn = unifiedForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

    try {
      console.log('⚡ Submitting unified form');
      
      // Prepare payload based on purpose
      const payload = {
        purpose,
        name: data.name,
        email: data.email
      };

      if (purpose === 'Contact Inquiry') {
        payload.phone = data.phone || undefined;
        payload.subject = data.subject;
        payload.message = data.message;
      } else if (purpose === 'Join Initiative') {
        payload.organization = data.organization || undefined;
        payload.interests = data.interests;
        if (data.joinMessage) payload.message = data.joinMessage;
      } else if (purpose === 'Ambassador Application') {
        payload.region = data.region;
        payload.linkedin = data.linkedin || undefined;
        payload.experience = data.experience;
        payload.subject = `Ambassador Application - ${data.region}`;
        if (data.ambassadorMessage) payload.message = data.ambassadorMessage;
      }

      console.log('📤 Sending payload:', payload);

      // Send to backend API
      const apiUrl = getApiUrl('/api/contact');
      console.log('📍 API URL:', apiUrl);
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      console.log('✅ Response status:', response.status);
      console.log('📊 Response data:', result);

      if (!response.ok) {
        const errorMsg = result.error || "Form submission failed";
        console.error('❌ Response error:', errorMsg);
        throw new Error(errorMsg);
      }

      // Show success message based on purpose
      let thankYouMessage = '✨ Thank You! We appreciate your submission.';
      if (purpose === 'Contact Inquiry') {
        thankYouMessage = '✨ Thank You! We appreciate your inquiry. We\'ll get back to you within 2-3 business days.';
      } else if (purpose === 'Join Initiative') {
        thankYouMessage = '✨ Welcome! Thank you for your interest. We\'ll review your information and contact you soon.';
      } else if (purpose === 'Ambassador Application') {
        thankYouMessage = '✨ Thank you for applying! We\'re honored by your interest. Our team will review your application and reach out shortly.';
      }
      
      Notification.success(thankYouMessage, 6000);

      console.log('🔄 Resetting form');
      // Reset form
      unifiedForm.reset();
      unifiedForm.querySelectorAll(".error").forEach((el) => el.classList.remove("error"));
      
      // Re-trigger purpose change to reset field visibility
      if (purposeSelect) {
        purposeSelect.dispatchEvent(new Event('change'));
      }

      // Track event
      console.log('📈 Tracking event');
      Analytics.trackEvent("submission_sent", {
        purpose: purpose,
        type: purpose.toLowerCase().replace(/\s+/g, '_')
      });
      
      console.log('✅ Form submission completed successfully');

    } catch (error) {
      console.error("❌ Form submission error:", error);
      Notification.error(error.message || "An error occurred. Please try again.");

    } finally {
      // Restore button state
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  // Add real-time validation
  unifiedForm.querySelectorAll("input, textarea, select").forEach((field) => {
    field.addEventListener("blur", () => {
      const value = field.value;
      const name = field.name;
      const validation = FormValidator.validateForm({ [name]: value });

      const errorDiv = field.parentElement.querySelector(".form-error");
      if (errorDiv) errorDiv.remove();

      if (!validation.isValid && value.trim()) {
        const error = document.createElement("div");
        error.className = "form-error";
        error.textContent = validation.errors[name];
        field.parentElement.appendChild(error);
        field.classList.add("error");
      } else {
        field.classList.remove("error");
      }
    });

    // Clear error on input
    field.addEventListener("input", () => {
      const errorDiv = field.parentElement.querySelector(".form-error");
      if (errorDiv) errorDiv.remove();
      field.classList.remove("error");
    });
  });

  console.log('✅ initializeFormHandlers() completed');
}

// Call initialization when DOM is ready
if (document.readyState === 'loading') {
  console.log('📍 DOM still loading, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', initializeFormHandlers);
} else {
  console.log('📍 DOM already loaded, calling initializeFormHandlers immediately');
  initializeFormHandlers();
}

// Also add window.onload as extra safety
window.addEventListener('load', () => {
  console.log('📍 Window load event fired');
  if (document.getElementById('contactForm')) {
    console.log('✅ contactForm still exists after window load');
  }
});

// Note: Scroll reveal is handled by main.js
// Note: Analytics is handled by main.js

