const WEBSOCKET_HOST = "localhost:8001";
const { h, app } = hyperapp;

// helper functions

const messenger = new class {
  constructor() {
    this.ws = undefined;
  }
  connect(name = "", listener) {
    this.ws && this.ws.close() && (this.ws = undefined);
    if (name) {
      this.ws = new WebSocket(`ws://${WEBSOCKET_HOST}/${name}`);
      this.ws.onmessage = e => listener(JSON.parse(e.data));
    }
  }
  send(to, from, message) {
    this.ws ? this.ws.send(JSON.stringify({ to, from, message })) : undefined;
  }
}();

function parseQueryString(search = "") {
  return search
    .substring(search.indexOf("?") + 1)
    .split("&")
    .map(s => s.split("="))
    .reduce((p, n) => Object.assign(p, { [n[0]]: decodeURIComponent(n[1]) }), {});
}

const router = new class {
  constructor() {
    this.listeners = [];
    addEventListener("popstate", () => this.listeners.forEach(l => l(this.getCurrentPath())));
  }
  addListener(listener) {
    this.listeners.push(listener);
  }
  getCurrentPath() {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }
  goTo(path) {
    path === this.getCurrentPath() ? undefined : history.pushState({}, "", path);
  }
}();

// app

const state = (initialState = {
  form: {
    name: parseQueryString(router.getCurrentPath()).name || "",
    to: parseQueryString(router.getCurrentPath()).to || "",
    message: parseQueryString(router.getCurrentPath()).message || "",
  },
  name: "",
  inbox: [],
  popup: undefined,
});

// <DEBUG>
// state.name = "ALICE";
// for (let i = 0; i < 2; i++) {
//   state.inbox.push({ to: "ALICE", from: "BOB", message: `hi ${i}`, date: new Date().toJSON() });
// }
// </DEBUG>

const actions = {
  form: {
    onNameChange: e => () => ({ name: e.target.value.toUpperCase() || "" }),
    onToChange: e => () => ({ to: e.target.value.toUpperCase() || "" }),
    onMessageChange: e => () => ({ message: e.target.value || "" }),
  },
  login: e => (state, actions) => {
    e && e.preventDefault && e.preventDefault();
    if (state.form.name === state.name) {
      return;
    }
    router.goTo(`${window.location.pathname}?name=${encodeURIComponent(state.form.name)}`);
    messenger.connect(state.form.name, actions.recieve);
    return { name: state.form.name };
  },
  logout: e => state => {
    e && e.preventDefault && e.preventDefault();
    messenger.connect(); // disconnects
    router.goTo(window.location.pathname);
    return { name: "", from: { to: "", message: "", name: "" }, popup: undefined, inbox: [] };
  },
  send: e => (state, actions) => {
    e && e.preventDefault && e.preventDefault();
    if (state.form.to === "" || state.name === "") {
      return;
    }
    messenger.send(state.form.to, state.name, state.form.message);
    actions.form.onMessageChange({ target: { value: "" } });
    return { popup: { type: "sent" } };
  },
  recieve: mail => state => ({ inbox: state.inbox.concat([mail]) }),
  openMail: mail => state => ({
    popup: { type: "mail", props: mail },
    inbox: state.inbox.filter(m => m !== mail),
  }),
  closeModal: () => () => ({ popup: undefined }),
  goTo: path => (state, actions) => {
    if (path !== router.getCurrentPath()) {
      router.goTo(path);
    }
    const name = parseQueryString(router.getCurrentPath()).name || "";
    if (name !== state.name) {
      actions.logout();
      actions.form.onNameChange({ target: { value: name } });
      actions.login();
    }
  },
};

const MailModal = mail =>
  h(
    "div",
    { class: "mail-modal" },
    h("div", { class: "mail-modal-date" }, `${new Date(mail.date).toLocaleString()}`),
    h("div", { class: "mail-modal-to" }, mail.to),
    h("div", { class: "mail-modal-from" }, mail.from),
    h("div", { class: "mail-modal-message" }, mail.message),
  );

const SentModal = () => h("div", { class: "sent-modal" }, "SENT");

const LoginForm = (state, actions) =>
  h(
    "form",
    {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        margin: 0,
        flex: "1",
      },
    },
    h("input", {
      style: { height: "50px", width: "200px", marginBottom: "20px" },
      type: "text",
      placeholder: "ALICE",
      value: state.form.name,
      oninput: actions.form.onNameChange,
      oncreate: el => el.focus(),
    }),
    h(
      "button",
      {
        style: { width: "100px", height: "100px" },
        disabled: !state.form.name,
        title: !state.form.name ? "name required" : undefined,
        type: "submit",
        onclick: actions.login,
      },
      "LOGIN",
    ),
  );

const SendForm = (state, actions) =>
  h(
    "form",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-around",
        flex: 1,
        margin: 0,
        alignItems: "flex-start",
      },
    },
    h("input", {
      style: { height: "50px", width: "200px" },
      required: true,
      type: "text",
      placeholder: "TO:",
      value: state.form.to,
      oninput: actions.form.onToChange,
      oncreate: el => el.focus(),
    }),
    h("textarea", {
      required: true,
      style: { width: "100%", height: "300px" },
      placeholder: "MESSAGE...",
      value: state.form.message,
      oninput: actions.form.onMessageChange,
    }),
    h(
      "button",
      {
        style: { width: "80%", height: "100px", alignSelf: "center" },
        title: !state.form.to || !state.form.message ? "TO and MESSAGE fields required" : undefined,
        disabled: !state.form.to || !state.form.message,
        type: "submit",
        onclick: actions.send,
      },
      "SEND",
    ),
  );

const Popup = (state, actions) =>
  h(
    "div",
    {
      oncreate: el => el.focus(),
      class: "modal",
      tabindex: "1",
      onkeydown: e => e.key === "Escape" && actions.closeModal(),
    },
    h(
      "div",
      { class: "modal-content" },
      h("span", { class: "modal-close", onclick: actions.closeModal }, "×"),
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
    ),
  );

const Mailbox = (state, actions) =>
  h(
    "aside",
    { style: { paddingLeft: "10px" } },
    h(
      "ul",
      { style: { padding: "0", margin: "0" } },
      state.inbox.map(m =>
        h(
          "li",
          {
            style: {
              cursor: "pointer",
              listStyle: "none",
              display: "flex",
              alignItems: "center",
              lineHeight: "50px",
              margin: "5px",
              backgroundColor: "white",
              border: "2px solid black",
            },
            onclick: () => actions.openMail(m),
          },
          h("span", { style: { fontSize: "2em", paddingLeft: "10px" } }, "✉"),
          h("span", { style: { flex: 1, textAlign: "center" } }, m.from),
        ),
      ),
    ),
  );

const Header = name =>
  h(
    "header",
    { style: { textAlign: "center" } },
    h(
      "h1",
      { style: { fontSize: "4em", fontWeight: "700" } },
      name ? `WELCOME ${name}!` : "TextyText",
    ),
  );

const Footer = logout =>
  h(
    "footer",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      },
    },
    h("a", { href: "#", onclick: logout }, "logout"),
    h("a", { href: "https://github.com/tscholl2/textytext" }, "source"),
  );

const view = (state, actions) => {
  return h(
    "div",
    { id: "app", class: state.name ? "is-logged-in" : "", oncreate: actions.login },
    Header(state.name),
    h(
      "main",
      { style: { display: "flex" } },
      state.name ? SendForm(state, actions) : LoginForm(state, actions),
    ),
    state.name && Mailbox(state, actions),
    Footer(actions.logout),
    state.popup && Popup(state, actions),
  );
};

const main = app(state, actions, view, document.body);
router.addListener(path => main.goTo(path));
