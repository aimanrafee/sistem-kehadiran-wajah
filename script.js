const video = document.getElementById('video');
const statusText = document.getElementById('status');

// URL Web App Google Apps Script anda
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyjelrWeeujFu4IWje9775B5x63lIB6V7qkKOKqItuOFDue9V1rbvKHOr9aMNbLV7jAlw/exec';

// Nama folder dalam labeled_images
const labels = ['Aiman']; 

let isSubmitting = false;

// 1. Muat model AI dari folder /models
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/sistem-kehadiran-wajah/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/sistem-kehadiran-wajah/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/sistem-kehadiran-wajah/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('/sistem-kehadiran-wajah/models')
]).then(startVideo);

function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
        .then(stream => {
            video.srcObject = stream;
            statusText.innerText = "Kamera Aktif. Sila tunjuk muka.";
        })
        .catch(err => {
            statusText.innerText = "Ralat Kamera: Pastikan webcam Hikvision disambung.";
            console.error(err);
        });
}

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
            
            // Lukis kotak pada muka
            const box = detection.detection.box;
            const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() });
            drawBox.draw(canvas);

            // Jika Aiman dikesan
            if (result.label === 'Aiman' && !isSubmitting) {
                await sendToGoogleSheet(result.label);
            }
        });
    }, 1500); // Semak setiap 1.5 saat
});

async function loadLabeledImages() {
    return Promise.all(
        labels.map(async label => {
            const descriptions = [];
            try {
                // Mengambil gambar dari path: /sistem-kehadiran-wajah/labeled_images/Aiman/1.jpg
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
    statusText.innerText = "Muka dikesan! Menghantar ke Google Sheets...";
    
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Penting untuk Google Apps Script
            cache: 'no-cache',
            body: JSON.stringify({ name: userName })
        });
        
        statusText.innerText = "KEHADIRAN BERJAYA: " + userName;
        
        // Elak spam: Tunggu 10 saat sebelum imbasan seterusnya
        setTimeout(() => { isSubmitting = false; statusText.innerText = "Sedia untuk imbasan seterusnya."; }, 10000);
        
    } catch (e) {
        console.error("Ralat hantar data", e);
        isSubmitting = false;
    }
}
