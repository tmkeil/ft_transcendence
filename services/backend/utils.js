export function broadcaster(clients, ws, msg) {
  // console.log("Broadcasting message to all clients: ", msg);
  for (const client of clients) {
    if (client !== ws && client.readyState === 1) {
      client.send(msg);
    }
  }
}
