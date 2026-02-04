const video = document.getElementById('video');
const statusText = document.getElementById('status');
const startBtn = document.getElementById('startBtn');

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyjelrWeeujFu4IWje9775B5x63lIB6V7qkKOKqItuOFDue9V1rbvKHOr9aMNbLV7jAlw/exec';

// 1. Tambah Dahlia dalam senarai labels
const labels = ['Aiman', 'Dahlia']; 

let isSubmitting = false;
let audioCtx; 

// --- FUNGSI BEEP ---
function playBeep() {
    if (!audioCtx) return; 

    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine'; 
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); 

    oscillator.start();
    setTimeout(() => {
        oscillator.stop();
    }, 1000); 
}

// 1. Muat model AI
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/sistem-kehadiran-wajah/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/sistem-kehadiran-wajah/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/sistem-kehadiran-wajah/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('/sistem-kehadiran-wajah/models')
]).then(() => {
    statusText.innerText = "Model AI sedia. Sila klik butang di atas.";
});

// 2. Event Listener untuk butang "Aktifkan"
startBtn.addEventListener('click', () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    startVideo();
});

function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
        .then(stream => {
            video.srcObject = stream;
            statusText.innerText = "Sistem Aktif. Sila tunjuk muka.";
        })
        .catch(err => {
            statusText.innerText = "Ralat Kamera: Pastikan peranti disambung.";
            console.error(err);
        });
}

// 3. Logik Pengesanan Wajah
video.addEventListener('play', async () => {
    const labeledFaceDescriptors = await loadLabeledImages();
    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);
    
    const canvas = faceapi.createCanvasFromMedia(video);
    document.getElementById('container').append(canvas);
    
    const displaySize = { width: 720, height: 560 };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptors();
        
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

        resizedDetections.forEach(async detection => {
            const result = faceMatcher.findBestMatch(detection.descriptor);
            
            const box = detection.detection.box;
            const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() });
            drawBox.draw(canvas);

            // Logik: Hantar data jika Aiman ATAU Dahlia dikesan
            if ((result.label === 'Aiman' || result.label === 'Dahlia') && !isSubmitting) {
                playBeep(); 
                await sendToGoogleSheet(result.label);
            }
        });
    }, 1500); 
});

// 4. Load Imej Rujukan
async function loadLabeledImages() {
    return Promise.all(
        labels.map(async label => {
            const descriptions = [];
            try {
                const img = await faceapi.fetchImage(`/sistem-kehadiran-wajah/labeled_images/${label}/1.jpg`);
                const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
                if (detections) descriptions.push(detections.descriptor);
            } catch (e) {
                console.error("Imej rujukan tidak dijumpai: " + label);
            }
            return new faceapi.LabeledFaceDescriptors(label, descriptions);
        })
    );
}

// 5. Hantar ke Google Apps Script
async function sendToGoogleSheet(userName) {
    isSubmitting = true;
    statusText.innerText = "Muka dikesan! Menghantar kehadiran...";
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ name: userName })
        });
        statusText.innerText = "BERJAYA: " + userName;
        
        setTimeout(() => { 
            isSubmitting = false; 
            statusText.innerText = "Sedia untuk imbasan seterusnya."; 
        }, 10000);
    } catch (e) {
        console.error("Ralat Network", e);
        isSubmitting = false;
        statusText.innerText = "Ralat hantar data. Cuba lagi.";
    }
}

// 6. PENDAFTARAN PWA SERVICE WORKER
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sistem-kehadiran-wajah/sw.js')
            .then(reg => console.log('PWA: Service Worker Berdaftar', reg))
            .catch(err => console.log('PWA: Ralat SW', err));
    });
}
