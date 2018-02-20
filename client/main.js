const WEBSOCKET_HOST = "localhost:8001";
const { h, app } = hyperapp;

const state = (initialState = {
  name: "",
  form: {
    name: "",
    to: "",
    message: "",
  },
  inbox: [],
  popup: undefined,
});

let ws;
function connect(name = "", listener) {
  if (ws) {
    ws.close();
    ws = undefined;
  }
  if (!name) {
    return;
  }
  ws = new WebSocket(`ws://${WEBSOCKET_HOST}/${name}`);
  ws.onmessage = e => listener(JSON.parse(e.data));
  history.pushState(null, "", `/?name=${name}`);
}

function send(to, from, message) {
  if (ws) {
    ws.send(JSON.stringify({ to, from, message }));
  }
}

const actions = {
  onMail: m => () => ({ inbox: inbox.concat([m]) }),
  form: {
    onNameChange: e => state =>
      console.log("state = ", state) ||
      console.log("new value = ", e.target.value) || { name: e.target.value.toUpperCase() || "" },
    onToChange: e => () => ({ to: e.target.value.toUpperCase() || "" }),
    onMessageChange: e => () => ({ message: e.target.value || "" }),
  },
  connect: e => (state, actions) => {
    e && e.preventDefault();
    connect(state.form.name, actions.onMail);
    return Object.assign({}, initialState, { name: state.form.name });
  },
  send: e => state => {
    e && e.preventDefault();
    if (state.form.to === "" || state.name === "") {
      return;
    }
    send(state.form.to, state.name, state.form.message);
    return { popup: "sent" };
  },
};

const view = (state, actions) =>
  h("div", { id: "app" }, [
    h("header", undefined, `WELCOME${state.name ? " " + state.name : ""}!`),
    h("main", undefined, [
      state.name
        ? h("form", undefined, [
            h("label", undefined, [
              h("span", undefined, "To: "),
              h("input", {
                type: "text",
                placeholder: "BOB",
                value: state.form.to,
                oninput: actions.form.onToChange,
              }),
            ]),
            h("label", undefined, [
              h("span", undefined, "Message: "),
              h("textarea", {
                placeholder: "hi",
                value: state.form.message,
                oninput: actions.form.onMessageChange,
              }),
            ]),
            h("button", { onclick: actions.send }, "ENTER"),
          ])
        : h("form", undefined, [
            h("label", undefined, [
              h("span", undefined, "Name: "),
              h("input", {
                type: "text",
                placeholder: "ALICE",
                value: state.form.name,
                oninput: actions.form.onNameChange,
              }),
            ]),
            h("button", { onclick: actions.connect }, "ENTER"),
          ]),
    ]),
    h("footer", undefined, [
      h(
        "p",
        undefined,
        "Your message will show up right after it is sent. Once shown, your message is deleted.",
      ),
      h("a", { href: "https://git.tws.website/t/snaptext" }, "source"),
    ]),
  ]);

const main = app(state, actions, view, document.body);

function parseQueryString(search = "") {
  return search
    .substring(search.indexOf("?") + 1)
    .split("&")
    .map(s => s.split("="))
    .reduce((p, n) => Object.assign(p, { [n[0]]: decodeURIComponent(n[1]) }), {});
}

const params = parseQueryString(location.search);
main.form.onNameChange({ target: { value: params.name || "" } });
main.form.onToChange({ target: { value: params.to || "" } });
