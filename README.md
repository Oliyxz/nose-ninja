# Quick Draw CV: Arena

A real-time, computer-vision-powered drawing game where an AI attempts to guess what you draw in real-time. Built with React and `ml5.js`.

## Setup and Running the Game

To run this application locally, you'll need [Node.js](https://nodejs.org/) installed on your machine.

1. **Install Dependencies**
   Navigate to this project directory in your terminal and install the required npm packages:
   ```bash
   npm install
   ```

2. **Start the Development Server**
   Start the local Vite development server:
   ```bash
   npm run dev
   ```

3. **Play the Game**
   - Open your browser and navigate to `http://localhost:5173/` (or whichever local URL the terminal provides).
   - Ensure you grant camera permissions when prompted.
   - Hold up a clear black-and-white sketch to the camera to see if the AI (DoodleNet) can guess it!

## Features
- **Real-Time Inference:** Fast, on-device machine learning inference via TensorFlow.js and ml5.js.
- **Image Preprocessing Pipeline:** The webcam feed runs through a custom center-crop, grayscale, and adaptive thresholding process. This strips out background noise (like screen grids or paper texture) so the AI only sees a clean, high-contrast sketch.
- **"AI Vision" Preview:** Watch exactly what the AI sees through its preprocessing lens in the top corner.
- **Dynamic Leaderboard:** Play in rounds with multiple people and lock in your top confidence scores.

## Technologies Used
- React (Vite)
- TypeScript
- ml5.js (DoodleNet Model)
- Framer Motion (Animations)
- Vanilla CSS with CSS Variables
