// === Particles.js Configuration ===
document.addEventListener('DOMContentLoaded', function() {
    particlesJS('particles-js', {
        particles: {
            number: { value: 80, density: { enable: true, value_area: 800 } },
            color: { value: "#6366f1" },
            shape: { type: "circle" },
            opacity: { value: 0.3, random: true },
            size: { value: 3, random: true },
            line_linked: {
                enable: true,
                distance: 150,
                color: "#6366f1",
                opacity: 0.2,
                width: 1
            },
            move: {
                enable: true,
                speed: 2,
                direction: "none",
                random: true,
                straight: false,
                out_mode: "out",
                bounce: false
            }
        },
        interactivity: {
            detect_on: "canvas",
            events: {
                onhover: { enable: true, mode: "grab" },
                onclick: { enable: true, mode: "push" },
                resize: true
            },
            modes: {
                grab: { distance: 140, line_linked: { opacity: 0.6 } },
                push: { particles_nb: 4 }
            }
        },
        retina_detect: true
    });
});

// === Theme Toggle ===
const themeToggle = document.getElementById('theme-toggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const icon = themeToggle.querySelector('i');
        if (document.body.classList.contains('dark-theme')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            localStorage.setItem('hexact_theme', 'dark');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            localStorage.setItem('hexact_theme', 'light');
        }
    });
}

// Load saved theme
if (localStorage.getItem('hexact_theme') === 'dark') {
    document.body.classList.add('dark-theme');
    const icon = themeToggle.querySelector('i');
    if (icon) {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }
}

// === Navbar Scroll Effect ===
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
});

// === Scroll Animations ===
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// Observe all animated elements
document.querySelectorAll('.animate-fade, .animate-slide').forEach(el => {
    observer.observe(el);
});

// === Stats Counter Animation ===
function animateCounters() {
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        const target = parseFloat(stat.dataset.count);
        const duration = 2000;
        const start = 0;
        const increment = target / (duration / 16);

        let current = start;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                stat.textContent = target % 1 === 0 ? target : target.toFixed(1);
                clearInterval(timer);
            } else {
                stat.textContent = current % 1 === 0 ? Math.floor(current) : current.toFixed(1);
            }
        }, 16);
    });
}

// Trigger counters when hero section is in view
const heroObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCounters();
            heroObserver.disconnect();
        }
    });
}, { threshold: 0.5 });

const heroSection = document.querySelector('.hero');
if (heroSection) {
    heroObserver.observe(heroSection);
}

// === Smooth Scroll for Anchor Links ===
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const target = document.querySelector(targetId);
        if (target) {
            window.scrollTo({
                top: target.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});

// === Preloader ===
window.addEventListener('load', () => {
    setTimeout(() => {
        const preloader = document.querySelector('.preloader');
        if (preloader) {
            preloader.style.opacity = '0';
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 600);
        }
    }, 1000);
});

// === Button Hover Effects ===
document.querySelectorAll('.btn-primary, .btn-secondary, .btn-outline').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'translateY(-4px)';
    });

    btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translateY(0)';
    });
});

// === Feature Card Hover ===
document.querySelectorAll('.feature-card, .step-card, .analytics-card, .pricing-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-10px)';
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
    });
});

// === Mobile Menu Toggle ===
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        const icon = mobileMenuBtn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        }
    });
}

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            if (navLinks) navLinks.style.display = 'none';
            const icon = mobileMenuBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        }
    });
});

// === Window Resize Handler ===
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        if (navLinks) navLinks.style.display = 'flex';
        const icon = mobileMenuBtn.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    }
});

// === Console Welcome Message ===
console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ██████╗ ██╗  ██╗██╗  ██╗    █████╗ ██╗  ██╗ █████╗     ║
║   ██╔══██╗██║  ██║╚██╗██╔╝   ██╔══██╗██║ ██╔╝██╔══██╗    ║
║   ██████╔╝███████║ ╚███╔╝    ███████║█████╔╝ ███████║    ║
║   ██╔═══╝ ██╔══██║ ██╔██╗    ██╔══██║██╔═██╗ ██╔══██║    ║
║   ██║     ██║  ██║██╔╝ ██╗   ██║  ██║██║  ██╗██║  ██║    ║
║   ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝    ║
║                                                            ║
║   HexAct — Система автоматической детекции крепежа       ║
║   Version: 1.0.0                                           ║
║   Author: Stepan Kislin                                    ║
║   GitHub: https://github.com/StepanKislin/hexact          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

// === Add active class to current section in navbar ===
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section');
    const scrollPos = window.scrollY + 80;

    sections.forEach(section => {
        if (scrollPos >= section.offsetTop && scrollPos < section.offsetTop + section.offsetHeight) {
            const id = section.getAttribute('id');
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${id}`) {
                    link.classList.add('active');
                }
            });
        }
    });
});

// === Initialize on page load ===
document.addEventListener('DOMContentLoaded', () => {
    console.log('HexAct Landing Page loaded successfully!');

    // Add subtle animations to elements on load
    setTimeout(() => {
        document.querySelectorAll('.feature-card, .step-card, .analytics-card, .pricing-card').forEach((el, index) => {
            setTimeout(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, 200 + (index * 100));
        });
    }, 500);

    // Check browser compatibility
    checkBrowserCompatibility();
});

// === Browser Compatibility Check ===
function checkBrowserCompatibility() {
    const isCompatible = 'getUserMedia' in navigator.mediaDevices &&
        'ImageCapture' in window &&
        'CanvasRenderingContext2D' in window;

    if (!isCompatible) {
        console.warn('Browser may not be fully compatible with HexAct');
    }
}

// === PWA Support ===
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('ServiceWorker registered:', registration.scope);
        }).catch(error => {
            console.log('ServiceWorker registration failed:', error);
        });
    });
}