
let canvas, ctx;
let currentImage = null;
let currentMaxDimension = 640;
let displayMode = 'fit-to-view'; // 'fit-to-view' or 'real-pixels'

function calculateDimensions(img, maxDimension) {
    const aspectRatio = img.width / img.height;
    let width, height;

    if (img.width >= img.height) {
        // Horizontal or square image: constrain width
        width = maxDimension;
        height = Math.round(maxDimension / aspectRatio);
    } else {
        // Vertical image: constrain height
        height = maxDimension;
        width = Math.round(maxDimension * aspectRatio);
    }

    return { width, height };
}

function updateCanvasSize(width, height) {
    canvas.width = width;
    canvas.height = height;
}

function initCanvas() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvas.classList.add('fit-to-view');

    // Add click listener for toggling display mode
    canvas.addEventListener('click', toggleDisplayMode);
}

function toggleDisplayMode() {
    if (!currentImage) {
        return;
    }

    if (displayMode === 'fit-to-view') {
        displayMode = 'real-pixels';
        canvas.classList.remove('fit-to-view');
        canvas.classList.add('real-pixels');
    } else {
        displayMode = 'fit-to-view';
        canvas.classList.remove('real-pixels');
        canvas.classList.add('fit-to-view');
    }
}

function handleImageUpload(file) {
    if (!file || !file.type.match('image.*')) {
        alert('Please upload a valid image file.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            currentImage = img;
            processImage();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function processImage() {
    if (!currentImage) {
        return;
    }

    const processStart = performance.now();

    // Calculate dimensions maintaining aspect ratio
    const { width, height } = calculateDimensions(currentImage, currentMaxDimension);
    updateCanvasSize(width, height);

    // Draw image to canvas at calculated resolution
    ctx.drawImage(currentImage, 0, 0, width, height);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, width, height);

    const ditherStart = performance.now();
    // Apply dithering and palette reduction
    applyDithering(imageData, width, height);
    const ditherEnd = performance.now();

    // Log processing time
    const ditherTime = ditherEnd - ditherStart;
    const totalTime = ditherEnd - processStart;
    console.log('Processing time:', totalTime.toFixed(2) + 'ms', 'Dithering:', ditherTime.toFixed(2) + 'ms', 'Resolution:', width + 'x' + height);

    // Put processed data back
    ctx.putImageData(imageData, 0, 0);
}

function changeResolution(maxDimension) {
    currentMaxDimension = maxDimension;

    // Reprocess the image if one is loaded
    if (currentImage) {
        processImage();
    }
}

// Event listeners
document.getElementById('imageInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleImageUpload(file);
    }
});

document.getElementById('uploadBtn').addEventListener('click', () => {
    document.getElementById('imageInput').click();
});

document.getElementById('resolutionSelect').addEventListener('change', (e) => {
    const maxDimension = parseInt(e.target.value);
    changeResolution(maxDimension);
});

document.getElementById('paletteSelect').addEventListener('change', (e) => {
    const paletteName = e.target.value;
    console.log('Switching palette to:', paletteName);

    const newPalette = PALETTES[paletteName];
    if (!newPalette) {
        console.error('Palette not found:', paletteName);
        return;
    }

    console.log('Palette loaded:', paletteName, 'Colors:', newPalette.length, 'First color:', newPalette[0]);
    currentPalette = newPalette;

    // Reprocess the image with new palette
    if (currentImage) {
        processImage();
    }
    console.log('Palette switch complete');
});

document.getElementById('snapshotBtn').addEventListener('click', () => {
    try {
        if (!canvas) {
            alert('Canvas not initialized.');
            return;
        }
        if (!currentImage) {
            alert('Please upload an image first.');
            return;
        }

        // Get export scale multiplier
        const scale = parseInt(document.getElementById('exportScaleSelect').value);

        // Create a temporary canvas for scaled export
        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d');

        // Set export canvas size (scaled)
        exportCanvas.width = canvas.width * scale;
        exportCanvas.height = canvas.height * scale;

        // Disable image smoothing for nearest-neighbor scaling
        exportCtx.imageSmoothingEnabled = false;
        exportCtx.mozImageSmoothingEnabled = false;
        exportCtx.webkitImageSmoothingEnabled = false;
        exportCtx.msImageSmoothingEnabled = false;

        // Draw the current canvas scaled up
        exportCtx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height);

        // Create download link
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        link.download = `dithered-${scale}x-${timestamp}.png`;
        link.href = exportCanvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('Snapshot saved:', link.download, 'Size:', exportCanvas.width + 'x' + exportCanvas.height);
    } catch (err) {
        console.error('Snapshot failed:', err);
        alert('Snapshot failed: ' + err.message);
    }
});

// Initialize canvas on page load
window.addEventListener('DOMContentLoaded', () => {
    initCanvas();
});
