import { ws } from "../services/ws.js";
import type { ServerState, UserData } from "../interfaces/GameInterfaces.js";
import { GameManager } from "../managers/GameManager.js";
import { Derived } from "@app/shared";
import { Settings } from "../game/GameSettings.js";

type UsersData = {
  id: number;
  username: string;
  wins: number;
  losses: number;
  level: number;
  created_at: string;
  email?: string;
  status: "ok" | "friend" | "blocked";
};

// <section class="dashboard">
//   <!-- My Dashboard -->
//   <aside class="mydash card">
//     <h2 class="cardTitle">My Dashboard</h2>

//     <!-- My Dashboard profile name and level and picture -->
//     <div class="mydash_profile">
//       <div class="avatar" id="my-avatar" aria-hidden="true">U</div>
//       <div>
//         <div class="mydash_name" id="my-name">USERNAME</div>
//         <div class="mydash_level" id="my-level">Level 12</div>
//       </div>
//     </div>

//     <!-- My Dashboard stats: Wins, Losses, Win Rate -->
//     <ul class="stats" aria-label="My Stats">
//       <li><span>Wins</span><strong id="my-wins">0</strong></li>
//       <li><span>Losses</span><strong id="my-losses">0</strong></li>
//       <li><span>Win Rate</span><strong id="my-winrate">0%</strong></li>
//     </ul>
//   </aside>

//   <!-- User Dashboard -->
//   <section class="users card">
//     <!-- User Dashboard header which contains the search bar and the cardTitle -->
//     <header class="users_header">
//       <!-- Title of the User Dashboard -->
//       <h1 class="cardTitle">User Dashboard</h1>
//       <!-- Search field -->
//       <label class="search">
//         <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
//           <path
//             d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79L20 21l1-1-5.5-6zM10 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"
//             fill="currentColor" />
//         </svg>
//         <input id="user-search" type="search" placeholder="Search..." autocomplete="off" />
//       </label>
//     </header>

//     <hr class="divider" />

//     <!-- User Dashboard list with user cards -->
//     <ul class="users_list" id="users-list" aria-live="polite">

//          <!-- Example user card -->
//       <li class="usercard" data-user-id="123" data-status="blocked">
//         <div class="usercard_left">
//           <div class="avatar">A</div>
//           <div class="usercard_meta">
//             <div class="usercard_name">Some_User</div>
//             <div class="usercard_level">Level 12</div>
//           </div>
//         </div>

//         <div class="usercard_stats">
//           Wins: <span data-wins>0</span> | Losses: <span data-losses>0</span>
//         </div>

//         <div class="badge"></div>

//         <div class="usercard_actions">
//           <button class="btn btn--primary" data-action="add-friend">Add Friend</button>
//           <button class="btn btn--ghost" data-action="unfriend">Unfriend</button>
//           <button class="btn btn--ghost" data-action="block">Block</button>
//           <button class="btn btn--ghost" data-action="unblock">Unblock</button>
//         </div>
//       </li>
//       <!-- Example user card end -->
//     </ul>
//   </section>
// </section>
// <link rel="stylesheet" href="/pages/dashboard2.css" />
const getUsers = async () => {
  const response = await fetch("/api/users");
  if (!response.ok) {
    console.error("Failed to fetch users:", response.statusText);
    return [];
  }
  const users: UsersData[] = await response.json();
  return users;
};

export const mountDashboard = async (root: HTMLElement) => {

  // Get the userId from localStorage
  const userId = Number(localStorage.getItem("userId") || "0");
  // Fetch the users from the server
  const users = await getUsers();
  console.log("Fetched users:", users);
  console.log("User at index 0:", users[0]);
  console.log("Own user:", users.find(u => u.id === userId));
  const myUser = users.find(u => u.id === userId);

  // My Dashboard elements
  const myNameEl = root.querySelector("#my-name") as HTMLDivElement;
  const myLevelEl = root.querySelector("#my-level") as HTMLDivElement;
  const myWinsEl = root.querySelector("#my-wins") as HTMLSpanElement;
  const myLossesEl = root.querySelector("#my-losses") as HTMLSpanElement;
  const myWinrateEl = root.querySelector("#my-winrate") as HTMLSpanElement;
  const myAvatarEl = root.querySelector("#my-avatar") as HTMLDivElement;
  // Update the My Dashboard section with the user's data
  if (myUser) {
    myNameEl.textContent = myUser.username;
    myLevelEl.textContent = `Level ${myUser.level}`;
    myWinsEl.textContent = myUser.wins.toString();
    myLossesEl.textContent = myUser.losses.toString();
    const totalGames = myUser.wins + myUser.losses;
    const winRate = totalGames > 0 ? Math.round((myUser.wins / totalGames) * 100) : 0;
    myWinrateEl.textContent = `${winRate}%`;
  }

  // Function to create a user card element
  const createUserCard = (user: UsersData) => {
    const li = document.createElement("li");
    const wins = user.wins;
    const losses = user.losses;
    const level = user.level;

    li.innerHTML = `
    <li class="usercard" data-user-id="${user.id}" data-status="${user.status}">
        <div class="usercard_left">
          <div class="avatar">A</div>
          <div class="usercard_meta">
            <div class="usercard_name">${user.username}</div>
            <div class="usercard_level">Level ${level}</div>
          </div>
        </div>

        <div class="usercard_stats">
          Wins: <span data-wins>${wins}</span> | Losses: <span data-losses>${losses}</span>
        </div>

        <div class="badge"></div>

        <div class="usercard_actions">
          <button onclick="addFriend(${user.id})" class="btn btn--primary" data-action="add-friend">Add Friend</button>
          <button onclick="unfriend(${user.id})" class="btn btn--ghost" data-action="unfriend">Unfriend</button>
          <button onclick="block(${user.id})" class="btn btn--ghost" data-action="block">Block</button>
          <button onclick="unblock(${user.id})" class="btn btn--ghost" data-action="unblock">Unblock</button>
        </div>
      </li>`;
    return li;
  };

  // Reference the ul element to append user cards to
  const usersListEl = root.querySelector("#users-list") as HTMLUListElement;
  // Populate the User Dashboard with user cards
  usersListEl.innerHTML = "";
  for (const user of users) {
    if (user.id === userId)
      continue;
    const userCard = createUserCard(user);
    usersListEl.appendChild(userCard);
  }

  // User Dashboard elements
  const searchInput = root.querySelector("#user-search") as HTMLInputElement;

  return () => {
  };
}
