const video = document.getElementById('video');
const statusText = document.getElementById('status');
const startBtn = document.getElementById('startBtn'); // Ambil rujukan butang

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyjelrWeeujFu4IWje9775B5x63lIB6V7qkKOKqItuOFDue9V1rbvKHOr9aMNbLV7jAlw/exec';
const labels = ['Aiman']; 

let isSubmitting = false;
let audioCtx; // Biarkan kosong dahulu

// Fungsi Beep yang diperkemas
function playBeep() {
    if (!audioCtx) return; 

    // Pastikan audio context aktif (resume jika suspended)
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
    }, 1000); // Beep 1 saat
}

// 1. Muat model AI (Sama seperti kod asal)
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/sistem-kehadiran-wajah/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/sistem-kehadiran-wajah/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/sistem-kehadiran-wajah/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('/sistem-kehadiran-wajah/models')
]).then(() => {
    statusText.innerText = "Model dimuatkan. Klik butang di atas untuk mula.";
});

// 2. Event Listener untuk butang "Aktifkan"
startBtn.addEventListener('click', () => {
    // MULAKAN AUDIO DI SINI (Interaksi Pengguna)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Mulakan video
    startVideo();
});

function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
        .then(stream => {
            video.srcObject = stream;
            statusText.innerText = "Kamera & Audio Aktif. Sila tunjuk muka.";
        })
        .catch(err => {
            statusText.innerText = "Ralat Kamera: Pastikan webcam disambung.";
        });
}

// Logik pengesanan (Sama seperti kod asal anda)
video.addEventListener('play', async () => {
    const labeledFaceDescriptors = await loadLabeledImages();
    const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);
    
    const canvas = faceapi.createCanvasFromMedia(video);
    document.getElementById('container').append(canvas);
    const displaySize = { width: video.width, height: video.height };
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

            if (result.label === 'Aiman' && !isSubmitting) {
                playBeep(); // Beep akan berbunyi sekarang!
                await sendToGoogleSheet(result.label);
            }
        });
    }, 1500); 
});

// Fungsi load images & send data (Kekal sama)
async function loadLabeledImages() {
    return Promise.all(
        labels.map(async label => {
            const descriptions = [];
            try {
                const img = await faceapi.fetchImage(`/sistem-kehadiran-wajah/labeled_images/${label}/1.jpg`);
                const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
                if (detections) descriptions.push(detections.descriptor);
            } catch (e) {
                console.error("Gagal muat imej rujukan: " + label);
            }
            return new faceapi.LabeledFaceDescriptors(label, descriptions);
        })
    );
}

async function sendToGoogleSheet(userName) {
    isSubmitting = true;
    statusText.innerText = "Muka dikesan! Beep... Menghantar data...";
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({ name: userName })
        });
        statusText.innerText = "KEHADIRAN BERJAYA: " + userName;
        setTimeout(() => { 
            isSubmitting = false; 
            statusText.innerText = "Sedia untuk imbasan seterusnya."; 
        }, 10000);
    } catch (e) {
        isSubmitting = false;
    }
}
