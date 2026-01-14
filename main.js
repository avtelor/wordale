
//  !!   listOfWords is in wordlist.js, hebWords is in hebwords.js    !! //

////////* Variables: *///////

// did user win todays game:
//localStorage.clear();
//console.log(localStorage.getItem(alreadySentKey));
let win = false;
// did user finish todays game (win or lose):
let endOfGameToday = false;
//which try am i in?
let rowCount = 1;
//wordCount - which try am i after word was guessed:
let wordCount = 0;
//saves the letters in a string until word is sent:
let currentWord = '';
//array to save the colors of guessed words' letters
let answersColors = [];
//array to save the letter of guessed words
let answersLetters = [];
//numOfWordale is calculated later by the difference from today to the launch of wordale
let numOfWordale = 0;
// the launch date of wordale
const startDate = new Date(2022, 0, 11);
const summerClockStartDate = new Date(2022,2,26)
//today:
let today = new Date();
// Manual mode variables
let manualMode = false;
let manualWordIndex = 0;
const MANUAL_MODE_PASSWORD = "6060";
// Global flag to prevent resets during active gameplay
window.preventResets = false;

// Define clickLetter immediately to prevent "not defined" errors
// This ensures it's available even if initialization code fails
// The real implementation will replace this later
window.clickLetter = function(value) {
    // Temporary fallback - real function will replace this
    // This prevents "not defined" errors if script hasn't fully loaded
    try {
        if (typeof endOfGameToday !== 'undefined' && endOfGameToday === true) {
            return;
        }
        if (typeof rowCount === 'undefined') return;
        const currentRow = document.getElementById(`row${rowCount}`);
        if (!currentRow) return;
        for (let i = 1; i <= 5; i++) {
            const tile = document.getElementById(`tile${rowCount}${i}`);
            if (tile && tile.innerHTML === '') {
                let finalValue = value;
                if (typeof changeToFinal === 'function') {
                    finalValue = changeToFinal(value);
                }
                if (typeof currentWord !== 'undefined') {
                    currentWord += finalValue;
                }
                tile.setAttribute('data-animation', 'pop');
                tile.style.border = "solid rgb(34, 34, 34)";
                tile.innerHTML = finalValue;
                break;
            }
        }
    } catch (e) {
        console.error('Error in clickLetter fallback:', e);
    }
};

//word index is the numOfWordale calculated later on
// Check if manual mode is enabled in localStorage
manualMode = localStorage.getItem('manualMode') === 'true';
if (manualMode) {
    // Temporarily set pickedWord to avoid errors while waiting for Firebase
    let manualWordList = window.manualListOfWords;
    if (manualWordList && manualWordList.length > 0 && manualWordList.length < 100) {
        pickedWord = manualWordList[0]; // Temporary, will be updated from Firebase
    } else {
        pickedWord = pickWord(); // Fallback
    }
    
    // Wait for Firebase functions to become available, then initialize manual mode
    console.log('[WORDLE_SYNC] Manual mode detected, waiting for Firebase functions...');
    function initializeManualMode() {
        if (window.getSharedManualWordIndex) {
            console.log('[WORDLE_SYNC] Firebase functions available, getting shared word index...');
            window.getSharedManualWordIndex(function(sharedIndex) {
            manualWordIndex = sharedIndex;
            // Get the manual wordlist
            let manualWordList = window.manualListOfWords;
            console.log('[WORDLE_SYNC] manualWordList:', manualWordList);
            console.log('[WORDLE_SYNC] manualWordList length:', manualWordList ? manualWordList.length : 'undefined');
            console.log('[WORDLE_SYNC] Shared word index from Firebase:', sharedIndex);
            
            // Check if manualWordList is actually the manual list (should be small, not 1462)
            if (manualWordList && manualWordList.length > 0 && manualWordList.length < 100) {
                // Make sure index is valid
                if (manualWordIndex < 0 || manualWordIndex >= manualWordList.length) {
                    manualWordIndex = 0;
                    if (window.setSharedManualWordIndex) {
                        window.setSharedManualWordIndex(0);
                    }
                } else {
                    // Ensure Firebase has the correct value (in case it was out of sync)
                    if (window.setSharedManualWordIndex) {
                        window.setSharedManualWordIndex(manualWordIndex);
                    }
                }
                pickedWord = manualWordList[manualWordIndex];
                numOfWordale = manualWordIndex;
                console.log('[WORDLE_SYNC] *** ORIGINAL INIT *** Using word:', pickedWord, 'index:', manualWordIndex, 'from manual list of', manualWordList.length, 'words');
                console.log('[WORDLE_SYNC] This may conflict with game mode restoration!');
                
                // Now that we have the correct word from Firebase, load user data for this word
                // Only on initial page load - not when syncing to new word
                // Also skip if game mode restoration is handling this
                if (!window.hasInitialLoadCompleted && !window.skipInitialFirebaseSync) {
                    setTimeout(function() {
                        loadUserData();
                        window.hasInitialLoadCompleted = true;
                    }, 500);
                } else if (window.skipInitialFirebaseSync) {
                    console.log('[WORDLE_SYNC] Skipping loadUserData in original init - game mode restoration will handle it');
                }
                
                // Set up listener for shared word index changes (after initial load)
                if (window.watchSharedManualWordIndex) {
                    let lastKnownIndex = manualWordIndex; // Initialize with current index
                    let listenerSetup = false;
                    let initialLoadComplete = false;
                    let isResetting = false; // Flag to prevent multiple simultaneous resets
                    let lastResetTime = 0; // Track when we last reset to prevent rapid resets
                    
                    console.log('[WORDLE_SYNC] Preparing listener setup - initial manualWordIndex:', manualWordIndex, 'pickedWord:', pickedWord);
                    
                    // Mark initial load as complete after a delay 
                    setTimeout(function() {
                        initialLoadComplete = true;
                        console.log('[WORDLE_SYNC] Initial load complete, index:', manualWordIndex, 'lastKnownIndex:', lastKnownIndex);
                        // Don't load user data here - it should only load on initial page load, not during sync
                    }, 3000); // Increased to 3 seconds
                    
                    // Wait before setting up listener to avoid initial load trigger
                    setTimeout(function() {
                        if (listenerSetup) {
                            console.log('[WORDLE_SYNC] Listener already set up, skipping');
                            return; // Prevent duplicate listeners
                        }
                        listenerSetup = true;
                        console.log('[WORDLE_SYNC] Setting up Firebase listener, current index:', manualWordIndex, 'lastKnownIndex:', lastKnownIndex);
                        
                        window.watchSharedManualWordIndex(function(newIndex) {
                            console.log('[WORDLE_SYNC] Firebase listener callback triggered with index:', newIndex);
                            console.log('[WORDLE_SYNC] Current state: initialLoadComplete=', initialLoadComplete, 'isResetting=', isResetting, 'lastKnownIndex=', lastKnownIndex, 'manualWordIndex=', manualWordIndex);
                            
                            // Ignore if initial load not complete
                            if (!initialLoadComplete) {
                                console.log('[WORDLE_SYNC] Ignoring listener callback - initial load not complete, index:', newIndex);
                                lastKnownIndex = newIndex;
                                return;
                            }
                            
                            // Prevent multiple simultaneous resets
                            if (isResetting) {
                                console.log('[WORDLE_SYNC] Reset already in progress, ignoring callback');
                                return;
                            }
                            
                            // Only react if the index actually changed from what we last saw
                            if (newIndex !== lastKnownIndex && newIndex !== manualWordIndex) {
                                console.log('[WORDLE_SYNC] Word index changed detected: lastKnownIndex=', lastKnownIndex, 'newIndex=', newIndex, 'current manualWordIndex=', manualWordIndex);
                                
                                // Don't reset if user is actively typing RIGHT NOW
                                if (window.preventResets && currentWord && currentWord.length > 0) {
                                    console.log('[WORDLE_SYNC] User is actively typing - deferring reset. Will sync index but wait for user to finish.');
                                    lastKnownIndex = newIndex;
                                    return;
                                }
                                
                                const manualWordList = window.manualListOfWords || [];
                                
                                console.log('[WORDLE_SYNC] SYNCHRONIZING: Word changed - resetting to new word. New index:', newIndex);
                                isResetting = true;
                                lastKnownIndex = newIndex;
                                manualWordIndex = newIndex;
                                
                                if (manualWordList.length > 0 && manualWordIndex >= 0 && manualWordIndex < manualWordList.length) {
                                    pickedWord = manualWordList[manualWordIndex];
                                    numOfWordale = manualWordIndex;
                                    
                                    // Reset game state completely for all devices
                                    win = false;
                                    endOfGameToday = false;
                                    rowCount = 1;
                                    wordCount = 0;
                                    currentWord = '';
                                    answersColors = [];
                                    answersLetters = [];
                                    
                                    resetGameForNewWord();
                                    
                                    // Allow resets again after a small delay
                                    setTimeout(function() {
                                        isResetting = false; // Allow resets again
                                    }, 200);
                                    
                                    openNotification(`מילה ${manualWordIndex + 1} מתוך ${manualWordList.length}`);
                                } else {
                                    isResetting = false;
                                }
                            } else {
                                // Index didn't change - just sync it
                                console.log('[WORDLE_SYNC] Index same as known:', newIndex, '- syncing only');
                                lastKnownIndex = newIndex;
                            }
                        });
                    }, 3000); // Wait 3 seconds to ensure initial load is complete
                }
            } else {
                // manualWordList is wrong (probably pointing to main list) or not loaded
                console.error('Manual wordlist not found or incorrect! manualWordList length:', manualWordList ? manualWordList.length : 'undefined');
                // Reset to first word and use main list as fallback
                manualWordIndex = 0;
                if (window.setSharedManualWordIndex) {
                    window.setSharedManualWordIndex(0);
                }
                pickedWord = pickWord();
                console.log('[WORDLE_SYNC] Manual mode - falling back to main list, word:', pickedWord);
            }
        });
        } else {
            console.log('[WORDLE_SYNC] Firebase getSharedManualWordIndex function not available during initialization');
        }
    }
    
    // Try to initialize manual mode, with retries if Firebase functions aren't ready yet
    let attempts = 0;
    const maxAttempts = 20;
    function tryInitializeManualMode() {
        // Skip if game mode switching is handling Firebase sync
        if (window.skipInitialFirebaseSync) {
            console.log('[WORDLE_SYNC] Skipping initial Firebase sync - game mode switching will handle it');
            return;
        }
        
        // Also skip if we don't have the correct manual wordlist yet (mode restoration will handle this)
        const manualWordList = window.manualListOfWords;
        if (!manualWordList || manualWordList.length === 0 || manualWordList.length > 100) {
            console.log('[WORDLE_SYNC] Manual wordlist not ready or incorrect, deferring to game mode restoration');
            return;
        }
        
        attempts++;
        if (window.getSharedManualWordIndex) {
            console.log('[WORDLE_SYNC] Firebase functions available after', attempts, 'attempts');
            initializeManualMode();
        } else if (attempts < maxAttempts) {
            console.log('[WORDLE_SYNC] Firebase functions not ready yet, attempt', attempts, '/', maxAttempts, '- retrying...');
            setTimeout(tryInitializeManualMode, 100); // Much faster - 100ms instead of 1000ms
        } else {
            // Fallback if Firebase functions not available after retries
            console.log('[WORDLE_SYNC] Firebase functions not available after', maxAttempts, 'attempts, using localStorage fallback');
            manualWordIndex = parseInt(localStorage.getItem('manualWordIndex') || '0');
            let manualWordList = window.manualListOfWords;
            if (manualWordList && manualWordList.length > 0 && manualWordList.length < 100) {
                if (manualWordIndex < 0 || manualWordIndex >= manualWordList.length) {
                    manualWordIndex = 0;
                }
                pickedWord = manualWordList[manualWordIndex];
                numOfWordale = manualWordIndex;
            } else {
                pickedWord = pickWord();
            }
        }
    }
    
    // Start trying to initialize manual mode
    tryInitializeManualMode();
} else {
    pickedWord = pickWord();
    // Load user data for auto mode (daily word) - only on initial load
    if (!window.hasInitialLoadCompleted) {
        loadUserData();
        window.hasInitialLoadCompleted = true;
    }
}
//set the timer for next wordale
countDownTimer();

//load statistics:
let guessDistribution;

const stats = {
1: 2,
2: 10,
3: 20,
4: 30,
5: 25,
6: 10,
fail: 3
};
const userGuess = 3;

function pickWord() {
    if (manualMode) {
        const manualWordList = window.manualListOfWords || [];
        console.log('pickWord in manual mode - manualWordList:', manualWordList, 'length:', manualWordList.length, 'manualWordIndex:', manualWordIndex);
        if (manualWordList.length > 0) {
            if (manualWordIndex >= 0 && manualWordIndex < manualWordList.length) {
                console.log('Returning word from manual list:', manualWordList[manualWordIndex]);
                return manualWordList[manualWordIndex];
            }
            console.log('Index out of bounds, returning first word from manual list:', manualWordList[0]);
            return manualWordList[0];
        }
        console.log('Manual list empty or not loaded, falling back to main list');
        return listOfWords[0];
    }
    //This is for WinterClock, please uncomment differenceInTime equation and also differenceInDays equation.
    var differenceInTime = today.getTime() - startDate.getTime();
    // To calculate the no. of days between two dates
    var differenceInDays = Math.floor(differenceInTime / (1000 * 3600 * 24)); //added 74 since it screwed the 1 hour difference between gmt+3 and gmt+2; 
     //This is for SummerClock, please uncomment differenceInTime equation and also differenceInDays equation.
       
    //var differenceInTime = today.getTime() - summerClockStartDate.getTime();
    //var differenceInDays = Math.floor(differenceInTime / (1000 * 3600 * 24)) + 74; //added 74 since it screwed the 1 hour difference between gmt+3 and gmt+2; 
    numOfWordale = differenceInDays;

    return listOfWords[differenceInDays];
}

function clickLetter(value) {
if(endOfGameToday!=true){
    // Prevent resets while user is typing
    window.preventResets = true;
    
currentRow = document.getElementById(`row${rowCount}`)
for (let i = 1; i <= 5; i++) {
    let tile = `tile${rowCount}${i}`;
    if (document.getElementById(`${tile}`).innerHTML == '') {
        value = changeToFinal(value);
        currentWord += value;//add letter to currentWord
        document.getElementById(tile).setAttribute('data-animation', 'pop');
        document.getElementById(tile).style.border = "solid rgb(34, 34, 34)";
        document.getElementById(tile).innerHTML = value;//print letter in Tile
        break;
    }
}
}
}
// Make clickLetter available globally immediately
window.clickLetter = clickLetter;
function changeToFinal(value) {
if (currentWord.length === 4) {
    if (value === 'פ') { value = 'ף'; };
    if (value === 'נ') { value = 'ן'; };
    if (value === 'מ') { value = 'ם'; };
    if (value === 'כ') { value = 'ך'; };
    if (value === 'צ') { value = 'ץ'; };

}
return value;
}
function sendWord() {

if (win === false) {
    // Keep preventResets flag active during gameplay
    window.preventResets = true;
    
    let x = checkSpell(currentWord);
    if (currentWord.length === 5) {
        if (checkSpell(currentWord)) {
            if (wordCount < 7) {
                wordCount++;
            }
            console.log("sendword");
            compareWords();//compares words and does the rest fills tiles accordingly
            rowCount++;
            answersLetters.push(currentWord);//keeps the word in answers array (not the colors)
            saveUserData();//saves answers to localStorage
            currentWord = '';//in order to start new word at next line
            
            // Only allow resets if game is finished
            if (win || endOfGameToday) {
                window.preventResets = false;
            }
        } else {
            animateWakeUp();
            openNotification('המילה לא קיימת');
        }
    }
    else { //checks if there are enough letters
        animateWakeUp();
        openNotification("אין מספיק אותיות")
    }

}
}
function animateWakeUp() {
for (i = 1; i <= 5; i++) {
    setAnimation(i, 'wakeup');
    function setAnimation(k, animation) { 
        document.getElementById(`tile${rowCount}${i}`).classList.add(animation) 
    };
}
setTimeout(function () {
    for (j = 1; j <= 5; j++) {
            document.getElementById(`tile${rowCount}${j}`).setAttribute('data-animation','idle');
            document.getElementById(`tile${rowCount}${j}`).classList.remove('wakeup');}        
}, 800);
}
function openNotification(message) {
document.getElementById('notify').style.height = "5%";
document.getElementById('notify').innerHTML = message;

setTimeout(function () {
    document.getElementById('notify').style.height = "0%";
}, 2000);

}

function openNotificationLong(message, bool) {
document.getElementById('notify').style.height = "5%";
if (bool === true) {
    document.getElementById('notify').style.backgroundColor = "rgb(98, 159, 91)";
}
document.getElementById('notify').innerHTML = message;
}

function openShareNotificationLong() {
document.getElementById('notify2').style.height = "5%";
document.getElementById('notify2').style.visibility = "visible"; // הוסף שורה זו
document.getElementById('shareButton').style.visibility = "visible";
}


function eraseWord() {
currentWord = '';
if (wordCount <= rowCount) {
    for (let i = 1; i <= 5; i++) {
        let tile = `tile${rowCount}${i}`;
        document.getElementById(tile).innerHTML = '';
        document.getElementById(tile).setAttribute('data-animation', 'idle');
        document.getElementById(tile).style.border = "solid rgb(212, 212, 212)";
    }
}
}

function eraseLetter() {
if (currentWord != '') {
    let tile = `tile${rowCount}${currentWord.length}`;
    document.getElementById(tile).innerHTML = '';
    document.getElementById(tile).setAttribute('data-animation', 'idle');
    document.getElementById(tile).style.border = "solid rgb(212, 212, 212)";
    currentWord = currentWord.substring(0, currentWord.length - 1);

}
//     setInterval(removeAnimation('wakeup'),5000);
//     function removeAnimation(animation){ 
//         for (i=1;i<=5;i++){
//             document.getElementById(`tile${rowCount}${i}`).setAttribute('data-animation','idle');
//             document.getElementById(`tile${rowCount}${i}`).classList.remove(animation);
//         }
// };

}
function getCurrentDateKey() {
const today = new Date();
return `wordle-${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
}
function handleGameEnd(result) {
const gameDateKey = getCurrentDateKey();
const alreadySentKey = `resultSent-${gameDateKey}`;
console.log(alreadySentKey);
console.log(localStorage.getItem(alreadySentKey));
console.log("afterHandle"+ result);
if (localStorage.getItem(alreadySentKey)) {
    console.log("result"+result);
    console.log("Result already sent for this game.");
    return;
}
console.log(1111);
sendResultToFirebase(result);  // זו הפונקציה שאתה צריך לכתוב/השתמש בה
console.log(22222);
localStorage.setItem(alreadySentKey, "true");
}
function compareWords() {
let answer = [];
let newWord = '';
let greenIndices = [];
let yellowIndices = [];
let greyIndices = [];
let usedYellowIndices = [];
console.log(pickedWord);
for (i = 0; i <= 4; i++) {
    //if letter exists in place:
    if (compareLetters(currentWord[i], pickedWord[i])) {
        greenIndices.push(i);
    } else {
        newWord += pickedWord[i];
    }
}

for (i = 0; i <= 4; i++) {
    if (!greenIndices.includes(i)) {
        for (j = 0; j < newWord.length; j++) {
            if (compareLetters(currentWord[i], newWord[j])) {
                yellowIndices.push(i);
                newWord = newWord.slice(0, j) + newWord.slice(j + 1);
                break;
            }
        }
    }
}
for (i = 0; i <= 4; i++) {
    if (!yellowIndices.includes(i) && !(greenIndices.includes(i))) { //if letter exists anywhere else:
        greyIndices.push(i);
        //

    }
}
//splice used green ones from yelloweIndices:
for (i = 0; i < greenIndices.length; i++) {
    if (yellowIndices.includes(greenIndices[i])) {
        let x = yellowIndices.indexOf(greenIndices[i]);
        yellowIndices.splice(x, 1);
    }
}
//color grey indices:
for (i = 0; i < greyIndices.length; i++) {
    document.getElementById(`tile${wordCount}${greyIndices[i] + 1}`).setAttribute('data-animation', 'flip-in');
    document.getElementById(`tile${wordCount}${greyIndices[i] + 1}`).style.backgroundColor = "rgb(109, 113 ,115)";//gray
    document.getElementById(`tile${wordCount}${greyIndices[i] + 1}`).style.border = "solid rgb(109, 113 ,115)";//gray border
    paintFinalLetter(currentWord[greyIndices[i]], "rgb(109, 113 ,115)");
    answer.splice(greyIndices[i], 0, '⬜');

}
//color yellow indices:
for (i = 0; i < yellowIndices.length; i++) {
    document.getElementById(`tile${wordCount}${yellowIndices[i] + 1}`).setAttribute('data-animation', 'flip-in');
    document.getElementById(`tile${wordCount}${yellowIndices[i] + 1}`).style.backgroundColor = "rgb(194, 170, 82)";//yellow
    document.getElementById(`tile${wordCount}${yellowIndices[i] + 1}`).style.border = "solid rgb(194, 170, 82)";//yellow border
    paintFinalLetter(currentWord[yellowIndices[i]], "rgb(194, 170, 82)");
    answer.splice(yellowIndices[i], 0, '🟨');

}
//color green indices on top of all else:
for (i = 0; i < greenIndices.length; i++) {
    document.getElementById(`tile${wordCount}${greenIndices[i] + 1}`).setAttribute('data-animation', 'flip-in');
    document.getElementById(`tile${wordCount}${greenIndices[i] + 1}`).style.backgroundColor = "rgb(98, 159, 91)";//green
    document.getElementById(`tile${wordCount}${greenIndices[i] + 1}`).style.border = "solid rgb(98, 159, 91)";//green border
    paintFinalLetter(currentWord[greenIndices[i]], "rgb(98, 159, 91)");
    answer.splice(greenIndices[i], 0, '🟩');

}

answer = answer.reverse();
answersColors.push(answer);
console.log(greenIndices);

// color text white
document.getElementById(`row${wordCount}`).style.color = "white";
//if sentWord is correct display final message and update win:
// if (greenIndices.length === 5 || wordCount === 6) {
if (greenIndices.length === 5) {
    win = true;
    window.finalGuessCount = wordCount;
    console.log("win");
    handleGameEnd(wordCount);
    //sendResultToFirebase(wordCount);
    showDistributionStats(wordCount);
    endOfGameToday = true;
    // Allow resets now that game is finished
    window.preventResets = false;


    let winMessage = pickMessage();
    // fetchPercentile(wordCount, function(percentile, total) {
    //     openNotificationLong(`הצלחת ב-${wordCount} ניחושים! אתה באחוזון ה-${percentile} מבין ${total} שחקנים.`, true);
    // });
    openNotificationLong(winMessage, true);
    openShareNotificationLong();
}
//if ended and lost:
if (wordCount === 6 && greenIndices.length != 5) {
    console.log(wordCount);
    console.log("lose");
    wordCount=wordCount+1;
    console.log(wordCount);
    window.finalGuessCount = wordCount;
    win=false;
    console.log("beforeHandle" + wordCount);
    handleGameEnd(wordCount);
    //sendResultToFirebase(wordCount);
    showDistributionStats(999);
    endOfGameToday = true;
    // Allow resets now that game is finished
    window.preventResets = false;
    let message = `המילה היא ${pickedWord} `;
    openNotificationLong(message, false);
    openShareNotificationLong();

    // fetchPercentile(wordCount, function(percentile, total) {
    //     openNotificationLong(`הצלחת ב-${wordCount} ניחושים! אתה באחוזון ה-${percentile} מבין ${total} שחקנים.`, true);
    // });
}

}
// import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
// function openStats() {
//     const statsModal = document.getElementById("statsModal");
//     statsModal.style.visibility = "visible";

//     // נניח שהניחוש האחרון שמור במשתנה גלובלי או session
//     const userGuess = window.finalGuessCount || 7; // 7 מייצג כישלון

//     const dateStr = new Date().toISOString().split('T')[0];
//     const statsRef = ref(db, 'results/' + dateStr);

//     get(statsRef).then(snapshot => {
//       if (!snapshot.exists()) {
//         renderStats({}, userGuess);
//         return;
//       }

//       const allResults = Object.values(snapshot.val());

//     //   // הוספת המשתמש לתוך ההתפלגות אם טרם נרשם
//       allResults.push({ guesses: userGuess });

//       // בניית מפת סטטיסטיקה
//       const stats = {};
//       allResults.forEach(entry => {
//         const key = entry.guesses > 6 ? 'fail' : entry.guesses;
//         stats[key] = (stats[key] || 0) + 1;
//       });

//       renderStats(stats, userGuess);
//     });
//   }

function closeStats() {
document.getElementById('statsModal').style.visibility = 'hidden';
document.getElementById('statsContent').style.visibility = 'hidden';

}
function showDistributionStats(userGuessCount) {
// תאריך לפי השעון המקומי

const dateStr = getLocalDateString();


console.log("showDist"+dateStr);
fetch(`https://yairwordale-default-rtdb.firebaseio.com/results/${dateStr}.json`)
    .then(res => res.json())
    .then(data => {
    const stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, fail: 0 };
    const all = Object.values(data || {});
    for (const r of all) {
        const g = parseInt(r.guesses);
        if (g >= 1 && g <= 6) stats[g]++;
        else stats.fail++;
    }
    const total = all.length;
    console.log(total);
    const statsDiv = document.getElementById('statsTable');
    statsDiv.innerHTML = '';

    for (let i = 1; i <= 6; i++) {
        const percent = total ? ((stats[i] / total) * 100).toFixed(1) : 0;
        const row = document.createElement('div');
        row.classList.add('stats-row');
        if (i === userGuessCount) row.classList.add('highlight');

        const label = document.createElement('span');
        label.className = 'stats-label';
        label.textContent = `ניחוש ${i}`;

        const bar = document.createElement('div');
        bar.className = 'stats-bar';
        bar.style.width = `${percent}%`;
        bar.textContent = `${percent}%`;

        row.appendChild(label);
        row.appendChild(bar);
        statsDiv.appendChild(row);
    }

    const failPercent = total ? ((stats.fail / total) * 100).toFixed(1) : 0;
    const failRow = document.createElement('div');
    failRow.classList.add('stats-row');
    if (userGuessCount > 6) failRow.classList.add('highlight');

    const failLabel = document.createElement('span');
    failLabel.className = 'stats-label';
    failLabel.textContent = 'לא הצליחו';

    const failBar = document.createElement('div');
    failBar.className = 'stats-bar';
    failBar.style.width = `${failPercent}%`;
    failBar.textContent = `${failPercent}%`;

    failRow.appendChild(failLabel);
    failRow.appendChild(failBar);
    statsDiv.appendChild(failRow);
    });
}

function fetchPercentile(guesses, callback) {
const dateStr = getLocalDateString();


firebase.database().ref('results/' + dateStr).once('value', snapshot => {
    const allResults = Object.values(snapshot.val() || {});
    // הוספת המשתמש הנוכחי באופן מקומי
    allResults.push({ guesses }); // הוספתו באופן וירטואלי
    const total = allResults.length;
    const better = allResults.filter(r => r.guesses < guesses).length;
    const equal = allResults.filter(r => r.guesses == guesses).length;
    const percentile = Math.round(((better + equal / 2) / total) * 100);
    callback(percentile, total);
});
}
function getLocalDateString() {
const now = new Date();
const tzOffsetMinutes = now.getTimezoneOffset();
const localTime = new Date(now.getTime() - tzOffsetMinutes * 60000);
return localTime.toISOString().split('T')[0];
}

// function sendResultToFirebase(guessCount) {
//     const dateStr = new Date().toISOString().split('T')[0];
//     firebase.database().ref('results/' + dateStr).push({
//         guesses: guessCount,
//         timestamp: Date.now()
//     });
//     const allResults = Object.values(snapshot.val());

//     //   // הוספת המשתמש לתוך ההתפלגות אם טרם נרשם
//       allResults.push({ guesses: userGuess });
// }
function renderStats(stats, userGuess) {
const table = document.getElementById("statsTable");
table.innerHTML = "";

const total = Object.values(stats).reduce((a, b) => a + b, 0);

const keys = [1, 2, 3, 4, 5, 6, 'fail'];

keys.forEach(key => {
const count = stats[key] || 0;
const percent = total ? Math.round((count / total) * 100) : 0;

const row = document.createElement("div");
row.className = "statsRow" + ((userGuess == key || (key === 'fail' && userGuess === 7)) ? " highlight" : "");
const label = document.createElement("div");
label.className = "statsLabel";
label.innerText = key === 'fail' ? "לא הצליחו" : `ניחוש ${key}`;

const bar = document.createElement("div");
bar.className = "statsBar";

const fill = document.createElement("div");
fill.className = "statsFill";
fill.style.width = percent + "%";

bar.appendChild(fill);

const pct = document.createElement("div");
pct.className = "statsPercent";
pct.innerText = percent + "%";

row.appendChild(label);
row.appendChild(bar);
row.appendChild(pct);

table.appendChild(row);
});
const statsTitle = document.getElementById("statsTitle");
const today = new Date();
const formattedDate = today.toLocaleDateString('he-IL'); // למשל: 03/05/2025
statsTitle.innerText = `התפלגות ניחושים להיום - ${formattedDate}`;
document.getElementById("statsContent").style.visibility = "visible";

}
function pickMessage() {
let messageArray = [];
if (wordCount === 1) {
    messageArray = [
        'גאוני', 'אמאל׳ה הצלחת מהר', '?די נו, תוך ניחוש', 'תוצאה מוגזמת', '!!!טירוף', 'שיחקת מדהים', 'יש לך מוח עצום',
        'תוצאה מפחידה', '?וואו. תוך ניחוש. רימית', '?מי זה? אבשלום קור', 'אחד מי יודע? את/ה', 'מגניב מדי בשביל בית ספר',
        '?יש לך את זה ביותר מהר', 'פששש, כבוד', 'פתרת מהר מדי', 'בפוקס הראשון','ניחוש ראשון זה לא צחוק',
        'ציפור אחת במכה אחת','?איך הבאת את זה כל כך מהר','בטח גם עברת טסט ראשון','?הניחשת וגם הצלחת','מדובר בהצלחה מסחררת',
        'זה חוקי בכלל?', 'נראה לי שאתה בינה מלאכותית', 'הקלדת בעיניים עצומות?', 'המילה התחננה להינחש, הא?', 'כמה שילמת למילה?',
        'אם היה פרס, היית מקבל אותו פעמיים', 'מה אתה עושה כאן? לך תעבוד בגוגל', 'חד כתער!', 'תוך ניחוש? בא לי לבכות',
        'את/ה עילוי. פשוטו כמשמעו'
    ];
}
if (wordCount === 2) {
    messageArray = [
        'נסכם את ההצלחה בשתי מילים: יופי טופי','נולדת לוורדל׳ה','וורדל׳ה מודה לך על משחק מופתי',
        'טובים השניים מן האחד (ניחושים כאילו)', 'גאוני', 'אמאל׳ה הצלחת מהר', 'אחלה תוצאה שבעולם', 'נראה שהלך מדהים',
        '!!!טירוף', 'שני ניחושים? קטונתי', 'יש לך מוח ענק', 'תוצאה מפחידה', 'וואו פשוט וואו',
        'בגלגול הקודם היית מילונאי', "שני ניחושים יצאו לדרך בים בם בום", 'אין לנו מה לומר, הצלחת',
        'מזל של מתחילים', 'הלכת אול אין וזה השתלם אחושקשוקי', 'לא רואים אבל אני משתחווה','מוצלח, מאוד מאוד מוצלח',
        'חכם בלילה - וביום', 'יש לך מילים על קצה הלשון', 'עוד שניה היית מצליח בניחוש אחד', 'כמעט מושלם, רק כמעט',
        'אין לי דרך יפה להגיד את זה - הצלחת', 'שניים זה מספר המזל שלך', 'וורדל׳ה מאוהבת בך', 'לא היית רחוק מנס', 
        'זה כמו לקלוע שלשה עם הגב', 'תוצאה פוטוגנית'
    ];
}
if (wordCount === 3) {
    messageArray = [
        'אני גאה בך', 'דיייי איזו תוצאה', 'ניחשת את המילה מהר', 'שלושה ניחושים? וואו', 'משחק מדהים שלך',
        'ניחושים ופיגוזים', 'משחק הבא עלינו', 'בליגה של הגדולים/גדולות', '!טוב מאוד', 'פשוט מעולה',
        'התרשמנו לטובה ממך', 'בואנה אחלה תוצאה', 'הצלחת בגדול, הפרס: מילה חדשה מחר', 'ידענו שתצליח/י אבל הפתעת',
        'משלושה (ניחושים) יוצא אחד','שלושה ניחושים והכל יופי','בניחוץ׳ הצ׳ליצ׳י','שלושה ניחושים זה בגבוה',
        'בדיוק לפי הספר', 'שלוש פעמים קסם', 'אם הייתי צריך ניחוש שלישי – הייתי בוחר בך', 'שלוש זה מספר ראשוני. כמוך.',
        'התוצאה שלך חורגת מהסטטיסטיקה', 'את/ה ממש על זה', 'תזמון מושלם', 'מילה בשלוש פעימות', 'זה לא מזל – זה כישרון'
    ];
}
if (wordCount === 4) {
    messageArray = [
        'הצלחתך הצלחתינו', 'פשששש','לא רע בכלל','פשוט אחלה תוצאה','סחתיין עליך', 'יופי יופי יופי',
        'כפיים לך, הצלחת', 'נראה לי שיש פה ניחוש מעולה', 'נתת בראש', 'אחלה תוצאה שבעולם', 'עם התמדה מגיעים להכל',
        'פתרת כמו גדול/ה', 'אחלה בחלה', 'יופי טופי', 'משחק טוב כל הכבוד', 'שיחקת מעולה', 'נהדר ומצוין ואחלה ויופי',
        "פששש ממש סוס ארבעה",'כבוד הולך אליך על הפתירה', 'בניחוש הרביעי!!! יפה', 'ארבע זה מספר טיפולוגי',
        'כנגד ארבעה ניחושים דיברה המילה', 'זה לא היה קל – אבל הצלחת', 'כמו מרתון קצרצר', 'תוצאה ראויה להערכה',
        'נחישות ראויה לציון','המילה נכנעה אחרי כמה מכות מדויקות',  
'הגעת בדיוק לנקודה בה מתחילים להזיע',  
'היה אפשר לחתוך את המתח בסכין חמאה', 'עשית את זה ברוגע', 'זהב בקטגוריית ארבעה ניחושים','הרביעי זה הניחוש של העקשנים',  
'נו, ארבע פעמים זה בדיוק הממוצע של איינשטיין (סתם)',   'המילה לא עמדה בפניך'
    ];
}
if (wordCount === 5) {
    messageArray = [
        'ולחשוב שמישהו פקפק בך', 'לא רע', 'יפה.. קצת חששנו אבל יפה', 'יששש הצלחת', 'הידד זה עבד לך בסוף',
        'אז בסוף ניחשת נכון', 'נלחצנו לרגע', 'נפלת 4 פעמים, אבל בסוף קמת כמו גדול/ה', 'בסדר, אז הצלחת. יופי באמת',
        'הצלחת, אמא גאה בך', 'שיחקת יפה מאוד', 'יופייייי', 'ועל זה נאמר - תיסלם', 'זה שלא ויתרת זה כבר משהו',
        'שמת את האותיות במקום ובום הצלחה', 'משחק אגדה זה היה', 'מתקרב לקצה אבל לא נופל', 'עברת את זה עם סטייל',
        'עבודה יסודית', 'הקצב שלך? זהיר, אבל מדויק', 'ניצחון עם קצת מתח', 'לא מובן מאליו',
        'פתרת כמו מקצוען', 'הלב שלנו חזר לפעום'
    ];
}
if (wordCount === 6) {
    messageArray = [
        'וואו נלחצנו לרגע, כל הכבוד', 'שניה לפני הנפילה', 'הניחוש הגואל!!! כל הכבוד', 'מי חשב שלא תצליח/י? לא אנחנו',
        'פאק נפל לנו הלב לתחתון. מזל. כל הכבוד', '!!!ניחוש אחרון?? אשכרה', 'מדובר בגול בדקה התשעים',
        'ידענו שלא תוותר/י', 'אין עליך בעולם, התמדה זה הסוד', '.פאק זה היה קרוב', 'גדול!!! כמעט הפסדת ואז בסוף - לא',
        'מברוק', 'אחלה את/ה תאמין/י לי', 'וואי וואי לא הימרתי שזה יעבוד', 'פששש, חזק', '.אין לי מילים. תרתי משמע',
        'ממש ני-חוש שישי', 'פעם שישית גלידה, סתם לא', '..יפה! כלומר, נחמד', 'אה הצלחת בסוף? טוב', 'נו רואה? בסוף זה השתלם',
        'מילה שלי שהצלחת', 'כמו טלנובלה – הכל קורה ברגע האחרון', 'זה לא וורדל – זה דרמה', 'היה צמוד מדי',
        'הזעת, לא?', 'חזרנו לנשום. אתה גם?', 'היינו איתך מהניחוש הראשון ועד השישי','הניחוש האחרון זה כמו הדקה ה־90 ועוד תוספת זמן',  
'כל המשרד עצר לנשום איתך',  
'וואו, זה היה מתוח יותר מבחירות לכנסת',  
'אם זה היה עוד ניחוש אחד – המסך היה נמס',  
'העיקר שלא נשברת... חיצונית לפחות',   'זה היה מיני־מותחן'
    ];
}

const randIndex = Math.floor(Math.random() * messageArray.length);
return messageArray[randIndex];
}

function checkSpell(word) {
let wordExists = false;
splitWordsHebrew = hebWords.split(' ');
for (i = 0; i < splitWordsHebrew.length; i++) {
    if (splitWordsHebrew[i] === (word)) {
        wordExists = true;
        break;
    }
}

return wordExists;

};
function getValidDate() {
const now = new Date();
const israelTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));

// אם השעה בישראל לפני 15:30
if (israelTime.getHours() < 15 || (israelTime.getHours() === 15 && israelTime.getMinutes() < 30)) {
    // נחזיר את התאריך של אתמול
    israelTime.setDate(israelTime.getDate() - 1);
}

return israelTime.toISOString().split('T')[0];
}

function paintFinalLetter(letter, color) {
if (letter === 'ן') letter = 'נ';
if (letter === 'ם') letter = 'מ';
if (letter === 'ץ') letter = 'צ';
if (letter === 'ף') letter = 'פ';
if (letter === 'ך') letter = 'כ';
document.getElementById(letter).style.backgroundColor = color;
document.getElementById(letter).style.color = "white";


}
function shareResults() {
let shareResult = `מאיוורדל # ${numOfWordale}` + "\n";
shareResult += `נסיון ${wordCount} מתוך 6` + "\n";

for (i = 0; i < answersColors.length; i++) {
    let tempAnswer = answersColors[i].toString();
    const result = tempAnswer.replaceAll(",", "");
    shareResult = shareResult + result + "\n";

}
shareResult = shareResult + "\n" + "מאיוורדל 👩‍🦰" + "\n" + "https://yairhasfari.github.io/wordale";
navigator.clipboard.writeText(shareResult);
// let shareButton = "<input id=\"shareButton\" onclick=\"shareResults()\" value=\"תוצאות הועתקו ללוח\">"
// document.getElementById('notify2').innerHTML = shareButton;
document.getElementById("shareButton").innerHTML = "תוצאות הועתקו ללוח";

}
function openInstructions() {
if (document.getElementById('instructions').style.visibility === "hidden") {
    document.getElementById('instructions').style.visibility = "visible";
}
else {
    document.getElementById('instructions').style.visibility = "hidden";
}
}
function saveUserData() {
//update statistics:
//updateStatistics();
// In manual mode, save data per word index so each word has its own progress
const storageKey = manualMode ? `manual_${manualWordIndex}` : 'auto';
//saves the date the user is currently on
localStorage.setItem(`userDate_${storageKey}`, today.toString());
//saves the answers arrays of today (save as JSON for proper array storage)
localStorage.setItem(`answersColors_${storageKey}`, JSON.stringify(answersColors));
localStorage.setItem(`answersLetters_${storageKey}`, JSON.stringify(answersLetters));

}
// function saveUserDataEnd (){
//     localStorage.setItem('end', "yes");

// }
// loadUserData loads the data saved on localStorage and fills the tiles with older answers. this only happens if the day is today.
function loadUserData() {
    // Skip loading if in manual mode (check both variable and localStorage)
    const isManualMode = manualMode || localStorage.getItem('manualMode') === 'true';
    if (isManualMode) {
        // STRICT: Don't load if user has ANY active input or game state
        if (currentWord && currentWord.length > 0) {
            console.log('loadUserData skipped - user is currently typing');
            return;
        }
        
        // Don't load if there are any tiles with content in the current row
        if (rowCount >= 1 && rowCount <= 6) {
            let hasContentInCurrentRow = false;
            for (let i = 1; i <= 5; i++) {
                const tile = document.getElementById(`tile${rowCount}${i}`);
                if (tile && tile.innerHTML && tile.innerHTML.trim() !== '') {
                    hasContentInCurrentRow = true;
                    break;
                }
            }
            if (hasContentInCurrentRow) {
                console.log('loadUserData skipped - current row has content');
                return;
            }
        }
        
        // In manual mode, load data for the current word index
        const storageKey = `manual_${manualWordIndex}`;
        let savedDateString = localStorage.getItem(`userDate_${storageKey}`);
        console.log(`[WORDLE_SYNC] loadUserData called - manualWordIndex: ${manualWordIndex}, pickedWord: "${pickedWord}", storageKey: "${storageKey}"`);
        if (!savedDateString) {
            console.log('loadUserData skipped - no saved data for manual word', manualWordIndex);
            return;
        }
        let savedDate = new Date(savedDateString);
        // In manual mode, always load the saved data for this word (don't check date)
        const savedLetters = localStorage.getItem(`answersLetters_${storageKey}`);
        const savedColors = localStorage.getItem(`answersColors_${storageKey}`);
        if (!savedLetters || !savedColors) {
            console.log('loadUserData skipped - no saved letters/colors');
            return;
        }
        answersLetters = JSON.parse(savedLetters);
        answersColors = JSON.parse(savedColors);
        
        // Don't restore if user is currently typing in the current row
        const currentRowHasInput = currentWord && currentWord.length > 0;
        if (currentRowHasInput && rowCount === answersLetters.length + 1) {
            console.log('loadUserData skipped - user is typing in current row');
            return;
        }
        
        // Restore the tiles and colors without calling compareWords
        for (k = 0; k < answersLetters.length; k++) {
            const rowNum = k + 1;
            // Skip restoring the current row if user is typing
            if (rowNum === rowCount && currentRowHasInput) {
                continue;
            }
            
            for (m = 0; m < answersLetters[k].length; m++) {
                const tile = document.getElementById(`tile${rowNum}${m + 1}`);
                if (tile) {
                    // Don't overwrite if tile already has content and it's the current row
                    if (rowNum === rowCount && tile.innerHTML && currentRowHasInput) {
                        continue;
                    }
                    
                    tile.innerHTML = answersLetters[k][m];
                    // Restore tile colors from answersColors
                    if (answersColors[k] && answersColors[k][m]) {
                        const colorEmoji = answersColors[k][m];
                        if (colorEmoji === '🟩') {
                            tile.style.backgroundColor = "rgb(98, 159, 91)";
                            tile.style.border = "solid rgb(98, 159, 91)";
                            tile.style.color = "white";
                        } else if (colorEmoji === '🟨') {
                            tile.style.backgroundColor = "rgb(194, 170, 82)";
                            tile.style.border = "solid rgb(194, 170, 82)";
                            tile.style.color = "white";
                        } else if (colorEmoji === '⬜') {
                            tile.style.backgroundColor = "rgb(109, 113 ,115)";
                            tile.style.border = "solid rgb(109, 113 ,115)";
                            tile.style.color = "white";
                        }
                    }
                }
            }
            // Update keyboard colors
            for (m = 0; m < answersLetters[k].length; m++) {
                const letter = answersLetters[k][m];
                if (answersColors[k] && answersColors[k][m]) {
                    const colorEmoji = answersColors[k][m];
                    let color = "rgb(109, 113 ,115)";
                    if (colorEmoji === '🟩') color = "rgb(98, 159, 91)";
                    else if (colorEmoji === '🟨') color = "rgb(194, 170, 82)";
                    paintFinalLetter(letter, color);
                }
            }
        }
        
        // Update game state variables (but don't overwrite currentWord if user is typing)
        if (!currentRowHasInput) {
            wordCount = answersLetters.length;
            rowCount = answersLetters.length + 1;
            currentWord = '';
        } else {
            // Only update wordCount if it's less than what we're restoring
            if (answersLetters.length > wordCount) {
                wordCount = answersLetters.length;
            }
        }
        
        // Set row color to white for completed rows
        for (k = 0; k < answersLetters.length; k++) {
            const row = document.getElementById(`row${k + 1}`);
            if (row) row.style.color = "white";
        }
        return;
    }
    // Auto mode - use old behavior
    //because localStorage only saves strings.
    let savedDateString = localStorage.getItem('userDate_auto');
    if (!savedDateString) return;
    let savedDate = new Date(savedDateString);
    let todayNoHours = today.setHours(0, 0, 0, 0);//in order to compare date only without time
    let savedDateCompare = savedDate.setHours(0, 0, 0, 0)//likewise
    //only if day has changed:
    if (todayNoHours === savedDateCompare) {
        const savedLetters = localStorage.getItem('answersLetters_auto');
        const savedColors = localStorage.getItem('answersColors_auto');
        if (!savedLetters || !savedColors) return;
        answersLetters = JSON.parse(savedLetters);
        answersColors = JSON.parse(savedColors);
        for (k = 0; k < answersLetters.length; k++) {
            for (m = 0; m < answersLetters[k].length; m++) {
                document.getElementById(`tile${k + 1}${m + 1}`).innerHTML = answersLetters[k][m];
            }
            currentRow = k + 1;
            currentWord = answersLetters[k];
            wordCount = k + 1;
            rowCount = rowCount + 1;
            
            compareWords();
            currentWord = '';

        }

    }
}
function compareLetters(letterA, letterB) {
if (letterA === letterB | (letterA === "נ" && letterB === "ן") | (letterA === "צ" && letterB === "ץ") | (letterA === "פ" && letterB === "ף") | (letterA === "כ" && letterB === "ך") | (letterA === "מ" && letterB === "ם")) {
    return true;
}
else if ((letterB === "נ" && letterA === "ן") | (letterB === "צ" && letterA === "ץ") | (letterB === "פ" && letterA === "ף") | (letterB === "כ" && letterA === "ך") | (letterB === "מ" && letterA === "ם")) {
    return true
}
else {
    return false;

}
}
function countDownTimer() {
var todaysDate = new Date()
todaysDate.setDate(todaysDate.getDate() + 1);
todaysDate.setHours(0, 0, 0, 0);
var countDownDate = todaysDate.getTime();

// Update the count down every 1 second
var x = setInterval(function () {
    
    // Get today's date and time
    var now = new Date().getTime();
    
    // Find the distance between now and the count down date
    var distance = countDownDate - now;

    // Time calculations for days, hours, minutes and seconds
    var days = Math.floor(distance / (1000 * 60 * 60 * 24));
    var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((distance % (1000 * 60)) / 1000);

    hours = hours.toLocaleString(undefined, { minimumIntegerDigits: 2 });
    minutes = minutes.toLocaleString(undefined, { minimumIntegerDigits: 2 });
    seconds = seconds.toLocaleString(undefined, { minimumIntegerDigits: 2 });
    // Output the result in an element with id="demo"
    document.getElementById("timer").innerHTML = hours + ":"
        + minutes + ":" + seconds;
    if (hours==0 & minutes==0 & seconds==0) {location.reload();};

    // If the count down is over, write some text 
    if (distance < 0) {
        clearInterval(x);
        document.getElementById("timer").innerHTML = "";
        
    }
}, 1000);
}

function toggleManualMode() {
    manualMode = !manualMode;
    localStorage.setItem('manualMode', manualMode.toString());
    
    const timerLabel = document.getElementById('timerWithLabel');
    
    console.log('toggleManualMode called - manualMode:', manualMode);
    
    if (manualMode) {
        // Just show the manual mode controls - don't reset the game
        // Get the manual wordlist
        const manualWordList = window.manualListOfWords || [];
        console.log('toggleManualMode - entering manual mode');
        console.log('manualWordList:', manualWordList);
        console.log('manualWordList length:', manualWordList.length);
        console.log('First 3 words in manual list:', manualWordList.slice(0, 3));
        console.log('mainListOfWords length:', window.mainListOfWords ? window.mainListOfWords.length : 'undefined');
        
        // Verify this is actually the manual list (should be ~15 words)
        if (manualWordList.length > 100) {
            console.error('ERROR: manualWordList appears to be the main list! Length:', manualWordList.length);
            console.error('This means window.manualListOfWords was not set correctly');
        }
        
        if (!localStorage.getItem('manualWordIndex') || manualWordList.length === 0) {
            manualWordIndex = 0;
            localStorage.setItem('manualWordIndex', '0');
            // Update pickedWord to first word in manual list
            if (manualWordList.length > 0 && manualWordList.length < 100) {
                pickedWord = manualWordList[0];
                numOfWordale = 0;
                console.log('Setting pickedWord to first word in manual list:', pickedWord);
            } else {
                console.error('Manual wordlist is empty or incorrect! Length:', manualWordList.length);
            }
        } else {
            manualWordIndex = parseInt(localStorage.getItem('manualWordIndex') || '0');
            // Make sure index is valid
            if (manualWordList.length > 0 && manualWordList.length < 100) {
                if (manualWordIndex >= manualWordList.length) {
                    manualWordIndex = 0;
                    localStorage.setItem('manualWordIndex', '0');
                }
                // Update pickedWord to current word in manual list
                pickedWord = manualWordList[manualWordIndex];
                numOfWordale = manualWordIndex;
                console.log('Setting pickedWord to word at index', manualWordIndex, ':', pickedWord);
                console.log('Verifying word is in manual list:', manualWordList.includes(pickedWord));
            } else {
                console.error('Manual wordlist issue - length:', manualWordList.length, 'index:', manualWordIndex);
            }
        }
        
        // Hide timer in manual mode
        if (timerLabel) {
            timerLabel.style.display = 'none';
        }
        // Update mode indicator
        const modeIndicator = document.getElementById('modeIndicator');
        if (modeIndicator) modeIndicator.textContent = 'M';
    } else {
        // Show timer when exiting manual mode
        if (timerLabel) {
            timerLabel.style.display = 'flex';
        }
        // Update mode indicator
        const modeIndicator = document.getElementById('modeIndicator');
        if (modeIndicator) modeIndicator.textContent = 'A';
        // Keep manualWordIndex in localStorage in case user switches back
    }
}

window.resetGameForNewWord = function() {
    // Add logging to track when this is called
    console.log('resetGameForNewWord called - current pickedWord:', pickedWord, 'manualWordIndex:', manualWordIndex);
    
    win = false;
    endOfGameToday = false;
    rowCount = 1;
    wordCount = 0;
    currentWord = '';
    answersColors = [];
    answersLetters = [];
    
    // Clear all tiles and rows
    for (let r = 1; r <= 6; r++) {
        // Reset row color
        const row = document.getElementById(`row${r}`);
        if (row) {
            row.style.color = ''; // Reset to default (black)
        }
        
        // Clear all tiles in this row
        for (let c = 1; c <= 5; c++) {
            const tile = document.getElementById(`tile${r}${c}`);
            if (tile) {
                tile.innerHTML = '';
                tile.style.backgroundColor = '';
                tile.style.border = "solid rgb(212, 212, 212)";
                tile.style.color = ''; // Reset to default (black)
                tile.setAttribute('data-animation', 'idle');
            }
        }
    }
    
    // Reset keyboard button colors
    const hebrewLetters = 'אבגדהוזחטיכלמנסעפצקרשתםןץףך';
    for (let i = 0; i < hebrewLetters.length; i++) {
        const letter = hebrewLetters[i];
        const button = document.getElementById(letter);
        if (button) {
            button.style.backgroundColor = '';
            button.style.color = '';
        }
    }
    
    // Hide notifications
    const notify = document.getElementById('notify');
    const notify2 = document.getElementById('notify2');
    if (notify) notify.style.height = "0%";
    if (notify2) {
        notify2.style.height = "0%";
        notify2.style.visibility = "hidden";
    }
    
    // Don't clear localStorage - each word keeps its own progress
    // The storage keys are now word-specific (manual_0, manual_1, etc.)
};

// Initialize manual mode - ensure all state is correct
window.manualModeInit = function() {
    if (manualMode) {
        // Force reset all game state variables
        win = false;
        endOfGameToday = false;
        rowCount = 1;
        wordCount = 0;
        currentWord = '';
        answersColors = [];
        answersLetters = [];
        
        // Make sure pickedWord is set correctly from manual wordlist
        const manualWordList = window.manualListOfWords || [];
        if (manualWordList.length > 0 && manualWordIndex >= 0 && manualWordIndex < manualWordList.length) {
            pickedWord = manualWordList[manualWordIndex];
            numOfWordale = manualWordIndex;
            console.log('manualModeInit - set pickedWord to:', pickedWord, 'from manual list');
        } else {
            console.error('manualModeInit - manual wordlist issue, length:', manualWordList.length, 'index:', manualWordIndex);
        }
    }
};

function setupManualModeListener() {
    // Prevent multiple listeners
    if (window.manualModeListenerSetup) {
        console.log('[WORDLE_SYNC] Manual mode listener already set up, skipping');
        return;
    }
    window.manualModeListenerSetup = true;
    
    console.log('[WORDLE_SYNC] Setting up manual mode Firebase listener...');
    if (window.watchSharedManualWordIndex) {
        let lastKnownIndex = manualWordIndex;
        let initialLoadComplete = true; // Since we're setting up after initial load
        let isResetting = false;
        
        console.log('[WORDLE_SYNC] Setting up Firebase listener, current index:', manualWordIndex, 'lastKnownIndex:', lastKnownIndex);
        
        window.watchSharedManualWordIndex(function(newIndex) {
            console.log('[WORDLE_SYNC] Firebase listener callback triggered with index:', newIndex);
            console.log('[WORDLE_SYNC] Current state: initialLoadComplete=', initialLoadComplete, 'isResetting=', isResetting, 'lastKnownIndex=', lastKnownIndex, 'manualWordIndex=', manualWordIndex);
            
            // Prevent multiple simultaneous resets
            if (isResetting) {
                console.log('[WORDLE_SYNC] Reset already in progress, ignoring callback');
                return;
            }
            
            // Only react if the index actually changed from what we last saw
            if (newIndex !== lastKnownIndex && newIndex !== manualWordIndex) {
                console.log('[WORDLE_SYNC] Word index changed detected: lastKnownIndex=', lastKnownIndex, 'newIndex=', newIndex, 'current manualWordIndex=', manualWordIndex);
                
                // Don't reset if user is actively typing RIGHT NOW
                if (window.preventResets && currentWord && currentWord.length > 0) {
                    console.log('[WORDLE_SYNC] User is actively typing - deferring reset. Will sync index but wait for user to finish.');
                    lastKnownIndex = newIndex;
                    return;
                }
                
                const manualWordList = window.manualListOfWords || [];
                
                console.log('[WORDLE_SYNC] SYNCHRONIZING: Word changed - resetting to new word. New index:', newIndex);
                isResetting = true;
                lastKnownIndex = newIndex;
                manualWordIndex = newIndex;
                
                if (manualWordList.length > 0 && manualWordIndex >= 0 && manualWordIndex < manualWordList.length) {
                    pickedWord = manualWordList[manualWordIndex];
                    numOfWordale = manualWordIndex;
                    
                    // Reset game state completely for all devices
                    win = false;
                    endOfGameToday = false;
                    rowCount = 1;
                    wordCount = 0;
                    currentWord = '';
                    answersColors = [];
                    answersLetters = [];
                    
                    resetGameForNewWord();
                    
                    // Allow resets again immediately - no need for delay
                    isResetting = false;
                    
                    openNotification(`מילה ${manualWordIndex + 1} מתוך ${manualWordList.length}`);
                } else {
                    isResetting = false;
                }
            } else {
                // Index didn't change - just sync it
                console.log('[WORDLE_SYNC] Index same as known:', newIndex, '- syncing only');
                lastKnownIndex = newIndex;
            }
        });
    } else {
        console.log('[WORDLE_SYNC] Firebase watchSharedManualWordIndex function not available');
    }
}

function openManagerPage() {
    const modal = document.getElementById('managerModal');
    const passwordPhase = document.getElementById('passwordPhase');
    const managerControls = document.getElementById('managerControls');
    const passwordInput = document.getElementById('managerPassword');
    
    // Reset to password phase
    passwordPhase.style.display = 'block';
    managerControls.style.display = 'none';
    passwordInput.value = '';
    
    modal.style.display = 'block';
    
    // Focus on password input
    setTimeout(() => {
        passwordInput.focus();
    }, 100);
}

function closeManagerPage() {
    document.getElementById('managerModal').style.display = 'none';
}

function checkManagerPassword() {
    const password = document.getElementById('managerPassword').value;
    
    if (password === MANUAL_MODE_PASSWORD) {
        // Correct password - show manager controls
        document.getElementById('passwordPhase').style.display = 'none';
        document.getElementById('managerControls').style.display = 'block';
        
        // Ensure manual mode is enabled
        if (!manualMode) {
            enableManualMode();
        }
        
        updateManagerStatus();
    } else if (password !== '') {
        openNotification('סיסמה שגויה');
        document.getElementById('managerPassword').value = '';
    }
}

function enableManualMode() {
    manualMode = true;
    localStorage.setItem('manualMode', 'true');
    
    // Initialize manual mode if needed
    const manualWordList = window.manualListOfWords || [];
    if (!localStorage.getItem('manualWordIndex') && manualWordList.length > 0) {
        manualWordIndex = 0;
        localStorage.setItem('manualWordIndex', '0');
        pickedWord = manualWordList[0];
        numOfWordale = 0;
    }
    
    // Hide timer in manual mode
    const timerLabel = document.getElementById('timerWithLabel');
    if (timerLabel) timerLabel.style.display = 'none';
    
    // Update mode indicator
    const modeIndicator = document.getElementById('modeIndicator');
    if (modeIndicator) modeIndicator.textContent = 'M';
    
    // Set up Firebase listener for manual mode
    console.log('[WORDLE_SYNC] Entering manual mode via manager, setting up Firebase listener...');
    setupManualModeListener();
}

function updateManagerStatus() {
    // Update current status display
    const gameMode = localStorage.getItem('gameMode') || 'test';
    const gameModeText = {
        'test': 'בדיקה (Test)',
        'mayabd': 'מאיהוורדל (Maya BD)', 
        'ignite': 'Ignite Wordle'
    };
    
    document.getElementById('currentMode').textContent = manualMode ? 
        `מצב ידני - ${gameModeText[gameMode]}` : 
        `מצב אוטומטי - ${gameModeText[gameMode]}`;
    document.getElementById('currentWord').textContent = pickedWord || '?';
    document.getElementById('currentIndex').textContent = manualWordIndex + 1;
    
    // Update radio button selection
    const currentGameMode = localStorage.getItem('gameMode') || 'test';
    const radioButton = document.querySelector(`input[name="gameMode"][value="${currentGameMode}"]`);
    if (radioButton) {
        radioButton.checked = true;
    }
}

function moveToNextWordFromManager() {
    if (manualMode) {
        moveToNextWord();
        updateManagerStatus();
        openNotification('עברת למילה הבאה');
    } else {
        openNotification('יש להיות במצב ידני');
    }
}

function changeGameMode(mode) {
    console.log('[WORDLE_SYNC] Changing game mode to:', mode);
    
    // Store the selected mode
    localStorage.setItem('gameMode', mode);
    
    // Apply the mode changes
    applyGameMode(mode);
    
    // Update manager status if available
    if (typeof updateManagerStatus === 'function') {
        updateManagerStatus();
    }
    
    openNotification(`עברת למצב: ${getModeConfig(mode).title}`);
}

function getModeConfig(mode) {
    const modeConfigs = {
        'test': {
            favicon: 'wordale-favicon.png',
            title: 'בדיקה',
            wordlistFile: 'wordlist-manual.js',
            wordlistVar: 'manualListOfWords'
        },
        'mayabd': {
            favicon: 'wordale-favicon-mayabd.png',
            title: 'מאיהוורדל',
            wordlistFile: 'wordlist-mayabd.js',
            wordlistVar: 'mayaBdListOfWords'
        },
        'ignite': {
            favicon: 'wordale-favicon-ignite.png',
            title: 'Ignite Wordle',
            wordlistFile: 'wordlist-ignite.js',
            wordlistVar: 'igniteListOfWords'
        }
    };
    
    return modeConfigs[mode] || modeConfigs['test'];
}

function applyGameMode(mode) {
    console.log('[WORDLE_SYNC] Applying game mode:', mode);
    
    const config = getModeConfig(mode);
    
    // Update favicon
    const faviconImg = document.querySelector('img[src*="wordale-favicon"]');
    if (faviconImg) {
        faviconImg.src = config.favicon;
    }
    
    // Update page title and header
    const titleElement = document.querySelector('.title');
    if (titleElement) {
        titleElement.textContent = config.title;
    }
    document.title = `${config.title} - משחק ב-6 ניחושים`;
    
    // Update favicon link in head
    const faviconLink = document.querySelector('link[rel="icon"]');
    if (faviconLink) {
        faviconLink.href = config.favicon;
    }
    
    // Load the appropriate wordlist
    loadWordlistForMode(mode, config);
}

// Make applyGameMode available globally
window.applyGameMode = applyGameMode;

function loadWordlistForMode(mode, config) {
    console.log(`[WORDLE_SYNC] Loading wordlist for mode: ${mode}`);
    
    // For mode-specific wordlists, ensure we're in manual mode
    const shouldEnableManualMode = mode !== 'test' || manualMode;
    
    // Create a script element to load the wordlist
    const existingScript = document.querySelector(`script[src*="wordlist-${mode}"]`);
    if (existingScript) {
        existingScript.remove();
    }
    
    const script = document.createElement('script');
    script.src = config.wordlistFile;
    script.onload = function() {
        console.log(`[WORDLE_SYNC] Wordlist loaded for ${mode}, processing...`);
        
        // After loading, save the wordlist to the appropriate variable
        if (mode === 'test') {
            window.manualListOfWords = listOfWords.slice();
        } else if (mode === 'mayabd') {
            window.mayaBdListOfWords = listOfWords.slice();
            window.manualListOfWords = listOfWords.slice(); // Use as manual list too
        } else if (mode === 'ignite') {
            window.igniteListOfWords = listOfWords.slice();
            window.manualListOfWords = listOfWords.slice(); // Use as manual list too
        }
        
        // Restore main wordlist
        listOfWords = window.mainListOfWords;
        
        console.log(`[WORDLE_SYNC] Loaded ${mode} wordlist, length:`, window.manualListOfWords.length);
        console.log(`[WORDLE_SYNC] First word in ${mode} list:`, window.manualListOfWords[0]);
        
        // For mode-specific wordlists (not daily words), enable manual mode and set the word
        if (shouldEnableManualMode) {
            // Enable manual mode if not already enabled
            if (!manualMode) {
                console.log(`[WORDLE_SYNC] Enabling manual mode for ${mode} wordlist`);
                manualMode = true;
                localStorage.setItem('manualMode', 'true');
                
                // Hide timer in manual mode
                const timerLabel = document.getElementById('timerWithLabel');
                if (timerLabel) timerLabel.style.display = 'none';
            }
            
            // DON'T set pickedWord immediately - wait for Firebase sync
            console.log(`[WORDLE_SYNC] Mode ${mode} wordlist loaded, waiting for Firebase sync before setting word...`);
            
            // NEW APPROACH: First try to get the direct current word from Firebase
            console.log(`[WORDLE_SYNC] ===== FIREBASE SYNC START =====`);
            
            if (window.getSharedCurrentWord) {
                window.getSharedCurrentWord(function(sharedWord) {
                    if (sharedWord && window.manualListOfWords.includes(sharedWord)) {
                        // We have a valid shared word - use it directly
                        pickedWord = sharedWord;
                        manualWordIndex = window.manualListOfWords.indexOf(sharedWord);
                        numOfWordale = manualWordIndex;
                        
                        console.log(`[WORDLE_SYNC] *** WORD FROM FIREBASE *** Using stored word: "${pickedWord}" (index ${manualWordIndex}) for mode ${mode}`);
                        
                        // Update localStorage
                        localStorage.setItem('manualWordIndex', manualWordIndex.toString());
                        localStorage.setItem('currentPickedWord', pickedWord);
                        
                        // Update manager and load data
                        if (typeof updateManagerStatus === 'function') {
                            updateManagerStatus();
                        }
                        
                        setTimeout(() => {
                            console.log(`[WORDLE_SYNC] Loading user data for stored word "${pickedWord}"`);
                            if (!window.hasInitialLoadCompleted) {
                                loadUserData();
                                window.hasInitialLoadCompleted = true;
                            }
                        }, 200);
                        
                    } else {
                        // No valid shared word found - fall back to index-based approach
                        console.log(`[WORDLE_SYNC] No valid shared word found ("${sharedWord}"), falling back to index approach`);
                        
                        if (window.getSharedManualWordIndex) {
                            window.getSharedManualWordIndex(function(sharedIndex) {
                                console.log(`[WORDLE_SYNC] Got shared index ${sharedIndex} for mode ${mode}`);
                                manualWordIndex = Math.max(0, Math.min(sharedIndex, window.manualListOfWords.length - 1));
                                
                                // Set the picked word from the index
                                pickedWord = window.manualListOfWords[manualWordIndex];
                                numOfWordale = manualWordIndex;
                                
                                console.log(`[WORDLE_SYNC] *** WORD FROM INDEX *** pickedWord: "${pickedWord}" (index ${manualWordIndex}) for mode ${mode}`);
                                
                                // Store the word directly in Firebase for future consistency
                                if (window.setSharedCurrentWord) {
                                    window.setSharedCurrentWord(pickedWord);
                                }
                                
                                // Update localStorage
                                localStorage.setItem('manualWordIndex', manualWordIndex.toString());
                                localStorage.setItem('currentPickedWord', pickedWord);
                                
                                // Update manager and load data
                                if (typeof updateManagerStatus === 'function') {
                                    updateManagerStatus();
                                }
                                
                                setTimeout(() => {
                                    console.log(`[WORDLE_SYNC] Loading user data for index-based word "${pickedWord}"`);
                                    if (!window.hasInitialLoadCompleted) {
                                        loadUserData();
                                        window.hasInitialLoadCompleted = true;
                                    }
                                }, 200);
                            });
                        }
                    }
                    console.log(`[WORDLE_SYNC] ===== FIREBASE SYNC END =====`);
                });
            } else {
                console.log(`[WORDLE_SYNC] getSharedCurrentWord not available, falling back to index approach`);
                // Fallback to localStorage only
                const savedWord = localStorage.getItem('currentPickedWord');
                const savedIndex = parseInt(localStorage.getItem('manualWordIndex') || '0');
                if (savedWord && window.manualListOfWords.includes(savedWord)) {
                    pickedWord = savedWord;
                    manualWordIndex = window.manualListOfWords.indexOf(savedWord);
                    numOfWordale = manualWordIndex;
                    console.log(`[WORDLE_SYNC] Using localStorage word: "${pickedWord}"`);
                } else {
                    manualWordIndex = Math.max(0, Math.min(savedIndex, window.manualListOfWords.length - 1));
                    pickedWord = window.manualListOfWords[manualWordIndex];
                    numOfWordale = manualWordIndex;
                    console.log(`[WORDLE_SYNC] Using localStorage index: "${pickedWord}"`);
                }
            }
        }
        }
    };
    
    script.onerror = function() {
        console.error(`[WORDLE_SYNC] Failed to load wordlist: ${config.wordlistFile}`);
    };
    
    document.head.appendChild(script);
}

function switchToAutoMode() {
    // Switch back to automatic mode
    manualMode = false;
    localStorage.setItem('manualMode', 'false');
    
    // Reset to daily word
    pickedWord = pickWord();
    
    // Show timer
    const timerLabel = document.getElementById('timerWithLabel');
    if (timerLabel) timerLabel.style.display = 'flex';
    
    // Reset game state
    resetGameForNewWord();
    
    closeManagerPage();
    openNotification('עברת למצב אוטומטי');
}

function moveToNextWord() {
    console.log('[WORDLE_SYNC] moveToNextWord called');
    if (!manualMode) {
        console.log('[WORDLE_SYNC] Not in manual mode, exiting');
        return;
    }
    
    const manualWordList = window.manualListOfWords || [];
    console.log('[WORDLE_SYNC] Manual word list length:', manualWordList.length);
    if (manualWordList.length === 0) {
        console.log('[WORDLE_SYNC] Manual word list is empty');
        openNotification('רשימת המילים הידנית לא נטענה');
        return;
    }
    
    let newIndex = manualWordIndex + 1;
    // Cycle back to the first word when reaching the end
    if (newIndex >= manualWordList.length) {
        newIndex = 0;
    }
    
    console.log('[WORDLE_SYNC] Moving from word index', manualWordIndex, 'to', newIndex);
    
    // Update the shared word index in Firebase (this will trigger updates for all users)
    if (window.setSharedManualWordIndex) {
        console.log('[WORDLE_SYNC] Calling setSharedManualWordIndex with:', newIndex);
        window.setSharedManualWordIndex(newIndex);
        
        // CRITICAL: Also store the actual word directly for consistency
        const newWord = manualWordList[newIndex];
        console.log('[WORDLE_SYNC] Storing current word in Firebase:', newWord);
        if (window.setSharedCurrentWord) {
            window.setSharedCurrentWord(newWord);
        }
        
        // The listener will handle updating the local state when Firebase updates
        // But we also update locally immediately for this user
        manualWordIndex = newIndex;
        pickedWord = newWord;
        numOfWordale = manualWordIndex;
        
        // Store in localStorage for consistency
        localStorage.setItem('manualWordIndex', manualWordIndex.toString());
        localStorage.setItem('currentPickedWord', pickedWord);
        
        // Reset all game state (like a new day)
        win = false;
        endOfGameToday = false;
        rowCount = 1;
        wordCount = 0;
        currentWord = '';
        answersColors = [];
        answersLetters = [];
        
        // Reset the UI (clear tiles, keyboard, etc.)
        resetGameForNewWord();
        
        if (newIndex === 0) {
            openNotification('חזרה למילה הראשונה');
        } else {
            openNotification(`מילה ${manualWordIndex + 1} מתוך ${manualWordList.length}`);
        }
    } else {
        // Fallback if Firebase not available
        manualWordIndex = newIndex;
        localStorage.setItem('manualWordIndex', manualWordIndex.toString());
        pickedWord = manualWordList[manualWordIndex];
        numOfWordale = manualWordIndex;
        resetGameForNewWord();
        openNotification(`מילה ${manualWordIndex + 1} מתוך ${manualWordList.length}`);
    }
}

//loadUserData();

// Verification check - compare stored word with what should be the current word
console.log('[WORDLE_SYNC] ===== PAGE LOAD VERIFICATION =====');
console.log('[WORDLE_SYNC] manualMode:', manualMode);
console.log('[WORDLE_SYNC] currentPickedWord from localStorage:', localStorage.getItem('currentPickedWord'));
console.log('[WORDLE_SYNC] manualWordIndex from localStorage:', localStorage.getItem('manualWordIndex'));
console.log('[WORDLE_SYNC] gameMode from localStorage:', localStorage.getItem('gameMode'));
console.log('[WORDLE_SYNC] Current pickedWord variable:', pickedWord);
console.log('[WORDLE_SYNC] ===== END VERIFICATION =====');

// Check if there's a pending game mode to apply (from page load)
if (window.pendingGameMode) {
    console.log('[WORDLE_SYNC] Applying pending game mode:', window.pendingGameMode);
    // Flag should already be set by index.html initialization
    console.log('[WORDLE_SYNC] skipInitialFirebaseSync flag:', window.skipInitialFirebaseSync);
    setTimeout(() => {
        applyGameMode(window.pendingGameMode);
        window.pendingGameMode = null; // Clear the pending mode
    }, 500); // Small delay to ensure DOM is ready
}

document.addEventListener("visibilitychange",function(){
//document.getElementById(`tile${rowCount}1`)
if(currentWord==='' && document.visibilityState === 'hidden'){
location.reload();
}
});
const englishKeyboardToHebrew = {
a:'ש',
b:'נ',
c:'ב',
d:'ג',
e:'ק',
f:'כ',
g:'ע',
h:'י',
i:'נ',
j:'ח',
k:'ל',
m:'צ',
n:'מ',
p:'פ',
r:'ר',
s:'ד',
t:'א',
u:'ו',
v:'ה',
x:'ס',
y:'ט',
z:'ז',
',':'ת',
'.':'ץ',
';':'ף',
'l':'ך',
o:'מ',
}
const hebrewLetters = 'אבגדהוזחטיכלמנסעפצקרשתםןץףך';
const suffixLetterToMiddleLetter = {
'ם':'מ',
'ן':'נ',
'ץ':'צ',
'ף':'פ',
'ך':'כ',
}
window.addEventListener('keydown', function (e) {

if (e.key === 'Enter') {
    // Don't trigger sendWord if Enter is pressed on a button
    if (e.target.tagName === 'BUTTON' || document.activeElement.tagName === 'BUTTON') {
        e.preventDefault();
        e.stopPropagation();
        return; // Don't trigger anything
    }
    // Don't trigger sendWord if we're in an input field (like password prompt)
    if (e.target.tagName === 'INPUT' || document.activeElement.tagName === 'INPUT') {
        return;
    }
    // Otherwise, send the word
    e.preventDefault();
    sendWord();
}
if (e.key === 'Backspace') {
    eraseLetter();
}
if (hebrewLetters.includes(e.key)) {
    clickLetter(suffixLetterToMiddleLetter[e.key] || e.key);
}
const hebrewWordFromEnglish = englishKeyboardToHebrew[e.key.toLowerCase()];
if (hebrewLetters.includes(hebrewWordFromEnglish)) {
    clickLetter(suffixLetterToMiddleLetter[hebrewWordFromEnglish] || hebrewWordFromEnglish);
}
});

function openInstructions() {
document.getElementById('instructions').style.display = 'block';
}

function closeInstructions() {
document.getElementById('instructions').style.display = 'none';
}

// Ensure all functions are available globally (functions are hoisted, but ensure they're on window)
if (typeof sendWord === 'function') window.sendWord = sendWord;
if (typeof eraseLetter === 'function') window.eraseLetter = eraseLetter;
if (typeof eraseWord === 'function') window.eraseWord = eraseWord;
