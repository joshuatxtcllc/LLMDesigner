
// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Mobile Menu Toggle
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.createElement('div');
    mobileMenu.classList.add('mobile-menu', 'hidden', 'md:hidden');
    
    if (menuToggle) {
        // Create mobile menu
        const navLinks = document.querySelectorAll('nav a');
        mobileMenu.innerHTML = Array.from(navLinks)
            .filter(link => !link.parentElement.classList.contains('flex'))
            .map(link => `<a href="${link.getAttribute('href')}" class="block py-2 px-4 hover:bg-gray-100 rounded-md">${link.textContent}</a>`)
            .join('');
        
        document.querySelector('header').appendChild(mobileMenu);
        
        menuToggle.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }
    
    // Artwork Upload Functionality
    const fileInput = document.getElementById('artwork-upload');
    const previewContainer = document.getElementById('preview-container');
    const artworkPreview = document.getElementById('artwork-preview');
    const removeButton = document.getElementById('remove-image');
    const uploadArea = document.querySelector('.upload-area');
    
    if (fileInput) {
        // Handle file selection
        fileInput.addEventListener('change', function(e) {
            handleFileSelect(e.target.files[0]);
        });
        
        // Handle drag and drop
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadArea.classList.add('active');
        });
        
        uploadArea.addEventListener('dragleave', function() {
            uploadArea.classList.remove('active');
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadArea.classList.remove('active');
            handleFileSelect(e.dataTransfer.files[0]);
        });
        
        // Remove image
        if (removeButton) {
            removeButton.addEventListener('click', function() {
                fileInput.value = '';
                previewContainer.classList.add('hidden');
                uploadArea.classList.remove('hidden');
            });
        }
    }
    
    // Handle file selection
    function handleFileSelect(file) {
        if (!file) return;
        
        if (!file.type.match('image.*')) {
            alert('Please select an image file.');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            artworkPreview.src = e.target.result;
            previewContainer.classList.remove('hidden');
            document.querySelector('.upload-label').classList.add('hidden');
        };
        
        reader.readAsDataURL(file);
    }
    
    // Artwork Form Submission
    const artworkForm = document.getElementById('artwork-form');
    
    if (artworkForm) {
        artworkForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // Here you would normally send the data to the server
            alert('Form submitted! This would normally send the data to the server for processing.');
        });
    }
    
    // Contact Form Submission
    const contactForm = document.getElementById('contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // Here you would normally send the data to the server
            alert('Thank you for your message! We will get back to you shortly.');
        });
    }
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 80, // Adjust for header height
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                mobileMenu.classList.add('hidden');
            }
        });
    });
    
    // Animate elements on scroll
    const animateElements = document.querySelectorAll('.feature-card, .testimonial-card, .section-heading');
    
    // Check if IntersectionObserver is supported
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fadeIn');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        animateElements.forEach(el => {
            observer.observe(el);
        });
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        animateElements.forEach(el => {
            el.classList.add('animate-fadeIn');
        });
    }
});
