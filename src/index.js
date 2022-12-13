const http = require("http");
const handler = require("./handler.js");
const { Server } = require("socket.io");
const { waitForDatabaseToBeUpdated } = require("./helpers");

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer(handler);

const io = new Server(httpServer, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  global.connection = socket;
  console.log("We are connected");

  socket.on("upload-info", async (username, img) => {
    const uploadInfo = await waitForDatabaseToBeUpdated(username, img);
    const [postsNum, newImageIndex] = uploadInfo;
    io.emit("update-feed", username, img, postsNum, newImageIndex);
  });
});

httpServer.listen(PORT, () => console.log(`server is running at ${PORT}`));
