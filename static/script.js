// Variables to store selected files and processed data
let selectedFiles = [];
let processedImageUrl = '';
let fileName = '';

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const previewContainer = document.getElementById('previewContainer');
const previewGrid = document.getElementById('previewGrid');
const userInputField = document.getElementById('userInput');
const uploadBtn = document.getElementById('uploadBtn');
const resultContainer = document.getElementById('resultContainer');
const resultBox = document.getElementById('resultBox');
const resultIcon = document.getElementById('resultIcon');
const resultTitle = document.getElementById('resultTitle');
const resultText = document.getElementById('resultText');
const downloadBtnContainer = document.getElementById('downloadBtnContainer');
const downloadBtn = document.getElementById('downloadBtn');
const downloadShine = document.getElementById('downloadShine');
const downloadBtnText = document.getElementById('downloadBtnText');

// Point this URL to your locally running Flask (or other) server
const backendUrl = 'https://text-highlighter-io.onrender.com/process-images';

// Upload Area Click
uploadArea.addEventListener('click', (e) => {
    if (!e.target.closest('.remove-btn')) {
        imageInput.click();
    }
});

// File Input Change
imageInput.addEventListener('change', (e) => {
    handleFileSelect(Array.from(e.target.files));
});

// Text input change - check if ready to process
userInputField.addEventListener('input', checkUploadReady);

// Drag and Drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('border-neutral-900', 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('border-neutral-900', 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('border-neutral-900', 'shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]');

    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
        handleFileSelect(files);
    }
});

// Handle File Selection
function handleFileSelect(files) {
    if (!files || files.length === 0) return;

    const validFiles = files.filter(file => file.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    selectedFiles = [...selectedFiles, ...validFiles];
    updatePreview();
    checkUploadReady();

    // Hide results when new images are selected
    resultContainer.style.display = 'none';
    downloadBtnContainer.style.display = 'none';
    processedImageUrl = '';
}

// Update Preview
function updatePreview() {
    if (selectedFiles.length === 0) {
        uploadPlaceholder.style.display = 'flex';
        previewContainer.style.display = 'none';
        uploadArea.classList.remove('border-neutral-900');
        uploadArea.classList.add('border-neutral-200');
        return;
    }

    uploadPlaceholder.style.display = 'none';
    previewContainer.style.display = 'block';
    uploadArea.classList.add('border-neutral-900');
    uploadArea.classList.remove('border-neutral-200');
    previewGrid.innerHTML = '';

    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="Preview ${index + 1}">
                <button class="remove-btn" data-index="${index}" title="Remove image">×</button>
            `;

            previewItem.querySelector('.remove-btn').addEventListener('click', (event) => {
                event.stopPropagation();
                removeFile(index);
            });

            previewGrid.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

// Remove File
function removeFile(index) {
    selectedFiles.splice(index, 1);
    updatePreview();
    checkUploadReady();
    if (selectedFiles.length === 0) {
        resultContainer.style.display = 'none';
        downloadBtnContainer.style.display = 'none';
        processedImageUrl = '';
    }
}

// Check if ready to upload
function checkUploadReady() {
    const hasFiles = selectedFiles.length > 0;
    const hasText = userInputField.value.trim().length > 0;

    if (hasFiles && hasText) {
        uploadBtn.disabled = false;
        uploadBtn.className = 'group relative px-16 py-6 border-4 font-black text-xl transition-all duration-200 bg-neutral-900 border-neutral-900 text-white hover:translate-x-1 hover:translate-y-1 hover:shadow-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]';
    } else {
        uploadBtn.disabled = true;
        uploadBtn.className = 'group relative px-16 py-6 border-4 font-black text-xl transition-all duration-200 bg-neutral-300 border-neutral-300 text-neutral-500 cursor-not-allowed';
    }
}

// Upload Button Click
uploadBtn.addEventListener('click', async () => {
    const userInput = userInputField.value.trim();
    if (selectedFiles.length === 0 || !userInput) return;

    uploadBtn.disabled = true;
    uploadBtn.innerHTML = `
        <span class="flex items-center gap-4">
            <div class="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            PROCESSING...
        </span>
    `;

    const formData = new FormData();

    // Add the search text
    formData.append('user_input', userInput);

    // Append all selected images
    selectedFiles.forEach((file, index) => {
        formData.append('images', file);
    });

    try {
        const response = await fetch(backendUrl, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();

            showResult(data.message, true);

            if (data.processedImageUrl) {
                processedImageUrl = data.processedImageUrl;
                downloadBtnContainer.style.display = 'flex';
            }

            if (data.fileName) {
                fileName = data.fileName;
            }
        } else {
            const errorData = await response.json();
            showResult(errorData.error || 'Error processing images. Please try again.', false);
        }
    } catch (error) {
        showResult(`Network error: ${error.message}`, false);
    }

    uploadBtn.innerHTML = `
        <span class="flex items-center gap-4">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>
            </svg>
            PROCESS & HIGHLIGHT
        </span>
    `;
    checkUploadReady();
});

// Download Button Click
downloadBtn.addEventListener('click', () => {
    if (!processedImageUrl) return;

    // Start animation
    downloadShine.style.display = 'block';
    downloadShine.classList.add('animate-download-shine');
    downloadBtnText.textContent = 'DOWNLOADING...';
    downloadBtn.disabled = true;

    // Create and click direct link to Flask download endpoint
    const link = document.createElement('a');
    link.href = processedImageUrl;  // e.g. http://localhost:5000/download/filename.png
    link.download = fileName || '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Stop animation shortly after; give time for download to start
    setTimeout(() => {
        downloadShine.style.display = 'none';
        downloadShine.classList.remove('animate-download-shine');
        downloadBtnText.textContent = 'DOWNLOAD HIGHLIGHTED';
        downloadBtn.disabled = false;
    }, 2000);
});

// Show Result
function showResult(text, isSuccess) {
    resultContainer.style.display = 'block';
    resultText.textContent = text;

    if (isSuccess) {
        resultBox.className = 'bg-white border-4 border-green-500 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]';
        resultIcon.className = 'w-8 h-8 text-green-600';
        resultTitle.className = 'text-2xl font-black text-green-600';
        resultTitle.textContent = 'SUCCESS';
        resultIcon.innerHTML = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>';
    } else {
        resultBox.className = 'bg-white border-4 border-red-500 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]';
        resultIcon.className = 'w-8 h-8 text-red-600';
        resultTitle.className = 'text-2xl font-black text-red-600';
        resultTitle.textContent = 'ERROR';
        resultIcon.innerHTML = '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>';
        downloadBtnContainer.style.display = 'none';
    }
}
