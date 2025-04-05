// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Bluetooth and Recording Variables
    let bluetoothDevice = null;
    let gattServer = null;
    let mediaRecorder = null;
    let recordedChunks = [];
    let recordingStream = null;
    let recordingCounter = 1;
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
        artworkForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Get the file and form data
            const fileInput = document.getElementById('artwork-upload');
            const artworkName = document.getElementById('artwork-name').value;
            const medium = document.getElementById('artwork-medium').value;
            const width = document.getElementById('artwork-width').value;
            const height = document.getElementById('artwork-height').value;
            const specialNotes = document.getElementById('special-notes').value;

            // Validate if an image is uploaded
            if (!fileInput.files || !fileInput.files[0]) {
                alert('Please upload an image of your artwork first.');
                return;
            }

            // Show loading state
            const submitButton = artworkForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.innerHTML = 'Processing...';
            submitButton.disabled = true;

            try {
                // Create form data
                const formData = new FormData();
                formData.append('artwork', fileInput.files[0]);
                formData.append('artworkName', artworkName);
                formData.append('medium', medium);
                formData.append('width', width);
                formData.append('height', height);
                formData.append('specialNotes', specialNotes);
                
                // Ensure results container exists
                let resultsContainer = document.getElementById('results');
                if (!resultsContainer) {
                    resultsContainer = document.createElement('div');
                    resultsContainer.id = 'results';
                    resultsContainer.className = 'results-container';
                    artworkForm.parentNode.appendChild(resultsContainer);
                }

                // Set a timeout to handle stuck requests
                const analysisTimeout = setTimeout(() => {
                    submitButton.innerHTML = originalButtonText;
                    submitButton.disabled = false;
                    const errorDisplay = document.createElement('div');
                    errorDisplay.className = 'bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4';
                    errorDisplay.innerHTML = `
                        <strong class="font-bold">Analysis taking too long!</strong>
                        <span class="block sm:inline">Using mock data for demonstration purposes.</span>
                    `;
                    resultsContainer.innerHTML = '';
                    resultsContainer.appendChild(errorDisplay);
                    displayMockResults();
                }, 20000); // 20 seconds timeout

                // Send to server
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    body: formData
                });

                // Check if response is ok
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Error analyzing artwork');
                }

                // Clear the timeout if we get a response
                clearTimeout(analysisTimeout);

                // Handle the response
                const data = await response.json();

                // Display the recommendations
                displayFramingRecommendations(data);

            } catch (error) {
                console.error('Error:', error);
                // Show a more detailed error message
                const errorDisplay = document.createElement('div');
                errorDisplay.className = 'bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4';

                // Check if it's an API key error
                let errorMessage = error.message || 'An error occurred while processing your artwork';
                if (errorMessage.includes('API key') || errorMessage.includes('authentication') || errorMessage.includes('401')) {
                    errorMessage = 'OpenAI API key error: Please ask the administrator to add a valid OpenAI API key with access to GPT-4 Vision API in the Replit Secrets tool.';
                }

                errorDisplay.innerHTML = `
                    <strong class="font-bold">Error!</strong>
                    <span class="block sm:inline">${errorMessage}</span>
                `;

                // Ensure results container exists
                let resultSection = document.getElementById('results');
                if (!resultSection) {
                    resultSection = document.createElement('div');
                    resultSection.id = 'results';
                    resultSection.className = 'results-container';
                    artworkForm.parentNode.appendChild(resultSection);
                }
                
                resultSection.innerHTML = '';
                resultSection.appendChild(errorDisplay);
                resultSection.scrollIntoView({ behavior: 'smooth' });
            } finally {
                // Reset button state
                submitButton.innerHTML = originalButtonText;
                submitButton.disabled = false;
            }
        });
    }

    // Function to display the framing recommendations
    function displayFramingRecommendations(data) {
        // Create results container if it doesn't exist
        let resultsContainer = document.getElementById('framing-results');
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'framing-results';
            resultsContainer.className = 'max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md mt-8';
            document.querySelector('#upload .container').appendChild(resultsContainer);
        }

        // Scroll to results
        resultsContainer.scrollIntoView({ behavior: 'smooth' });

        // Create the HTML content
        let content = `
            <h3 class="text-2xl font-bold mb-6">Your Framing Recommendations</h3>

            <div class="mb-6">
                <h4 class="text-xl font-semibold mb-3">Artwork Analysis</h4>
                <div class="grid md:grid-cols-2 gap-4">
                    <div class="p-4 bg-gray-50 rounded">
                        <div class="font-medium text-gray-700">Medium and Type</div>
                        <div>${data.analysis.medium || 'Not detected'}</div>
                    </div>
                    <div class="p-4 bg-gray-50 rounded">
                        <div class="font-medium text-gray-700">Color Palette</div>
                        <div>${data.analysis.colors || 'Not detected'}</div>
                    </div>
                    <div class="p-4 bg-gray-50 rounded">
                        <div class="font-medium text-gray-700">Style and Subject</div>
                        <div>${data.analysis.style || 'Not detected'}</div>
                    </div>
                    <div class="p-4 bg-gray-50 rounded">
                        <div class="font-medium text-gray-700">Conservation Needs</div>
                        <div>${data.analysis.conservation || 'Standard conservation'}</div>
                    </div>
                </div>
            </div>

            <div class="mb-6">
                <h4 class="text-xl font-semibold mb-3">Framing Options</h4>
                <div class="grid md:grid-cols-3 gap-6">
                    <!-- Traditional Option -->
                    <div class="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div class="bg-amber-50 p-4 border-b">
                            <h5 class="text-lg font-semibold text-amber-800">Traditional Option</h5>
                        </div>
                        <div class="p-4 space-y-3">
                            <div>
                                <div class="font-medium">Frame:</div>
                                <div>${data.recommendations.traditional.frame || 'Not specified'}</div>
                            </div>
                            <div>
                                <div class="font-medium">Mat:</div>
                                <div>${data.recommendations.traditional.mat || 'Not specified'}</div>
                            </div>
                            <div>
                                <div class="font-medium">Glass:</div>
                                <div>${data.recommendations.traditional.glass || 'Not specified'}</div>
                            </div>
                            <div>
                                <div class="font-medium">Mounting:</div>
                                <div>${data.recommendations.traditional.mounting || 'Not specified'}</div>
                            </div>
                            <div>
                                <div class="font-medium">Price Range:</div>
                                <div>${data.recommendations.traditional.priceRange || 'Not specified'}</div>
                            </div>
                            <div class="pt-2">
                                <div class="font-medium">Design Rationale:</div>
                                <div class="text-gray-700">${data.recommendations.traditional.rationale || 'Not provided'}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Contemporary Option -->
                    <div class="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div class="bg-indigo-50 p-4 border-b">
                            <h5 class="text-lg font-semibold text-indigo-800">Contemporary Option</h5>
                        </div>
                        <div class="p-4 space-y-3">
                            <div>
                                <div class="font-medium">Frame:</div>
                                <div>${data.recommendations.contemporary.frame || 'Not specified'}</div>
                            </div>
                            <div>
                                <div class="font-medium">Mat:</div>
                                <div>${data.recommendations.contemporary.mat || 'Not specified'}</div>
                            </div>
                            <div>
                                <div class="font-medium">Glass:</div>
                                <div>${data.recommendations.contemporary.glass || 'Not specified'}</div>
                            </div>
                            <div>
                                <div class="font-medium">Mounting:</div>
                                <div>${data.recommendations.contemporary.mounting || 'Not specified'}</div>
                            </div>
                            <div>
                                <div class="font-medium">Price Range:</div>
                                <div>${data.recommendations.contemporary.priceRange || 'Not specified'}</div>
                            </div>
                            <div class="pt-2">
                                <div class="font-medium">Design Rationale:</div>
                                <div class="text-gray-700">${data.recommendations.contemporary.rationale || 'Not provided'}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Budget Option -->
                    <div class="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div class="bg-green-50 p-4 border-b">
                            <h5 class="text-lg font-semibold text-green-800">Budget Option</h5>
                        </div>
                        <div class="p-4 space-y-3">
                            <div>
                                <div class="font-medium">Frame:</div>
                                <div>${data.recommendations.budget.frame || 'Not specified'}</div>
                            </div>
                            <div>
                                <div class="font-medium">Mat:</div>
                                <div>${data.recommendations.budget.mat || 'Not specified'}</div>
                            </div>
                            <div>
                                <div class="font-medium">Glass:</div>
                                <div>${data.recommendations.budget.glass || 'Not specified'}</div>
                            </div>
                            <div>
                                <div class="font-medium">Mounting:</div>
                                <div>${data.recommendations.budget.mounting || 'Not specified'}</div>
                            </div>
                            <div>
                                <div class="font-medium">Price Range:</div>
                                <div>${data.recommendations.budget.priceRange || 'Not specified'}</div>
                            </div>
                            <div class="pt-2">
                                <div class="font-medium">Design Rationale:</div>
                                <div class="text-gray-700">${data.recommendations.budget.rationale || 'Not provided'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="text-center mt-8">
                <button id="print-recommendations" class="btn-secondary mx-2">Print Recommendations</button>
                <button id="new-artwork" class="btn-primary mx-2">Analyze Another Artwork</button>
            </div>
        `;

        // Set the HTML content
        resultsContainer.innerHTML = content;

        // Add event listeners for buttons
        document.getElementById('print-recommendations').addEventListener('click', function() {
            window.print();
        });

        document.getElementById('new-artwork').addEventListener('click', function() {
            // Reset the form
            artworkForm.reset();
            document.getElementById('preview-container').classList.add('hidden');
            document.querySelector('.upload-label').classList.remove('hidden');

            // Remove results
            resultsContainer.remove();

            // Scroll to upload form
            document.getElementById('upload').scrollIntoView({ behavior: 'smooth' });
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

    // Bluetooth Connection Functionality
    const bluetoothConnectBtn = document.getElementById('bluetooth-connect');
    const deviceInfo = document.getElementById('device-info');
    const deviceName = document.getElementById('device-name');
    const connectionStatus = document.getElementById('connection-status');
    const recordingControls = document.getElementById('recording-controls');
    const startRecordingBtn = document.getElementById('start-recording');
    const stopRecordingBtn = document.getElementById('stop-recording');
    const previewStream = document.getElementById('preview-stream');
    const cameraPreview = document.getElementById('camera-preview');
    const recordingList = document.getElementById('recording-list');
    const recordingsContainer = document.getElementById('recordings-container');

    if (bluetoothConnectBtn) {
        bluetoothConnectBtn.addEventListener('click', async function() {
            try {
                // Check if Web Bluetooth API is available
                if (!navigator.bluetooth) {
                    alert('Web Bluetooth API is not available in your browser. Please use Chrome or Edge.');
                    return;
                }

                // Request device with appropriate filters
                bluetoothDevice = await navigator.bluetooth.requestDevice({
                    filters: [
                        { services: ['00001101-0000-1000-8000-00805f9b34fb'] }, // Serial Port Profile
                        { services: ['battery_service'] },
                        { namePrefix: 'Camera' },
                        { namePrefix: 'GoPro' },
                        { namePrefix: 'iPhone' },
                        { namePrefix: 'Android' }
                    ],
                    optionalServices: ['generic_access']
                });

                // Show device info
                deviceInfo.classList.remove('hidden');
                deviceName.textContent = bluetoothDevice.name || 'Unknown Device';
                connectionStatus.textContent = 'Connected';

                bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);

                // Connect to GATT server
                gattServer = await bluetoothDevice.gatt.connect();
                console.log('Connected to GATT server');

                // Once connected to Bluetooth, let's use WebRTC for camera access
                // This simulates connecting to a device's camera
                await setupCamera();
                recordingControls.classList.remove('hidden');

            } catch (error) {
                console.error('Bluetooth connection error:', error);
                alert('Failed to connect to a Bluetooth device: ' + error.message);
            }
        });
    }

    async function setupCamera() {
        try {
            // Request camera access
            recordingStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            // Display the camera stream
            cameraPreview.srcObject = recordingStream;
            previewStream.classList.remove('hidden');

            return true;
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Could not access camera: ' + error.message);
            return false;
        }
    }

    function onDisconnected() {
        connectionStatus.textContent = 'Disconnected';
        console.log('Bluetooth device disconnected');

        // Stop media stream if active
        if (recordingStream) {
            recordingStream.getTracks().forEach(track => track.stop());
            recordingStream = null;
        }

        // Log disconnection event to server/Supabase
        fetch('/api/log-device-event', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                event: 'disconnected',
                deviceName: bluetoothDevice ? bluetoothDevice.name : 'Unknown Device',
                timestamp: new Date().toISOString()
            })
        }).catch(error => console.error('Failed to log device event:', error));

        // Hide controls
        recordingControls.classList.add('hidden');
        previewStream.classList.add('hidden');
    }

    // Training functionality
    const startTrainingBtn = document.getElementById('start-training');
    const stopTrainingBtn = document.getElementById('stop-training');

    if (startTrainingBtn) {
        startTrainingBtn.addEventListener('click', function() {
            // Start training session
            window.trainingModule.start();
        });
    }

    if (stopTrainingBtn) {
        stopTrainingBtn.addEventListener('click', function() {
            // End training session
            window.trainingModule.end();
        });
    }

    // Recording functionality
    if (startRecordingBtn) {
        startRecordingBtn.addEventListener('click', function() {
            if (!recordingStream) {
                alert('Camera is not connected. Please connect a device first.');
                return;
            }

            // Initialize MediaRecorder
            recordedChunks = [];
            mediaRecorder = new MediaRecorder(recordingStream, { mimeType: 'video/webm' });

            mediaRecorder.addEventListener('dataavailable', function(e) {
                if (e.data.size > 0) {
                    recordedChunks.push(e.data);
                }
            });

            mediaRecorder.addEventListener('stop', function() {
                // Create recording blob
                const recordingBlob = new Blob(recordedChunks, { type: 'video/webm' });
                const recordingUrl = URL.createObjectURL(recordingBlob);

                // Add recording to list
                addRecordingToList(recordingUrl);

                // Upload to server
                uploadRecording(recordingBlob);

                // If training session is active, associate this recording with it
                if (window.trainingModule && window.trainingModule.isActive) {
                    window.trainingModule.end(recordingUrl);
                }

                // Reset UI
                startRecordingBtn.disabled = false;
                stopRecordingBtn.disabled = true;
            });

            // Start recording
            mediaRecorder.start();
            startRecordingBtn.disabled = true;
            stopRecordingBtn.disabled = false;
            console.log('Recording started');
        });
    }

    if (stopRecordingBtn) {
        stopRecordingBtn.addEventListener('click', function() {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
                console.log('Recording stopped');
            }
        });
    }

    function addRecordingToList(url) {
        // Show the recordings list
        recordingList.classList.remove('hidden');

        // Create recording item
        const recordingItem = document.createElement('li');
        recordingItem.className = 'py-4';

        const recordingName = `Recording ${recordingCounter++}`;

        recordingItem.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <h4 class="text-lg font-medium">${recordingName}</h4>
                    <p class="text-sm text-gray-500">${new Date().toLocaleString()}</p>
                </div>
                <div class="flex space-x-2">
                    <a href="${url}" download="${recordingName}.webm" class="text-indigo-600 hover:text-indigo-800">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                        </svg>
                    </a>
                    <button class="text-gray-500 hover:text-gray-700 play-recording">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="mt-2 hidden recording-preview">
                <video controls class="w-full rounded" src="${url}"></video>
            </div>
        `;

        recordingsContainer.prepend(recordingItem);

        // Add event listener for play button
        recordingItem.querySelector('.play-recording').addEventListener('click', function() {
            const preview = recordingItem.querySelector('.recording-preview');
            preview.classList.toggle('hidden');

            if (!preview.classList.contains('hidden')) {
                const video = preview.querySelector('video');
                video.play();
            }
        });
    }

    // Function to upload recording to server
    async function uploadRecording(blob) {
        try {
            const formData = new FormData();
            formData.append('recording', blob, `recording-${Date.now()}.webm`);

            const response = await fetch('/api/upload-recording', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload recording');
            }

            console.log('Recording uploaded successfully');
        } catch (error) {
            console.error('Error uploading recording:', error);
        }
    }

    // Mock data display function
    function displayMockResults() {
        console.log("Displaying mock results");
        
        // Ensure results container exists
        let resultsContainer = document.getElementById('results');
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'results';
            resultsContainer.className = 'results-container';
            document.querySelector('#upload .container').appendChild(resultsContainer);
        }
        
        // Create mock data
        const mockData = {
            analysis: {
                medium: "Acrylic painting on canvas",
                colors: "Blues, greens, and earth tones",
                style: "Abstract landscape",
                conservation: "Standard conservation"
            },
            recommendations: {
                traditional: {
                    frame: "Classic gold wood frame with ornate profile",
                    mat: "Double mat with cream top mat, forest green bottom mat",
                    glass: "Conservation clear glass with 99% UV protection",
                    mounting: "Dry mounted to acid-free foam board",
                    rationale: "The traditional gold frame creates a timeless presentation that enhances the artwork's natural colors",
                    priceRange: "$150-250"
                },
                contemporary: {
                    frame: "Slim black metal frame with clean lines",
                    mat: "Single white mat with 3-inch border",
                    glass: "Museum glass with anti-reflective coating",
                    mounting: "Corner mounted with archival corners",
                    rationale: "The minimalist approach allows the artwork to be the focal point while protecting it",
                    priceRange: "$200-300"
                },
                budget: {
                    frame: "Natural wood frame with simple profile",
                    mat: "Single off-white mat",
                    glass: "Standard clear glass",
                    mounting: "Archival tape mounting",
                    rationale: "This option provides good protection while keeping costs down",
                    priceRange: "$75-125"
                }
            }
        };
        
        // Display the mock recommendations
        displayFramingRecommendations(mockData);
    }
});


document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('fileInput');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const resultContainer = document.getElementById('result-container');

    // Prevent default behavior for drag events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop area when file is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.classList.add('highlight');
    }

    function unhighlight() {
        dropArea.classList.remove('highlight');
    }

    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleFiles, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles({ target: { files } });
    }

    function handleFiles(e) {
        const files = e.target.files;
        if (files.length > 0) {
            uploadFiles(files);
        }
    }

    function uploadFiles(files) {
        // Show loading animation
        loading.classList.remove('hidden');
        results.classList.add('hidden');
        resultContainer.innerHTML = '';

        const formData = new FormData();

        // Append all files to the form data
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }

        // Send files to server for conversion
        fetch('/api/convert', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            displayResults(data);
        })
        .catch(error => {
            console.error('Error:', error);
            displayError(error.message);
        })
        .finally(() => {
            loading.classList.add('hidden');
        });
    }

    function displayResults(data) {
        resultContainer.innerHTML = '';

        if (data.results && data.results.length > 0) {
            // If multiple files were converted
            data.results.forEach(result => {
                const resultItem = createResultItem(result);
                resultContainer.appendChild(resultItem);
            });
        } else if (data.markdown) {
            // If a single file was converted
            const result = {
                filename: data.filename || 'Converted File',
                markdown: data.markdown
            };
            const resultItem = createResultItem(result);
            resultContainer.appendChild(resultItem);
        } else {
            displayError('No conversion results returned');
            return;
        }

        results.classList.remove('hidden');
    }

    function createResultItem(result) {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';

        const resultHeader = document.createElement('div');
        resultHeader.className = 'result-header';

        const resultTitle = document.createElement('div');
        resultTitle.className = 'result-title';
        resultTitle.textContent = result.filename;

        const resultActions = document.createElement('div');
        resultActions.className = 'result-actions';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn copy-btn';
        copyBtn.textContent = 'Copy';
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(result.markdown)
                .then(() => {
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = originalText;
                    }, 2000);
                })
                .catch(err => {
                    console.error('Could not copy text: ', err);
                });
        });

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'btn download-btn';
        downloadBtn.textContent = 'Download';
        downloadBtn.addEventListener('click', () => {
            const filename = result.filename.replace(/\.[^/.]+$/, '') + '.md';
            const blob = new Blob([result.markdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });

        resultActions.appendChild(copyBtn);
        resultActions.appendChild(downloadBtn);

        resultHeader.appendChild(resultTitle);
        resultHeader.appendChild(resultActions);

        const markdownContent = document.createElement('pre');
        markdownContent.className = 'markdown-content';
        markdownContent.textContent = result.markdown;

        resultItem.appendChild(resultHeader);
        resultItem.appendChild(markdownContent);

        return resultItem;
    }

    function displayError(message) {
        resultContainer.innerHTML = `
            <div class="error-message">
                <p>Error: ${message}</p>
                <p>Please try again with a supported file type.</p>
            </div>
        `;
        results.classList.remove('hidden');
    }
});