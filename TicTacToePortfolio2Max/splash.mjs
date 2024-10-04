import { ANSI } from "./ansi.mjs";

const ART = `
${ANSI.COLOR.RED} ______  ____   __     ${ANSI.COLOR.GREEN} ______   ____    __     ${ANSI.COLOR.BLUE} ______   ___     ___   ${ANSI.COLOR.YELLOW}  ___
${ANSI.COLOR.RED}|      ||    | /  ]    ${ANSI.COLOR.GREEN}|      | /    |  /  ]    ${ANSI.COLOR.BLUE}|      | /   \\   /  _]  ${ANSI.COLOR.YELLOW} |   |
${ANSI.COLOR.RED}|      | |  | /  /     ${ANSI.COLOR.GREEN}|      ||  o  | /  /     ${ANSI.COLOR.BLUE}|      ||     | /  [_   ${ANSI.COLOR.YELLOW} |   |
${ANSI.COLOR.RED}  |_|  |_| |  |/  /      ${ANSI.COLOR.GREEN}|_|  |_||     |/  /      ${ANSI.COLOR.BLUE}|_|  |_||  O  ||    _]  ${ANSI.COLOR.YELLOW} |   | 
${ANSI.COLOR.RED}  |  |   |  /   \\_     ${ANSI.COLOR.GREEN}  |  |  |  _  /   \\_     ${ANSI.COLOR.BLUE}  |  |  |     ||   [_   ${ANSI.COLOR.YELLOW} |___|
${ANSI.COLOR.RED}  |  |   |  \\     |    ${ANSI.COLOR.GREEN}  |  |  |  |  \\     |    ${ANSI.COLOR.BLUE}  |  |  |     ||     |  ${ANSI.COLOR.YELLOW}  ___ 
${ANSI.COLOR.RED}  |__|  |____\\____|    ${ANSI.COLOR.GREEN}  |__|  |__|__|\\____|    ${ANSI.COLOR.BLUE}  |__|   \\___/ |_____|  ${ANSI.COLOR.YELLOW} |___|
${ANSI.RESET}
`

function showSplashScreen() {
    return ART;
}

export default showSplashScreen;