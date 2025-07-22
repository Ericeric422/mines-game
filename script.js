// Game Configuration
const ROWS = 5;
const COLS = 5;
const DEFAULT_MINE_COUNT = 3;
const DEFAULT_BET = 1;

// Game State
let balance = 100;
let currentBet = DEFAULT_BET;
let mineCount = DEFAULT_MINE_COUNT;
let potentialWin = 0;
let revealedCount = 0;
let gameActive = false;
let gameEnding = false;
let mines = [];
let gameHistory = [];

// DOM Elements
const gameContainer = document.getElementById('game-container');
const balanceDisplay = document.getElementById('balance');
const currentBetDisplay = document.getElementById('current-bet');
const potentialWinDisplay = document.getElementById('potential-win');
const multiplierDisplay = document.getElementById('multiplier');
const startGameBtn = document.getElementById('start-game');
const cashOutBtn = document.getElementById('cash-out');
const betAmountInput = document.getElementById('bet-amount');
const minesCountInput = document.getElementById('mines-count');
const allInBtn = document.getElementById('all-in');
const historyList = document.getElementById('history-list');
const resetBalanceBtn = document.getElementById('reset-balance');

// Initialize the game
function init() {
    // Set initial values
    betAmountInput.value = DEFAULT_BET;
    minesCountInput.value = DEFAULT_MINE_COUNT;
    
    // Add event listeners
    betAmountInput.addEventListener('change', updateBetAmount);
    minesCountInput.addEventListener('change', updateMineCount);
    allInBtn.addEventListener('click', setAllIn);
    
    // Make sure inputs are enabled initially
    betAmountInput.disabled = false;
    minesCountInput.disabled = false;
    allInBtn.disabled = false;
    startGameBtn.disabled = false;
    resetBalanceBtn.disabled = false;
    
    // Create empty grid without starting game
    createEmptyGrid();
}

// Update bet amount
function updateBetAmount() {
    const newBet = parseInt(betAmountInput.value);
    if (newBet >= 1 && newBet <= 1000) {
        currentBet = newBet;
        currentBetDisplay.textContent = `$${currentBet}`;
        updateDisplay(); // Update display to show new potential win
    } else {
        betAmountInput.value = currentBet;
    }
}

// Update mine count
function updateMineCount() {
    const newMineCount = parseInt(minesCountInput.value);
    if (newMineCount >= 1 && newMineCount <= 24) {
        mineCount = newMineCount;
        updateDisplay(); // Update display to show new multiplier
    } else {
        minesCountInput.value = mineCount;
    }
}

// Set bet to all in (current balance)
function setAllIn() {
    currentBet = balance;
    betAmountInput.value = balance;
    currentBetDisplay.textContent = `$${currentBet}`;
}

// Initialize a new game
function initGame() {
    if (balance < currentBet) {
        showNotification("Not enough balance to place this bet!", "error");
        return;
    }
    
    balance -= currentBet;
    revealedCount = 0;
    gameActive = true;
    gameEnding = false;
    mines = [];
    updateDisplay(); // Update display after resetting revealedCount
    
    // Hide instruction
    const instruction = document.getElementById('game-instruction');
    if (instruction) {
        instruction.style.display = 'none';
    }
    
    // Create game grid with mines
    createGrid();
    
    // Enable/disable controls
    startGameBtn.disabled = true;
    cashOutBtn.disabled = true;
    betAmountInput.disabled = true;
    minesCountInput.disabled = true;
    allInBtn.disabled = true;
    resetBalanceBtn.disabled = true;
}

// Create empty grid without starting game
function createEmptyGrid() {
    gameContainer.innerHTML = '';
    gameContainer.classList.remove('game-active');
    
    // Show instruction
    const instruction = document.getElementById('game-instruction');
    if (instruction) {
        instruction.style.display = 'block';
    }
    
    createGridCells();
}

// Create the game grid and start the game
function createGrid() {
    // Clear previous grid
    gameContainer.innerHTML = '';
    gameContainer.classList.add('game-active');
    
    // Generate mines
    while (mines.length < mineCount) {
        const pos = Math.floor(Math.random() * ROWS * COLS);
        if (!mines.includes(pos)) {
            mines.push(pos);
        }
    }
    
    createGridCells();
}

// Create grid cells (shared between empty and active grids)
function createGridCells() {
    for (let i = 0; i < ROWS; i++) {
        const row = document.createElement('div');
        row.className = 'row';
        
        for (let j = 0; j < COLS; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            const index = i * COLS + j;
            
            // Ensure pointer events are enabled
            cell.style.pointerEvents = 'auto';
            cell.addEventListener('click', () => handleCellClick(cell, index));
            row.appendChild(cell);
        }
        
        gameContainer.appendChild(row);
    }
}

// Handle cell clicks
function handleCellClick(cell, index) {
    if (!gameActive || cell.classList.contains('revealed')) return;
    
    if (mines.includes(index)) {
        // Hit a mine - immediately disable ALL cell clicks permanently
        gameActive = false;
        gameEnding = true;
        
        // Remove ALL click event listeners from ALL cells
        const allCells = document.querySelectorAll('.cell');
        allCells.forEach(cell => {
            cell.style.pointerEvents = 'none';
            cell.style.cursor = 'default';
        });
        
        cell.classList.add('mine');
        cell.textContent = '💣';
        cell.style.animation = 'shake 0.5s ease-in-out';
        
        setTimeout(() => {
            revealAllMines();
            gameOver(false);
        }, 500);
    } else {
        // Safe cell
        cell.classList.add('revealed');
        cell.textContent = '💎';
        revealedCount++;
        
        // Add reveal animation
        cell.style.animation = 'reveal 0.3s ease-out';
        
        // Calculate multiplier based on mine count and revealed cells
        const multiplier = calculateMultiplier();
        potentialWin = Math.floor(currentBet * multiplier);
        updateDisplay();
        
        // Disable this cell
        cell.style.cursor = 'default';
        cell.onclick = null;
        
        // Enable cash out after first reveal
        if (revealedCount === 1) {
            cashOutBtn.disabled = false;
        }
    }
}

// Calculate multiplier based on mine count and revealed cells
function calculateMultiplier() {
    const totalCells = ROWS * COLS;
    const safeCells = totalCells - mineCount;
    
    if (revealedCount === 0) {
        return 1;
    }
    
    // Calculate probability of revealing x tiles without hitting a mine
    // P(success) = C(safe_cells, x) / C(total_cells, x)
    const probability = combination(safeCells, revealedCount) / combination(totalCells, revealedCount);
    
    // Multiplier is the inverse of this probability
    const multiplier = 1 / probability;
    
    return Math.max(1, multiplier);
}

// Calculate combination (n choose k)
function combination(n, k) {
    if (k > n) return 0;
    if (k === 0 || k === n) return 1;
    
    // Use a more efficient calculation to avoid overflow
    let result = 1;
    for (let i = 0; i < k; i++) {
        result = result * (n - i) / (i + 1);
    }
    return result;
}

// Reveal all mines when game ends
function revealAllMines() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
        if (mines.includes(index) && !cell.classList.contains('mine')) {
            cell.classList.add('mine');
            cell.textContent = '💣';
        }
    });
}

// End the game
function gameOver(win) {
    gameActive = false;
    
    // Re-enable controls
    startGameBtn.disabled = false;
    betAmountInput.disabled = false;
    minesCountInput.disabled = false;
    allInBtn.disabled = false;
    resetBalanceBtn.disabled = false;
    
    if (win) {
        balance += potentialWin;
        showNotification(`You won $${potentialWin}!`, "success");
        addToHistory(true, potentialWin);
    } else {
        potentialWin = 0;
        showNotification('You hit a mine! You lost your bet.', "error");
        addToHistory(false, currentBet);
    }
    
    // Disable cash out button (same as before game starts)
    cashOutBtn.disabled = true;
    updateDisplay();
}

// Add game result to history
function addToHistory(won, amount) {
    const historyItem = {
        won: won,
        amount: amount,
        timestamp: new Date(),
        bet: currentBet,
        mines: mineCount,
        revealed: revealedCount
    };
    
    gameHistory.unshift(historyItem);
    
    // Keep only last 10 games
    if (gameHistory.length > 10) {
        gameHistory.pop();
    }
    
    updateHistoryDisplay();
}

// Update history display
function updateHistoryDisplay() {
    historyList.innerHTML = '';
    
    gameHistory.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = `history-item ${item.won ? 'win' : 'loss'}`;
        
        const time = item.timestamp.toLocaleTimeString();
        const result = item.won ? 'Won' : 'Lost';
        const amount = item.won ? `+$${item.amount}` : `-$${item.amount}`;
        
        historyItem.innerHTML = `
            <strong>${result} ${amount}</strong> | 
            Bet: $${item.bet} | 
            Mines: ${item.mines} | 
            Revealed: ${item.revealed} | 
            ${time}
        `;
        
        historyList.appendChild(historyItem);
    });
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        max-width: 300px;
    `;
    
    // Set background color based on type
    switch(type) {
        case 'success':
            notification.style.background = 'linear-gradient(145deg, #28a745, #20c997)';
            break;
        case 'error':
            notification.style.background = 'linear-gradient(145deg, #dc3545, #c82333)';
            break;
        default:
            notification.style.background = 'linear-gradient(145deg, #007bff, #0056b3)';
    }
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Update the display
function updateDisplay() {
    balanceDisplay.textContent = `$${balance}`;
    currentBetDisplay.textContent = `$${currentBet}`;
    
    // Calculate and display current multiplier
    const multiplier = calculateMultiplier();
    multiplierDisplay.textContent = `(${multiplier.toFixed(2)}x)`;
    
    potentialWinDisplay.textContent = `$${potentialWin}`;
}

// Add CSS animations
function addAnimations() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes reveal {
            0% { transform: scale(0.8); opacity: 0.5; }
            100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Event Listeners
startGameBtn.addEventListener('click', () => {
    if (!gameActive) {
        initGame();
    }
});

cashOutBtn.addEventListener('click', () => {
    if (gameActive && revealedCount > 0) {
        gameOver(true);
    }
});

// Initialize the game when page loads
document.addEventListener('DOMContentLoaded', () => {
    addAnimations();
    init();
    resetBalanceBtn.addEventListener('click', () => {
        balance = 100;
        updateDisplay();
        showNotification('Balance reset to $100.', 'info');
    });
});