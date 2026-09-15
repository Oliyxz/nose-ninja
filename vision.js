import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

let faceLandmarker;
let video = document.getElementById('webcam');
let canvasElement = document.getElementById('meshCanvas');
let canvasCtx = canvasElement.getContext('2d');
let webcamStream = null;

// Array of normalized nose coordinates for up to 2 faces
export let nosePositions = [];

export async function initVision(onReadyCallback) {
    try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                delegate: "GPU"
            },
            outputFaceBlendshapes: false,
            runningMode: "VIDEO",
            numFaces: 2
        });
        
        // Setup Webcam
        webcamStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480, facingMode: "user" }
        });
        
        video.srcObject = webcamStream;
        video.addEventListener("loadeddata", () => {
            canvasElement.width = video.videoWidth;
            canvasElement.height = video.videoHeight;
            onReadyCallback();
            predictWebcam(); // Start detection loop
        });
    } catch (error) {
        console.error("Vision AI init failed:", error);
        alert("Camera access denied or model failed to load.");
    }
}

let lastVideoTime = -1;
async function predictWebcam() {
    // Keep predicting on the video stream
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    let startTimeMs = performance.now();
    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        
        if (faceLandmarker) {
            const results = faceLandmarker.detectForVideo(video, startTimeMs);
            
            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                nosePositions = [];
                for (let i = 0; i < results.faceLandmarks.length; i++) {
                    const landmarks = results.faceLandmarks[i];
                    const nose = landmarks[1]; // Nose tip is landmark 1
                    
                    nosePositions.push({
                        x: nose.x,
                        y: nose.y,
                        isDetected: true
                    });

                    // Draw a neon green dot on the nose on the mesh canvas
                    canvasCtx.fillStyle = i === 0 ? "#0ff" : "#f0f"; // Cyan for Player 1, Pink for Player 2
                    canvasCtx.shadowBlur = 10;
                    canvasCtx.shadowColor = i === 0 ? "#0ff" : "#f0f";
                    canvasCtx.beginPath();
                    canvasCtx.arc(nose.x * canvasElement.width, nose.y * canvasElement.height, 5, 0, 2 * Math.PI);
                    canvasCtx.fill();
                }
            } else {
                nosePositions = [];
            }
        }
    }
    
    // Loop
    requestAnimationFrame(predictWebcam);
}
