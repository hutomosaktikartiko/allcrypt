self.onmessage = (e) => {
  const { type } = e.data;
  if (type === "PING") {
    self.postMessage({ type: "PONG" });
  }
};
