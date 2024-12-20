// DOM Elements
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');
const navLinksItems = document.querySelectorAll('.nav-link');
const navbar = document.querySelector('.navbar');
const typingWrapper = document.querySelector('.typing-wrapper');

// Mobile Menu
function toggleMobileMenu() {
    mobileMenuBtn.classList.toggle('active');
    navLinks.classList.toggle('active');
    document.body.classList.toggle('menu-open');
}

mobileMenuBtn.addEventListener('click', toggleMobileMenu);

navLinksItems.forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            toggleMobileMenu();
        }
    });
});

// Smooth Scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (!target) return;
        
        const headerOffset = 80;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    });
});

// Navbar Scroll Effect
let lastScroll = 0;

function handleScroll() {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll <= 0) {
        navbar.classList.remove('scrolled');
        return;
    }
    
    if (currentScroll > lastScroll && !navbar.classList.contains('scroll-down')) {
        navbar.classList.add('scroll-down', 'scrolled');
    } else if (currentScroll < lastScroll && navbar.classList.contains('scroll-down')) {
        navbar.classList.remove('scroll-down');
    }
    
    lastScroll = currentScroll;
}

window.addEventListener('scroll', handleScroll);

// Typing Animation
let currentTextIndex = 0;

function updateTypingText() {
    if (!typingWrapper) return;
    const height = typingWrapper.children[0].offsetHeight;
    typingWrapper.style.transform = `translateY(-${currentTextIndex * height}px)`;
    currentTextIndex = (currentTextIndex + 1) % typingWrapper.children.length;
}

setInterval(updateTypingText, 3000);

// Intersection Observer for Animations
const observerOptions = {
    threshold: 0.2,
    rootMargin: '0px 0px -50px 0px'
};

const animateElements = new Map([
    ['skill-tags', (el) => {
        el.querySelectorAll('.skill-tag').forEach((tag, index) => {
            setTimeout(() => {
                tag.style.opacity = '1';
                tag.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }],
    ['hero-stats', (el) => {
        el.querySelectorAll('.stat').forEach((stat, index) => {
            setTimeout(() => {
                stat.style.opacity = '1';
                stat.style.transform = 'translateY(0)';
            }, index * 200);
        });
    }],
    ['about-highlights', (el) => {
        el.querySelectorAll('.highlight-item').forEach((item, index) => {
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * 200);
        });
    }]
]);

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate');
            
            for (const [className, animationFn] of animateElements) {
                if (entry.target.classList.contains(className)) {
                    animationFn(entry.target);
                    break;
                }
            }
        }
    });
}, observerOptions);

// Initialize Animations
function initializeAnimations() {
    // Hero Stats
    document.querySelectorAll('.stat').forEach(stat => {
        stat.style.opacity = '0';
        stat.style.transform = 'translateY(20px)';
        stat.style.transition = 'all 0.6s ease';
    });
    
    // About Highlights
    document.querySelectorAll('.highlight-item').forEach(item => {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = 'all 0.6s ease';
    });
    
    // Skill Tags
    document.querySelectorAll('.skill-tags').forEach(container => {
        container.querySelectorAll('.skill-tag').forEach(tag => {
            tag.style.opacity = '0';
            tag.style.transform = 'translateY(20px)';
            tag.style.transition = 'all 0.5s ease';
        });
    });
    
    // Observe Elements
    document.querySelectorAll('.hero-stats, .about-highlights, .skill-tags').forEach(el => {
        observer.observe(el);
    });
}

// Active Navigation
function updateActiveNavLink() {
    const sections = document.querySelectorAll('section');
    const navItems = document.querySelectorAll('.nav-link');
    
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });
    
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href').slice(1) === current) {
            item.classList.add('active');
        }
    });
}

window.addEventListener('scroll', updateActiveNavLink);

// Update Copyright Year
document.getElementById('year').textContent = new Date().getFullYear();

// Initialize
document.addEventListener('DOMContentLoaded', initializeAnimations);

// Back to Top Button
const backToTopButton = document.getElementById('back-to-top');

window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        backToTopButton.classList.add('visible');
    } else {
        backToTopButton.classList.remove('visible');
    }
});

backToTopButton.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});