const WEBSOCKET_HOST = "localhost:8001";

function mail(to, from, message) {
  return JSON.stringify({ to, from, message });
}

function ViewNoName() {
  document.querySelector("header").innerText = `Welcome!`;
  document.querySelector("main").innerHTML = `
<label>Name: <input id="input-name" onclick="" type="text" placeholder="A"/></label>
`;
}

function ViewName(name) {
  document.querySelector("header").innerText = `Welcome ${name}!`;
  document.querySelector("main").innerHTML
}

async function start() {
  const ws = new WebSocket(`ws://${WEBSOCKET_HOST}/`);
  const state = {
    name: location.pathname.split("/").pop(),
    inbox: [],
  }

  ws.onmessage = e => console.log(`got: ${JSON.stringify(m)}`) || inbox.push(JSON.parse(e.data));

  await new Promise(resolve => (ws.onopen = resolve()));

  
}

start();
