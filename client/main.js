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

// <DEBUG>
state.name = "ALICE";
state.inbox = [
  { to: "ALICE", from: "BOB", message: "hi", date: new Date().toJSON() },
  { to: "ALICE", from: "BOB", message: "hi again", date: new Date().toJSON() },
];
// </DEBUG>

const actions = {
  onMail: m => () => ({ inbox: inbox.concat([m]) }),
  form: {
    onNameChange: e => () => ({ name: e.target.value.toUpperCase() || "" }),
    onToChange: e => () => ({ to: e.target.value.toUpperCase() || "" }),
    onMessageChange: e => () => ({ message: e.target.value || "" }),
  },
  connect: e => (state, actions) => {
    e && e.preventDefault();
    if (state.form.name === state.name) {
      return;
    }
    // connect(name, actions.onMail);
    return Object.assign({}, initialState, { name: state.form.name });
  },
  disconnect: e => (state, actions) => {
    e && e.preventDefault();
    return Object.assign({}, initialState, { name: "" });
  },
  send: e => state => {
    e && e.preventDefault();
    if (state.form.to === "" || state.name === "") {
      return;
    }
    // send(state.form.to, state.name, state.form.message);
    return { popup: { type: "sent" } };
  },
  closeModal: () => () => ({ popup: undefined }),
};

const MailModal = m => {
  return h("div", { class: "view-mail" }, [
    h("p", undefined, `sent at ${m.date}`),
    h("h3", undefined, m.to),
    h("h3", undefined, m.from),
    h("p", undefined, m.message),
  ]);
};

const SentModal = () => {
  return h("div", undefined, [h("p", undefined, "message sent ✓")]);
};

const view = (state, actions) =>
  h("div", { id: "app" }, [
    h("header", undefined, [h("h1", undefined, `WELCOME${state.name ? " " + state.name : ""}!`)]),
    h("main", undefined, [
      h(
        "form",
        undefined,
        state.name
          ? [
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
            ]
          : [
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
            ],
      ),
    ]),
    h(
      "div",
      { id: "mailbox" },
      state.name
        ? [
            h("h2", undefined, "Mailbox"),
            h(
              "ul",
              undefined,
              state.inbox.map(m =>
                h("li", undefined, [
                  h("div", { class: "mail" }, [h("span", undefined, `From: ${m.from}`)]),
                ]),
              ),
            ),
          ]
        : undefined,
    ),
    h("footer", undefined, [
      h(
        "p",
        undefined,
        "Your message will show up right after it is sent. Once shown, your message is deleted.",
      ),
      h("a", { href: "https://git.tws.website/t/snaptext" }, "source"),
      h("a", { href: "#", onclick: actions.disconnect }, "Signout"),
    ]),
    state.popup
      ? h("div", { id: "modal", class: "modal" }, [
          h("div", { class: "modal-content" }, [
            h("span", { class: "modal-close", onclick: actions.closeModal }, "×"),
            // fill in
            (() => {
              switch (state.popup.type) {
                case "mail":
                  return MailModal(state.popup.props, state, actions);
                case "sent":
                  return SentModal(state.popup.props, state, actions);
                default:
                  return undefined;
              }
            })(),
            h("p", undefined, "some text..."),
          ]),
        ])
      : undefined,
  ]);

const main = app(state, actions, view, document.body);

// helper functions

let ws;
function connect(name = "", listener) {
  if (ws) {
    ws.close();
    ws = undefined;
  }
  if (!name) {
    return;
  }
  // ws = new WebSocket(`ws://${WEBSOCKET_HOST}/${name}`);
  // ws.onmessage = e => listener(JSON.parse(e.data));
}

function send(to, from, message) {
  if (ws) {
    ws.send(JSON.stringify({ to, from, message }));
  }
}

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
