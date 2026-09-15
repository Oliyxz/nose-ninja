# Nose Ninja

A fast-paced, interactive endless runner where you dodge shurikens and collect sushi using only your face!

**Nose Ninja** uses Google's MediaPipe AI vision model directly in your browser to track your facial landmarks in real-time. It maps the tip of your nose to the ninja on screen. Stand back, center your face, and lean left or right to move!

## Features
- **Facial Recognition Control**: Your nose is the joystick! Lean left and right to control your character.
- **1 Player & 2 Player (VS) Modes**: Play solo or face off against a friend.
- **Dynamic Leaderboard**: Keep track of the top players (saves locally).
- **Profile System**: Create your own profiles to save your high scores.

## Setup and Running the Game

To play Nose Ninja, you need to serve the files through a local web server. Web browsers require a secure context (like `http://localhost`) to grant webcam access, so opening the `index.html` file directly via the file explorer will not work.

### Option 1: Using Python (Recommended if installed)
1. Open your terminal and navigate to the game's directory.
2. Run the following command:
   ```bash
   python -m http.server 8000
   ```
3. Open your browser and navigate to [http://localhost:8000](http://localhost:8000).

### Option 2: Using Node.js / npx
If you have Node.js installed, you can use `http-server`:
1. Open your terminal and navigate to the game's directory.
2. Run the following command:
   ```bash
   npx http-server
   ```
3. Open your browser and navigate to the provided local URL (typically `http://localhost:8080`).

### Option 3: VS Code Live Server
1. Open the project folder in Visual Studio Code.
2. Install the **Live Server** extension by Ritwick Dey.
3. Right-click on `index.html` and select **Open with Live Server**.

## How to Play
1. **Grant Permissions**: Allow the browser to access your webcam when prompted.
2. **Calibrate**: Wait for the AI model to initialize. Stand back so your face is clearly visible in the camera frame.
3. **Select Mode**: Choose 1 Player or 2 Player mode.
4. **Play**: Lean left and right to dodge obstacles and collect sushi!
