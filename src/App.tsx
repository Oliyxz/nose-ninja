import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Trophy, Loader2, Play, CheckCircle } from 'lucide-react';
import WebcamCapture from './components/WebcamCapture';
import type { WebcamRef } from './components/WebcamCapture';

declare const ml5: any;

const PROMPTS = [
  'apple', 'bicycle', 'bird', 'book', 'butterfly', 'cat', 'clock', 'cloud',
  'dog', 'eye', 'fish', 'flower', 'guitar', 'hat', 'heart', 'house', 'key',
  'moon', 'mushroom', 'pizza', 'rainbow', 'star', 'sun', 'tree', 'umbrella'
];

interface Player {
  id: number;
  name: string;
  score: number | null;
}

interface Prediction {
  label: string;
  confidence: number;
}

function App() {
  const [modelLoading, setModelLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState('Initializing...');
  const classifierRef = useRef<any>(null);
  
  const [players, setPlayers] = useState<Player[]>([
    { id: 1, name: 'Player 1', score: null },
    { id: 2, name: 'Player 2', score: null }
  ]);
  
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'round_over'>('setup');
  const [targetPrompt, setTargetPrompt] = useState('');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [topGuesses, setTopGuesses] = useState<Prediction[]>([]);
  
  const webcamRef = useRef<WebcamRef>(null);
  const inferenceRunning = useRef(false);

  // Initialize Model — DoodleNet is trained specifically on Quick Draw sketches
  useEffect(() => {
    setDebugInfo('Loading DoodleNet model...');
    try {
      const c = ml5.imageClassifier('DoodleNet', () => {
        console.log('✅ DoodleNet model loaded!');
        setDebugInfo('Model loaded! Ready to play.');
        classifierRef.current = c;
        setModelLoading(false);
      });
    } catch (e: any) {
      console.error('❌ Model load error:', e);
      setDebugInfo('ERROR loading model: ' + e.message);
    }
  }, []);

  const startGame = () => {
    const randomPrompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    setTargetPrompt(randomPrompt);
    setPlayers(prev => prev.map(p => ({ ...p, score: null })));
    setCurrentPlayerIndex(0);
    setGameState('playing');
    setCurrentConfidence(0);
    setTopGuesses([]);
    inferenceRunning.current = true;
  };

  // Continuous inference loop using requestAnimationFrame-style recursion
  const runInference = useCallback(() => {
    if (!inferenceRunning.current) return;

    const classifier = classifierRef.current;
    if (!classifier) {
      setDebugInfo('Classifier not ready yet...');
      setTimeout(runInference, 500);
      return;
    }

    // Use the preprocessed canvas (high-contrast B&W) instead of raw video
    // This strips away screen grids, paper textures, shadows, etc.
    const processedCanvas = webcamRef.current?.getProcessedCanvas();
    if (!processedCanvas || processedCanvas.width === 0) {
      // Fall back to checking video readiness
      const videoEl = webcamRef.current?.getVideoElement();
      if (!videoEl || videoEl.readyState < 2) {
        setDebugInfo('Video/canvas not ready yet...');
        setTimeout(runInference, 500);
        return;
      }
      setDebugInfo('Processed canvas not ready...');
      setTimeout(runInference, 500);
      return;
    }

    setDebugInfo('Classifying processed sketch...');

    try {
      classifier.classify(processedCanvas, (firstArg: any, secondArg: any) => {
        // ml5 v1.x passes results as the first argument directly.
        // Detect which signature we got:
        let results: any;
        if (Array.isArray(firstArg)) {
          // v1.x style: (results)
          results = firstArg;
        } else if (firstArg && !secondArg) {
          // Could be an error object
          console.error('classify error:', firstArg);
          setDebugInfo('Classify error: ' + String(firstArg));
          if (inferenceRunning.current) setTimeout(runInference, 500);
          return;
        } else {
          // v0.x style: (error, results)
          if (firstArg) {
            console.error('classify error:', firstArg);
            setDebugInfo('Classify error: ' + String(firstArg));
            if (inferenceRunning.current) setTimeout(runInference, 500);
            return;
          }
          results = secondArg;
        }

        if (!results || results.length === 0) {
          setDebugInfo('No results returned');
          if (inferenceRunning.current) setTimeout(runInference, 500);
          return;
        }

        // Update top guesses for display
        const guesses: Prediction[] = results.slice(0, 5).map((r: any) => ({
          label: r.label,
          confidence: r.confidence
        }));
        setTopGuesses(guesses);

        // Check for target match
        const normalizedTarget = targetPrompt.replace(/_/g, ' ').toLowerCase();
        const matchingResult = results.find((r: any) =>
          r.label.replace(/_/g, ' ').toLowerCase().includes(normalizedTarget)
        );

        if (matchingResult) {
          setCurrentConfidence(matchingResult.confidence * 100);
          setDebugInfo(`Match found! "${matchingResult.label}" = ${(matchingResult.confidence * 100).toFixed(1)}%`);
        } else {
          setCurrentConfidence(0);
          setDebugInfo(`No match for "${targetPrompt}". Top: "${results[0].label}" (${(results[0].confidence * 100).toFixed(1)}%)`);
        }

        // Continue loop
        if (inferenceRunning.current) setTimeout(runInference, 300);
      });
    } catch (e: any) {
      console.error('classify exception:', e);
      setDebugInfo('Exception: ' + e.message);
      if (inferenceRunning.current) setTimeout(runInference, 1000);
    }
  }, [targetPrompt]);

  // Start/stop inference when game state changes
  useEffect(() => {
    if (gameState === 'playing') {
      inferenceRunning.current = true;
      runInference();
    } else {
      inferenceRunning.current = false;
    }
    return () => { inferenceRunning.current = false; };
  }, [gameState, runInference]);

  const lockScore = () => {
    const newPlayers = [...players];
    newPlayers[currentPlayerIndex].score = currentConfidence;
    setPlayers(newPlayers);
    
    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
      setCurrentConfidence(0);
      setTopGuesses([]);
    } else {
      inferenceRunning.current = false;
      setGameState('round_over');
    }
  };

  const addPlayer = () => {
    setPlayers([...players, { id: Date.now(), name: `Player ${players.length + 1}`, score: null }]);
  };

  const getWinner = () => {
    let max = -1;
    let winnerName = '';
    players.forEach(p => {
      if (p.score !== null && p.score > max) {
        max = p.score;
        winnerName = p.name;
      }
    });
    return { name: winnerName, score: max };
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Brain className="text-accent" color="var(--accent-color)" size={28} />
          <h1>Quick Draw CV: Arena</h1>
        </div>
        
        <div className="prompt-container">
          {modelLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              <Loader2 className="animate-spin" />
              <span>Loading Model...</span>
            </div>
          ) : gameState === 'setup' ? (
             <h2>Ready to play?</h2>
          ) : (
            <>
              <p className="prompt-text">Draw a...</p>
              <h2 className="prompt-target">"{targetPrompt}"</h2>
            </>
          )}
        </div>
      </header>

      {/* Debug Banner */}
      <div style={{ 
        background: 'rgba(255,255,0,0.15)', 
        border: '1px solid rgba(255,255,0,0.3)', 
        padding: '0.5rem 1rem', 
        borderRadius: '0.5rem', 
        fontSize: '0.85rem',
        color: '#fbbf24',
        fontFamily: 'monospace'
      }}>
        🔍 Debug: {debugInfo}
      </div>

      <div className="main-content">
        {/* Left: Webcam Area */}
        <div className="webcam-section glass-panel">
          <WebcamCapture ref={webcamRef} />
          
          {gameState === 'playing' && (
             <div className="live-inference-overlay">
               <div className="current-player-banner">
                 {players[currentPlayerIndex].name}'s Turn!
               </div>
               <div className="live-confidence">
                  <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Confidence match for "{targetPrompt}":</div>
                  <div className="score-display">
                    {currentConfidence.toFixed(1)}%
                  </div>
               </div>
               
               <motion.button
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 className="btn btn-primary lock-btn"
                 onClick={lockScore}
               >
                 <CheckCircle size={20} />
                 Lock Score for {players[currentPlayerIndex].name}
               </motion.button>
             </div>
          )}

          {gameState === 'round_over' && (
            <div className="winner-overlay">
              <Trophy size={64} color="var(--success-color)" />
              <h2 className="winner-text">Winner: {getWinner().name}!</h2>
              <p className="winner-score">Winning Score: {getWinner().score.toFixed(1)}%</p>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn btn-primary"
                onClick={startGame}
                style={{ marginTop: '2rem' }}
              >
                Play Another Round
              </motion.button>
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <aside className="sidebar glass-panel">
          <h2>Scoreboard</h2>
          
          {gameState === 'setup' && (
            <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
               <button className="btn btn-secondary" onClick={addPlayer} disabled={modelLoading}>+ Add Player</button>
               <button className="btn btn-primary" onClick={startGame} disabled={modelLoading} style={{ marginTop: '1rem' }}>
                 <Play size={18} /> Start Game
               </button>
            </div>
          )}

          <div className="player-list">
            <AnimatePresence>
              {players.map((player, idx) => (
                <motion.div 
                  key={player.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`player-card ${gameState === 'playing' && idx === currentPlayerIndex ? 'active' : ''}`}
                >
                  <div className="player-info">
                    <span className="player-name">{player.name}</span>
                    <span className="player-score">
                      {player.score !== null ? `${player.score.toFixed(1)}%` : '-'}
                    </span>
                  </div>
                  {player.score !== null && (
                    <div className="progress-track">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${player.score}%` }}
                        className="progress-fill"
                      />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Live AI Guesses */}
          {gameState === 'playing' && topGuesses.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                🤖 AI Top Guesses
              </h3>
              {topGuesses.map((g, i) => (
                <div key={i} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '0.35rem 0',
                  fontSize: '0.9rem',
                  color: g.label.toLowerCase().includes(targetPrompt.toLowerCase()) ? 'var(--success-color)' : 'var(--text-muted)'
                }}>
                  <span>{g.label}</span>
                  <span>{(g.confidence * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default App;
