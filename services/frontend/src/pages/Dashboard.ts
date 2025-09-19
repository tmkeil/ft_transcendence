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

const getUsers = async () => {
  const response = await fetch("/api/users");
  if (!response.ok) {
    console.error("Failed to fetch users:", response.statusText);
    return [];
  }
  const users: UsersData[] = await response.json();
  // Update each user with their relationship status
  const myUserId = Number(localStorage.getItem("userId") || "0");
  const myUser = users.find(u => u.id === myUserId);
  if (myUser) {
    const friends = new Set<string>(myUser.friends ? myUser.friends.split(",") : []);
    const blocks = new Set<string>(myUser.blocks ? myUser.blocks.split(",") : []);
    for (const user of users) {
      // If the user is myself, set status to "ok"
      if (user.id === myUserId) {
        user.status = "ok";
      }
      // If the user is in my blocks list, set status to "blocked"
      else if (blocks.has(String(user.id))) {
        user.status = "blocked";
      }
      // If the user is in my friends list, set status to "friend"
      else if (friends.has(String(user.id))) {
        user.status = "friend";
      }
      // Otherwise, set status to "ok"
      else {
        user.status = "ok";
      }
    }
  }
  return users;
};

const sendRequest = async (userId: number, myUserId: number | undefined) => {
  const res = await fetch(`/api/users/${myUserId}/sendFriendRequest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ friendId: userId })
  });
  if (!res.ok) {
    console.error("Failed to add friend:", res.statusText);
  }
};

const unfriend = async (userId: number, myUserId: number | undefined) => {
  const res = await fetch(`/api/users/${myUserId}/unfriend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ friendId: userId })
  });
  if (!res.ok) {
    console.error("Failed to unfriend user:", res.statusText);
  }
};

const block = async (userId: number, myUserId: number | undefined) => {
  const res = await fetch(`/api/users/${myUserId}/block`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blockId: userId })
  });
  if (!res.ok) {
    console.error("Failed to block user:", res.statusText);
  }
};

const unblock = async (userId: number, myUserId: number | undefined) => {
  console.log("Unblock user function called with:", userId, myUserId);
  const res = await fetch(`/api/users/${myUserId}/unblock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unblockId: userId })
  });
  if (!res.ok) {
    console.error("Failed to unblock user:", res.statusText);
  }
};

export const mountDashboard = async (root: HTMLElement) => {

  // Get the userId from localStorage
  const userId = Number(localStorage.getItem("userId") || "0");
  if (userId === 0) {
    console.error("No userId found in localStorage");
    return;
  }

  let users: UsersData[] = await getUsers();

  if (users.length === 0) {
    console.error("No users found from the server");
    return;
  }
  const myUser: UsersData | undefined = users.find(u => u.id === userId);
  if (!myUser) {
    console.error("Current user not found in users list");
    return;
  }

  // My Dashboard elements
  const myNameEl = root.querySelector("#my-name") as HTMLDivElement;
  const myLevelEl = root.querySelector("#my-level") as HTMLDivElement;
  const myWinsEl = root.querySelector("#my-wins") as HTMLSpanElement;
  const myLossesEl = root.querySelector("#my-losses") as HTMLSpanElement;
  const myWinrateEl = root.querySelector("#my-winrate") as HTMLSpanElement;
  const myAvatarEl = root.querySelector("#my-avatar") as HTMLDivElement;
  // Update the My Dashboard section with the user's data
  myNameEl.textContent = myUser.username;
  myLevelEl.textContent = `Level ${myUser.level}`;
  myWinsEl.textContent = myUser.wins.toString();
  myLossesEl.textContent = myUser.losses.toString();
  const totalGames = myUser.wins + myUser.losses;
  const winRate = totalGames > 0 ? Math.round((myUser.wins / totalGames) * 100) : 0;
  myWinrateEl.textContent = `${winRate}%`;

  // Function to create a user card element
  const createUserCard = (user: UsersData, myUser: UsersData | undefined) => {
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
          <button class="btn btn--primary" data-action="add-friend">Add Friend</button>
          <button class="btn btn--ghost" data-action="unfriend">Unfriend</button>
          <button class="btn btn--ghost" data-action="block">Block</button>
          <button class="btn btn--ghost" data-action="unblock">Unblock</button>
        </div>
      </li>`;

      // Reference the buttons
      const addFriendBtn = li.querySelector('[data-action="add-friend"]') as HTMLButtonElement;
      const unfriendBtn = li.querySelector('[data-action="unfriend"]') as HTMLButtonElement;
      const blockBtn = li.querySelector('[data-action="block"]') as HTMLButtonElement;
      const unblockBtn = li.querySelector('[data-action="unblock"]') as HTMLButtonElement;

      addFriendBtn.addEventListener("click", async () => {
        console.log("Add Friend:", user.id);
          await sendRequest(user.id, myUser?.id);
          users = await getUsers();
          renderUserCards(usersListEl, users, userId, myUser);
      });

      unfriendBtn.addEventListener("click", async () => {
          console.log("Unfriend user:", user.id);
          await unfriend(user.id, myUser?.id);
          users = await getUsers();
          renderUserCards(usersListEl, users, userId, myUser);
      });

      blockBtn.addEventListener("click", async () => {
          console.log("Block user:", user.id);
          await block(user.id, myUser?.id);
          users = await getUsers();
          renderUserCards(usersListEl, users, userId, myUser);
      });

      unblockBtn.addEventListener("click", async () => {
          console.log("Unblock user:", user.id);
          await unblock(user.id, myUser?.id);
          users = await getUsers();
          renderUserCards(usersListEl, users, userId, myUser);
      });

      return li;
  };

  // Populate the User Dashboard with user cards
  const renderUserCards = (container: HTMLUListElement, users: UsersData[], userId: number, myUser: UsersData | undefined) => {
    console.log("Rendering user cards, total users:", users.length);
    console.log("Users data:", users);
    container.innerHTML = "";
    for (const user of users) {
      if (user.id === userId)
        continue;
      const userCard = createUserCard(user, myUser);
      container.appendChild(userCard);
    }
  };

  // Reference the ul element to append user cards to
  const usersListEl = root.querySelector("#users-list") as HTMLUListElement;
  // Render the user cards
  renderUserCards(usersListEl, users, userId, myUser);

  // User Dashboard elements
  const searchInput = root.querySelector("#user-search") as HTMLInputElement;

  return () => {
    console.log("Unmounting Dashboard");
  };
}

		// db.run(`
		// 	CREATE TABLE IF NOT EXISTS users (
		// 	id INTEGER PRIMARY KEY,
		// 	username TEXT UNIQUE NOT NULL,
		// 	email TEXT UNIQUE NOT NULL,
		// 	password_hash TEXT NOT NULL,
		// 	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		// 	wins INTEGER DEFAULT 0,
		// 	losses INTEGER DEFAULT 0,
		// 	level INTEGER DEFAULT 1,
		// 	status TEXT DEFAULT 'ok',
		// 	friends TEXT DEFAULT '',
		// 	blocks TEXT DEFAULT ''
		// 	)
		// `);