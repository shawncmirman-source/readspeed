document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const setupScreen = document.getElementById('setup-screen');
    const readingScreen = document.getElementById('reading-screen');
    const setupForm = document.getElementById('setup-form');
    
    // Modal Elements
    const infoModal = document.getElementById('info-modal');
    const infoBtn = document.getElementById('info-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    
    // Reading Screen Elements
    const wpmValue = document.getElementById('wpm-value');
    const tempFinishBtn = document.getElementById('temp-finish-btn');
    const missedWordBtn = document.getElementById('missed-word-btn');
    const readingProgress = document.getElementById('reading-progress');
    const rsvpLeft = document.querySelector('.rsvp-left');
    const rsvpCenter = document.querySelector('.rsvp-center');
    const rsvpRight = document.querySelector('.rsvp-right');
    
    // Setup Inputs
    const startWpmInput = document.getElementById('start-wpm');
    const startWpmSlider = document.getElementById('start-wpm-slider');
    const targetWpmInput = document.getElementById('target-wpm');
    const targetWpmSlider = document.getElementById('target-wpm-slider');
    
    // Recap Screen Elements
    const recapScreen = document.getElementById('recap-screen');
    const recapName = document.getElementById('recap-name');
    const recapTime = document.getElementById('recap-time');
    const recapWpm = document.getElementById('recap-wpm');
    const recapInterruptions = document.getElementById('recap-interruptions');
    const quizSection = document.getElementById('quiz-section');
    const quizContainer = document.getElementById('quiz-container');
    const printBtn = document.getElementById('print-btn');
    const newSessionBtn = document.getElementById('new-session-btn');
    
    // Teacher's Corner Elements
    const toggleTeachersCorner = document.getElementById('toggle-teachers-corner');
    const teachersCornerPanel = document.querySelector('.teachers-corner');

    // Store reading data
    let readingData = {
        name: '',
        passage: '',
        words: [],
        startWpm: 60,
        targetWpm: 600,
        currentWpm: 60,
        sessionStartTime: null,
        sessionEndTime: null,
        interruptions: 0,
        questions: [],
        currentWordIndex: 0,
        isPlaying: false,
        timeoutId: null,
        wordsSinceLastBump: 0,
        wordsAtTargetSpeed: 0,
        totalWordsRead: 0,
        missedWordsLog: []
    };

    // Sync Sliders and Number Inputs
    startWpmInput.addEventListener('input', (e) => startWpmSlider.value = e.target.value);
    startWpmSlider.addEventListener('input', (e) => startWpmInput.value = e.target.value);

    targetWpmInput.addEventListener('input', (e) => targetWpmSlider.value = e.target.value);
    targetWpmSlider.addEventListener('input', (e) => targetWpmInput.value = e.target.value);

    // Teacher's Corner Logic
    toggleTeachersCorner.addEventListener('click', () => {
        teachersCornerPanel.classList.toggle('active');
    });

    // Modal Logic
    const openModal = () => {
        infoModal.classList.remove('hidden');
    };

    const closeModal = () => {
        infoModal.classList.add('hidden');
    };

    infoBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    
    // Close modal on click outside
    infoModal.addEventListener('click', (e) => {
        if (e.target === infoModal) {
            closeModal();
        }
    });
    
    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !infoModal.classList.contains('hidden')) {
            closeModal();
        }
    });

    // Calculate Optimal Recognition Point (ORP) index
    const getOrpIndex = (word) => {
        const len = word.length;
        if (len <= 1) return 0;
        return Math.floor((len - 1) / 2); // Perfectly biases slightly to the left of the exact center
    };

    // Render word in RSVP Display
    const renderWord = (word) => {
        const index = getOrpIndex(word);
        rsvpLeft.textContent = word.substring(0, index);
        rsvpCenter.textContent = word.charAt(index);
        rsvpRight.textContent = word.substring(index + 1);
    };

    // RSVP Engine Play Loop
    const playRsvp = () => {
        if (!readingData.isPlaying) return;

        // Check Target Speed Termination
        if (readingData.currentWpm >= readingData.targetWpm) {
            readingData.wordsAtTargetSpeed++;
            if (readingData.wordsAtTargetSpeed >= 60) {
                showRecapScreen();
                return;
            }
        }

        // Loop Text if needed
        if (readingData.currentWordIndex >= readingData.words.length) {
            readingData.currentWordIndex = 0;
        }

        const word = readingData.words[readingData.currentWordIndex];
        renderWord(word);

        // Speed Progression Logic
        if (readingData.currentWpm < readingData.targetWpm) {
            readingData.wordsSinceLastBump++;
            
            let wordsRequired = 5;
            if (readingData.currentWpm >= 200 && readingData.currentWpm < 300) {
                wordsRequired = 10;
            } else if (readingData.currentWpm >= 300) {
                wordsRequired = 20;
            }
            
            let bumpAmount = 10;
            if (readingData.currentWpm >= 300) {
                bumpAmount = 30;
            }

            if (readingData.wordsSinceLastBump >= wordsRequired) {
                readingData.currentWpm = Math.min(readingData.currentWpm + bumpAmount, readingData.targetWpm);
                readingData.wordsSinceLastBump = 0;
                wpmValue.textContent = readingData.currentWpm; // update UI
            }
        }

        // Update progress bar
        const progressPercent = ((readingData.currentWordIndex + 1) / readingData.words.length) * 100;
        readingProgress.style.width = `${progressPercent}%`;

        readingData.currentWordIndex++;
        readingData.totalWordsRead++;

        // Calculate timeout based on current WPM
        // Delay extra for punctuation!
        let delayMs = 60000 / readingData.currentWpm;
        if (word.endsWith('.') || word.endsWith('!') || word.endsWith('?')) {
            delayMs *= 1.8; // End of sentence pause (Reduced from 2.5)
        } else if (word.endsWith(',') || word.endsWith(';') || word.endsWith(':')) {
            delayMs *= 1.3; // Comma pause (Reduced from 1.5)
        }

        readingData.timeoutId = setTimeout(playRsvp, delayMs);
    };

    // Toggle Screens logic
    const showReadingScreen = () => {
        // Handle full-screen request
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        }
        
        setupScreen.classList.add('hidden');
        recapScreen.classList.add('hidden');
        readingScreen.classList.remove('hidden');
        
        // Ensure no mobile offset clipping
        window.scrollTo(0, 0);

        // Reset RSVP display to initial state
        rsvpLeft.textContent = '';
        rsvpCenter.textContent = '3';
        rsvpRight.textContent = '...';
        readingProgress.style.width = '0%';
        wpmValue.textContent = readingData.startWpm;
        
        // Track start time
        if (!readingData.sessionStartTime) {
            readingData.sessionStartTime = new Date();
        }

        // Countdown then start
        setTimeout(() => { rsvpCenter.textContent = '2'; }, 1000);
        setTimeout(() => { rsvpCenter.textContent = '1'; }, 2000);
        setTimeout(() => { 
            readingData.isPlaying = true;
            playRsvp(); 
        }, 3000);
    };

    const showSetupScreen = () => {
        readingData.isPlaying = false;
        clearTimeout(readingData.timeoutId);

        // Exit full-screen
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => {
                console.log(`Error attempting to exit fullscreen: ${err.message}`);
            });
        }
        
        readingScreen.classList.add('hidden');
        recapScreen.classList.add('hidden');
        setupScreen.classList.remove('hidden');
    };
    
    const showRecapScreen = () => {
        readingData.isPlaying = false;
        clearTimeout(readingData.timeoutId);

        // Exit full-screen
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => {
                console.log(`Error attempting to exit fullscreen: ${err.message}`);
            });
        }
        
        readingData.sessionEndTime = new Date();
        
        readingScreen.classList.add('hidden');
        setupScreen.classList.add('hidden');
        recapScreen.classList.remove('hidden');
        
        renderRecap();
    };

    // Render Recap Data
    const renderRecap = () => {
        recapName.textContent = readingData.name;
        
        // Calculate Time and Scores
        let totalMinutes = 0;
        if (readingData.sessionStartTime && readingData.sessionEndTime) {
            totalMinutes = (readingData.sessionEndTime - readingData.sessionStartTime) / 60000;
        }
        const minutes = Math.floor(totalMinutes);
        const seconds = Math.floor((totalMinutes % 1) * 60);
        recapTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const totalWords = readingData.totalWordsRead;
        const misses = readingData.missedWordsLog.length;
        const maxWpm = readingData.currentWpm; 
        
        const correctedWpm = totalMinutes > 0 ? Math.round((totalWords - misses) / totalMinutes) : maxWpm;

        recapWpm.textContent = maxWpm; 
        document.getElementById('recap-corrected').textContent = correctedWpm > 0 ? correctedWpm : 0;
        document.getElementById('recap-interruptions').textContent = misses;
        
        // Timeline Chart
        document.getElementById('chart-start-wpm').textContent = readingData.startWpm;
        document.getElementById('chart-final-wpm').textContent = readingData.currentWpm;
        
        const timelineChart = document.getElementById('timeline-chart');
        timelineChart.innerHTML = '<div class="timeline-line"></div>';
        
        readingData.missedWordsLog.forEach(miss => {
            const pct = totalWords > 0 ? (miss.wordCount / totalWords) * 100 : 0;
            const marker = document.createElement('div');
            marker.className = 'timeline-marker';
            marker.style.left = `${pct}%`;
            marker.title = `Missed word at ${miss.wpm} WPM`;
            timelineChart.appendChild(marker);
        });
        
        // Render Quiz
        if (readingData.questions.length > 0) {
            quizSection.classList.remove('hidden');
            quizContainer.innerHTML = '';
            
            readingData.questions.forEach((q, index) => {
                const qDiv = document.createElement('div');
                qDiv.className = 'quiz-item';
                qDiv.innerHTML = `
                    <p><strong>Q${index + 1}:</strong> ${q}</p>
                    <textarea placeholder="Write your answer here..." style="width: 100%; min-height: 60px; margin-top: 0.5rem;"></textarea>
                `;
                quizContainer.appendChild(qDiv);
            });
        } else {
            quizSection.classList.add('hidden');
        }
    };

    // Form Submission
    setupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        readingData.name = document.getElementById('student-name').value;
        readingData.passage = document.getElementById('reading-passage').value;
        readingData.startWpm = parseInt(startWpmInput.value, 10);
        readingData.targetWpm = parseInt(targetWpmInput.value, 10);
        readingData.currentWpm = readingData.startWpm;
        
        // Reset time and stats on new start
        readingData.sessionStartTime = null;
        readingData.sessionEndTime = null;
        readingData.interruptions = 0;
        readingData.currentWordIndex = 0;
        readingData.wordsSinceLastBump = 0;
        readingData.wordsAtTargetSpeed = 0;
        readingData.totalWordsRead = 0;
        readingData.missedWordsLog = [];
        
        // Collect Custom Questions
        readingData.questions = [];
        const q1 = document.getElementById('q1').value.trim();
        const q2 = document.getElementById('q2').value.trim();
        const q3 = document.getElementById('q3').value.trim();
        if (q1) readingData.questions.push(q1);
        if (q2) readingData.questions.push(q2);
        if (q3) readingData.questions.push(q3);
        
        readingData.words = readingData.passage.trim().split(/\s+/);
        
        if (readingData.words.length > 0 && readingData.words[0] !== "") {
            showReadingScreen();
        }
    });
    
    // Missed Word Button
    missedWordBtn.addEventListener('click', () => {
        readingData.interruptions++;
        readingData.missedWordsLog.push({
            wpm: readingData.currentWpm,
            wordCount: readingData.totalWordsRead
        });
        
        // Visual feedback to indicate missed word registered
        missedWordBtn.style.backgroundColor = 'rgba(255, 165, 0, 0.2)';
        setTimeout(() => { missedWordBtn.style.backgroundColor = 'transparent'; }, 200);
    });
    
    // Temp Finish Session
    tempFinishBtn.addEventListener('click', () => {
        showRecapScreen();
    });
    
    // Recap Actions
    printBtn.addEventListener('click', () => {
        window.print();
    });
    
    newSessionBtn.addEventListener('click', () => {
        // Only reset standard stats, keep passage if we want, or completely start fresh
        startWpmInput.value = readingData.currentWpm; // inherit new base
        startWpmSlider.value = readingData.currentWpm; 
        readingData.interruptions = 0;
        showSetupScreen();
    });
    
    // Initial Full-Screen Event Listener sync if user exits fullscreen via browser controls
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && !readingScreen.classList.contains('hidden')) {
            showSetupScreen();
        }
    });
});
