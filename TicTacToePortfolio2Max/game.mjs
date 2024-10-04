import { print, askQuestion } from "./io.mjs"
import { debug, DEBUG_LEVELS } from "./debug.mjs";
import { ANSI } from "./ansi.mjs";
import DICTIONARY from "./language.mjs";
import showSplashScreen from "./splash.mjs";
import fs from 'fs';

const GAME_BOARD_SIZE = 3;
const PLAYER_1 = 1;
const PLAYER_2 = -1;
const PLAYER_1_NUMBER = 1;
const PLAYER_2_NUMBER = 2;
const NO_PLAYER = 0;
const NO_CHOICE = -1;
const LANGUAGE_CHANGED = "Language changed successfully.";
const INVALID_LANGUAGE = "Invalid language choice. Language remains unchanged.";
const ENTER_TO_CONTINUE = "Press enter to continue...";
const WAIT_RESPONSE = "";

const MENU_CHOICES = {
    MENU_CHOICE_START_GAME: 1,
    MENU_CHOICE_SHOW_SETTINGS: 2,
    MENU_CHOICE_EXIT_GAME: 3
};

const GAME_MODES = {
    PLAYER_VS_PLAYER: 1,
    PLAYER_VS_COMPUTER: 2
};

const GAME_OUTCOMES = {
    DRAW: 0.5,
    PLAYER_1_WIN: 1,
    PLAYER_2_WIN: -1,
    IN_PROGRESS: 0
};

const LANGUAGE_PREFERENCES = {
    ENGLISH: 'en',
    NORWEGIAN: 'no' 
};

const FILE_PATHS = {
    LANGUAGE_PREFERENCE: 'language_preference.json'
}

const BOARD_MARKS = {
    EMPTY: ' ',
    PLAYER_1: 'X',
    PLAYER_2: 'O'
};

const BOARD_COLORS = {
    PLAYER_1: ANSI.COLOR.RED,
    PLAYER_2: ANSI.COLOR.BLUE
};

const GAME_DELAY = {
    SPLASH_SCREEN: 2500,
    COMPUTER_MOVE: 1000
};

const WINNING_SUM = 3;
const MOVE_INDICES = {
    ROW: 0,
    COLUMN: 1
};

let language = loadLanguagePreference();
let gameBoard;
let currentPlayer;

clearScreen();
showCenteredSplashScreen();
setTimeout(start, GAME_DELAY.SPLASH_SCREEN);

async function start() {

    do {
        let chosenAction = NO_CHOICE;
        chosenAction = await showMenu();

        if (chosenAction == MENU_CHOICES.MENU_CHOICE_START_GAME) {
            await runGame();
        } else if (chosenAction == MENU_CHOICES.MENU_CHOICE_SHOW_SETTINGS) {
            await showSettings();
        } else if (chosenAction == MENU_CHOICES.MENU_CHOICE_EXIT_GAME) {
            clearScreen();
            process.exit();
        }

    } while (true)
}

function showCenteredSplashScreen() {
    const art = showSplashScreen();
    const lines = art.split('\n');
    const terminalWidth = process.stdout.columns || 80;

    lines.forEach(line => {
        const padding = Math.max(0, Math.floor((terminalWidth - line.length) / 2));
        console.log(' '.repeat(padding) + line);
    });
}

async function showMenu() {

    let choice = -1;
    let validChoice = false;

    while (!validChoice) {
        clearScreen();
        print(ANSI.COLOR.YELLOW + language.MENU_TITLE + ANSI.RESET);
        print(language.MENU_PLAY_GAME);
        print(language.MENU_SETTINGS);
        print(language.MENU_EXIT_GAME);

        choice = await askQuestion(WAIT_RESPONSE);

        if ([MENU_CHOICES.MENU_CHOICE_START_GAME, MENU_CHOICES.MENU_CHOICE_SHOW_SETTINGS, MENU_CHOICES.MENU_CHOICE_EXIT_GAME].includes(Number(choice))) {
            validChoice = true;
        }
    }

    return choice;
}

async function selectGameMode() {
    let choice = -1;
    let validChoice = false;

    while (!validChoice) {
        clearScreen();
        print(ANSI.COLOR.YELLOW + language.GAME_MODE_SELECTION + ANSI.RESET);
        print(language.PLAYER_VS_PLAYER);
        print(language.PLAYER_VS_COMPUTER);

        choice = await askQuestion(WAIT_RESPONSE);

        if ([GAME_MODES.PLAYER_VS_PLAYER, GAME_MODES.PLAYER_VS_COMPUTER].includes(Number(choice))) {
            validChoice = true;
        }
    }

    return Number(choice);
}

async function showSettings() {
    clearScreen();
    print(ANSI.COLOR.YELLOW + language.SETTINGS_TITLE + ANSI.RESET);
    print(language.SETTINGS_LANGUAGE);
    print(language.SETTINGS_BACK);

    let choice = await askQuestion(WAIT_RESPONSE);

    if (choice === MENU_CHOICES.MENU_CHOICE_START_GAME) {
        await changeLanguage();
    }
}

function loadLanguagePreference() {
    try {
        const data = fs.readFileSync(FILE_PATHS.LANGUAGE_PREFERENCE, 'utf8');
        const preference = JSON.parse(data);
        return DICTIONARY[preference.language] || DICTIONARY.en;
    } catch (error) {
        return DICTIONARY.en;
    }
}

async function changeLanguage() {
    let newLang = await askQuestion(language.LANGUAGE_CHOICE);
    if (newLang.toLowerCase() === LANGUAGE_PREFERENCES.ENGLISH || newLang.toLowerCase() === LANGUAGE_PREFERENCES.NORWEGIAN) {
        language = DICTIONARY[newLang.toLowerCase()];
        fs.writeFileSync(FILE_PATHS.LANGUAGE_PREFERENCE, JSON.stringify({ language: newLang.toLowerCase() }));
        print(LANGUAGE_CHANGED);
    } else {
        print(INVALID_LANGUAGE);
    }
    await askQuestion(ENTER_TO_CONTINUE);
}

async function runGame() {
    let isPlaying = true;

    while (isPlaying) {
        initializeGame();
        let gameMode = await selectGameMode();
        isPlaying = await playGame(gameMode);
    }
}

async function playGame(gameMode) {
    let outcome;
    do {
        clearScreen();
        showGameBoardWithCurrentState();
        showHUD();

        let move
        if (gameMode === GAME_MODES.PLAYER_VS_COMPUTER && currentPlayer === PLAYER_2) {
            print(language.COMPUTER_TURN);
            await new Promise(resolve => setTimeout(resolve, 1000));
            move = getComputerMove();
        } else {
            move = await getGameMoveFromCurrentPlayer();
        }

        updateGameBoardState(move);
        outcome = evaluateGameState();
        if (outcome !== 0) break;
        changeCurrentPlayer();
    } while (true)

    showGameSummary(outcome);

    return await askWantToPlayAgain();
}

function getComputerMove() {
    const result = minimax(gameBoard, currentPlayer, 0);
    const move = result.row !== undefined ? result : result.move;
    return [(move.row + 1).toString(), (move.col + 1).toString()];
}

function minimax(board, player, depth) {
    if (checkWin(board, PLAYER_1)) return { score: -10 + depth};
    if (checkWin(board, PLAYER_2)) return { score: 10 - depth};
    if (isBoardFull(board)) return { score: 0};

    const moves = [];
    for (let i = 0; i < GAME_BOARD_SIZE; i++) {
        for (let j = 0; j < GAME_BOARD_SIZE; j++) {
            if (board[i][j] === 0) {
                const move = { row: i, col: j }
                board[i][j] = player;
                const result = minimax(board, -player, depth + 1);
                move.score = result.score;
                board[i][j] = 0;
                moves.push(move);
            }
        }
    }

    if (moves.length === 0) {
        return { score: 0 };
    }

    let bestMove;
    if (player === PLAYER_2) {
        let bestScore = -Infinity;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].score > bestScore) {
                bestScore = moves[i].score;
                bestMove = i;
            }
        }
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < moves.length; i++) {
            if (moves[i].score < bestScore) {
                bestScore = moves[i].score;
                bestMove = i;
            }
        }
    }

    return moves[bestMove];
}

function checkWin(board, player) {
    for (let i = 0; i < GAME_BOARD_SIZE; i++) {
        if (board[i][0] === player && board[i][1] === player && board[i][2] === player) return true;
        if (board[0][i] === player && board[1][i] === player && board[2][i] === player) return true;
    }
    if (board[0][0] === player && board[1][1] === player && board[2][2] === player) return true;
    if (board[0][2] === player && board[1][1] === player && board[2][0] === player) return true;
    return false;
}

function isBoardFull(board) {
    return board.every(row => row.every(cell => cell !== 0));
}

async function askWantToPlayAgain() {
    let answer = await askQuestion(language.PLAY_AGAIN_QUESTION);
    let playAgain = true;
    if (answer && answer.toLowerCase()[0] != language.CONFIRM) {
        playAgain = false;
    }
    return playAgain;
}

function showGameSummary(outcome) {
    clearScreen();

    if (outcome === GAME_OUTCOMES.DRAW) {
        print(language.DRAW);
    } else {
        print(`${language.WINNER} ${outcome === PLAYER_1 ? '1' : '2'}!`);
    }

    showGameBoardWithCurrentState();
}

function changeCurrentPlayer() {
    currentPlayer *= -1;
}

function evaluateGameState() {
    let state = GAME_OUTCOMES.IN_PROGRESS;

    for (let i = 0; i < GAME_BOARD_SIZE; i++) {
        let rowSum = 0;
        let colSum = 0;
        for (let j = 0; j < GAME_BOARD_SIZE; j++) {
            rowSum += gameBoard[i][j];
            colSum += gameBoard[j][i];
        }
        if (Math.abs(rowSum) === WINNING_SUM) state = rowSum;
        if (Math.abs(colSum) === WINNING_SUM) state = colSum;
    }

    let diag1Sum = gameBoard[0][0] + gameBoard[1][1] + gameBoard[2][2];
    let diag2Sum = gameBoard[0][2] + gameBoard[1][1] + gameBoard[2][0];
    if (Math.abs(diag1Sum) === WINNING_SUM) state = diag1Sum;
    if (Math.abs(diag2Sum) === WINNING_SUM) state = diag2Sum;
    let isDraw = gameBoard.every(row => row.every(cell => cell !== NO_PLAYER));
    if (state === GAME_OUTCOMES.IN_PROGRESS && isDraw) {
        return GAME_OUTCOMES.DRAW;
    }

    return state;
}

function updateGameBoardState(move) {
    let row, col;

    if (Array.isArray(move)) {
        row = parseInt(move[MOVE_INDICES.ROW]) - 1;
        col = parseInt(move[MOVE_INDICES.COLUMN]) - 1;
    } else if (typeof move === 'object') {
        row = move.row;
        col = move.col;
    } else {
        console.log('Invalid move format');
        return;
    }
    
    if (row >= 0 && row < GAME_BOARD_SIZE && col >= 0 && col < GAME_BOARD_SIZE) {
        gameBoard[row][col] = currentPlayer;
    } else {
        console.log(`Invalid move: row ${row + 1}, col ${col + 1}`);
    }
}

async function getGameMoveFromCurrentPlayer() {
    let position = null;
    do {
        let rawInput = await askQuestion(language.PLACE_MARK);
        position = rawInput.split(" ");
    } while (!isValidPositionOnBoard(position))

    return position
}

function isValidPositionOnBoard(position) {

    if (position.length < 2) {
        return false;
    }

    let row = parseInt(position[0]) - 1;
    let col = parseInt(position[1]) - 1;

    if (isNaN(row) || isNaN(col)) {
        return false;
    }
    
    if (row < 0 || row >= GAME_BOARD_SIZE || col < 0 || col >= GAME_BOARD_SIZE) {
        return false;
    }
    
    if (gameBoard[row][col] !== 0) {
        return false;
    }

    return true;
}

function showHUD() {
    let playerDescription = currentPlayer === PLAYER_1 ? PLAYER_1_NUMBER : PLAYER_2_NUMBER;
    print(language.PLAYER_TURN.replace("{0}", playerDescription));
}

function showGameBoardWithCurrentState() {
    const horizontalLine = '  +---+---+---+';
    const verticalLine = '|';

    console.log('    1   2   3')

    for (let currentRow = 0; currentRow < GAME_BOARD_SIZE; currentRow++) {
        console.log(horizontalLine)
        let rowOutput = `${currentRow + 1} ${verticalLine}`;
        for (let currentCol = 0; currentCol < GAME_BOARD_SIZE; currentCol++) {
            let cell = gameBoard[currentRow][currentCol];
            if (cell === NO_PLAYER) {
                rowOutput += ` ${BOARD_MARKS.EMPTY} ${verticalLine}`;
            }
            else if (cell === PLAYER_1) {
                rowOutput += ` ${BOARD_COLORS.PLAYER_1}${BOARD_MARKS.PLAYER_1}${ANSI.RESET} ${verticalLine}`;
            } else {
                rowOutput += ` ${BOARD_COLORS.PLAYER_2}${BOARD_MARKS.PLAYER_2}${ANSI.RESET} ${verticalLine}`;
            }
        }
        console.log(rowOutput);
    }
    console.log(horizontalLine)
}

function initializeGame() {
    gameBoard = createGameBoard();
    currentPlayer = PLAYER_1;
}

function createGameBoard() {

    let newBoard = new Array(GAME_BOARD_SIZE);

    for (let currentRow = 0; currentRow < GAME_BOARD_SIZE; currentRow++) {
        let row = new Array(GAME_BOARD_SIZE).fill(NO_PLAYER);
        for (let currentColumn = 0; currentColumn < GAME_BOARD_SIZE; currentColumn++) {
            row[currentColumn] = 0;
        }
        newBoard[currentRow] = row;
    }
    return newBoard;
}

function clearScreen() {
    console.log(ANSI.CLEAR_SCREEN, ANSI.CURSOR_HOME, ANSI.RESET);
}