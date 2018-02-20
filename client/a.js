const WebSocket = require("isomorphic-ws");

function mail(to, from, message) {
  return JSON.stringify({ to, from, message });
}

async function main() {
  const A = new WebSocket("ws://localhost:8001/A");
  const B = new WebSocket("ws://localhost:8001/B");
  const B2 = new WebSocket("ws://localhost:8001/B");

  A.onmessage = e => {
    const m = JSON.parse(e.data);
    console.log(`A recieved mail: ${JSON.stringify(m)}`);
  };

  B.onmessage = e => {
    const m = JSON.parse(e.data);
    console.log(`B recieved mail: ${JSON.stringify(m)}`);
  };

  B2.onmessage = e => {
    const m = JSON.parse(e.data);
    console.log(`B2 recieved mail: ${JSON.stringify(m)}`);
  };

  await Promise.all([A, B, B2].map(P => new Promise(resolve => (P.onopen = () => resolve()))));

  A.send(mail("B", "A", "hello"));
  A.send(mail("B", "A", "hello again"));

  B.send(mail("A", "B", "got it"));
}

main();
