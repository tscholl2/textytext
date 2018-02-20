const WEBSOCKET_HOST = "localhost:8001";

function mail(to, from, message) {
  return JSON.stringify({ to, from, message });
}

function parseQueryString(search) {
  return search
    .substring(search.indexOf("?") + 1)
    .split("&")
    .map(s => s.split("="))
    .reduce((p, n) => Object.assign(p, { [n[0]]: decodeURIComponent(n[1]) }), {});
}

function ViewNoName() {
  document.querySelector("header").innerText = `Welcome!`;
  document.getElementById("form-message").classList.toggle("hide");
}

function ViewName(name) {
  document.querySelector("header").innerText = `Welcome ${name}!`;
  document.getElementById("form-name").style.display = "none";
}

function updateState(state) {
  const params = parseQueryString(location.search);
  return { name: params.name, inbox: state.name === params.name ? state.inbox : [] };
}

async function start() {
  const ws = new WebSocket(`ws://${WEBSOCKET_HOST}/`);
  const state = {
    name: location.pathname.split("/").pop(),
    inbox: [],
  };

  // events
  document.addEventListener("update-name", event => {
    const name = event.detail;
    if (name === state.name) {
      return;
    }
    history.pushState({}, "", `/?name=${name}`);
    state.name = name;
  });
  document.addEventListener("send-message", event => {
    const to = document.getElementById("input-to").value;
    const from = state.name;
    const message = document.getElementById("input-message").value;
    ws.send(mail(to, from, message));
  });
  document.addEventListener("recieve-message", e => {
    const m = e.detail;
    if (m.to !== state.name) {
      return;
    }
    state.inbox.push(m);
  });

  // <DEBUG>
  state.name = "alice";
  document.getElementById("form-message").classList.toggle("hide");
  document.getElementById("form-name").classList.toggle("hide");
  document.querySelector("header").innerText = `Welcome${
    state.name !== "" ? " " + state.name : ""
  }!`;
  // </DEBUG>

  ws.onmessage = e => console.log(`got: ${JSON.stringify(m)}`) || inbox.push(JSON.parse(e.data));

  await new Promise(resolve => (ws.onopen = resolve()));
}

window.onload = start;
