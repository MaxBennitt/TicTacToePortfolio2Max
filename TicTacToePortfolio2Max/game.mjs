import { print, askQuestion } from "./io.mjs"
import { debug, DEBUG_LEVELS } from "./debug.mjs";
import { ANSI } from "./ansi.mjs";
import DICTIONARY from "./language.mjs";
import showSplashScreen from "./splash.mjs";
import { getRandomInt } from "./utils.mjs";
import fs from 'fs';

const GAME_BOARD_SIZE = 3;
const PLAYER_1 = 1;
const PLAYER_2 = -1;

// These are the valid choices for the menu.
const MENU_CHOICES = {
    MENU_CHOICE_START_GAME: 1,
    MENU_CHOICE_SHOW_SETTINGS: 2,
    MENU_CHOICE_EXIT_GAME: 3
};

const GAME_MODES = {
    PLAYER_VS_PLAYER: 1,
    PLAYER_VS_COMPUTER: 2
};

const NO_CHOICE = -1;

let language = loadLanguagePreference();
let gameboard;
let currentPlayer;

clearScreen();
showCenteredSplashScreen();
setTimeout(start, 2500); // This waites 2.5seconds before calling the function. i.e. we get to see the splash screen for 2.5 seconds before the menue takes over. 



//#region game functions -----------------------------

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

    let choice = -1;  // This variable tracks the choice the player has made. We set it to -1 initially because that is not a valid choice.
    let validChoice = false;    // This variable tells us if the choice the player has made is one of the valid choices. It is initially set to false because the player has made no choices.

    while (!validChoice) {
        // Display our menu to the player.
        clearScreen();
        print(ANSI.COLOR.YELLOW + language.MENU_TITLE + ANSI.RESET);
        print(language.MENU_PLAY_GAME);
        print(language.MENU_SETTINGS);
        print(language.MENU_EXIT_GAME);

        // Wait for the choice.
        choice = await askQuestion("");

        // Check to see if the choice is valid.
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

        choice = await askQuestion("");

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

    let choice = await askQuestion("");

    if (choice === "1") {
        await changeLanguage();
    }
}

function loadLanguagePreference() {
    try {
        const data = fs.readFileSync('language_preference.json', 'utf8');
        const preference = JSON.parse(data);
        return DICTIONARY[preference.language] || DICTIONARY.en;
    } catch (error) {
        return DICTIONARY.en;
    }
}

async function changeLanguage() {
    let newLang = await askQuestion(language.LANGUAGE_CHOICE);
    if (newLang.toLowerCase() === "en" || newLang.toLowerCase() === "no") {
        language = DICTIONARY[newLang.toLowerCase()];
        fs.writeFileSync('language_preference.json', JSON.stringify({ language: newLang.toLowerCase() }));
        print("Language changed successfully.");
    } else {
        print("Invalid language choice. Language remains unchanged.")
    }
    await askQuestion("Press enter to continue...");
}

async function runGame() {
    let isPlaying = true;

    while (isPlaying) { // Do the following until the player dos not want to play anymore. 
        initializeGame(); // Reset everything related to playing the game
        let gameMode = await selectGameMode();
        isPlaying = await playGame(gameMode); // run the actual game 
    }
}

async function playGame(gameMode) {
    // Play game..
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
    const result = minimax(gameboard, currentPlayer, 0);
    const move = result.row !== undefined ? result : result.move;
    return [(move.row + 1).toString(), (move.col + 1).toString()];
}

function minimax(board, player, depth) {
    if (checkWin(board, PLAYER_1)) return { score: -10 + depth};
    if (checkWin(board, PLAYER_2)) return { score: 10 - depth};
    if (isBoardfull(board)) return { score: 0};

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

function isBoardfull(board) {
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

    if (outcome === 0.5) {
        print(language.DRAW);
    } else if (outcome === 1) {
        print(language.WINNER.replace("{0}", "1"));
    } else if (outcome === -1) {
        print(language.WINNER.replace("{0}", "2"));
    } else {
        print(language.GAME_OVER);
    }

    showGameBoardWithCurrentState();
    print("GAME OVER");
}

function changeCurrentPlayer() {
    currentPlayer *= -1;
}

function evaluateGameState() {
    let sum = 0;
    let state = 0;

    for (let row = 0; row < GAME_BOARD_SIZE; row++) {

        for (let col = 0; col < GAME_BOARD_SIZE; col++) {
            sum += gameboard[row][col];
        }

        if (Math.abs(sum) == 3) {
            state = sum;
        }
        sum = 0;
    }

    for (let col = 0; col < GAME_BOARD_SIZE; col++) {

        for (let row = 0; row < GAME_BOARD_SIZE; row++) {
            sum += gameboard[row][col];
        }

        if (Math.abs(sum) == 3) {
            state = sum;
        }

        sum = 0;
    }

    sum = gameboard[0][0] + gameboard[1][1] + gameboard[2][2];
    if (Math.abs(sum) == 3){
        state = sum;
    }

    sum = gameboard[0][2] + gameboard[1][1] + gameboard[2][0];
    if (Math.abs(sum) == 3){
        state = sum;
    }

    let isDraw = true;
    for (let row = 0; row < GAME_BOARD_SIZE; row++) {
        for (let col = 0; col < GAME_BOARD_SIZE; col++){
            if (gameboard[row][col] === 0) {
                isDraw = false;
                break;
            }
        }
        if (!isDraw) break;
    }

    if (state === 0 && isDraw) {
        return 0.5;
    }

    let winner = state / 3;
    return winner;
}

function updateGameBoardState(move) {
    let row, col;

    if (Array.isArray(move)) {
        const ROW_ID = 0;
        const COLUMN_ID = 1;
        row = parseInt(move[ROW_ID]) - 1;
        col = parseInt(move[COLUMN_ID]) - 1;
    } else if (typeof move === 'object') {
        row = move.row;
        col = move.col;
    } else {
        console.error('Invalid move format');
        return;
    }
    
    if (row >= 0 && row < GAME_BOARD_SIZE && col >= 0 && col < GAME_BOARD_SIZE) {
        gameboard[row][col] = currentPlayer;
    } else {
        console.error(`Invalid move: row ${row + 1}, col ${col + 1}`);
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
        // We where not given two numbers or more.
        return false;
    }

    let row = parseInt(position[0]) - 1;
    let col = parseInt(position[1]) - 1;

    if (isNaN(row) || isNaN(col)) {
        // Not Numbers
        return false;
    }
    
    if (row < 0 || row >= GAME_BOARD_SIZE || col < 0 || col >= GAME_BOARD_SIZE) {
        // Not on board
        return false;
    }
    
    if (gameboard[row][col] !== 0) {
        // Position taken.
        return false;
    }


    return true;
}

function showHUD() {
    let playerDescription = currentPlayer === PLAYER_1 ? "1" : "2";
    print(language.PLAYER_TURN.replace("{0}", playerDescription));
}

function showGameBoardWithCurrentState() {
    for (let currentRow = 0; currentRow < GAME_BOARD_SIZE; currentRow++) {
        let rowOutput = "";
        for (let currentCol = 0; currentCol < GAME_BOARD_SIZE; currentCol++) {
            let cell = gameboard[currentRow][currentCol];
            if (cell == 0) {
                rowOutput += "_ ";
            }
            else if (cell > 0) {
                rowOutput += "X ";
            } else {
                rowOutput += "O ";
            }
        }

        print(rowOutput);
    }
}

function initializeGame() {
    gameboard = createGameBoard();
    currentPlayer = PLAYER_1;
}

function createGameBoard() {

    let newBoard = new Array(GAME_BOARD_SIZE);

    for (let currentRow = 0; currentRow < GAME_BOARD_SIZE; currentRow++) {
        let row = new Array(GAME_BOARD_SIZE);
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


//#endregion