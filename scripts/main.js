/**
 * VoteChainAI - Main JavaScript
 * Handles theme toggle, scroll animations, and navigation
 */

(function () {
    'use strict';

    // ============================
    // THEME TOGGLE
    // ============================
    const ThemeManager = {
        STORAGE_KEY: 'votechainai-theme',

        init() {
            this.toggle = document.querySelector('.theme-toggle');
            this.html = document.documentElement;

            // Load saved theme or default to dark
            const savedTheme = localStorage.getItem(this.STORAGE_KEY) || 'dark';
            this.setTheme(savedTheme);

            // Bind toggle click
            if (this.toggle) {
                this.toggle.addEventListener('click', () => this.toggleTheme());
                this.toggle.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.toggleTheme();
                    }
                });
            }
        },

        setTheme(theme) {
            this.html.setAttribute('data-theme', theme);
            localStorage.setItem(this.STORAGE_KEY, theme);

            // Update ARIA label
            if (this.toggle) {
                const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
                this.toggle.setAttribute('aria-label', label);
            }
        },

        toggleTheme() {
            const currentTheme = this.html.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            this.setTheme(newTheme);
        }
    };

    // ============================
    // NAVIGATION SCROLL EFFECT
    // ============================
    const NavManager = {
        init() {
            this.nav = document.querySelector('.nav');
            if (!this.nav) return;

            this.handleScroll = this.handleScroll.bind(this);
            window.addEventListener('scroll', this.handleScroll, { passive: true });
            this.handleScroll(); // Initial check
        },

        handleScroll() {
            const scrolled = window.scrollY > 50;
            this.nav.classList.toggle('scrolled', scrolled);
        }
    };

    // ============================
    // SCROLL ANIMATIONS
    // ============================
    const ScrollAnimator = {
        init() {
            // Check for reduced motion preference
            this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (this.prefersReducedMotion) {
                // Make all elements visible immediately
                document.querySelectorAll('[data-animate]').forEach(el => {
                    el.classList.add('is-visible');
                });
                return;
            }

            // Set up Intersection Observer
            this.observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('is-visible');
                            // Optionally unobserve after animation
                            this.observer.unobserve(entry.target);
                        }
                    });
                },
                {
                    threshold: 0.1,
                    rootMargin: '0px 0px -50px 0px'
                }
            );

            // Observe all elements with data-animate attribute
            document.querySelectorAll('[data-animate]').forEach(el => {
                this.observer.observe(el);
            });
        }
    };

    // ============================
    // HERO SCROLL ANIMATION
    // ============================
    const HeroAnimator = {
        init() {
            this.container = document.querySelector('.hero__animation');
            this.frames = document.querySelectorAll('.hero__animation-frame');

            if (!this.container || this.frames.length === 0) return;

            // Check for reduced motion preference
            this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (this.prefersReducedMotion) {
                // Show first frame only
                this.frames[0]?.classList.add('active');
                return;
            }

            this.totalFrames = this.frames.length;
            this.currentFrame = 0;

            // Bind scroll handler
            this.handleScroll = this.handleScroll.bind(this);
            window.addEventListener('scroll', this.handleScroll, { passive: true });
            this.handleScroll(); // Initial frame
        },

        handleScroll() {
            const heroSection = document.querySelector('.hero');
            if (!heroSection) return;

            const rect = heroSection.getBoundingClientRect();
            const scrollProgress = Math.max(0, Math.min(1, -rect.top / (rect.height * 0.5)));
            const frameIndex = Math.min(
                this.totalFrames - 1,
                Math.floor(scrollProgress * this.totalFrames)
            );

            if (frameIndex !== this.currentFrame) {
                this.frames[this.currentFrame]?.classList.remove('active');
                this.frames[frameIndex]?.classList.add('active');
                this.currentFrame = frameIndex;
            }
        }
    };

    // ============================
    // SMOOTH SCROLL FOR ANCHORS
    // ============================
    const SmoothScroll = {
        init() {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', (e) => {
                    const href = anchor.getAttribute('href');
                    if (href === '#') return;

                    const target = document.querySelector(href);
                    if (target) {
                        e.preventDefault();
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            });
        }
    };

    // ============================
    // INITIALIZE ALL MODULES
    // ============================
    document.addEventListener('DOMContentLoaded', () => {
        ThemeManager.init();
        NavManager.init();
        ScrollAnimator.init();
        HeroAnimator.init();
        SmoothScroll.init();
    });

})();
