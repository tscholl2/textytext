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
    router.goTo(`/?name=${encodeURIComponent(state.form.name)}`);
    messenger.connect(state.form.name, actions.recieve);
    return { name: state.form.name };
  },
  logout: e => state => {
    e && e.preventDefault && e.preventDefault();
    messenger.connect(); // disconnects
    router.goTo(`/`);
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
    { class: "view-mail" },
    h("p", undefined, `sent at ${mail.date}`),
    h("div", undefined, "To: ", h("h3", undefined, mail.to)),
    h("div", undefined, "From: ", h("h3", undefined, mail.from)),
    h("div", undefined, "Message: ", h("p", undefined, mail.message)),
  );

const SentModal = () => h("div", undefined, [h("p", undefined, "message sent ✓")]);

const LoginForm = (state, actions) =>
  h(
    "form",
    undefined,
    h(
      "label",
      undefined,
      h("span", undefined, "Name: "),
      h("input", {
        type: "text",
        placeholder: "ALICE",
        value: state.form.name,
        oninput: actions.form.onNameChange,
        oncreate: el => el.focus(),
      }),
    ),
    h("button", { onclick: actions.login }, "LOGIN"),
  );

const SendForm = (state, actions) =>
  h(
    "form",
    undefined,
    h(
      "label",
      undefined,
      h("span", undefined, "To: "),
      h("input", {
        type: "text",
        placeholder: "TO:",
        value: state.form.to,
        oninput: actions.form.onToChange,
        oncreate: el => el.focus(),
      }),
    ),
    h(
      "label",
      undefined,
      h("span", undefined, "Message: "),
      h("textarea", {
        placeholder: "message...",
        value: state.form.message,
        oninput: actions.form.onMessageChange,
      }),
    ),
    h("button", { type: "submit", onclick: actions.send }, "ENTER"),
  );

const Popup = (state, actions) =>
  h(
    "div",
    { id: "modal", class: "modal" },
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
    "div",
    { id: "mailbox" },
    h(
      "ul",
      undefined,
      state.inbox.map(m =>
        h(
          "li",
          { class: "mailbox-message", onclick: () => actions.openMail(m) },
          h("span", undefined, "✉"),
          h("span", undefined, m.from),
        ),
      ),
    ),
  );

const Header = name =>
  h("header", undefined, h("h1", undefined, `WELCOME${name ? " " + name : ""}!`));

const Footer = logout =>
  h(
    "footer",
    undefined,
    h(
      "p",
      undefined,
      "Your message will show up right after it is sent. Once shown, your message is deleted.",
    ),
    h(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          maxWidth: "500px",
          width: "100%",
        },
      },
      h("a", { href: "#TODO" }, "source"),
      h("a", { href: "#", onclick: actions.logout }, "logout"),
    ),
  );

const view = (state, actions) => {
  return h("div", { id: "app", oncreate: actions.login }, [
    Header(state.name),
    h("main", undefined, state.name ? SendForm(state, actions) : LoginForm(state, actions)),
    state.name && Mailbox(state, actions),
    Footer(),
    state.popup && Popup(state, actions),
  ]);
};

const main = app(state, actions, view, document.body);
router.addListener(path => main.goTo(path));
