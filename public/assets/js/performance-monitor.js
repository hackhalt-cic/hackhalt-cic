// performance-monitor.js - Website Performance Optimization

// Enable performance monitoring and optimization
const PerformanceOptimizer = {
  // Lazy load images using Intersection Observer
  lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    
    if (!images.length || !('IntersectionObserver' in window)) {
      // Fallback for older browsers
      images.forEach(img => {
        if (img.dataset.src) img.src = img.dataset.src;
      });
      return;
    }

    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          observer.unobserve(img);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '50px'
    });

    images.forEach(img => imageObserver.observe(img));
  },

  // Optimize font loading
  optimizeFonts() {
    if (!('fonts' in document)) return;
    
    // Load fonts asynchronously
    const fonts = [
      new FontFaceObserver('Inter', { weight: 400 }),
      new FontFaceObserver('Inter', { weight: 500 }),
      new FontFaceObserver('Inter', { weight: 600 }),
      new FontFaceObserver('Inter', { weight: 700 })
    ];

    Promise.all(fonts.map(font => font.load()))
      .then(() => {
        document.documentElement.classList.add('fonts-loaded');
      })
      .catch(err => console.warn('Font loading delayed:', err));
  },

  // Debounce scroll events for better performance
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function to limit event calls
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Optimize animations with reduced motion support
  respectReducedMotion() {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReduced.matches) {
      document.documentElement.style.setProperty('--transition-fast', '0.01s');
      document.documentElement.style.setProperty('--transition-default', '0.01s');
      document.documentElement.style.setProperty('--transition-smooth', '0.01s');
      document.documentElement.style.setProperty('--transition-slow', '0.01s');
    }
  },

  // Prefetch DNS for external resources
  prefetchResources() {
    const prefetchLinks = [
      { rel: 'dns-prefetch', href: '//cdnjs.cloudflare.com' },
      { rel: 'dns-prefetch', href: '//fonts.googleapis.com' },
      { rel: 'dns-prefetch', href: '//fonts.gstatic.com' }
    ];

    prefetchLinks.forEach(link => {
      const linkEl = document.createElement('link');
      linkEl.rel = link.rel;
      linkEl.href = link.href;
      document.head.appendChild(linkEl);
    });
  },

  // Monitor Core Web Vitals
  monitorWebVitals() {
    if ('web-vital' in window || !('PerformanceObserver' in window)) return;

    try {
      // Measure Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Measure First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          console.log('FID:', entry.processingDuration);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Measure Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.hadRecentInput) return;
          clsValue += entry.value;
          console.log('CLS:', clsValue);
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (err) {
      console.warn('Web Vitals monitoring not supported:', err);
    }
  },

  // Initialize all optimizations
  init() {
    // Run on DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.run());
    } else {
      this.run();
    }
  },

  run() {
    this.lazyLoadImages();
    this.respectReducedMotion();
    this.monitorWebVitals();
    console.log('✓ Performance optimizations initialized');
  }
};

// Initialize when script loads
PerformanceOptimizer.init();
