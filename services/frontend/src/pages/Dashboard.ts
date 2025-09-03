import { ws } from "../services/ws.js";
import type { ServerState } from "../interfaces/GameInterfaces.js";
import { GameManager } from "../managers/GameManager.js";
import { Derived } from "@app/shared";
import { Settings } from "../game/GameSettings.js";

// <h1>Dashboard</h1>
// <table id="lb">
//   <thead><tr><th>User</th><th>W</th><th>L</th></tr></thead>
//   <tbody></tbody>
// </table>
// <button id="reload">Reload</button>
export const mountDashboard = (root: HTMLElement) => {
}