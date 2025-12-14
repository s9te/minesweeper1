document.addEventListener('DOMContentLoaded', () => {
    // === КОНСТАНТЫ И СОСТОЯНИЕ ИГРЫ ===
    const boardElement = document.getElementById('board');
    const resetButton = document.getElementById('reset-button');
    const faceIcon = document.getElementById('face-icon');
    const minesCountDisplay = document.getElementById('mines-count');
    const timerDisplay = document.getElementById('timer-count');

    // Параметры "Эксперт" (для имитации XP)
    const ROWS = 16;
    const COLS = 16;
    const MINES = 40;

    let board = [];
    let isGameOver = false;
    let isGameStarted = false;
    let timerInterval = null;
    let timer = 0;
    let flagsPlaced = 0;
    let revealedCells = 0;

    // === ИКОНКИ (пути к изображениям) ===
    const ICON_PATHS = {
        SMILE: 'images/face_smile.png',
        OH: 'images/face_oh.png',
        WIN: 'images/face_win.png',
        LOSE: 'images/face_lose.png',
        FLAG: 'images/flag.png',
        BOMB: 'images/bomb.png'
    };
    
    // === ГЛАВНЫЕ ФУНКЦИИ УПРАВЛЕНИЯ ===

    function initializeGame() {
        // Сброс состояния
        isGameOver = false;
        isGameStarted = false;
        timer = 0;
        flagsPlaced = 0;
        revealedCells = 0;
        
        // Сброс счетчиков
        faceIcon.src = ICON_PATHS.SMILE;
        minesCountDisplay.textContent = String(MINES).padStart(3, '0');
        timerDisplay.textContent = '000';
        clearInterval(timerInterval);

        // Установка стилей для доски
        boardElement.style.gridTemplateColumns = `repeat(${COLS}, 23px)`;
        boardElement.innerHTML = '';
        board = []; 
        
        // Создание пустой доски (0 - нет бомбы, -1 - бомба)
        for (let r = 0; r < ROWS; r++) {
            board[r] = [];
            for (let c = 0; c < COLS; c++) {
                board[r][c] = {
                    value: 0, // 0-8: мины вокруг, -1: бомба
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    element: createCellElement(r, c)
                };
                boardElement.appendChild(board[r][c].element);
            }
        }
    }

    function placeMines(startR, startC) {
        let minesPlaced = 0;
        const totalCells = ROWS * COLS;
        
        // Создание списка всех позиций
        let allPositions = [];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                allPositions.push({ r, c });
            }
        }
        
        // Удаляем стартовую позицию и соседей из кандидатов для мин
        const safePositions = new Set();
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (startR + dr >= 0 && startR + dr < ROWS && startC + dc >= 0 && startC + dc < COLS) {
                    safePositions.add(`${startR + dr},${startC + dc}`);
                }
            }
        }
        
        let minePositions = [];
        
        // Рандомизация позиций мин
        while (minesPlaced < MINES) {
            let randomIndex = Math.floor(Math.random() * allPositions.length);
            let { r, c } = allPositions[randomIndex];
            
            if (!safePositions.has(`${r},${c}`)) {
                board[r][c].value = -1;
                board[r][c].isMine = true;
                minePositions.push({r, c});
                minesPlaced++;
            }
            // Удаляем, чтобы избежать повторного выбора
            allPositions.splice(randomIndex, 1);
        }

        // Вычисляем числа (мины вокруг)
        for (let { r, c } of minePositions) {
            updateNeighborCounts(r, c);
        }
        
        // Запускаем игру после размещения мин
        isGameStarted = true;
        timerInterval = setInterval(updateTimer, 1000);
        
        // Открываем первую ячейку
        revealCell(startR, startC);
    }
    
    function updateNeighborCounts(mineR, mineC) {
        for (let r = mineR - 1; r <= mineR + 1; r++) {
            for (let c = mineC - 1; c <= mineC + 1; c++) {
                if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
                    // Если это не мина, увеличиваем счетчик
                    if (!board[r][c].isMine) {
                        board[r][c].value += 1;
                    }
                }
            }
        }
    }

    // === ОБРАБОТЧИКИ СОБЫТИЙ МЫШИ ===

    function handleLeftClick(r, c) {
        if (isGameOver || board[r][c].isRevealed || board[r][c].isFlagged) return;

        // Если это первый клик, размещаем мины
        if (!isGameStarted) {
            placeMines(r, c);
            return;
        }

        // Если клик по мине -> GAME OVER
        if (board[r][c].isMine) {
            gameOver(r, c);
            return;
        }
        
        // Открываем ячейку
        revealCell(r, c);
        checkWin();
    }
    
    function handleRightClick(r, c, event) {
        event.preventDefault();
        if (isGameOver || board[r][c].isRevealed) return;

        const cell = board[r][c];

        if (cell.isFlagged) {
            // Удаляем флаг
            cell.isFlagged = false;
            cell.element.innerHTML = '';
            flagsPlaced--;
        } else if (flagsPlaced < MINES) {
            // Ставим флаг
            cell.isFlagged = true;
            cell.element.innerHTML = `<img src="${ICON_PATHS.FLAG}" alt="Flag">`;
            flagsPlaced++;
        }
        
        minesCountDisplay.textContent = String(MINES - flagsPlaced).padStart(3, '0');
        checkWin();
    }

    function handleMiddleClick(r, c, event) {
        event.preventDefault();
        if (isGameOver || !board[r][c].isRevealed || board[r][c].value === 0 || board[r][c].isMine) return;

        let adjacentFlags = 0;
        let unrevealedNeighbors = [];

        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                
                const nr = r + dr;
                const nc = c + dc;
                
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                    const neighbor = board[nr][nc];
                    if (neighbor.isFlagged) {
                        adjacentFlags++;
                    }
                    if (!neighbor.isRevealed && !neighbor.isFlagged) {
                        unrevealedNeighbors.push({ r: nr, c: nc });
                    }
                }
            }
        }
        
        // Если количество флагов совпадает с числом в ячейке, открываем неоткрытых соседей
        if (adjacentFlags === board[r][c].value) {
            for (let { r: nr, c: nc } of unrevealedNeighbors) {
                if (board[nr][nc].isMine) {
                    gameOver(nr, nc); // Неправильно поставлен флаг, клик по мине
                    return;
                }
                revealCell(nr, nc);
            }
            checkWin();
        }
    }

    // === ЛОГИКА ОТКРЫТИЯ ЯЧЕЕК ===

    function revealCell(r, c) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c].isRevealed || board[r][c].isFlagged) {
            return;
        }

        const cell = board[r][c];
        cell.isRevealed = true;
        cell.element.classList.add('revealed');
        cell.element.removeAttribute('style'); // Убираем стили закрытой ячейки
        revealedCells++;

        if (cell.value > 0) {
            // Это число
            cell.element.textContent = cell.value;
            cell.element.setAttribute('data-value', cell.value);
        } else if (cell.value === 0) {
            // Это пустое место, рекурсивно открываем соседей
            cell.element.textContent = '';
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr !== 0 || dc !== 0) {
                        revealCell(r + dr, c + dc);
                    }
                }
            }
        }
    }
    
    // === ЛОГИКА КОНЦА ИГРЫ ===

    function checkWin() {
        // Условие победы: все не-мины открыты
        if (revealedCells === ROWS * COLS - MINES) {
            isGameOver = true;
            clearInterval(timerInterval);
            faceIcon.src = ICON_PATHS.WIN;
            
            // Ставим флаги на все оставшиеся мины
            board.forEach(row => row.forEach(cell => {
                if (cell.isMine && !cell.isFlagged) {
                    cell.element.innerHTML = `<img src="${ICON_PATHS.FLAG}" alt="Flag">`;
                    cell.isFlagged = true;
                    flagsPlaced++;
                }
            }));
            minesCountDisplay.textContent = '000'; 
            alert(`You Win! Time: ${timer}s`);
        }
    }

    function gameOver(hitR, hitC) {
        isGameOver = true;
        clearInterval(timerInterval);
        faceIcon.src = ICON_PATHS.LOSE;

        board.forEach(row => row.forEach(cell => {
            if (cell.isMine) {
                // Показываем все мины
                cell.element.classList.add('revealed');
                cell.element.innerHTML = `<img src="${ICON_PATHS.BOMB}" alt="Bomb">`;
            }
            if (cell.isFlagged && !cell.isMine) {
                // Неправильно поставленный флаг
                cell.element.innerHTML = 'X'; 
                cell.element.style.backgroundColor = 'red';
            }
        }));

        // Отмечаем взорвавшуюся мину
        board[hitR][hitC].element.style.backgroundColor = 'red';
    }
    
    // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

    function createCellElement(r, c) {
        const cellElement = document.createElement('div');
        cellElement.className = 'cell';
        cellElement.dataset.row = r;
        cellElement.dataset.col = c;
        
        // Нажатие на ячейку (для временной смены иконки лица)
        cellElement.addEventListener('mousedown', () => {
             if (!isGameOver && !board[r][c].isRevealed) {
                faceIcon.src = ICON_PATHS.OH;
             }
        });
        cellElement.addEventListener('mouseup', () => {
             if (!isGameOver) {
                faceIcon.src = ICON_PATHS.SMILE;
             }
        });

        // Левый клик (открытие)
        cellElement.addEventListener('click', () => handleLeftClick(r, c));
        
        // Правый клик (флаг)
        cellElement.addEventListener('contextmenu', (e) => handleRightClick(r, c, e));
        
        // Средний клик (открытие соседей)
        cellElement.addEventListener('auxclick', (e) => {
             if (e.button === 1) { // Кнопка 1 = средняя кнопка мыши
                handleMiddleClick(r, c, e);
             }
        });
        
        return cellElement;
    }

    function updateTimer() {
        if (timer < 999) {
            timer++;
            timerDisplay.textContent = String(timer).padStart(3, '0');
        } else {
            clearInterval(timerInterval);
        }
    }

    // === ИНИЦИАЛИЗАЦИЯ ===
    resetButton.addEventListener('click', initializeGame);
    initializeGame();
});