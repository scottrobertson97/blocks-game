import { Game } from "./game/Game";
import "./styles/style.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root was not found.");
}

const game = new Game(app);
game.start();

