
// Jay's Frames Expert - Client-side JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const artworkForm = document.getElementById('artwork-form');
    const artworkUpload = document.getElementById('artwork-upload');
    const uploadLabel = document.querySelector('.upload-label');
    const previewContainer = document.getElementById('preview-container');
    const artworkPreview = document.getElementById('artwork-preview');
    const removeImageBtn = document.getElementById('remove-image');
    const menuToggleBtn = document.getElementById('menu-toggle');
    
    // Mobile menu toggle
    if (menuToggleBtn) {
        const mobileMenu = document.createElement('div');
        mobileMenu.className = 'mobile-menu hidden md:hidden bg-white w-full absolute z-10 left-0 shadow-md';
        mobileMenu.innerHTML = `
            <div class="px-4 py-3 space-y-2">
                <a href="#" class="block text-gray-700 hover:text-indigo-600 py-2">Home</a>
                <a href="#how-it-works" class="block text-gray-700 hover:text-indigo-600 py-2">How It Works</a>
                <a href="#about" class="block text-gray-700 hover:text-indigo-600 py-2">About</a>
                <a href="#contact" class="block text-gray-700 hover:text-indigo-600 py-2">Contact</a>
            </div>
        `;
        document.querySelector('header').appendChild(mobileMenu);
        
        menuToggleBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }
    
    // File upload handling
    if (artworkUpload) {
        // Handle file selection
        artworkUpload.addEventListener('change', handleFileSelect);
        
        // Handle drag and drop
        uploadLabel.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadLabel.parentElement.classList.add('active');
        });
        
        uploadLabel.addEventListener('dragleave', function() {
            uploadLabel.parentElement.classList.remove('active');
        });
        
        uploadLabel.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadLabel.parentElement.classList.remove('active');
            
            if (e.dataTransfer.files.length) {
                artworkUpload.files = e.dataTransfer.files;
                handleFileSelect();
            }
        });
        
        // Remove image
        if (removeImageBtn) {
            removeImageBtn.addEventListener('click', function(e) {
                e.preventDefault();
                artworkUpload.value = '';
                previewContainer.classList.add('hidden');
                uploadLabel.classList.remove('hidden');
            });
        }
    }
    
    // Form submission
    if (artworkForm) {
        artworkForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!artworkUpload.files.length) {
                alert('Please upload an image first');
                return;
            }
            
            // Show loading state
            const submitBtn = artworkForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = 'Analyzing...';
            submitBtn.disabled = true;
            
            try {
                // Create form data
                const formData = new FormData();
                formData.append('artwork', artworkUpload.files[0]);
                formData.append('artworkName', document.getElementById('artwork-name').value);
                formData.append('medium', document.getElementById('artwork-medium').value);
                formData.append('width', document.getElementById('artwork-width').value);
                formData.append('height', document.getElementById('artwork-height').value);
                formData.append('specialNotes', document.getElementById('special-notes').value);
                
                // Send to server
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error('Failed to analyze artwork');
                }
                
                const data = await response.json();
                
                // Show results (in a real app, you'd render the recommendations)
                console.log('Framing recommendations:', data);
                alert('Your artwork was analyzed! Check the console for the results.');
                
                // In a complete implementation, you would:
                // 1. Hide the form
                // 2. Show a results section with the recommendations
                // 3. Allow the user to select a recommendation and proceed
                
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred while analyzing your artwork. Please try again.');
            } finally {
                // Reset button state
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }
    
    // Helper function to handle file selection
    function handleFileSelect() {
        if (artworkUpload.files && artworkUpload.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                artworkPreview.src = e.target.result;
                uploadLabel.classList.add('hidden');
                previewContainer.classList.remove('hidden');
            };
            
            reader.readAsDataURL(artworkUpload.files[0]);
        }
    }
});
