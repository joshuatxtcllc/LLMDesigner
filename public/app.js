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
});