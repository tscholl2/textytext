const WebSocket = require("isomorphic-ws");

/**
 * Formats some mail for passing on wire.
 * @param {string} to
 * @param {string} from
 * @param {string} message
 * @returns {object}
 */
function mail(to, from, message) {
  return JSON.stringify({ to, from, message });
}

async function main() {
  const A = new WebSocket("ws://localhost:8001/A");
  const B = new WebSocket("ws://localhost:8001/B");

  A.onmessage = e => {
    const m = JSON.parse(e.data);
    console.log(`A recieved mail: ${JSON.stringify(m)}`);
  };

  B.onmessage = e => {
    const m = JSON.parse(e.data);
    console.log(`B recieved mail: ${JSON.stringify(m)}`);
  };

  await Promise.all([A,B].map(P => new Promise(resolve => P.onopen = () => resolve())));

  A.send(mail("B", "A", "hello"));
  A.send(mail("B", "A", "hello again"));

  B.send(mail("A", "B", "got it"));
}

main();
